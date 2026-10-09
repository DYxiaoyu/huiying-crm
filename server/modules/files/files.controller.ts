import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Res,
  UseGuards,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { randomBytes } from 'crypto';
import { EmployeeAuthGuard } from '@server/modules/auth/employee-auth.guard';
import { FilesService } from './files.service';
import * as fs from 'fs';
import * as path from 'path';
import archiver = require('archiver');
import type { Response } from 'express';

const UPLOAD_DIR = '/app/uploads';
const TRASH_DIR = '/app/uploads/.trash';

function ensureTrash() {
  try { fs.mkdirSync(TRASH_DIR, { recursive: true }); } catch (e) {}
}

function safeName(name: string) {
  if (!name || name.includes('..')) {
    throw new BadRequestException('非法文件名');
  }
  return name;
}

/** 相对路径（支持 public/ 子目录）→ 磁盘绝对路径；仅允许 uploads 内部，防目录穿越 */
function resolveRel(rel: string): string {
  const clean = String(rel || '').replace(/^\/+/, '').replace(/\\/g, '/');
  if (!clean || clean.includes('..') || clean.startsWith('.trash')) {
    throw new BadRequestException('非法路径');
  }
  const abs = path.normalize(path.join(UPLOAD_DIR, clean));
  if (!abs.startsWith(UPLOAD_DIR + path.sep) && abs !== UPLOAD_DIR) {
    throw new BadRequestException('非法路径');
  }
  return abs;
}

@Controller('api/files')
@UseGuards(EmployeeAuthGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  /** 磁盘占用统计（文件数 / 已用 / 回收站 / 卷总容量） */
  @Get('usage')
  usage() {
    return this.filesService.usage();
  }

  /** 整目录打包下载（zip：/app/uploads 全部文件，含 public/ 与 .trash/，保留相对路径） */
  @Get('backup')
  async backup(@Res() res: Response) {
    try {
      const archive = archiver('zip', { zlib: { level: 6 } });
      const date = new Date().toISOString().slice(0, 10);
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="uploads-backup-${date}.zip"`);
      archive.on('error', (e: Error) => {
        try { res.destroy(); } catch (err) { /* ignore */ }
      });
      archive.pipe(res);
      const walk = (dir: string, prefix: string) => {
        let entries: string[] = [];
        try { entries = fs.readdirSync(dir); } catch { return; }
        for (const name of entries) {
          const full = path.join(dir, name);
          const rel = prefix + name;
          let st;
          try { st = fs.statSync(full); } catch { continue; }
          if (st.isDirectory()) walk(full, rel + '/');
          else if (st.isFile()) archive.file(full, { name: rel });
        }
      };
      walk(UPLOAD_DIR, '');
      await archive.finalize();
    } catch (e: any) {
      throw new BadRequestException('打包失败：' + (e?.message || '未知错误'));
    }
  }

  /** 搬家工具箱：文件清单 + 客户/供应商/商品/密钥 CSV + 说明文档（zip 一键下载） */
  @Get('export')
  async exportBundle(@Res() res: Response) {
    try {
      const bundle = await this.filesService.exportFullBundle();
      const archive = archiver('zip', { zlib: { level: 6 } });
      const date = new Date().toISOString().slice(0, 10);
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="crm-move-toolkit-${date}.zip"`);
      archive.on('error', (e: Error) => {
        try { res.destroy(); } catch (err) { /* ignore */ }
      });
      archive.pipe(res);
      for (const f of bundle) {
        archive.append(f.content, { name: f.name });
      }
      await archive.finalize();
    } catch (e: any) {
      throw new BadRequestException('导出失败：' + (e?.message || '未知错误'));
    }
  }

  /** 立即触发一次孤儿文件清理（上传超7天且未被引用→回收站） */
  @Post('cleanup')
  cleanup() {
    return this.filesService.cleanupOrphanFiles();
  }
  /** 通用文件上传（multipart/form-data，字段名 file，单个≤200MB，直接落盘 /app/uploads） */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (req, file, cb) => {
        try { fs.mkdirSync(UPLOAD_DIR, { recursive: true }); } catch (e) {}
        cb(null, UPLOAD_DIR);
      },
      filename: (req, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase().slice(0, 12);
        cb(null, Date.now() + '-' + randomBytes(6).toString('hex') + ext);
      },
    }),
    limits: { fileSize: 200 * 1024 * 1024 },
  }))
  upload(@UploadedFile() file?: { originalname?: string; filename?: string; size?: number }) {
    if (!file) throw new BadRequestException('未收到文件');
    return {
      url: '/uploads/' + file.filename,
      name: file.originalname || file.filename,
      size: file.size,
    };
  }

  @Get('list')
  async list(@Query('trash') trash?: string) {
    ensureTrash();
    const refMap = await this.filesService.getRefMap();
    const files: { name: string; rel: string; size: number; mtime: number; refs: { productName: string; supplierName: string; role: string }[] }[] = [];
    // 主目录 + public 子目录都列出（rel 区分）；回收站只有一层
    const dir = trash === '1' ? TRASH_DIR : UPLOAD_DIR;
    const collect = (d: string, prefix: string) => {
      let entries: string[] = [];
      try { entries = fs.readdirSync(d); } catch { return; }
      for (const f of entries) {
        if (f.startsWith('.')) continue;
        const fp = path.join(d, f);
        let st;
        try { st = fs.statSync(fp); } catch { continue; }
        if (st.isDirectory()) {
          if (trash !== '1') collect(fp, prefix + f + '/'); // 递归子目录（如 public/）
          continue;
        }
        const rel = prefix + f;
        const refs = (refMap.get(f) || []).map(r => ({ productName: r.productName, supplierName: r.supplierName, role: r.role }));
        files.push({ name: f, rel, size: st.size, mtime: Math.floor(st.mtimeMs), refs });
      }
    };
    collect(dir, '');
    files.sort((a, b) => b.mtime - a.mtime);
    return files;
  }

  @Post('delete')
  delete(@Body('name') name: string) {
    ensureTrash();
    safeName(name);
    try {
      const fp = resolveRel(name);
      fs.renameSync(fp, path.join(TRASH_DIR, path.basename(name)));
      return { ok: true };
    } catch (e: any) {
      throw new BadRequestException(e.message);
    }
  }

  @Post('restore')
  restore(@Body('name') name: string) {
    ensureTrash();
    safeName(name);
    try {
      fs.renameSync(path.join(TRASH_DIR, path.basename(name)), resolveRel(name));
      return { ok: true };
    } catch (e: any) {
      throw new BadRequestException(e.message);
    }
  }

  @Post('permanent')
  permanent(@Body('name') name: string) {
    ensureTrash();
    safeName(name);
    try {
      fs.unlinkSync(path.join(TRASH_DIR, path.basename(name)));
      return { ok: true };
    } catch (e: any) {
      throw new BadRequestException(e.message);
    }
  }

  /** 一次性迁移：数据库 base64 商品图片 → 磁盘文件，并更新引用为 /uploads/ 路径 */
  @Post('migrate-images')
  async migrateImages() {
    return this.filesService.migrateBase64Images();
  }
}
