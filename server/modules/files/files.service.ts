import {
  Injectable,
  Inject,
  Logger,
} from '@nestjs/common';
import { DRIZZLE_DATABASE } from '@server/database/database.module';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { supplierProducts } from '@server/database/schema';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/app/uploads';
const PUBLIC_DIR = path.join(UPLOAD_DIR, 'public'); // 供应商表单页(join)公开上传落盘目录
const TRASH_DIR = path.join(UPLOAD_DIR, '.trash');

// 数据库可能存 /uploads/ 或 /api/uploads/ 两种前缀（历史上做过 SQL 替换），都识别
function toUploadName(p: string): string | null {
  const s = (p || '').trim();
  if (s.startsWith('/uploads/') || s.startsWith('/api/uploads/')) {
    return path.basename(s);
  }
  return null;
}

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  /** 收集所有被数据库引用的文件名（files JSON / images JSON / imageUrl，兼容 /uploads/ 与 /api/uploads/ 前缀） */
  private async collectReferencedNames(): Promise<Set<string>> {
    const referenced = new Set<string>();
    const rows = await this.db
      .select({
        files: supplierProducts.files,
        images: supplierProducts.images,
        imageUrl: supplierProducts.imageUrl,
      })
      .from(supplierProducts);
    for (const r of rows) {
      const n = toUploadName(r.imageUrl || '');
      if (n) referenced.add(n);
      for (const col of ['files', 'images'] as const) {
        const raw = r[col];
        if (!raw) continue;
        try {
          const arr = JSON.parse(raw);
          if (!Array.isArray(arr)) continue;
          for (const item of arr) {
            if (typeof item === 'string') {
              const n = toUploadName(item);
              if (n) referenced.add(n);
            } else if (item && typeof item === 'object') {
              const u = (item as { url?: string }).url;
              const n = toUploadName(u || '');
              if (n) referenced.add(n);
            }
          }
        } catch {
          /* JSON 损坏忽略，不误删 */
        }
      }
    }
    return referenced;
  }

  /** 手动清理供应商表单页(join)公开上传目录中，未被任何商品引用的文件（移入回收站）。
   *  仅手动触发（POST /api/files/cleanup），不自动调度。 */
  async cleanupOrphanFiles() {
    try {
      if (!fs.existsSync(PUBLIC_DIR)) return { cleaned: 0 };
      const referenced = await this.collectReferencedNames();
      let cleaned = 0;
      const entries = fs.readdirSync(PUBLIC_DIR).filter((f) => !f.startsWith('.'));
      for (const name of entries) {
        if (referenced.has(name)) continue;
        const fp = path.join(PUBLIC_DIR, name);
        try {
          const st = fs.statSync(fp);
          if (!st.isFile()) continue;
          fs.mkdirSync(TRASH_DIR, { recursive: true });
          fs.renameSync(fp, path.join(TRASH_DIR, name));
          cleaned++;
        } catch {
          /* 单文件失败跳过 */
        }
      }
      if (cleaned > 0) {
        this.logger.log(`表单页未引用文件手动清理：${cleaned} 个已移入回收站`);
      }
      return { cleaned };
    } catch (e) {
      this.logger.error('清理失败', e as Error);
      return { cleaned: 0 };
    }
  }

  /** 统计 uploads（含回收站）占用 */
  usage() {
    let files = 0;
    let sizeBytes = 0;
    let trashFiles = 0;
    let trashSizeBytes = 0;
    const walk = (dir: string, isTrash: boolean) => {
      if (!fs.existsSync(dir)) return;
      for (const f of fs.readdirSync(dir)) {
        if (f.startsWith('.')) continue;
        const fp = path.join(dir, f);
        try {
          const st = fs.statSync(fp);
          if (st.isDirectory()) {
            walk(fp, isTrash);
            continue;
          }
          if (isTrash) {
            trashFiles++;
            trashSizeBytes += st.size;
          } else {
            files++;
            sizeBytes += st.size;
          }
        } catch {
          /* 跳过无法读取的文件 */
        }
      }
    };
    walk(UPLOAD_DIR, false);
    walk(TRASH_DIR, true);
    // 磁盘总容量（持久卷），df 第二列为 1K-blocks
    let totalBytes: number | null = null;
    try {
      const out = execSync(`df -k ${JSON.stringify(UPLOAD_DIR)}`, { encoding: 'utf8' });
      const lines = out.trim().split('\n');
      const last = lines[lines.length - 1].trim().split(/\s+/);
      if (last.length >= 2) {
        const kb = parseInt(last[1], 10);
        if (Number.isFinite(kb) && kb > 0) totalBytes = kb * 1024;
      }
    } catch {
      totalBytes = null;
    }
    return { files, sizeBytes, trashFiles, trashSizeBytes, totalBytes };
  }
}
