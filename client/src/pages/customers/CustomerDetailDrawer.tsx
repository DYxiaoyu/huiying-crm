import { useCallback, useEffect, useState } from 'react';
import { X, Phone, Trash2, Star } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import * as customersApi from '@/api/customers';
import * as followUpsApi from '@/api/follow-ups';
import type {
  Customer,
  CustomerStage,
  FollowUp,
  UpdateCustomerDto,
} from '@shared/api.interface';
import { STAGE_NAMES } from '@shared/api.interface';
import { CustomerDialog } from './CustomerDialog';
import { showConfirm } from '@lark-apaas/client-toolkit';

const STAGE_DOT_COLORS: Record<CustomerStage, string> = {
  new: '#64748B',
  contacted: '#2563EB',
  following: '#D97706',
  quoted: '#0891B2',
  negotiating: '#7C3AED',
  closed: '#059669',
  lost: '#DC2626',
  invalid: '#6B7280',
  duplicate: '#B45309',
};

const followUpSchema = z.object({
  content: z.string().min(1, '请输入跟进内容'),
  result: z.string().optional(),
  followAt: z.string().min(1, '请选择跟进时间'),
});

type FollowUpFormValues = z.infer<typeof followUpSchema>;

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '-';
  const date = new Date(value);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${hh}:${mm}`;
}

function getLocalDatetimeNow(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d}T${hh}:${mm}`;
}

interface CustomerDetailDrawerProps {
  customerId: string | null;
  onClose: () => void;
  onSuccess?: () => void;
}

