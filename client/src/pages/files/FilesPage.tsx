import { useEffect, useState, useCallback } from 'react';
import { FolderOpen, Trash2, Search, Download, RotateCcw, X, CheckSquare, Square } from 'lucide-react';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';

interface FileRef {
  productName: string;
  supplierName: string;
  role: string;
}

interface FileItem {
  name: string;
  rel: string;
  size: number;
  mtime: number;
  refs?: FileRef[];
}

function getType(name: string): 'image' | 'doc' | 'archive' | 'other' {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (['jpg','jpeg','png','gif','webp','svg','bmp'].includes(ext)) return 'image';
  if (['pdf','doc','docx','xls','xlsx','ppt','pptx','txt','csv'].includes(ext)) return 'doc';
  if (['zip','rar','7z','tar','gz'].includes(ext)) return 'archive';
  return 'other';
}

/** 按文件类型返回彩色图标（白底 + 类型色折角 + 类型徽标，识别不出用通用图标） */
function FileTypeIcon({ name }: { name: string }) {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  let color = '#9AA0A6';
  let label = 'FILE';
  if (ext === 'pdf') { color = '#E5484D'; label = 'PDF'; }
  else if (['xls', 'xlsx'].includes(ext)) { color = '#1E8E5A'; label = 'XLS'; }
  else if (ext === 'csv') { color = '#30A46C'; label = 'CSV'; }
  else if (['doc', 'docx'].includes(ext)) { color = '#2B5FBF'; label = 'DOC'; }
  else if (['ppt', 'pptx'].includes(ext)) { color = '#E8710A'; label = 'PPT'; }
  else if (ext === 'zip') { color = '#D97706'; label = 'ZIP'; }
  else if (ext === 'rar') { color = '#7C3AED'; label = 'RAR'; }
  else if (['7z', 'tar', 'gz'].includes(ext)) { color = '#B45309'; label = 'ZIP'; }
  else if (['txt', 'md', 'log'].includes(ext)) { color = '#5B8DEF'; label = 'TXT'; }
  return (
    <svg viewBox="0 0 48 56" className="w-10 h-10 shrink-0" fill="none">
      <path d="M10 1C5.6 1 2 4.6 2 9v38c0 4.4 3.6 8 8 8h28c4.4 0 8-3.6 8-8V15L31 1H10z" fill="#FFFFFF" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M31 1v10c0 2.2 1.8 4 4 4h11" fill={color} stroke={color} strokeLinejoin="round" />
      <text x="24" y="30" textAnchor="middle" fontSize="13" fontWeight="700" fill={color} fontFamily="Arial, sans-serif">{label}</text>
      <rect x="10" y="38" width="28" height="2.5" rx="1.25" fill="#E5E7EB" />
      <rect x="10" y="44" width="19" height="2.5" rx="1.25" fill="#E5E7EB" />
    </svg>
  );
}

function fmtSize(b: number): string {
  if (b < 1024) return b + 'B';
  if (b < 1048576) return (b/1024).toFixed(1) + 'KB';
  return (b/1048576).toFixed(1) + 'MB';
}

const PAGE_SIZE = 30;

interface DiskUsage {
  files: number;
  sizeBytes: number;
  trashFiles: number;
  trashSizeBytes: number;
  totalBytes: number | null;
}

