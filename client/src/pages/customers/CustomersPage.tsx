import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Eye,
  Pencil,
  Trash2,
  Download,
  HardDriveDownload,
  ImagePlus,
  Images,
} from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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

import * as customersApi from '@/api/customers';
import { CustomerDialog } from './CustomerDialog';
import type {
  Customer,
  CustomerStage,
} from '@shared/api.interface';

const STAGE_OPTIONS: { value: CustomerStage | ''; label: string }[] = [
  { value: '', label: '全部' },
  { value: 'new', label: '新客户' },
  { value: 'contacted', label: '已联系' },
  { value: 'following', label: '跟进中' },
  { value: 'closed', label: '已成交' },
  { value: 'lost', label: '已流失' },
];

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'updatedAt-desc', label: '按更新时间' },
  { value: 'createdAt-desc', label: '按创建时间' },
  { value: 'name-asc', label: '按姓名' },
];

interface StageBadgeConfig {
  label: string;
  dotColor: string;
  bgColor: string;
  textColor: string;
}

const STAGE_BADGE_MAP: Record<CustomerStage, StageBadgeConfig> = {
  new: {
    label: '新客户',
    dotColor: 'bg-[#64748B]',
    bgColor: 'bg-[#EFF1F4]',
    textColor: 'text-[#64748B]',
  },
  contacted: {
    label: '已联系',
    dotColor: 'bg-[#2563EB]',
    bgColor: 'bg-[#E8EFFD]',
    textColor: 'text-[#2563EB]',
  },
  following: {
    label: '跟进中',
    dotColor: 'bg-[#D97706]',
    bgColor: 'bg-[#FDF3E3]',
    textColor: 'text-[#D97706]',
  },
  closed: {
    label: '已成交',
    dotColor: 'bg-[#059669]',
    bgColor: 'bg-[#E5F4EC]',
    textColor: 'text-[#059669]',
  },
  lost: {
    label: '已流失',
    dotColor: 'bg-[#DC2626]',
    bgColor: 'bg-[#FDECEC]',
    textColor: 'text-[#DC2626]',
  },
};

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '-';
  const date = new Date(value);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${h}:${min}`;
}

const CustomersPage = () => {
  const navigate = useNavigate();

  const [keyword, setKeyword] = useState('');
  const [stage, setStage] = useState<CustomerStage | ''>('');
  const [sortValue, setSortValue] = useState('updatedAt-desc');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [items, setItems] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { sortBy, sortOrder } = useMemo(() => {
    const [by, order] = sortValue.split('-');
    return {
      sortBy: by as 'updatedAt' | 'createdAt' | 'name',
      sortOrder: order as 'asc' | 'desc',
    };
  }, [sortValue]);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await customersApi.getList({
        page,
        pageSize,
        keyword: keyword || undefined,
        stage: stage || undefined,
        sortBy,
        sortOrder,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (error) {
      logger.error('加载客户列表失败', error as Error);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, keyword, stage, sortBy, sortOrder]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(total / pageSize));
  }, [total]);

  const handleAdd = () => {
    setEditingCustomer(null);
    setDialogOpen(true);
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setDialogOpen(true);
  };

  const handleView = (id: string) => {
    navigate(`/customers/${id}`);
  };

  const handleDeleteClick = (id: string) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;
    setDeleting(true);
    try {
      await customersApi.remove(deletingId);
      setDeleteDialogOpen(false);
      setDeletingId(null);
      if (items.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        void fetchList();
      }
    } catch (error) {
      logger.error('删除客户失败', error as Error);
    } finally {
      setDeleting(false);
    }
  };

  const handleKeywordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setKeyword(e.target.value);
    setPage(1);
  };

  const handleStageChange = (value: string) => {
    setStage(value as CustomerStage | '');
    setPage(1);
  };

  const handleSortChange = (value: string) => {
    setSortValue(value);
    setPage(1);
  };

  const handleExportCsv = () => {
    const url = customersApi.getCsvUrl();
    const a = document.createElement('a');
    a.href = url;
    a.download = 'customers.csv';
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // 图片上传（占位：按钮已就位，上传能力待接入）
  const handleUploadImage = (customer: Customer) => {
    toast.info(`「${customer.name}」的图片上传功能即将上线`);
  };

  // 图片预览（占位）
  const handlePreviewImage = (customer: Customer) => {
    toast.info(`「${customer.name}」暂无已上传图片`);
  };

  const handleExportBackup = () => {
    const url = customersApi.getBackupUrl();
    const a = document.createElement('a');
    a.href = url;
    a.download = 'customers-backup.json';
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePrevPage = () => {
    if (page > 1) setPage(page - 1);
  };

  const handleNextPage = () => {
    if (page < totalPages) setPage(page + 1);
  };

  return (
    <div className="p-6 flex flex-col gap-6">
      {/* 页面标题 */}
      <div
        className="relative overflow-hidden rounded-2xl px-6 py-5 text-white shadow-lg"
        style={{
          background: 'linear-gradient(120deg, #0B6356 0%, #0E7C6B 45%, #14A085 100%)',
          boxShadow: '0 8px 24px rgba(11,99,86,0.25)',
        }}
      >
        {/* 装饰光斑 */}
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
            <h1 className="text-xl font-semibold tracking-wide">我的客户</h1>
            <p className="mt-1 text-[13px] text-white/70">
              共 {total} 位客户 · 管理跟进与阶段流转
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportBackup}
              data-ai-section-type="button"
              className="inline-flex items-center gap-2 px-[14px] py-2 rounded-lg bg-white/15 border border-white/25 text-white text-sm font-medium backdrop-blur hover:bg-white/25 transition-all"
            >
              <HardDriveDownload className="size-4" />
              <span>备份数据</span>
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
              onClick={handleAdd}
              data-ai-section-type="button"
              className="inline-flex items-center gap-2 px-[16px] py-2 rounded-lg bg-white text-[#0B6356] text-sm font-semibold shadow-md hover:shadow-lg hover:-translate-y-px transition-all"
            >
              <Plus className="size-4" />
              <span>新增客户</span>
            </button>
          </div>
        </div>
      </div>

      {/* 工具栏 */}
      <div
        className="flex flex-wrap items-center gap-3 p-4 bg-white rounded-xl border border-[#E4E7EC] shadow-sm"
        data-ai-section-type="button"
      >
        {/* 搜索框 */}
        <div className="flex-1 min-w-[220px] flex items-center gap-2 px-3 py-2 rounded-lg border border-[#E4E7EC] bg-white">
          <Search className="size-4 text-[#98A2B3] shrink-0" />
          <input
            type="text"
            placeholder="搜索姓名/电话/公司"
            value={keyword}
            onChange={handleKeywordChange}
            className="flex-1 border-none outline-none bg-transparent text-sm text-[#1D2733] placeholder:text-[#98A2B3]"
          />
        </div>

        {/* 阶段筛选 */}
        <div className="shrink-0">
          <Select value={stage} onValueChange={handleStageChange}>
            <SelectTrigger className="min-w-[140px] h-9 px-3 rounded-lg border border-[#E4E7EC] bg-white text-sm text-[#1D2733]">
              <SelectValue placeholder="全部阶段" />
            </SelectTrigger>
            <SelectContent>
              {STAGE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 排序 */}
        <div className="shrink-0">
          <Select value={sortValue} onValueChange={handleSortChange}>
            <SelectTrigger className="min-w-[140px] h-9 px-3 rounded-lg border border-[#E4E7EC] bg-white text-sm text-[#1D2733]">
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

      {/* 列表区 - 卡片式表格 */}
      <div className="bg-white rounded-xl border border-[#E4E7EC] shadow-sm overflow-auto">
        {loading ? (
          <div className="p-10 text-center text-sm text-[#98A2B3]">
            加载中...
          </div>
        ) : items.length === 0 ? (
          <div className="p-10">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Search className="size-6" />
                </EmptyMedia>
                <EmptyTitle>暂无客户</EmptyTitle>
                <EmptyDescription>
                  点击下方按钮添加第一位客户
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button onClick={handleAdd}>新增客户</Button>
              </EmptyContent>
            </Empty>
          </div>
        ) : (
          <>
            {/* ===== 桌面端表格 ===== */}
            <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[#E4E7EC] hover:bg-transparent bg-[#FAFBFC]">
                  <TableHead className="px-4 py-3 text-xs font-medium text-[#98A2B3]">
                    客户姓名
                  </TableHead>
                  <TableHead className="px-4 py-3 text-xs font-medium text-[#98A2B3]">
                    电话
                  </TableHead>
                  <TableHead className="px-4 py-3 text-xs font-medium text-[#98A2B3]">
                    公司
                  </TableHead>
                  <TableHead className="px-4 py-3 text-xs font-medium text-[#98A2B3]">
                    来源
                  </TableHead>
                  <TableHead className="px-4 py-3 text-xs font-medium text-[#98A2B3]">
                    阶段
                  </TableHead>
                  <TableHead className="px-4 py-3 text-xs font-medium text-[#98A2B3]">
                    最近跟进时间
                  </TableHead>
                  <TableHead className="px-4 py-3 text-xs font-medium text-[#98A2B3] text-right">
                    操作
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((customer: Customer) => {
                  const stageBadge = STAGE_BADGE_MAP[customer.stage];
                  return (
                    <TableRow
                      key={customer.id}
                      className="border-b border-[#EAECF0] hover:bg-[#F7F9FA]"
                    >
                      <TableCell className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[#1D2733]">
                            {customer.name}
                          </span>
                          {customer.isOverdue && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FDECEC] text-[#DC2626] text-[11px] font-medium">
                              <span className="size-1.5 rounded-full bg-[#DC2626]" />
                              待跟进
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-[#1D2733]">
                        {customer.phone || '-'}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-[#1D2733]">
                        {customer.company || '-'}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-xs text-[#98A2B3]">
                        {customer.source || '-'}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${stageBadge.bgColor} ${stageBadge.textColor}`}
                        >
                          <span
                            className={`size-1.5 rounded-full ${stageBadge.dotColor}`}
                          />
                          {stageBadge.label}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-[#5B6773]">
                        {formatDateTime(customer.lastFollowAt ?? customer.updatedAt)}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleUploadImage(customer)}
                            title="上传图片"
                            className="inline-flex items-center justify-center size-8 rounded-lg text-[#0E7C6B] bg-[#E5F4EC] hover:bg-[#0E7C6B] hover:text-white transition-all"
                          >
                            <ImagePlus className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePreviewImage(customer)}
                            title="预览图片"
                            className="inline-flex items-center justify-center size-8 rounded-lg text-[#2563EB] bg-[#E8EFFD] hover:bg-[#2563EB] hover:text-white transition-all"
                          >
                            <Images className="size-4" />
                          </button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleView(customer.id)}
                            title="查看"
                            className="hover:bg-[#F2F4F7]"
                          >
                            <Eye className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(customer)}
                            title="编辑"
                            className="hover:bg-[#F2F4F7]"
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(customer.id)}
                            title="删除"
                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>

            {/* ===== 手机端卡片列表 ===== */}
            <div className="md:hidden">
              {items.map((customer: Customer) => {
                const stageBadge = STAGE_BADGE_MAP[customer.stage];
                return (
                  <div
                    key={customer.id}
                    className="p-4 border-b border-[#EAECF0] last:border-b-0 hover:bg-[#F7F9FA] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-[#1D2733] text-[15px]">
                            {customer.name}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${stageBadge.bgColor} ${stageBadge.textColor}`}
                          >
                            <span
                              className={`size-1.5 rounded-full ${stageBadge.dotColor}`}
                            />
                            {stageBadge.label}
                          </span>
                          {customer.isOverdue && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FDECEC] text-[#DC2626] text-[11px] font-medium">
                              <span className="size-1.5 rounded-full bg-[#DC2626]" />
                              待跟进
                            </span>
                          )}
                        </div>
                        <div className="mt-2 space-y-1 text-[13px] text-[#5B6773]">
                          <div className="flex items-center gap-2">
                            <span className="text-[#98A2B3] w-8">电话</span>
                            <span>{customer.phone || '-'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[#98A2B3] w-8">公司</span>
                            <span className="truncate">{customer.company || '-'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[#98A2B3] w-8">来源</span>
                            <span>{customer.source || '-'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[#98A2B3] w-8">跟进</span>
                            <span>
                              {formatDateTime(customer.lastFollowAt ?? customer.updatedAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleUploadImage(customer)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-[13px] font-medium text-[#0E7C6B] bg-[#E5F4EC] active:bg-[#0E7C6B] active:text-white transition-all"
                      >
                        <ImagePlus className="size-4" />
                        上传图片
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePreviewImage(customer)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-[13px] font-medium text-[#2563EB] bg-[#E8EFFD] active:bg-[#2563EB] active:text-white transition-all"
                      >
                        <Images className="size-4" />
                        预览图片
                      </button>
                      <button
                        type="button"
                        onClick={() => handleView(customer.id)}
                        className="inline-flex items-center justify-center size-9 rounded-lg text-[#5B6773] bg-[#F2F4F7] active:bg-[#E4E7EC] transition-all"
                      >
                        <Eye className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEdit(customer)}
                        className="inline-flex items-center justify-center size-9 rounded-lg text-[#5B6773] bg-[#F2F4F7] active:bg-[#E4E7EC] transition-all"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteClick(customer.id)}
                        className="inline-flex items-center justify-center size-9 rounded-lg text-rose-600 bg-rose-50 active:bg-rose-100 transition-all"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 分页 */}
            <div className="flex items-center justify-end gap-[10px] px-4 py-3 bg-white border-t border-[#E4E7EC] rounded-b-[10px]">
              <span className="text-[13px] text-[#5B6773]">
                共 {total} 条
              </span>
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
      <CustomerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        customer={editingCustomer}
        onSuccess={fetchList}
      />

      {/* 删除确认 */}
      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除该客户吗？此操作不可撤销。
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

export default CustomersPage;
