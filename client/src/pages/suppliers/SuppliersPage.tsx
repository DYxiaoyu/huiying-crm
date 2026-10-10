import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  FileUp,
  Package,
  Store,
  Tag,
  Ruler,
  Phone,
  ExternalLink,
  Paperclip,
  Check,
  XCircle,
  FileText,
  Clock,
  Globe,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';

import { Button } from '@/components/ui/button';
import { PageJump } from '@/components/PageJump';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from '@/components/ui/empty';

import * as suppliersApi from '@/api/suppliers';
import { csvToObjects } from '@/utils/csv';
import { SupplierDialog } from './SupplierDialog';
import type { SupplierProduct, SupplierStatus, SupplierFile } from '@shared/api.interface';

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'updatedAt-desc', label: '按更新时间' },
  { value: 'createdAt-desc', label: '按创建时间' },
  { value: 'productName-asc', label: '按商品名称' },
];

const STATUS_OPTIONS: { value: SupplierStatus | ''; label: string }[] = [
  { value: '', label: '全部状态' },
  { value: 'pending', label: '待审核' },
  { value: 'approved', label: '已通过' },
  { value: 'rejected', label: '已驳回' },
];

const SOURCE_OPTIONS: { value: 'form' | 'admin' | ''; label: string }[] = [
  { value: '', label: '全部来源' },
  { value: 'admin', label: '后台添加' },
  { value: 'form', label: '供应商表单提交' },
];

const STATUS_STYLE: Record<SupplierStatus, { label: string; cls: string }> = {
  pending: { label: '待审核', cls: 'bg-amber-500/90 text-white' },
  approved: { label: '已通过', cls: 'bg-emerald-500/90 text-white' },
  rejected: { label: '已驳回', cls: 'bg-rose-500/90 text-white' },
};