export default function FilesPage() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [trash, setTrash] = useState(false);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('');
  const [timeFilter, setTimeFilter] = useState('');
  const [sizeFilter, setSizeFilter] = useState('');
  const [unrefOnly, setUnrefOnly] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [usage, setUsage] = useState<DiskUsage | null>(null);

  // 搜索/筛选/回收站切换时回到第1页并清空选择
  useEffect(() => { setPage(1); setSelected([]); }, [q, filter, trash, timeFilter, sizeFilter, unrefOnly]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axiosForBackend.get('/api/files/list?trash=' + (trash ? 1 : 0));
      setFiles(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [trash]);

  useEffect(() => { load(); }, [load]);

  // 磁盘用量（含回收站占用）
  useEffect(() => {
    let alive = true;
    axiosForBackend.get('/api/files/usage').then(({ data }) => {
      if (alive && data) setUsage(data as DiskUsage);
    }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const del = async (name: string) => {
    if (!confirm(`删除 ${name}？移入回收站保留7天`)) return;
    await axiosForBackend.post('/api/files/delete', { name });
    load();
  };
  const restore = async (name: string) => {
    await axiosForBackend.post('/api/files/restore', { name });
    load();
  };
  const perm = async (name: string) => {
    if (!confirm(`彻底删除 ${name}？不可恢复！`)) return;
    await axiosForBackend.post('/api/files/permanent', { name });
    load();
  };

  /** 批量删除（移入回收站） */
  const batchDelete = async () => {
    if (selected.length === 0) return;
    if (!confirm(`批量删除 ${selected.length} 个文件？移入回收站保留7天`)) return;
    const { data } = await axiosForBackend.post('/api/files/batch-delete', { names: selected });
    const res = data as { ok: number; failed: number; errors?: string[] };
    setSelected([]);
    load();
    if (res.ok > 0) {
      alert(`已删除 ${res.ok} 个文件${res.failed > 0 ? `，${res.failed} 个失败` : ''}`);
    } else {
      alert(`删除失败：${res.errors?.join('；') ?? '未知错误'}`);
    }
  };

  const toggleSelect = (rel: string) => {
    setSelected((prev) => (prev.includes(rel) ? prev.filter((x) => x !== rel) : [...prev, rel]));
  };

  const filtered = files.filter(f => {
    if (q && !f.name.toLowerCase().includes(q.toLowerCase())) return false;
    if (filter && getType(f.name) !== filter) return false;
    if (unrefOnly && f.refs && f.refs.length > 0) return false;
    // 上传时间筛选（mtime 毫秒）
    if (timeFilter) {
      const now = Date.now();
      const day = 24 * 60 * 60 * 1000;
      if (timeFilter === 'today') {
        const start = new Date(); start.setHours(0, 0, 0, 0);
        if (f.mtime < start.getTime()) return false;
      } else if (timeFilter === '7d' && f.mtime < now - 7 * day) return false;
      else if (timeFilter === '30d' && f.mtime < now - 30 * day) return false;
      else if (timeFilter === '90d' && f.mtime < now - 90 * day) return false;
    }
    // 文件大小筛选（字节）
    if (sizeFilter) {
      const MB = 1024 * 1024;
      const s = f.size;
      if (sizeFilter === 'lt1' && s >= MB) return false;
      else if (sizeFilter === '1to10' && (s < MB || s >= 10 * MB)) return false;
      else if (sizeFilter === '10to50' && (s < 10 * MB || s >= 50 * MB)) return false;
      else if (sizeFilter === '50to100' && (s < 50 * MB || s >= 100 * MB)) return false;
      else if (sizeFilter === 'gt100' && s < 100 * MB) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const curPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((curPage - 1) * PAGE_SIZE, curPage * PAGE_SIZE);

  return (
    <div className="max-w-6xl mx-auto">
      {/* 标题栏 */}
      <div className="bg-gradient-to-r from-amber-600 to-amber-700 rounded-2xl p-5 mb-4 text-white">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <FolderOpen className="w-6 h-6" /> 文件管理
        </h1>
        <p className="text-sm opacity-90 mt-1">搜索、预览、清理服务器文件 · 回收站保留7天 · 供应商表单页未提交的文件将自动清理，不占用服务器空间</p>
        {usage && (
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[13px]">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-white/90" />
              已用 <b>{fmtSize(usage.sizeBytes)}</b>（{usage.files} 个文件）
            </span>
            {usage.totalBytes ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-white/90" />
                云盘容量 <b>{fmtSize(usage.totalBytes)}</b>
                <span className="opacity-80">（{((usage.sizeBytes + usage.trashSizeBytes) / usage.totalBytes * 100).toFixed(1)}%）</span>
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-white/90" />
              回收站 <b>{fmtSize(usage.trashSizeBytes)}</b>（{usage.trashFiles} 个）
            </span>
          </div>
        )}
      </div>

      {/* 工具栏 */}
      <div className="bg-white rounded-xl p-3 mb-3 flex flex-wrap gap-2 items-center shadow-sm">
        <button
          onClick={() => setTrash(false)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${!trash ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-700'}`}
        >
          全部文件
        </button>
        <button
          onClick={() => setTrash(true)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${trash ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-700'}`}
        >
          <Trash2 className="w-4 h-4" /> 回收站
        </button>
        <div className="relative flex-1 min-w-[150px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="搜索文件名..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-amber-500"
          />
        </div>
        <select
          value={timeFilter}
          onChange={e => setTimeFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none bg-white"
        >
          <option value="">全部时间</option>
          <option value="today">今天</option>
          <option value="7d">最近 7 天</option>
          <option value="30d">最近 30 天</option>
          <option value="90d">最近 90 天</option>
        </select>
        <select
          value={sizeFilter}
          onChange={e => setSizeFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none bg-white"
        >
          <option value="">全部大小</option>
          <option value="lt1">&lt; 1MB</option>
          <option value="1to10">1 - 10MB</option>
          <option value="10to50">10 - 50MB</option>
          <option value="50to100">50 - 100MB</option>
          <option value="gt100">&gt; 100MB</option>
        </select>
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none"
        >
          <option value="">全部类型</option>
          <option value="image">图片</option>
          <option value="doc">文档</option>
          <option value="archive">压缩包</option>
          <option value="other">其他</option>
        </select>
        <button
          onClick={() => setUnrefOnly(prev => !prev)}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            unrefOnly
              ? 'bg-amber-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          title="仅显示未被任何商品/供应商引用的文件"
        >
          仅看未引用
        </button>
      </div>

      {trash && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3 text-sm text-amber-800">
          回收站文件保留7天，过期自动彻底删除
        </div>
      )}

      <div className="text-sm text-gray-500 mb-2 flex flex-wrap items-center gap-3">
        <span>共 {filtered.length} 个文件</span>
        {unrefOnly && !trash && (
          <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-0.5">
            仅显示未引用文件
          </span>
        )}
      </div>

      {/* 批量操作条 */}
      {!trash && selected.length > 0 && (
        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 px-3 py-2 mb-2 bg-amber-50 border border-amber-200 rounded-lg">
          <span className="text-sm font-medium text-amber-800">
            已选 {selected.length} 个文件
          </span>
          <button
            onClick={batchDelete}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium text-white bg-red-600 hover:bg-red-700 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" /> 批量删除
          </button>
          <button
            onClick={() => setSelected([])}
            className="ml-auto inline-flex items-center gap-1 px-2 py-1 text-[12px] text-amber-800 hover:text-amber-950 transition-colors"
          >
            <X className="w-3.5 h-3.5" /> 取消选择
          </button>
        </div>
      )}

      {/* 文件网格 */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">加载中...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FolderOpen className="w-16 h-16 mx-auto mb-3 text-gray-300" />
          暂无文件
        </div>
      ) : (
        <>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {pageItems.map(f => {
            const t = getType(f.name);
            const isSelected = selected.includes(f.rel);
            return (
              <div
                key={f.name}
                className={`bg-white rounded-xl overflow-hidden shadow-sm border transition-colors ${
                  isSelected ? 'border-amber-500 ring-2 ring-amber-200' : 'border-gray-100'
                }`}
              >
                <div className="relative">
                  {!trash && (
                    <button
                      type="button"
                      onClick={() => toggleSelect(f.rel)}
                      className={`absolute top-2 left-2 z-10 p-1 rounded-md bg-white/90 shadow-sm transition-colors ${
                        isSelected ? 'text-amber-600' : 'text-gray-400 hover:text-amber-600'
                      }`}
                      aria-label={isSelected ? '取消选择' : '选择'}
                    >
                      {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    </button>
                  )}
                  <div className="aspect-[4/3] bg-gray-50 flex items-center justify-center overflow-hidden">
                    {t === 'image' ? (
                      <img
                        src={'/uploads/' + encodeURIComponent(f.rel)}
                        loading="lazy"
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() => window.open('/uploads/' + encodeURIComponent(f.rel))}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <FileTypeIcon name={f.name} />
                    )}
                  </div>
                </div>
                <div className="p-2.5">
                  <div className="text-xs font-medium truncate" title={f.name}>{f.name}</div>
                  <div className="text-[11px] text-gray-400 mt-0.5">{fmtSize(f.size)}</div>
                  {/* 用途标签：被哪个商品/供应商引用 */}
                  <div className="mt-1.5 flex flex-col gap-0.5">
                    {f.refs && f.refs.length > 0 ? (
                      <>
                        {f.refs.slice(0, 2).map((r, i) => (
                          <div
                            key={i}
                            className="text-[11px] leading-snug text-amber-800 bg-amber-50 border border-amber-100 rounded px-1.5 py-0.5 truncate"
                            title={`${r.role} · ${r.productName}（${r.supplierName}）`}
                          >
                            {r.role}·{r.productName}（{r.supplierName}）
                          </div>
                        ))}
                        {f.refs.length > 2 && (
                          <div className="text-[11px] text-gray-400">+{f.refs.length - 2} 处引用</div>
                        )}
                      </>
                    ) : (
                      <div className="text-[11px] text-gray-400">未引用</div>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 px-2.5 pb-2.5 flex-wrap">
                  {!trash && (
                    <>
                      <a
                        href={'/uploads/' + encodeURIComponent(f.rel)}
                        target="_blank"
                        className="flex items-center gap-1 px-2 py-1 text-[11px] bg-blue-50 text-blue-600 rounded"
                      >
                        <Download className="w-3 h-3" /> 下载
                      </a>
                      <button
                        onClick={() => del(f.rel)}
                        className="flex items-center gap-1 px-2 py-1 text-[11px] bg-red-50 text-red-600 rounded"
                      >
                        <Trash2 className="w-3 h-3" /> 删除
                      </button>
                    </>
                  )}
                  {trash && (
                    <>
                      <button
                        onClick={() => restore(f.name)}
                        className="flex items-center gap-1 px-2 py-1 text-[11px] bg-green-50 text-green-600 rounded"
                      >
                        <RotateCcw className="w-3 h-3" /> 恢复
                      </button>
                      <button
                        onClick={() => perm(f.name)}
                        className="flex items-center gap-1 px-2 py-1 text-[11px] bg-gray-800 text-white rounded"
                      >
                        <X className="w-3 h-3" /> 彻底删
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {/* 分页 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <button
              onClick={() => setPage(Math.max(1, curPage - 1))}
              disabled={curPage <= 1}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-700 disabled:opacity-40"
            >
              上一页
            </button>
            <span className="text-sm text-gray-500">
              第 {curPage} / {totalPages} 页
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, curPage + 1))}
              disabled={curPage >= totalPages}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-700 disabled:opacity-40"
            >
              下一页
            </button>
          </div>
        )}
        </>
      )}
    </div>
  );
}
