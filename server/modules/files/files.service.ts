import {
  Injectable,
  Inject,
  Logger,
} from '@nestjs/common';
import { DRIZZLE_DATABASE } from '@server/database/database.module';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { supplierProducts, supplierKeys, customers } from '@server/database/schema';
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

  /** 构建 磁盘文件名 → 业务引用 映射（含引用角色：主图/商品图片/资料文件），供文件列表与搬家清单复用 */
  async getRefMap(): Promise<Map<string, { productId: string; productName: string; supplierName: string; role: string }[]>> {
    const rows = await this.db.select().from(supplierProducts);
    const refMap = new Map<string, { productId: string; productName: string; supplierName: string; role: string }[]>();
    const pushRef = (name: string, productId: string, productName: string, supplierName: string, role: string) => {
      if (!name) return;
      const list = refMap.get(name) || [];
      list.push({ productId, productName, supplierName, role });
      refMap.set(name, list);
    };
    for (const r of rows) {
      const pid = r.id;
      const pname = r.productName || '';
      const sname = r.supplierName || '';
      pushRef(toUploadName(r.imageUrl || ''), pid, pname, sname, '主图');
      for (const col of ['files', 'images'] as const) {
        const raw = r[col];
        if (!raw) continue;
        try {
          const arr = JSON.parse(raw);
          if (!Array.isArray(arr)) continue;
          const role = col === 'files' ? '资料文件' : '商品图片';
          for (const item of arr) {
            if (typeof item === 'string') pushRef(toUploadName(item), pid, pname, sname, role);
            else if (item && typeof item === 'object') {
              pushRef(toUploadName((item as { url?: string }).url || ''), pid, pname, sname, role);
            }
          }
        } catch {
          /* 忽略坏 JSON */
        }
      }
    }
    return refMap;
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

  /** 生成「搬家工具箱」：文件清单 + 业务数据 CSV + 说明文档（zip 内容项） */
  async exportFullBundle(): Promise<{ name: string; content: string }[]> {
    const out: { name: string; content: string }[] = [];
    const [products, keys, refMap] = await Promise.all([
      this.db.select().from(supplierProducts),
      this.db.select().from(supplierKeys),
      this.getRefMap(),
    ]);
    const custRows = await this.db.select().from(customers);

    // 2. 扫描磁盘文件（uploads 主目录 + public 子目录 + 回收站）
    const diskFiles: { name: string; rel: string; size: number; mtime: number; inTrash: boolean }[] = [];
    const walk = (dir: string, prefix: string, inTrash: boolean) => {
      let entries: string[] = [];
      try { entries = fs.readdirSync(dir); } catch { return; }
      for (const name of entries) {
        if (name.startsWith('.')) continue;
        const fp = path.join(dir, name);
        let st;
        try { st = fs.statSync(fp); } catch { continue; }
        if (st.isDirectory()) { walk(fp, prefix + name + '/', inTrash); continue; }
        diskFiles.push({ name, rel: prefix + name, size: st.size, mtime: st.mtimeMs, inTrash });
      }
    };
    walk(UPLOAD_DIR, '', false);
    walk(TRASH_DIR, '回收站/', true);

    // 3. 文件清单 CSV
    const typeOf = (n: string): string => {
      const ext = path.extname(n).toLowerCase().replace('.', '');
      if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext)) return '图片';
      if (['pdf'].includes(ext)) return 'PDF';
      if (['xls', 'xlsx', 'csv'].includes(ext)) return 'Excel';
      if (['doc', 'docx'].includes(ext)) return 'Word';
      if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return '压缩包';
      return '其他';
    };
    const fmt = (t: number): string => {
      const d = new Date(t);
      const p = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
    };
    const manifestHeader = ['文件名', '相对路径', '类型', '大小(B)', '上传时间', '引用角色', '引用商品', '引用供应商', '商品ID', '状态'];
    const manifestRows: (string | number)[][] = diskFiles
      .sort((a, b) => b.mtime - a.mtime)
      .map((f): (string | number)[][] => {
        const refs = refMap.get(f.name) || [];
        if (refs.length === 0) {
          return [[f.name, f.rel, typeOf(f.name), f.size, fmt(f.mtime), '', '', '', '', f.inTrash ? '回收站' : '未引用(孤儿)']];
        }
        return refs.map((r): (string | number)[] => [f.name, f.rel, typeOf(f.name), f.size, fmt(f.mtime), r.role, r.productName, r.supplierName, r.productId, f.inTrash ? '回收站(仍被引用)' : '已引用']);
      })
      .flat();
    out.push({ name: '1-文件清单.csv', content: [manifestHeader, ...manifestRows].map((r) => r.map(csvCell).join(',')).join('\n') });

    // 4. 商品 CSV
    const productHeader = ['商品ID', '商品名称', '供应商', '分类', '价格', '单位', '规格/型号', '商品链接', '备注', '联系人', '电话', '微信', '地址', '主营类目', '状态', '驳回原因', '提交密钥', '创建时间'];
    const productRows = products.map((r) => [
      r.id, r.productName || '', r.supplierName || '', r.category || '', r.price || '', r.unit || '',
      r.spec || '', r.productUrl || '', r.remark || '', r.contactName || '', r.contactPhone || '',
      r.wechat || '', r.address || '', r.mainCategory || '', r.status || '', r.rejectReason || '',
      r.submitKey || '', r.createdAt ? fmt(new Date(r.createdAt).getTime()) : '',
    ]);
    out.push({ name: '2-商品.csv', content: [productHeader, ...productRows].map((r) => r.map(csvCell).join(',')).join('\n') });

    // 5. 供应商 CSV（按供应商聚合）
    const supMap = new Map<string, { supplierName: string; contactName: string; contactPhone: string; wechat: string; address: string; mainCategory: string; productCount: number; approvedCount: number; pendingCount: number; firstAt: string; lastAt: string }>();
    for (const r of products) {
      const n = r.supplierName || '未知供应商';
      let s = supMap.get(n);
      if (!s) {
        s = { supplierName: n, contactName: r.contactName || '', contactPhone: r.contactPhone || '', wechat: r.wechat || '', address: r.address || '', mainCategory: r.mainCategory || '', productCount: 0, approvedCount: 0, pendingCount: 0, firstAt: '', lastAt: '' };
        supMap.set(n, s);
      }
      s.productCount++;
      if (r.status === 'approved') s.approvedCount++;
      if (r.status === 'pending' || r.status === 'rejected') s.pendingCount++;
      const t = r.createdAt ? new Date(r.createdAt).getTime() : 0;
      if (t) {
        if (!s.firstAt || t < new Date(s.firstAt).getTime()) s.firstAt = fmt(t);
        if (!s.lastAt || t > new Date(s.lastAt).getTime()) s.lastAt = fmt(t);
      }
      if (r.contactName) s.contactName = r.contactName;
      if (r.contactPhone) s.contactPhone = r.contactPhone;
      if (r.wechat) s.wechat = r.wechat;
      if (r.address) s.address = r.address;
      if (r.mainCategory) s.mainCategory = r.mainCategory;
    }
    const supHeader = ['供应商名称', '联系人', '电话', '微信', '地址', '主营类目', '商品总数', '已通过', '待审核/驳回', '首次提交', '最近提交'];
    const supRows = [...supMap.values()].sort((a, b) => b.productCount - a.productCount).map((s) => [
      s.supplierName, s.contactName, s.contactPhone, s.wechat, s.address, s.mainCategory,
      s.productCount, s.approvedCount, s.pendingCount, s.firstAt, s.lastAt,
    ]);
    out.push({ name: '3-供应商.csv', content: [supHeader, ...supRows].map((r) => r.map(csvCell).join(',')).join('\n') });

    // 6. 客户 CSV
    const custHeader = ['客户ID', '姓名', '手机号', '公司', '来源', '阶段', '备注', '负责人ID', '创建时间', '更新时间'];
    const stageNames: Record<string, string> = {
      new: '新客户', contacted: '已联系', following: '跟进中', quoted: '已报价', negotiating: '谈判中',
      won: '已成交', lost: '已流失', invalid: '无效客户', duplicate: '重复客户',
    };
    const custRowsOut = custRows.map((c) => [
      c.id, c.name || '', c.phone || '', c.company || '', c.source || '', stageNames[c.stage || 'new'] || c.stage || '',
      c.remark || '', c.employeeId || '', c.createdAt ? fmt(new Date(c.createdAt).getTime()) : '',
      c.updatedAt ? fmt(new Date(c.updatedAt).getTime()) : '',
    ]);
    out.push({ name: '4-客户.csv', content: [custHeader, ...custRowsOut].map((r) => r.map(csvCell).join(',')).join('\n') });

    // 7. 供应商密钥 CSV
    const keyHeader = ['密钥ID', '密钥', '备注名称', '是否启用', '创建时间'];
    const keyRows = keys.map((k) => [k.id, k.key, k.label || '', k.enabled ? '启用' : '停用', k.createdAt ? fmt(new Date(k.createdAt).getTime()) : '']);
    out.push({ name: '5-供应商密钥.csv', content: [keyHeader, ...keyRows].map((r) => r.map(csvCell).join(',')).join('\n') });

    // 8. README 说明
    const readme = [
      '汇盈聚金 CRM 搬家工具箱',
      '生成时间：' + fmt(Date.now()),
      '',
      '本压缩包包含以下文件：',
      '  1-文件清单.csv —— uploads 目录下所有文件（含回收站）与业务引用的对应关系，',
      '     每行含：文件名、类型、大小、上传时间、被哪个商品的哪个字段引用。',
      '     状态列：已引用 = 数据库正引用（搬过去必须保留）；未引用(孤儿) = 无引用；回收站 = 已删除状态。',
      '  2-商品.csv    —— 供应商商品库全部商品（供应商/价格/规格/链接/状态等）。',
      '  3-供应商.csv  —— 按供应商聚合的档案（联系人/电话/微信/地址/商品数）。',
      '  4-客户.csv    —— CRM 客户列表全部客户（姓名/电话/公司/来源/阶段/备注）。',
      '  5-供应商密钥.csv —— 供应商入驻密钥（key + 备注名 + 启用状态）。',
      '',
      '搬迁步骤（换新系统/新服务器时）：',
      '  1. 把 uploads 目录原样复制到新环境（保持 文件名 不变，否则引用失效）。',
      '  2. 按 1-文件清单.csv 核对文件与商品对应关系。',
      '  3. 把 2/3/4/5 号 CSV 导入新系统（Excel 可直接打开，UTF-8 编码）。',
      '  4. 文件名均为服务器落盘名（时间戳-随机串），原始上传文件名未做持久化，',
      '     如需识别用途请参照「引用商品」列。',
      '',
      '注意：本文件由系统自动生成，勿手工改动后回传，以免造成数据错误。',
    ].join('\n');
    out.push({ name: 'README-搬家说明.txt', content: readme });

    return out;
  }
}

function csvCell(v: unknown): string {
  const s = v == null ? '' : String(v);
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}