const SuppliersPage = () => {
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<SupplierStatus | ''>('');
  const [sourceFilter, setSourceFilter] = useState<'form' | 'admin' | ''>('');
  const [sortValue, setSortValue] = useState('updatedAt-desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [items, setItems] = useState<SupplierProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [supplierCount, setSupplierCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<SupplierProduct | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchApproving, setBatchApproving] = useState(false);

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingProduct, setRejectingProduct] = useState<SupplierProduct | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const [filesDialogOpen, setFilesDialogOpen] = useState(false);
  const [filesOfProduct, setFilesOfProduct] = useState<{ name: string; files: SupplierFile[] } | null>(null);

  // 图片灯箱
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // PDF 在线预览
  const [previewPdf, setPreviewPdf] = useState<SupplierFile | null>(null);

  const openLightbox = (images: string[], startIdx = 0) => {
    setLightboxImages(images);
    setLightboxIndex(startIdx);
    setLightboxOpen(true);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { sortBy, sortOrder } = useMemo(() => {
    const [by, order] = sortValue.split('-');
    return {
      sortBy: by as 'updatedAt' | 'createdAt' | 'productName',
      sortOrder: order as 'asc' | 'desc',
    };
  }, [sortValue]);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await suppliersApi.getList({
        page,
        pageSize,
        keyword: keyword || undefined,
        category: category || undefined,
        status: statusFilter || undefined,
        source: sourceFilter || undefined,
        sortBy,
        sortOrder,
      });
      setItems(res.items);
      setTotal(res.total);
      setSupplierCount(res.supplierCount);
    } catch (error) {
      logger.error('加载供应商商品列表失败', error as Error);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, keyword, category, statusFilter, sourceFilter, sortBy, sortOrder]);

  const fetchCategories = useCallback(async () => {
    try {
      const list = await suppliersApi.getCategories();
      setCategories(list);
    } catch (error) {
      logger.error('加载分类失败', error as Error);
    }
  }, []);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  useEffect(() => {
    void fetchCategories();
  }, [fetchCategories]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total]);

  const handleAdd = () => {
    setEditingProduct(null);
    setDialogOpen(true);
  };

  const handleEdit = (product: SupplierProduct) => {
    setEditingProduct(product);
    setDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;
    setDeleting(true);
    try {
      await suppliersApi.remove(deletingId);
      setDeleteDialogOpen(false);
      setDeletingId(null);
      if (items.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        void fetchList();
      }
      toast.success('商品已删除');
    } catch (error) {
      logger.error('删除商品失败', error as Error);
    } finally {
      setDeleting(false);
    }
  };

  const handleApprove = async (id: string) => {
    setApprovingId(id);
    try {
      await suppliersApi.approve(id);
      toast.success('已通过，商品已上架');
      void fetchList();
    } catch (error) {
      logger.error('审核通过失败', error as Error);
      toast.error('操作失败，请重试');
    } finally {
      setApprovingId(null);
    }
  };

  const handleBatchApprove = async () => {
    if (selectedIds.length === 0) return;
    setBatchApproving(true);
    let ok = 0;
    for (const id of selectedIds) {
      try {
        await suppliersApi.approve(id);
        ok++;
      } catch (e) {
        logger.error('批量通过失败', e as Error);
      }
    }
    setBatchApproving(false);
    setSelectedIds([]);
    toast.success(`已通过 ${ok} 件商品`);
    void fetchList();
  };

  const handleRejectClick = (product: SupplierProduct) => {
    setRejectingProduct(product);
    setRejectReason('');
    setRejectDialogOpen(true);
  };

  /** 下载供应商商品导入模板 */
  const handleDownloadTemplate = () => {
    suppliersApi.downloadTemplate().catch(() => {
      toast.error('模板下载失败，请重试');
    });
  };

  /** 导出当前筛选条件下的供应商商品 */
  const handleExportCsv = () => {
    suppliersApi.downloadCsv({
      keyword,
      category: category && category !== 'all' ? category : undefined,
      status: statusFilter && statusFilter !== 'all' ? statusFilter : undefined,
      source: sourceFilter && sourceFilter !== 'all' ? sourceFilter : undefined,
    }).catch(() => {
      toast.error('导出失败，请重试');
    });
  };

  const handleRejectConfirm = async () => {    if (!rejectingProduct) return;
    if (!rejectReason.trim()) {
      toast.error('请填写驳回理由');
      return;
    }
    setRejecting(true);
    try {
      await suppliersApi.reject(rejectingProduct.id, rejectReason.trim());
      setRejectDialogOpen(false);
      toast.success('已驳回');
      void fetchList();
    } catch (error) {
      logger.error('审核驳回失败', error as Error);
      toast.error('操作失败，请重试');
    } finally {
      setRejecting(false);
    }
  };

  const handleImportFile = async (file: File) => {
    if (!file) return;
    if (!/\.csv$/i.test(file.name)) {
      toast.error('请选择 .csv 文件');
      return;
    }
    setImporting(true);
    try {
      const text = await file.text();
      const rows = csvToObjects(text);
      if (rows.length === 0) {
        toast.error('未识别到数据，请确认表头包含"商品名称"和"供应商名称"');
        return;
      }
      const items = rows.map((r) => ({
        productName: r.productName ?? '',
        supplierName: r.supplierName ?? '',
        category: r.category || undefined,
        price: r.price || undefined,
        unit: r.unit || undefined,
        spec: r.spec || undefined,
        remark: r.remark || undefined,
      }));
      const res = await suppliersApi.importItems(items);
      const failed = res.errors?.length ?? 0;
      if (res.imported > 0 || res.skipped > 0) {
        const detail = failed > 0 ? `，失败 ${failed} 条` : '';
        toast.success(`导入成功 ${res.imported} 条 / 跳过 ${res.skipped} 条${detail}`);
        if (failed > 0) {
          toast.error(`失败明细：${res.errors!.slice(0, 3).join('；')}${failed > 3 ? ` 等 ${failed} 条` : ''}`);
        }
        void fetchList();
        void fetchCategories();
        setPage(1);
      } else {
        toast.error(`没有可导入的数据${res.errors.length ? `（${res.errors.slice(0, 3).join('；')}${res.errors.length > 3 ? ` 等 ${res.errors.length} 条` : ''}）` : ''}`);
      }
    } catch (error) {
      logger.error('导入供应商商品失败', error as Error);
      toast.error('导入失败，请检查文件格式');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePrevPage = () => {
    if (page > 1) setPage(page - 1);
  };

  const handleNextPage = () => {
    if (page < totalPages) setPage(page + 1);
  };

  return (
    <div className="p-6 flex flex-col gap-6">
      {/* 页面横幅 */}
      <div
        className="relative overflow-hidden rounded-2xl px-6 py-5 text-white shadow-lg"
        style={{
          background: 'linear-gradient(120deg, #B45309 0%, #D97706 45%, #F59E0B 100%)',
          boxShadow: '0 8px 24px rgba(180,83,9,0.25)',
        }}
      >
        <div
          className="absolute -right-8 -top-10 size-36 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #ffffff 0%, transparent 70%)' }}
        />
        <div
          className="absolute right-24 -bottom-12 size-28 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #ffffff 0%, transparent 70%)' }}
        />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-wide">供应商商品库</h1>
            <p className="mt-1 text-[13px] text-white/80">
              共 {total} 件商品 · {supplierCount} 家供应商 · 商品信息一目了然
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadTemplate}
              data-ai-section-type="button"
              className="inline-flex items-center gap-2 px-[14px] py-2 rounded-lg bg-white/15 border border-white/25 text-white text-sm font-medium backdrop-blur hover:bg-white/25 transition-all"
            >
              <FileText className="size-4" />
              <span>下载模板</span>
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              data-ai-section-type="button"
              className="inline-flex items-center gap-2 px-[14px] py-2 rounded-lg bg-white/15 border border-white/25 text-white text-sm font-medium backdrop-blur hover:bg-white/25 transition-all"
            >
              <Download className="size-4" />
              <span>导出 CSV</span>
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              data-ai-section-type="button"
              className="inline-flex items-center gap-2 px-[14px] py-2 rounded-lg bg-white/15 border border-white/25 text-white text-sm font-medium backdrop-blur hover:bg-white/25 transition-all disabled:opacity-60"
            >
              <FileUp className="size-4" />
              <span>{importing ? '导入中...' : '导入 CSV'}</span>
            </button>
            <button
              type="button"
              onClick={handleAdd}
              data-ai-section-type="button"
              className="inline-flex items-center gap-2 px-[16px] py-2 rounded-lg bg-white text-[#B45309] text-sm font-semibold shadow-md hover:shadow-lg hover:-translate-y-px transition-all"
            >
              <Plus className="size-4" />
              <span>新增商品</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleImportFile(file);
              }}
            />
          </div>
        </div>
      </div>

      {/* 工具栏 */}
      <div
        className="flex flex-wrap items-center gap-3 p-4 bg-white rounded-xl border border-[#E4E7EC] shadow-sm"
        data-ai-section-type="button"
      >
        <div className="flex-1 min-w-[220px] flex items-center gap-2 px-3 py-2 rounded-lg border border-[#E4E7EC] bg-white">
          <Search className="size-4 text-[#98A2B3] shrink-0" />
          <input
            type="text"
            placeholder="搜索商品 / 供应商 / 规格"
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value);
              setPage(1);
            }}
            className="flex-1 border-none outline-none bg-transparent text-sm text-[#1D2733] placeholder:text-[#98A2B3]"
          />
        </div>

        <div className="shrink-0">
          <Select
            value={category}
            onValueChange={(v) => {
              setCategory(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="min-w-[130px] h-9 px-3 rounded-lg border border-[#E4E7EC] bg-white text-sm text-[#1D2733]">
              <SelectValue placeholder="全部分类" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">全部分类</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="shrink-0">
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as SupplierStatus | ''); setPage(1); }}>
            <SelectTrigger className="min-w-[130px] h-9 px-3 rounded-lg border border-[#E4E7EC] bg-white text-sm text-[#1D2733]">
              <SelectValue placeholder="全部状态" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="shrink-0">
          <Select value={sourceFilter} onValueChange={(v) => { setSourceFilter(v as 'form' | 'admin' | ''); setPage(1); }}>
            <SelectTrigger className="min-w-[150px] h-9 px-3 rounded-lg border border-[#E4E7EC] bg-white text-sm text-[#1D2733]">
              <SelectValue placeholder="全部来源" />
            </SelectTrigger>
            <SelectContent>
              {SOURCE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="shrink-0">
          <Select value={sortValue} onValueChange={(v) => { setSortValue(v); setPage(1); }}>
            <SelectTrigger className="min-w-[130px] h-9 px-3 rounded-lg border border-[#E4E7EC] bg-white text-sm text-[#1D2733]">
              <SelectValue placeholder="排序方式" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 网格商品区 */}
      <div className="bg-white rounded-xl border border-[#E4E7EC] shadow-sm p-4">
        {loading ? (
          <div className="p-10 text-center text-sm text-[#98A2B3]">
            加载中...
          </div>
        ) : items.length === 0 ? (
          <div className="p-10">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Package className="size-6" />
                </EmptyMedia>
                <EmptyTitle>暂无商品</EmptyTitle>
                <EmptyDescription>
                  点击右上角"新增商品"或"导入 CSV"录入第一条供应商商品
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button onClick={handleAdd}>新增商品</Button>
              </EmptyContent>
            </Empty>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
              {items.map((product) => {
                const st = STATUS_STYLE[product.status] || STATUS_STYLE.pending;
                const showApprove = product.status === 'pending' || product.status === 'rejected';
                const showReject = product.status === 'pending' || product.status === 'approved';
                const allImages = [product.imageUrl, ...(product.images ?? [])].filter(Boolean) as string[];
                return (
                  <div
                    key={product.id}
                    className="group relative flex flex-col rounded-xl border border-[#EAECF0] overflow-hidden hover:shadow-md hover:-translate-y-px transition-all"
                  >
                    {/* 商品图区（横版，缩略图和价格叠在图上） */}
                    <div
                      className="relative aspect-[16/10] flex items-center justify-center overflow-hidden"
                      style={{
                        background: 'linear-gradient(135deg, #FEF3E2 0%, #FCE4C8 100%)',
                      }}
                    >
                      {allImages.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => openLightbox(allImages, 0)}
                          className="block w-full h-full"
                          title="点击查看全部图片"
                        >
                          <img src={allImages[0]} loading="lazy" decoding="async"
                            alt={product.productName}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ) : (
                        <div className="flex flex-col items-center gap-1.5 text-[#D97706]/60">
                          <Package className="size-9" />
                          <span className="text-[11px]">暂无图片</span>
                        </div>
                      )}

                      {allImages.length > 1 && (
                        <span className="absolute top-1.5 right-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/55 text-white text-[10px] font-medium shadow-sm">
                          📷 {allImages.length}
                        </span>
                      )}

                      {product.category && (
                        <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-white/90 text-[#B45309] text-[10px] font-medium shadow-sm">
                          <Tag className="size-3" />
                          {product.category}
                        </span>
                      )}

                      <span
                        className="absolute bottom-2 right-2 text-[15px] font-extrabold text-[#FFD600] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                      >
                        {product.price ? `¥${product.price}` : '价格面议'}
                      </span>

                      {allImages.length > 1 && (
                        <div className="absolute bottom-1.5 left-1.5 flex gap-1 max-w-[60%] overflow-hidden">
                          {allImages.slice(1, 4).map((img, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => openLightbox(allImages, idx + 1)}
                              className="shrink-0 size-9 rounded overflow-hidden border border-white/70 shadow-sm"
                            >
                              <img src={img} loading="lazy" decoding="async" alt="" className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      )}

                      <span
                        className={`absolute top-1/2 right-1.5 -translate-y-1/2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium shadow-sm ${st.cls}`}
                      >
                        {st.label}
                      </span>

                      {product.submitKey && (
                        <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#1D4ED8]/85 text-white text-[10px] font-medium shadow-sm">
                          <Globe className="size-3" />
                          表单提交
                        </span>
                      )}
                    </div>

                    <div className="px-2 pt-1.5 pb-1 flex flex-col gap-0.5">
                      <div className="text-[13px] font-medium text-[#1D2733] leading-snug line-clamp-1">
                        {product.productName}
                      </div>
                      <div className="flex items-center gap-1 text-[11.5px] text-[#B45309] truncate">
                        <Store className="size-3.5 shrink-0" />
                        <span className="truncate font-medium">{product.supplierName}</span>
                      </div>
                      {(product.contactName || product.contactPhone) && (
                        <div className="flex items-center gap-1 text-[11px] text-[#5B6773] truncate">
                          <Phone className="size-3 shrink-0" />
                          <span className="truncate">
                            {product.contactName}
                            {product.contactPhone ? ` · ${product.contactPhone}` : ''}
                          </span>
                        </div>
                      )}
                      {(product.productUrl || product.spec || (product.files && product.files.length > 0)) && (
                        <div className="flex items-center gap-2 pt-0.5">
                          {product.productUrl && (
                            <a
                              href={
                                /^https?:\/\//i.test(product.productUrl)
                                  ? product.productUrl
                                  : `https://${product.productUrl}`
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-0.5 text-[10.5px] font-medium text-[#1D4ED8] hover:underline"
                            >
                              <ExternalLink className="size-3" />
                              商品链接
                            </a>
                          )}
                          {product.spec && /https?:\/\//i.test(product.spec) && (
                            <a
                              href={(product.spec.match(/https?:\/\/[^\s]+/) || [''])[0]}
                              target="_blank"
                              rel="noreferrer"
                              title={product.spec}
                              className="inline-flex items-center gap-0.5 text-[10.5px] font-medium text-[#0E9F6E] hover:underline"
                            >
                              <ExternalLink className="size-3" />
                              网盘链接
                            </a>
                          )}                          {product.files && product.files.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setFilesOfProduct({
                                  name: product.productName,
                                  files: product.files ?? [],
                                });
                                setFilesDialogOpen(true);
                              }}
                              className="inline-flex items-center gap-0.5 text-[10.5px] font-medium text-[#B45309] hover:underline"
                            >
                              <Paperclip className="size-3" />
                              附件{product.files.length}
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="px-2 pb-2 grid grid-cols-3 gap-1">
                      {showApprove && (
                        <button
                          type="button"
                          onClick={() => void handleApprove(product.id)}
                          disabled={approvingId === product.id}
                          className="inline-flex items-center justify-center gap-0.5 py-1 rounded text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-60 transition-colors"
                        >
                          <Check className="size-3" />
                          通过
                        </button>
                      )}
                      {showReject && (
                        <button
                          type="button"
                          onClick={() => handleRejectClick(product)}
                          className="inline-flex items-center justify-center gap-0.5 py-1 rounded text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 transition-colors"
                        >
                          <XCircle className="size-3" />
                          驳回
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleEdit(product)}
                        className="inline-flex items-center justify-center gap-0.5 py-1 rounded text-[11px] font-semibold text-[#B45309] bg-[#FFF7E6] hover:bg-[#FDE8C8] transition-colors"
                      >
                        <Pencil className="size-3" />
                        编辑
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteClick(product.id)}
                        className="inline-flex items-center justify-center gap-0.5 py-1 rounded text-[11px] font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors"
                      >
                        <Trash2 className="size-3" />
                        删除
                      </button>
                    </div>

                    {product.status === 'rejected' && product.rejectReason && (
                      <div className="px-2 pb-2">
                        <div className="px-1.5 py-1 rounded bg-rose-50 text-[10.5px] text-rose-700 leading-snug">
                          <span className="font-semibold">驳回原因：</span>
                          {product.rejectReason}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 分页 */}
            <div className="flex flex-wrap items-center justify-between gap-[10px] px-4 py-3 bg-white border-t border-[#E4E7EC] rounded-b-[10px] mt-4">
              <div className="flex items-center gap-2">
                <span className="text-[13px] text-[#98A2B3]">每页</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="h-[30px] px-2 rounded-md border border-[#E4E7EC] bg-white text-[13px] text-[#1D2733] outline-none focus:border-primary"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={30}>30</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="text-[13px] text-[#98A2B3]">条</span>
                <span className="text-[13px] text-[#5B6773] ml-2">共 {total} 条</span>
              </div>
              <div className="flex items-center gap-[10px]">
                <button
                  type="button"
                  onClick={handlePrevPage}
                  disabled={page <= 1}
                  className="px-3 py-[5px] text-[13px] text-[#5B6773] border border-[#E4E7EC] rounded-md bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F7F9FA] transition-colors"
                >
                  上一页
                </button>
                <PageJump page={page} totalPages={totalPages} onChange={setPage} />
                <button
                  type="button"
                  onClick={handleNextPage}
                  disabled={page >= totalPages}
                  className="px-3 py-[5px] text-[13px] text-[#5B6773] border border-[#E4E7EC] rounded-md bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F7F9FA] transition-colors"
                >
                  下一页
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 新增/编辑弹窗 */}
      <SupplierDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        product={editingProduct}
        onSuccess={() => {
          void fetchList();
          void fetchCategories();
        }}
      />

      {/* 删除确认 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除该商品吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-rose-600 hover:bg-rose-700 text-white"
              disabled={deleting}
            >
              {deleting ? '删除中...' : '删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 驳回弹窗 */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>驳回商品</AlertDialogTitle>
            <AlertDialogDescription>
              驳回后供应商下次提交时将看到此理由，请写清楚修改要求。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
            placeholder="如：请补充商品图片；价格与目录不一致；缺少规格型号"
            className="w-full px-3.5 py-2.5 rounded-lg border border-[#E4E7EC] bg-white text-[14px] text-[#1D2733] placeholder:text-[#98A2B3] outline-none focus:border-[#D97706] focus:ring-2 focus:ring-[#D97706]/20 transition-all resize-none"
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={rejecting}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleRejectConfirm()}
              className="bg-rose-600 hover:bg-rose-700 text-white"
              disabled={rejecting}
            >
              {rejecting ? '驳回中...' : '确认驳回'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 附件列表弹窗 */}
      <AlertDialog
        open={filesDialogOpen}
        onOpenChange={(open) => {
          setFilesDialogOpen(open);
          if (!open) setPreviewPdf(null);
        }}
      >
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {filesOfProduct ? `「${filesOfProduct.name}」附件` : '附件'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              供应商提交的商品资料文件。PDF 可直接在线预览，其他文件点击下载。
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* PDF 在线预览区 */}
          {previewPdf && (
            <div className="rounded-lg overflow-hidden border border-[#E4E7EC]">
              <div className="flex items-center justify-between px-3 py-1.5 bg-[#F2F4F7]">
                <span className="text-[12px] font-medium text-[#1D2733] truncate">{previewPdf.name}</span>
                <button
                  type="button"
                  onClick={() => setPreviewPdf(null)}
                  className="text-[11.5px] text-[#5B6773] hover:text-rose-600"
                >
                  关闭预览
                </button>
              </div>
              <iframe
                src={previewPdf.url || previewPdf.data || ''}
                title={previewPdf.name}
                className="w-full h-[420px] bg-white"
              />
            </div>
          )}

          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {filesOfProduct?.files.map((f, idx) => {
              const isPdf = /\.pdf$/i.test(f.name);
              return isPdf ? (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setPreviewPdf(f)}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg bg-[#FFFBF5] border border-[#FDE8C8] hover:bg-[#FDE8C8] transition-colors text-left"
                >
                  <FileText className="size-4.5 text-[#D97706] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-[#1D2733] truncate">{f.name}</div>
                    <div className="text-[11px] text-[#98A2B3]">
                      {(f.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  </div>
                  <span className="text-[12px] text-[#B45309] font-medium">预览</span>
                </button>
              ) : (
                <a
                  key={idx}
                  href={f.url || f.data || '#'}
                  download={f.name}
                  className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg bg-[#FFFBF5] border border-[#FDE8C8] hover:bg-[#FDE8C8] transition-colors"
                >
                  <FileText className="size-4.5 text-[#D97706] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-[#1D2733] truncate">{f.name}</div>
                    <div className="text-[11px] text-[#98A2B3]">
                      {(f.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  </div>
                  <span className="text-[12px] text-[#B45309] font-medium">下载</span>
                </a>
              );
            })}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>关闭</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 图片灯箱 */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center"
          onClick={() => setLightboxOpen(false)}
        >
          <div
            className="absolute top-4 right-4 text-white/80 text-sm"
            onClick={(e) => e.stopPropagation()}
          >
            {lightboxIndex + 1} / {lightboxImages.length}
          </div>
          <button
            type="button"
            className="absolute top-4 right-16 text-white/80 hover:text-white text-xl"
            onClick={() => setLightboxOpen(false)}
          >
            ✕
          </button>
          <div
            className="max-w-[92vw] max-h-[82vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightboxImages[lightboxIndex]}
              alt=""
              className="max-w-full max-h-[82vh] object-contain"
            />
          </div>
          {lightboxImages.length > 1 && (
            <div className="flex gap-3 mt-4" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="px-4 py-1.5 rounded-lg bg-white/15 text-white text-sm hover:bg-white/25"
                onClick={() => setLightboxIndex((i) => (i - 1 + lightboxImages.length) % lightboxImages.length)}
              >
                ← 上一张
              </button>
              <button
                type="button"
                className="px-4 py-1.5 rounded-lg bg-white/15 text-white text-sm hover:bg-white/25"
                onClick={() => setLightboxIndex((i) => (i + 1) % lightboxImages.length)}
              >
                下一张 →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SuppliersPage;
