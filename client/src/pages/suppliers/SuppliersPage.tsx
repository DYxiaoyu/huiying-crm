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
} from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';

import { Button } from '@/components/ui/button';
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
import type { SupplierProduct } from '@shared/api.interface';

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'updatedAt-desc', label: '按更新时间' },
  { value: 'createdAt-desc', label: '按创建时间' },
  { value: 'productName-asc', label: '按商品名称' },
];

const SuppliersPage = () => {
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [sortValue, setSortValue] = useState('updatedAt-desc');
  const [page, setPage] = useState(1);
  const pageSize = 12;

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
  }, [page, pageSize, keyword, category, sortBy, sortOrder]);

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
      if (res.imported > 0) {
        toast.success(`导入成功 ${res.imported} 条${res.skipped > 0 ? `，跳过 ${res.skipped} 条` : ''}`);
        void fetchList();
        void fetchCategories();
        setPage(1);
      } else {
        toast.error(`没有可导入的数据${res.errors.length ? `（${res.errors[0]}）` : ''}`);
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
              {items.map((product) => (
                <div
                  key={product.id}
                  className="group relative flex flex-col rounded-xl border border-[#EAECF0] overflow-hidden hover:shadow-md hover:-translate-y-px transition-all"
                >
                  {/* 商品图区 */}
                  <div
                    className="relative aspect-[4/3] flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, #FEF3E2 0%, #FCE4C8 100%)',
                    }}
                  >
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.productName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-1.5 text-[#D97706]/60">
                        <Package className="size-9" />
                        <span className="text-[11px]">暂无图片</span>
                      </div>
                    )}
                    {product.category && (
                      <span className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/90 text-[#B45309] text-[11px] font-medium shadow-sm">
                        <Tag className="size-3" />
                        {product.category}
                      </span>
                    )}
                    {/* 操作按钮（桌面 hover 显示） */}
                    <div className="absolute top-2 right-2 hidden md:flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => handleEdit(product)}
                        title="编辑"
                        className="inline-flex items-center justify-center size-8 rounded-lg bg-white text-[#B45309] shadow-sm hover:bg-[#FFF7E6] transition-colors"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteClick(product.id)}
                        title="删除"
                        className="inline-flex items-center justify-center size-8 rounded-lg bg-white text-rose-600 shadow-sm hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>

                  {/* 商品信息 */}
                  <div className="p-3 flex flex-col gap-1.5 flex-1">
                    <div className="flex items-baseline gap-1">
                      <span className="text-[17px] font-bold text-[#D97706]">
                        {product.price ? `¥${product.price}` : '价格面议'}
                      </span>
                      {product.unit && (
                        <span className="text-[11px] text-[#98A2B3]">/{product.unit}</span>
                      )}
                    </div>
                    <div className="text-[13.5px] font-medium text-[#1D2733] leading-snug line-clamp-2 min-h-[36px]">
                      {product.productName}
                    </div>
                    <div className="mt-auto pt-1 space-y-1">
                      {product.spec && (
                        <div className="flex items-center gap-1 text-[11.5px] text-[#5B6773] truncate">
                          <Ruler className="size-3 shrink-0 text-[#98A2B3]" />
                          <span className="truncate">{product.spec}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1 text-[12px] text-[#B45309] truncate">
                        <Store className="size-3.5 shrink-0" />
                        <span className="truncate font-medium">{product.supplierName}</span>
                      </div>
                    </div>
                  </div>

                  {/* 手机端操作按钮 */}
                  <div className="md:hidden flex items-center gap-2 px-3 pb-3">
                    <button
                      type="button"
                      onClick={() => handleEdit(product)}
                      className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 rounded-lg text-[12px] font-medium text-[#B45309] bg-[#FFF7E6] active:bg-[#FDE8C8] transition-colors"
                    >
                      <Pencil className="size-3.5" />
                      编辑
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteClick(product.id)}
                      className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 rounded-lg text-[12px] font-medium text-rose-600 bg-rose-50 active:bg-rose-100 transition-colors"
                    >
                      <Trash2 className="size-3.5" />
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* 分页 */}
            <div className="flex items-center justify-end gap-[10px] px-4 py-3 bg-white border-t border-[#E4E7EC] rounded-b-[10px] mt-4">
              <span className="text-[13px] text-[#5B6773]">共 {total} 条</span>
              <button
                type="button"
                onClick={handlePrevPage}
                disabled={page <= 1}
                className="px-3 py-[5px] text-[13px] text-[#5B6773] border border-[#E4E7EC] rounded-md bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F7F9FA] transition-colors"
              >
                上一页
              </button>
              <span className="text-[13px] text-[#5B6773]">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={handleNextPage}
                disabled={page >= totalPages}
                className="px-3 py-[5px] text-[13px] text-[#5B6773] border border-[#E4E7EC] rounded-md bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F7F9FA] transition-colors"
              >
                下一页
              </button>
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
    </div>
  );
};

export default SuppliersPage;
