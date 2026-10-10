import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  Star,
  FileUp,
  FileText,
  Globe,
  UserPlus,
  Tag as TagIcon,
  CheckSquare,
  Square,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { showConfirm } from '@lark-apaas/client-toolkit';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { useAuth } from '../../contexts/AuthContext';

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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
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
import { csvToObjects } from '@/utils/csv';
import { CustomerDialog } from './CustomerDialog';
import { CustomerDetailDrawer } from './CustomerDetailDrawer';
import { PageJump } from '@/components/PageJump';
import type {
  AdminEmployeeItem,
  Customer,
  CustomerStage,
  ImportCustomerItem,
  TagStat,
  TimeRange,
} from '@shared/api.interface';

const TIME_RANGE_OPTIONS: { value: TimeRange | ''; label: string }[] = [
  { value: '', label: '全部时间' },
  { value: '7d', label: '最近 7 天' },
  { value: '30d', label: '最近 30 天' },
  { value: '90d', label: '最近 90 天' },
  { value: '1y', label: '最近 1 年' },
];

const BATCH_STAGE_OPTIONS: { value: CustomerStage; label: string }[] = [
  { value: 'new', label: '新客户' },
  { value: 'contacted', label: '已联系' },
  { value: 'following', label: '跟进中' },
  { value: 'quoted', label: '已报价' },
  { value: 'negotiating', label: '谈判中' },
  { value: 'closed', label: '已成交' },
  { value: 'lost', label: '已流失' },
  { value: 'invalid', label: '无效客户' },
  { value: 'duplicate', label: '重复客户' },
];

const BATCH_TAG_PRESETS = ['重点客户', '大客户', '待回访', '已报价', '潜在客户', '黑名单'];

const STAGE_NAME_TO_VALUE: Record<string, CustomerStage> = {
  新客户: 'new',
  已联系: 'contacted',
  跟进中: 'following',
  已报价: 'quoted',
  谈判中: 'negotiating',
  已成交: 'closed',
  已流失: 'lost',
  无效客户: 'invalid',
  重复客户: 'duplicate',
};

