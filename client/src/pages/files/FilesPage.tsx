import { useEffect, useState, useCallback } from 'react';
import { FolderOpen, Trash2, Search, Download, RotateCcw, X, FileText, Archive, Paperclip } from 'lucide-react';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';

interface FileItem {
  name: string;
  size: number;
  mtime: number;
}

function getType(name: string): 'image' | 'doc' | 'archive' | 'other' {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (['jpg','jpeg','png','gif','webp','svg','bmp'].includes(ext)) return 'image';
  if (['pdf','doc','docx','xls','xlsx','ppt','pptx','txt','csv'].includes(ext)) return 'doc';
  if (['zip','rar','7z','tar','gz'].includes(ext)) return 'archive';
  return 'other';
}

function fmtSize(b: number): string {
  if (b < 1024) return b + 'B';
  if (b < 1048576) return (b/1024).toFixed(1) + 'KB';
  return (b/1048576).toFixed(1) + 'MB';
}

export default function FilesPage() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [trash, setTrash] = useState(false);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('');

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

  const filtered = files.filter(f => {
    if (q && !f.name.toLowerCase().includes(q.toLowerCase())) return false;
    if (filter && getType(f.name) !== filter) return false;
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto">
      {/* 标题栏 */}
      <div className="bg-gradient-to-r from-amber-600 to-amber-700 rounded-2xl p-5 mb-4 text-white">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <FolderOpen className="w-6 h-6" /> 文件管理
        </h1>
        <p className="text-sm opacity-90 mt-1">搜索、预览、清理服务器文件 · 回收站保留7天</p>
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
      </div>

      {trash && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3 text-sm text-amber-800">
          回收站文件保留7天，过期自动彻底删除
        </div>
      )}

      <div className="text-sm text-gray-500 mb-2">共 {filtered.length} 个文件</div>

      {/* 文件网格 */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">加载中...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FolderOpen className="w-16 h-16 mx-auto mb-3 text-gray-300" />
          暂无文件
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filtered.map(f => {
            const t = getType(f.name);
            return (
              <div key={f.name} className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100">
                <div className="aspect-[4/3] bg-gray-50 flex items-center justify-center overflow-hidden">
                  {t === 'image' ? (
                    <img
                      src={'/uploads/' + encodeURIComponent(f.name)}
                      loading="lazy"
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() => window.open('/uploads/' + encodeURIComponent(f.name))}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : t === 'doc' ? (
                    <FileText className="w-10 h-10 text-gray-300" />
                  ) : t === 'archive' ? (
                    <Archive className="w-10 h-10 text-gray-300" />
                  ) : (
                    <Paperclip className="w-10 h-10 text-gray-300" />
                  )}
                </div>
                <div className="p-2.5">
                  <div className="text-xs font-medium truncate" title={f.name}>{f.name}</div>
                  <div className="text-[11px] text-gray-400 mt-0.5">{fmtSize(f.size)}</div>
                </div>
                <div className="flex gap-1 px-2.5 pb-2.5 flex-wrap">
                  {!trash && (
                    <>
                      <a
                        href={'/uploads/' + encodeURIComponent(f.name)}
                        target="_blank"
                        className="flex items-center gap-1 px-2 py-1 text-[11px] bg-blue-50 text-blue-600 rounded"
                      >
                        <Download className="w-3 h-3" /> 下载
                      </a>
                      <button
                        onClick={() => del(f.name)}
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
      )}
    </div>
  );
}