/** 客户详情抽屉：信息 + 标签 + 编辑 + 跟进记录时间线（复用详情页核心能力） */
export function CustomerDetailDrawer({
  customerId,
  onClose,
  onSuccess,
}: CustomerDetailDrawerProps) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const followForm = useForm<FollowUpFormValues>({
    resolver: zodResolver(followUpSchema),
    defaultValues: {
      content: '',
      result: '',
      followAt: getLocalDatetimeNow(),
    },
  });

  const fetchData = useCallback(async () => {
    if (!customerId) return;
    setLoading(true);
    try {
      const [cust, list] = await Promise.all([
        customersApi.getDetail(customerId),
        followUpsApi.listByCustomer(customerId),
      ]);
      setCustomer(cust);
      setFollowUps(list);
    } catch (err) {
      logger.error('加载客户详情失败', err as Error);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    if (customerId) {
      setCustomer(null);
      setFollowUps([]);
      void fetchData();
    }
  }, [customerId, fetchData]);

  const handleAddFollowUp = async (values: FollowUpFormValues) => {
    if (!customerId) return;
    try {
      await followUpsApi.create({
        customerId,
        content: values.content,
        result: values.result || undefined,
        followAt: new Date(values.followAt).toISOString(),
      });
      followForm.reset({
        content: '',
        result: '',
        followAt: getLocalDatetimeNow(),
      });
      void fetchData();
      onSuccess?.();
    } catch (err) {
      logger.error('添加跟进失败', err as Error);
    }
  };

  const handleToggleFavorite = async () => {
    if (!customer) return;
    try {
      const updated = await customersApi.update(customer.id, {
        isFavorite: !customer.isFavorite,
      });
      setCustomer(updated);
      onSuccess?.();
      toast.success(updated.isFavorite ? '已收藏' : '已取消收藏');
    } catch (err) {
      logger.error('收藏操作失败', err as Error);
    }
  };

  const handleDelete = async () => {
    if (!customer) return;
    const confirmed = await showConfirm('确定要删除该客户吗？此操作不可撤销。');
    if (!confirmed) return;
    setDeleting(true);
    try {
      await customersApi.remove(customer.id);
      toast.success('客户已删除');
      onClose();
      onSuccess?.();
    } catch (err) {
      logger.error('删除客户失败', err as Error);
    } finally {
      setDeleting(false);
    }
  };

  const sortedFollowUps = [...followUps].sort(
    (a, b) => new Date(b.followAt).getTime() - new Date(a.followAt).getTime()
  );

  return (
    <>
      {/* 遮罩 */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />
      {/* 抽屉 */}
      <div className="fixed right-0 top-0 h-full w-full max-w-[480px] bg-[#F7F9FA] z-50 shadow-2xl flex flex-col overflow-hidden">
        {/* 头部 */}
        <div className="bg-white border-b border-[#E4E7EC] px-5 py-4 flex items-center justify-between shrink-0">
          <div className="text-[15px] font-semibold text-[#1D2733] flex items-center gap-2">
            {customer && (
              <span
                className="inline-block size-2 rounded-full"
                style={{ background: STAGE_DOT_COLORS[customer.stage] }}
              />
            )}
            客户详情
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-[#5B6773] hover:bg-[#F2F4F7] transition-colors"
            aria-label="关闭"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {loading && !customer ? (
            <div className="text-center py-12 text-sm text-[#98A2B3]">
              加载中...
            </div>
          ) : !customer ? (
            <div className="text-center py-12 text-sm text-[#98A2B3]">
              客户不存在
            </div>
          ) : (
            <>
              {/* 客户信息卡 */}
              <div className="rounded-xl border border-[#E4E7EC] bg-white shadow-sm">
                <div className="px-4 py-3.5 border-b border-[#E4E7EC] flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-semibold text-[15px] text-[#1D2733] truncate">
                      {customer.name}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${
                        customer.stage === 'closed'
                          ? 'bg-emerald-50 text-emerald-700'
                          : customer.stage === 'lost'
                            ? 'bg-red-50 text-red-600'
                            : customer.stage === 'invalid'
                              ? 'bg-gray-100 text-gray-600'
                              : customer.stage === 'duplicate'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-blue-50 text-blue-700'
                      }`}
                    >
                      <span
                        className="size-1.5 rounded-full"
                        style={{ background: STAGE_DOT_COLORS[customer.stage] }}
                      />
                      {STAGE_NAMES[customer.stage]}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleFavorite}
                    className={`p-2 rounded-lg transition-colors ${
                      customer.isFavorite
                        ? 'text-[#F5B93C] bg-amber-50'
                        : 'text-[#D0D5DD] hover:text-[#F5B93C]'
                    }`}
                    aria-label="收藏"
                  >
                    <Star
                      className={`size-4 ${customer.isFavorite ? 'fill-[#F5B93C]' : ''}`}
                    />
                  </button>
                </div>

                <div className="px-4 py-3 flex flex-col">
                  {customer.tags && customer.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pb-3 mb-1 border-b border-dashed border-[#E4E7EC]">
                      {customer.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#E5F4EC] text-[#0E7C6B]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  {[
                    ['电话', customer.phone || '-'],
                    ['公司', customer.company || '-'],
                    ['来源', customer.source || '-'],
                    ['备注', customer.remark || '-'],
                    ['最近跟进', formatDateTime(customer.lastFollowAt)],
                    ['创建时间', formatDateTime(customer.createdAt)],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="flex items-start py-2 border-b border-dashed border-[#E4E7EC] last:border-none"
                    >
                      <div className="text-[13px] text-[#98A2B3] shrink-0 w-16">
                        {label}
                      </div>
                      <div className="flex-1 text-[14px] text-[#1D2733] break-all whitespace-pre-wrap">
                        {value}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="px-4 pb-3.5 flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditOpen(true)}
                  >
                    编辑
                  </Button>
                  {customer.phone && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        void navigator.clipboard?.writeText(customer.phone ?? '');
                        toast.success('电话已复制');
                      }}
                    >
                      <Phone className="size-3.5" />
                      复制电话
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="ml-auto text-[#DC2626] border-[#FDECEC] bg-[#FDECEC] hover:bg-[#FBDCDC]"
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    <Trash2 className="size-3.5" />
                    {deleting ? '删除中...' : '删除'}
                  </Button>
                </div>
              </div>

              {/* 添加跟进 */}
              <div className="rounded-xl border border-[#E4E7EC] bg-white shadow-sm p-4">
                <div className="text-[14px] font-semibold text-[#1D2733] mb-3">
                  添加跟进
                </div>
                <Form {...followForm}>
                  <form
                    onSubmit={followForm.handleSubmit(handleAddFollowUp)}
                    className="flex flex-col gap-3"
                  >
                    <FormField
                      control={followForm.control}
                      name="content"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>跟进内容</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="记录本次沟通内容..."
                              rows={3}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <FormField
                        control={followForm.control}
                        name="result"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>跟进结果（可选）</FormLabel>
                            <Select
                              value={field.value || ''}
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="选择结果" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="">未选择</SelectItem>
                                <SelectItem value="已联系">已联系</SelectItem>
                                <SelectItem value="已报价">已报价</SelectItem>
                                <SelectItem value="意向明确">意向明确</SelectItem>
                                <SelectItem value="暂无意向">暂无意向</SelectItem>
                                <SelectItem value="已成交">已成交</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={followForm.control}
                        name="followAt"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>跟进时间</FormLabel>
                            <FormControl>
                              <input
                                type="datetime-local"
                                className="w-full h-10 px-3 rounded-md border border-[#E4E7EC] text-sm outline-none focus:border-primary"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={followForm.formState.isSubmitting}
                      className="self-end"
                    >
                      {followForm.formState.isSubmitting ? '保存中...' : '保存跟进'}
                    </Button>
                  </form>
                </Form>
              </div>

              {/* 跟进时间线 */}
              <div className="rounded-xl border border-[#E4E7EC] bg-white shadow-sm p-4">
                <div className="text-[14px] font-semibold text-[#1D2733] mb-3">
                  跟进记录（{followUps.length}）
                </div>
                {sortedFollowUps.length === 0 ? (
                  <div className="text-center py-8 text-sm text-[#98A2B3]">
                    暂无跟进记录，添加第一条跟进吧
                  </div>
                ) : (
                  <div className="relative pl-5">
                    <div className="absolute left-1.5 top-1 bottom-1 w-px bg-[#E4E7EC]" />
                    {sortedFollowUps.map((f) => (
                      <div key={f.id} className="relative pb-5 last:pb-0">
                        <span className="absolute -left-[17px] top-1.5 size-3 rounded-full bg-[#0E7C6B] ring-2 ring-white" />
                        <div className="text-[13px] font-medium text-[#1D2733]">
                          {formatDateTime(f.followAt)}
                        </div>
                        <div className="mt-1 text-[13px] text-[#5B6773] whitespace-pre-wrap">
                          {f.content}
                        </div>
                        {f.result && (
                          <div className="mt-1.5 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-blue-50 text-blue-700">
                            {f.result}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 编辑弹窗（复用 CustomerDialog，含标签） */}
      <CustomerDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        customer={customer}
        onSuccess={() => {
          void fetchData();
          onSuccess?.();
        }}
      />
    </>
  );
}

export default CustomerDetailDrawer;