const STAGE_OPTIONS: { value: CustomerStage | ''; label: string }[] = [
  { value: '', label: '全部' },
  { value: 'new', label: '新客户' },
  { value: 'contacted', label: '已联系' },
  { value: 'following', label: '跟进中' },
  { value: 'quoted', label: '已报价' },
  { value: 'negotiating', label: '谈判中' },
  { value: 'closed', label: '已成交' },
  { value: 'lost', label: '已流失' },
  { value: 'invalid', label: '无效客户' },
  { value: 'duplicate', label: '重复客户' },
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
  quoted: {
    label: '已报价',
    dotColor: 'bg-[#0891B2]',
    bgColor: 'bg-[#E3F5FA]',
    textColor: 'text-[#0891B2]',
  },
  negotiating: {
    label: '谈判中',
    dotColor: 'bg-[#7C3AED]',
    bgColor: 'bg-[#F0EAFE]',
    textColor: 'text-[#7C3AED]',
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
  invalid: {
    label: '无效客户',
    dotColor: 'bg-[#6B7280]',
    bgColor: 'bg-[#F3F4F6]',
    textColor: 'text-[#6B7280]',
  },
  duplicate: {
    label: '重复客户',
    dotColor: 'bg-[#B45309]',
    bgColor: 'bg-[#FDF1E7]',
    textColor: 'text-[#B45309]',
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
  const [searchParams] = useSearchParams();
  const { employee } = useAuth();
  const urlStage = (searchParams.get('stage') as CustomerStage | null) ?? '';

  const [keyword, setKeyword] = useState('');
  const [stage, setStage] = useState<CustomerStage | ''>(urlStage);
  const [sortValue, setSortValue] = useState('updatedAt-desc');
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange | ''>('');
  const [tag, setTag] = useState('');
  const [tags, setTags] = useState<TagStat[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [items, setItems] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // 多选批量
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchDialog, setBatchDialog] = useState<'stage' | 'tags' | 'delete' | null>(null);
  const [batchStage, setBatchStage] = useState<CustomerStage>('new');
  const [batchTags, setBatchTags] = useState<string[]>([]);
  const [batchTagInput, setBatchTagInput] = useState('');
  const [batchSubmitting, setBatchSubmitting] = useState(false);

  // 详情抽屉
  const [drawerId, setDrawerId] = useState<string | null>(null);

  // 客户分配（管理员）
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<Customer | null>(null);
  const [assignEmployeeId, setAssignEmployeeId] = useState('');
  const [assignEmployees, setAssignEmployees] = useState<AdminEmployeeItem[]>([]);
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

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
        favoriteOnly: favoriteOnly || undefined,
        tag: tag || undefined,
        timeRange: timeRange || undefined,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (error) {
      logger.error('加载客户列表失败', error as Error);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, keyword, stage, sortBy, sortOrder, favoriteOnly, tag, timeRange]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  // 加载标签池（筛选下拉）
  useEffect(() => {
    let alive = true;
    customersApi.getTags().then((list) => {
      if (alive) setTags(list);
    }).catch((e) => logger.error('加载标签失败', e as Error));
    return () => { alive = false; };
  }, []);

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
    setDrawerId(id);
  };

  const handleTimeRangeChange = (value: string) => {
    setTimeRange(value as TimeRange | '');
    setPage(1);
  };

  const handleTagChange = (value: string) => {
    setTag(value);
    setPage(1);
  };

  // ===== 多选批量 =====
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const allSelected = items.length > 0 && items.every((c) => selectedIds.includes(c.id));
  const toggleSelectAll = () => {
    setSelectedIds((prev) =>
      allSelected ? prev.filter((id) => !items.some((c) => c.id === id)) : [...new Set([...prev, ...items.map((c) => c.id)])]
    );
  };

  const handleBatchStage = async () => {
    if (!batchStage || selectedIds.length === 0) return;
    setBatchSubmitting(true);
    try {
      const res = await customersApi.batchUpdateStage({ ids: selectedIds, stage: batchStage });
      toast.success(`已更新 ${res.updated} 条客户阶段`);
      setBatchDialog(null);
      setSelectedIds([]);
      void fetchList();
    } catch (e) {
      logger.error('批量改阶段失败', e as Error);
      toast.error('批量改阶段失败，请重试');
    } finally {
      setBatchSubmitting(false);
    }
  };

  const handleBatchTags = async () => {
    if (selectedIds.length === 0) return;
    setBatchSubmitting(true);
    try {
      const res = await customersApi.batchUpdateTags({ ids: selectedIds, tags: batchTags });
      toast.success(`已为 ${res.updated} 条客户打标签`);
      setBatchDialog(null);
      setBatchTags([]);
      setSelectedIds([]);
      void fetchList();
    } catch (e) {
      logger.error('批量打标签失败', e as Error);
      toast.error('批量打标签失败，请重试');
    } finally {
      setBatchSubmitting(false);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    setBatchSubmitting(true);
    try {
      const res = await customersApi.batchDelete({ ids: selectedIds });
      toast.success(`已删除 ${res.updated} 条客户`);
      setBatchDialog(null);
      setSelectedIds([]);
      void fetchList();
    } catch (e) {
      logger.error('批量删除失败', e as Error);
      toast.error('批量删除失败，请重试');
    } finally {
      setBatchSubmitting(false);
    }
  };

  const toggleBatchTag = (t: string) => {
    setBatchTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const addBatchTag = () => {
    const t = batchTagInput.trim();
    if (!t) return;
    if (!batchTags.includes(t)) setBatchTags((prev) => [...prev, t]);
    setBatchTagInput('');
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

  const handleFavoriteFilter = () => {
    setFavoriteOnly((prev) => !prev);
    setPage(1);
  };

  /** 切换收藏状态 */
  const handleToggleFavorite = async (customer: Customer) => {
    const next = !customer.isFavorite;
    try {
      await customersApi.update(customer.id, { isFavorite: next });
      setItems((prev) =>
        prev.map((c) => (c.id === customer.id ? { ...c, isFavorite: next } : c)),
      );
      toast.success(next ? `已收藏「${customer.name}」` : `已取消收藏「${customer.name}」`);
      if (favoriteOnly && !next) {
        void fetchList();
      }
    } catch (error) {
      logger.error('更新收藏状态失败', error as Error);
      toast.error('操作失败，请重试');
    }
  };

  /** 打开分配弹窗（管理员）：拉取员工列表 */
  const openAssign = async (customer: Customer) => {
    setAssignTarget(customer);
    setAssignEmployeeId('');
    setAssignDialogOpen(true);
    try {
      const { data } = await axiosForBackend.get<AdminEmployeeItem[]>('/api/admin/employees');
      setAssignEmployees(data);
    } catch (error) {
      logger.error('获取员工列表失败', error as Error);
      toast.error('员工列表加载失败，请重试');
    }
  };

  /** 确认分配 */
  const handleAssign = async () => {
    if (!assignTarget || !assignEmployeeId) return;
    setAssignSubmitting(true);
    try {
      await customersApi.assignCustomer(assignTarget.id, assignEmployeeId);
      toast.success(`已将「${assignTarget.name}」分配给员工`);
      setAssignDialogOpen(false);
      void fetchList();
    } catch (error) {
      logger.error('分配客户失败', error as Error);
      toast.error('分配失败，请重试');
    } finally {
      setAssignSubmitting(false);
    }
  };

  const handleExportCsv = () => {
    // 导出当前筛选条件下的客户（搜索/阶段/标签/时间/收藏）→ ZIP
    customersApi.downloadZip({
      keyword: keyword || undefined,
      stage: stage || undefined,
      tag: tag || undefined,
      timeRange: timeRange || undefined,
      favoriteOnly: favoriteOnly ? 'true' : undefined,
    }).catch(() => {
      toast.error('导出失败，请重试');
    });
  };

  const handleDownloadTemplate = () => {
    customersApi.downloadTemplate().catch(() => {
      toast.error('模板下载失败，请重试');
    });
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
    customersApi.downloadBackup().catch(() => {
      toast.error('备份导出失败，请重试');
    });
  };

  /** 导入 CSV：解析文件 → 批量创建客户 */
  const handleImportCsvFile = async (file: File) => {
    if (!file) return;
    if (!/\.csv$/i.test(file.name)) {
      toast.error('请选择 .csv 文件');
      return;
    }
    try {
      const text = await file.text();
      const rows = csvToObjects(text);
      if (rows.length === 0) {
        toast.error('未识别到数据，请确认表头包含"客户姓名"');
        return;
      }
      const items: ImportCustomerItem[] = rows.map((r) => ({
        name: r.name ?? '',
        phone: r.phone || undefined,
        company: r.company || undefined,
        source: r.source || undefined,
        stage: (r.stage && STAGE_NAME_TO_VALUE[r.stage]) || undefined,
        remark: r.remark || undefined,
        tags: r.tags
          ? String(r.tags).split(/[、,，;；]/).map((t) => t.trim()).filter((t) => t.length > 0)
          : undefined,
      }));
      const res = await customersApi.importCustomers(items);
      const failed = res.errors?.length ?? 0;
      if (res.imported > 0 || res.skipped > 0) {
        const detail = failed > 0 ? `，失败 ${failed} 条` : '';
        toast.success(`导入成功 ${res.imported} 条 / 跳过 ${res.skipped} 条${detail}`);
        if (failed > 0) {
          toast.error(`失败明细：${res.errors!.slice(0, 3).join('；')}${failed > 3 ? ` 等 ${failed} 条` : ''}`);
        }
        void fetchList();
      } else {
        toast.error(`没有可导入的数据${res.errors.length ? `（${res.errors.slice(0, 3).join('；')}${res.errors.length > 3 ? ` 等 ${res.errors.length} 条` : ''}）` : ''}`);
      }
    } catch (error) {
      logger.error('导入客户失败', error as Error);
      toast.error('导入失败，请检查文件格式');
    } finally {
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
            <h1 className="text-xl font-semibold tracking-wide">{employee?.role === 'admin' ? '全部客户' : '我的客户'}</h1>
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
              <span>导出数据</span>
            </button>
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
              onClick={() => fileInputRef.current?.click()}
              data-ai-section-type="button"
              className="inline-flex items-center gap-2 px-[14px] py-2 rounded-lg bg-white/15 border border-white/25 text-white text-sm font-medium backdrop-blur hover:bg-white/25 transition-all"
            >
              <FileUp className="size-4" />
              <span>导入 CSV</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleImportCsvFile(file);
              }}
            />
            <a
              href="/enquiry"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-[14px] py-2 rounded-lg bg-white/15 border border-white/25 text-white text-sm font-medium backdrop-blur hover:bg-white/25 transition-all"
            >
              <Globe className="size-4" />
              <span>网页收集</span>
            </a>
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

        {/* 时间筛选 */}
        <div className="shrink-0">
          <Select value={timeRange} onValueChange={handleTimeRangeChange}>
            <SelectTrigger className="min-w-[130px] h-9 px-3 rounded-lg border border-[#E4E7EC] bg-white text-sm text-[#1D2733]">
              <SelectValue placeholder="全部时间" />
            </SelectTrigger>
            <SelectContent>
              {TIME_RANGE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 标签筛选 */}
        <div className="shrink-0">
          <Select value={tag} onValueChange={handleTagChange}>
            <SelectTrigger className="min-w-[130px] h-9 px-3 rounded-lg border border-[#E4E7EC] bg-white text-sm text-[#1D2733]">
              <SelectValue placeholder="全部标签">
                {tag ? (
                  <span className="inline-flex items-center gap-1">
                    <TagIcon className="size-3.5" />
                    {tag}
                  </span>
                ) : '全部标签'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">全部标签</SelectItem>
              {tags.map((t) => (
                <SelectItem key={t.name} value={t.name}>
                  {t.name}（{t.count}）
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 只看收藏 */}
        <button
          type="button"
          onClick={handleFavoriteFilter}
          className={`shrink-0 inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border text-sm font-medium transition-all ${
            favoriteOnly
              ? 'border-[#F5B93C] bg-[#FFF7E0] text-[#B8860B]'
              : 'border-[#E4E7EC] bg-white text-[#5B6773] hover:bg-[#F7F9FA]'
          }`}
        >
          <Star
            className={`size-4 ${favoriteOnly ? 'fill-[#F5B93C] text-[#F5B93C]' : ''}`}
          />
          <span>只看收藏</span>
        </button>
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
            {/* ===== 批量操作条 ===== */}
            {selectedIds.length > 0 && (
              <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 px-4 py-2.5 bg-[#F0F9F6] border-b border-[#CDE8DE]">
                <span className="text-[13px] font-medium text-[#0E7C6B]">
                  已选 {selectedIds.length} 条
                </span>
                <button
                  type="button"
                  onClick={() => { setBatchStage('new'); setBatchDialog('stage'); }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium text-[#0E7C6B] bg-white border border-[#B8DCCD] hover:bg-[#0E7C6B] hover:text-white transition-all"
                >
                  批量改阶段
                </button>
                <button
                  type="button"
                  onClick={() => { setBatchTags([]); setBatchDialog('tags'); }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium text-[#0E7C6B] bg-white border border-[#B8DCCD] hover:bg-[#0E7C6B] hover:text-white transition-all"
                >
                  <TagIcon className="size-3.5" />
                  批量打标签
                </button>
                <button
                  type="button"
                  onClick={() => setBatchDialog('delete')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium text-[#DC2626] bg-white border border-[#F3C1C1] hover:bg-[#DC2626] hover:text-white transition-all"
                >
                  <Trash2 className="size-3.5" />
                  批量删除
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="ml-auto inline-flex items-center gap-1 px-2 py-1 text-[12px] text-[#5B6773] hover:text-[#1D2733] transition-colors"
                >
                  <X className="size-3.5" />
                  取消选择
                </button>
              </div>
            )}

            {/* ===== 桌面端表格 ===== */}
            <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[#E4E7EC] hover:bg-transparent bg-[#FAFBFC]">
                  <TableHead className="px-4 py-3 w-10">
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className={`transition-colors ${allSelected ? 'text-[#0E7C6B]' : 'text-[#98A2B3] hover:text-[#0E7C6B]'}`}
                      aria-label={allSelected ? '取消全选' : '全选'}
                    >
                      {allSelected ? <CheckSquare className="size-4" /> : <Square className="size-4" />}
                    </button>
                  </TableHead>
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
                    标签
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
                  const isSelected = selectedIds.includes(customer.id);
                  return (
                    <TableRow
                      key={customer.id}
                      className={`border-b border-[#EAECF0] ${isSelected ? 'bg-[#F0F9F6]' : 'hover:bg-[#F7F9FA]'}`}
                    >
                      <TableCell className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => toggleSelect(customer.id)}
                          className={`transition-colors ${isSelected ? 'text-[#0E7C6B]' : 'text-[#98A2B3] hover:text-[#0E7C6B]'}`}
                          aria-label={isSelected ? '取消选择' : '选择'}
                        >
                          {isSelected ? <CheckSquare className="size-4" /> : <Square className="size-4" />}
                        </button>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleFavorite(customer)}
                            title={customer.isFavorite ? '取消收藏' : '收藏'}
                            className={`shrink-0 transition-all ${
                              customer.isFavorite
                                ? 'text-[#F5B93C]'
                                : 'text-[#D0D5DD] hover:text-[#F5B93C]'
                            }`}
                          >
                            <Star
                              className={`size-4 ${customer.isFavorite ? 'fill-[#F5B93C]' : ''}`}
                            />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleView(customer.id)}
                            className="font-semibold text-[#1D2733] hover:text-[#0E7C6B] transition-colors"
                          >
                            {customer.name}
                          </button>
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
                      <TableCell className="px-4 py-3">
                        {customer.tags && customer.tags.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {customer.tags.slice(0, 3).map((t) => (
                              <span
                                key={t}
                                className="px-1.5 py-0.5 rounded-full text-[11px] font-medium bg-[#E5F4EC] text-[#0E7C6B]"
                              >
                                {t}
                              </span>
                            ))}
                            {customer.tags.length > 3 && (
                              <span className="text-[11px] text-[#98A2B3]">
                                +{customer.tags.length - 3}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-[#D0D5DD]">-</span>
                        )}
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
                          {employee?.role === 'admin' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => void openAssign(customer)}
                              title="分配给员工"
                              className="hover:bg-[#F2F4F7]"
                            >
                              <UserPlus className="size-4" />
                            </Button>
                          )}
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
                const isSelected = selectedIds.includes(customer.id);
                return (
                  <div
                    key={customer.id}
                    className={`p-4 border-b border-[#EAECF0] last:border-b-0 ${isSelected ? 'bg-[#F0F9F6]' : 'hover:bg-[#F7F9FA]'} transition-colors`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => toggleSelect(customer.id)}
                            className={`transition-colors ${isSelected ? 'text-[#0E7C6B]' : 'text-[#98A2B3] hover:text-[#0E7C6B]'}`}
                            aria-label={isSelected ? '取消选择' : '选择'}
                          >
                            {isSelected ? <CheckSquare className="size-4" /> : <Square className="size-4" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleFavorite(customer)}
                            title={customer.isFavorite ? '取消收藏' : '收藏'}
                            className={`shrink-0 transition-all ${
                              customer.isFavorite
                                ? 'text-[#F5B93C]'
                                : 'text-[#D0D5DD] hover:text-[#F5B93C]'
                            }`}
                          >
                            <Star
                              className={`size-4 ${customer.isFavorite ? 'fill-[#F5B93C]' : ''}`}
                            />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleView(customer.id)}
                            className="font-semibold text-[#1D2733] text-[15px] hover:text-[#0E7C6B] transition-colors"
                          >
                            {customer.name}
                          </button>
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
                        {customer.tags && customer.tags.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {customer.tags.map((t) => (
                              <span
                                key={t}
                                className="px-1.5 py-0.5 rounded-full text-[11px] font-medium bg-[#E5F4EC] text-[#0E7C6B]"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="mt-2 space-y-1 text-[13px] text-[#5B6773]">
                          <div className="flex items-center gap-2">
                            <span className="text-[#98A2B3] w-8">电话</span>
                            <span>{customer.phone || '-'}</span>
                            {customer.phone && (
                              <button
                                type="button"
                                onClick={() => {
                                  void navigator.clipboard?.writeText(customer.phone ?? '');
                                  toast.success('电话已复制');
                                }}
                                title="复制电话"
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] text-[#0E7C6B] bg-[#E5F4EC] active:bg-[#0E7C6B] active:text-white transition-all"
                              >
                                复制
                              </button>
                            )}
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
            <div className="flex flex-wrap items-center justify-between gap-[10px] px-4 py-3 bg-white border-t border-[#E4E7EC] rounded-b-[10px]">
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
      <CustomerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        customer={editingCustomer}
        onSuccess={fetchList}
      />

      {/* 详情抽屉 */}
      <CustomerDetailDrawer
        customerId={drawerId}
        onClose={() => setDrawerId(null)}
        onSuccess={fetchList}
      />

      {/* 批量改阶段弹窗 */}
      <Dialog open={batchDialog === 'stage'} onOpenChange={(o) => { if (!o) setBatchDialog(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>批量修改阶段（{selectedIds.length} 条）</DialogTitle>
            <DialogDescription>将所选客户统一移动到该阶段</DialogDescription>
          </DialogHeader>
          <Select value={batchStage} onValueChange={(v) => setBatchStage(v as CustomerStage)}>
            <SelectTrigger className="w-full h-10 rounded-lg border border-[#E4E7EC]">
              <SelectValue placeholder="选择阶段" />
            </SelectTrigger>
            <SelectContent>
              {BATCH_STAGE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setBatchDialog(null)}>
              取消
            </Button>
            <Button type="button" onClick={handleBatchStage} disabled={batchSubmitting}>
              {batchSubmitting ? '处理中...' : '确认修改'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 批量打标签弹窗 */}
      <Dialog open={batchDialog === 'tags'} onOpenChange={(o) => { if (!o) setBatchDialog(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>批量打标签（{selectedIds.length} 条）</DialogTitle>
            <DialogDescription>选择的标签将覆盖式应用到所选客户（未选择的标签会被移除）</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-1.5">
              {[...new Set([...BATCH_TAG_PRESETS, ...batchTags])].map((t) => {
                const selected = batchTags.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleBatchTag(t)}
                    className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                      selected
                        ? 'bg-[#0E7C6B] border-[#0E7C6B] text-white'
                        : 'bg-white border-[#D0D5DD] text-[#5B6773] hover:border-[#0E7C6B] hover:text-[#0E7C6B]'
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-1.5">
              <Input
                value={batchTagInput}
                onChange={(e) => setBatchTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addBatchTag();
                  }
                }}
                placeholder="输入自定义标签，回车添加"
                className="h-9 text-xs"
              />
              <Button type="button" variant="outline" size="sm" onClick={addBatchTag} className="shrink-0">
                添加
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setBatchDialog(null)}>
              取消
            </Button>
            <Button type="button" onClick={handleBatchTags} disabled={batchSubmitting}>
              {batchSubmitting ? '处理中...' : '确认打标签'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 分配客户（管理员） */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>分配客户</DialogTitle>
            <DialogDescription>
              将「{assignTarget?.name ?? ''}」分配给员工，分配后该员工即可查看和跟进此客户。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#344054]">选择员工</label>
            <Select value={assignEmployeeId} onValueChange={setAssignEmployeeId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="请选择接收客户员工" />
              </SelectTrigger>
              <SelectContent>
                {assignEmployees
                  .filter((emp) => emp.role !== 'admin')
                  .map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name}（{emp.username}）
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAssignDialogOpen(false)}
              disabled={assignSubmitting}
            >
              取消
            </Button>
            <Button
              type="button"
              onClick={handleAssign}
              disabled={!assignEmployeeId || assignSubmitting}
            >
              {assignSubmitting ? '分配中...' : '确认分配'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 批量删除确认 */}
      <AlertDialog open={batchDialog === 'delete'} onOpenChange={(o) => { if (!o) setBatchDialog(null); }}>        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>批量删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除选中的 {selectedIds.length} 条客户吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={batchSubmitting}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBatchDelete}
              className="bg-rose-600 hover:bg-rose-700 text-white"
              disabled={batchSubmitting}
            >
              {batchSubmitting ? '删除中...' : '删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
