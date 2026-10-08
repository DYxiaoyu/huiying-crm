import {
  Injectable,
  Inject,
  Logger,
  OnModuleInit,
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
const ORPHAN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 表单页上传后 7 天未提交视为孤儿
const CLEAN_INTERVAL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class FilesService implements OnModuleInit {
  private readonly logger = new Logger(FilesService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  onModuleInit() {
    // 启动约 10 秒后先跑一次，之后每 24 小时清理一次
    setTimeout(() => {
      void this.cleanupOrphanFiles();
    }, 10_000);
    setInterval(() => {
      void this.cleanupOrphanFiles();
    }, CLEAN_INTERVAL_MS);
  }

  /** 收集所有被数据库引用的文件名（files JSON / images JSON / imageUrl 中的 /uploads/ 路径） */
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
      if (r.imageUrl && r.imageUrl.startsWith('/uploads/')) {
        referenced.add(path.basename(r.imageUrl));
      }
      for (const col of ['files', 'images'] as const) {
        const raw = r[col];
        if (!raw) continue;
        try {
          const arr = JSON.parse(raw);
          if (!Array.isArray(arr)) continue;
          for (const item of arr) {
            if (typeof item === 'string' && item.startsWith('/uploads/')) {
              referenced.add(path.basename(item));
            } else if (item && typeof item === 'object') {
              const u = (item as { url?: string }).url;
              if (typeof u === 'string' && u.startsWith('/uploads/')) {
                referenced.add(path.basename(u));
              }
            }
          }
        } catch {
          /* JSON 损坏忽略，不误删 */
        }
      }
    }
    return referenced;
  }

  /** 孤儿文件清理：仅清理供应商表单页(join)公开上传目录中，上传超 7 天且未被任何商品引用的文件（移入回收站）。
   *  后台员工上传的文件（主目录）不受影响，由文件管理页手动管理。 */
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
          if (Date.now() - st.mtimeMs < ORPHAN_MAX_AGE_MS) continue;
          fs.mkdirSync(TRASH_DIR, { recursive: true });
          fs.renameSync(fp, path.join(TRASH_DIR, name));
          cleaned++;
        } catch {
          /* 单文件失败跳过 */
        }
      }
      if (cleaned > 0) {
        this.logger.log(`表单页孤儿文件自动清理：${cleaned} 个未提交文件已移入回收站`);
      }
      return { cleaned };
    } catch (e) {
      this.logger.error('孤儿文件清理失败', e as Error);
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
