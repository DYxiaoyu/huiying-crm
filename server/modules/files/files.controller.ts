import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { randomBytes } from 'crypto';
import { EmployeeAuthGuard } from '@server/modules/auth/employee-auth.guard';
import * as fs from 'fs';
import * as path from 'path';

const UPLOAD_DIR = '/app/uploads';
const TRASH_DIR = '/app/uploads/.trash';

function ensureTrash() {
  try { fs.mkdirSync(TRASH_DIR, { recursive: true }); } catch (e) {}
}

function safeName(name: string) {
  if (!name || name.includes('/') || name.includes('\\') || name.includes('..')) {
    throw new BadRequestException('非法文件名');
  }
  return name;
}

@Controller('api/files')
@UseGuards(EmployeeAuthGuard)
export class FilesController {
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
  list(@Query('trash') trash?: string) {
    ensureTrash();
    const dir = trash === '1' ? TRASH_DIR : UPLOAD_DIR;
    const files = fs.readdirSync(dir)
      .filter(f => !f.startsWith('.'))
      .map(f => {
        try {
          const st = fs.statSync(path.join(dir, f));
          return { name: f, size: st.size, mtime: Math.floor(st.mtimeMs) };
        } catch (e) { return null; }
      })
      .filter(Boolean)
      .sort((a: any, b: any) => b.mtime - a.mtime);
    return files;
  }

  @Post('delete')
  delete(@Body('name') name: string) {
    ensureTrash();
    safeName(name);
    try {
      fs.renameSync(path.join(UPLOAD_DIR, name), path.join(TRASH_DIR, name));
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
      fs.renameSync(path.join(TRASH_DIR, name), path.join(UPLOAD_DIR, name));
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
      fs.unlinkSync(path.join(TRASH_DIR, name));
      return { ok: true };
    } catch (e: any) {
      throw new BadRequestException(e.message);
    }
  }
}
