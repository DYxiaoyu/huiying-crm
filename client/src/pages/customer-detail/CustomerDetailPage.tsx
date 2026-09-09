import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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

const STAGE_DOT_COLORS: Record<CustomerStage, string> = {
  new: '#64748B',
  contacted: '#2563EB',
  following: '#D97706',
  closed: '#059669',
  lost: '#DC2626',
};

const STAGE_OPTIONS: { value: CustomerStage; label: string }[] = [
  { value: 'new', label: '新客户' },
  { value: 'contacted', label: '已联系' },
  { value: 'following', label: '跟进中' },
  { value: 'closed', label: '已成交' },
  { value: 'lost', label: '已流失' },
];

const customerEditSchema = z.object({
  name: z.string().min(1, '请输入客户姓名'),
  phone: z.string().optional(),
  company: z.string().optional(),
  source: z.string().optional(),
  stage: z.custom<CustomerStage>((val) => {
    return ['new', 'contacted', 'following', 'closed', 'lost'].includes(
      val as string
    );
  }),
  remark: z.string().optional(),
});

type CustomerEditFormValues = z.infer<typeof customerEditSchema>;

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

const CustomerDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const editForm = useForm<CustomerEditFormValues>({
    resolver: zodResolver(customerEditSchema),
    defaultValues: {
      name: '',
      phone: '',
      company: '',
      source: '',
      stage: 'new',
      remark: '',
    },
  });

  const followForm = useForm<FollowUpFormValues>({
    resolver: zodResolver(followUpSchema),
    defaultValues: {
      content: '',
      result: '',
      followAt: getLocalDatetimeNow(),
    },
  });

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [cust, list] = await Promise.all([
        customersApi.getDetail(id),
        followUpsApi.listByCustomer(id),
      ]);
      setCustomer(cust);
      setFollowUps(list);
    } catch (err) {
      logger.error('加载客户详情失败', err as Error);
      setError('加载失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, [id]);

  const handleEnterEdit = () => {
    if (!customer) return;
    editForm.reset({
      name: customer.name,
      phone: customer.phone ?? '',
      company: customer.company ?? '',
      source: customer.source ?? '',
      stage: customer.stage,
      remark: customer.remark ?? '',
    });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSaveEdit = async (values: CustomerEditFormValues) => {
    if (!id || !customer) return;
    try {
      const dto: UpdateCustomerDto = {
        name: values.name,
        phone: values.phone || undefined,
        company: values.company || undefined,
        source: values.source || undefined,
        stage: values.stage,
        remark: values.remark || undefined,
      };
      const updated = await customersApi.update(id, dto);
      setCustomer(updated);
      setIsEditing(false);
    } catch (err) {
      logger.error('更新客户失败', err as Error);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      await customersApi.remove(id);
      setDeleteDialogOpen(false);
      navigate('/customers');
    } catch (err) {
      logger.error('删除客户失败', err as Error);
    } finally {
      setDeleting(false);
    }
  };

  const handleAddFollowUp = async (values: FollowUpFormValues) => {
    if (!id) return;
    try {
      await followUpsApi.create({
        customerId: id,
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
    } catch (err) {
      logger.error('添加跟进失败', err as Error);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-sm text-slate-500">加载中...</div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="p-6">
        <div className="rounded-[10px] border border-[#E4E7EC] bg-white p-5 shadow-sm">
          <p className="text-sm text-rose-600">{error || '客户不存在'}</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate('/customers')}
          >
            返回列表
          </Button>
        </div>
      </div>
    );
  }

  const sortedFollowUps = [...followUps].sort(
    (a, b) => new Date(b.followAt).getTime() - new Date(a.followAt).getTime()
  );
  const dotColor = STAGE_DOT_COLORS[customer.stage];

  const infoFields: { label: string; value: string }[] = [
    { label: '姓名', value: customer.name },
    { label: '电话', value: customer.phone || '-' },
    { label: '公司', value: customer.company || '-' },
    { label: '来源', value: customer.source || '-' },
    { label: '阶段', value: STAGE_NAMES[customer.stage] },
    { label: '备注', value: customer.remark || '-' },
    { label: '最近跟进', value: formatDateTime(customer.lastFollowAt) },
    { label: '创建时间', value: formatDateTime(customer.createdAt) },
    { label: '更新时间', value: formatDateTime(customer.updatedAt) },
  ];

  return (
    <div className="p-6 flex flex-col gap-4">
      {/* 返回链接 */}
      <Link
        to="/customers"
        className="inline-flex items-center gap-1 text-[13px] text-[#5B6773] hover:text-primary transition-colors w-fit"
      >
        <ArrowLeft className="size-4" />
        <span>返回客户列表</span>
      </Link>

      {/* 两栏布局 */}
      <div
        className="grid items-start"
        style={{ gridTemplateColumns: '1fr 1.4fr', gap: '18px' }}
      >
        {/* 左侧：客户信息卡 */}
        <div className="rounded-[10px] border border-[#E4E7EC] bg-white shadow-sm">
          {/* 卡片头 */}
          <div
            className="flex items-center justify-between border-b border-[#E4E7EC]"
            style={{ padding: '14px 18px' }}
          >
            <div className="text-[14px] font-semibold text-[#1D2733]">
              客户信息
            </div>
            <div className="flex items-center gap-2">
              {!isEditing ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEnterEdit}
                    data-ai-section-type="button"
                  >
                    编辑
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setDeleteDialogOpen(true)}
                    data-ai-section-type="button"
                    className="bg-[#FDECEC] text-[#DC2626] border-[#FDECEC] hover:bg-[#FBDCDC] no-default-hover-elevate"
                  >
                    <Trash2 className="size-3.5" />
                    删除客户
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelEdit}
                    data-ai-section-type="button"
                  >
                    取消
                  </Button>
                  <Button
                    size="sm"
                    onClick={editForm.handleSubmit(handleSaveEdit)}
                    disabled={editForm.formState.isSubmitting}
                    data-ai-section-type="button"
                  >
                    {editForm.formState.isSubmitting ? '保存中...' : '保存'}
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* 卡片体 */}
          <div style={{ padding: '18px' }}>
            {!isEditing ? (
              <div className="flex flex-col">
                {infoFields.map((field, idx) => (
                  <div
                    key={field.label}
                    className="flex items-start"
                    style={{
                      padding: '9px 0',
                      borderBottom:
                        idx === infoFields.length - 1
                          ? 'none'
                          : '1px dashed #E4E7EC',
                    }}
                  >
                    <div
                      className="text-[13px] text-[#98A2B3] shrink-0"
                      style={{ width: '76px' }}
                    >
                      {field.label}
                    </div>
                    <div
                      className="flex-1 text-[14px] text-[#1D2733] break-all whitespace-pre-wrap"
                    >
                      {field.value}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Form {...editForm}>
                <form
                  onSubmit={editForm.handleSubmit(handleSaveEdit)}
                  className="flex flex-col gap-3"
                >
                  <FormField
                    control={editForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[13px] text-[#5B6773]">
                          姓名
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="请输入客户姓名" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[13px] text-[#5B6773]">
                          电话
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="请输入电话" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="company"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[13px] text-[#5B6773]">
                          公司
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="请输入公司名称" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="source"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[13px] text-[#5B6773]">
                          来源
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="请输入客户来源" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="stage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[13px] text-[#5B6773]">
                          阶段
                        </FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="请选择阶段" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {STAGE_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="remark"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[13px] text-[#5B6773]">
                          备注
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="请输入备注信息"
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
            )}
          </div>
        </div>

        {/* 右侧：跟进记录卡 */}
        <div className="rounded-[10px] border border-[#E4E7EC] bg-white shadow-sm">
          {/* 卡片头 */}
          <div
            className="flex items-center justify-between border-b border-[#E4E7EC]"
            style={{ padding: '14px 18px' }}
          >
            <div className="text-[14px] font-semibold text-[#1D2733]">
              跟进记录
            </div>
            <div className="text-[12px] text-[#98A2B3]">
              每次跟进请及时记录
            </div>
          </div>

          {/* 卡片体 */}
          <div style={{ padding: '18px' }}>
            {/* 时间线 */}
            {sortedFollowUps.length === 0 ? (
              <div className="py-8 text-center text-[13px] text-[#98A2B3]">
                暂无跟进记录
              </div>
            ) : (
              <ul className="relative list-none m-0 p-0">
                {/* 竖线 */}
                <span
                  className="absolute"
                  style={{
                    left: '7px',
                    top: '8px',
                    bottom: '8px',
                    width: '2px',
                    backgroundColor: '#E4E7EC',
                  }}
                />
                {sortedFollowUps.map((item, idx) => (
                  <li
                    key={item.id}
                    className="relative"
                    style={{
                      padding:
                        idx === sortedFollowUps.length - 1
                          ? '0 0 0 30px'
                          : '0 0 18px 30px',
                    }}
                  >
                    {/* 圆点 */}
                    <span
                      className="absolute rounded-full bg-white"
                      style={{
                        left: 0,
                        top: '4px',
                        width: '16px',
                        height: '16px',
                        border: `3px solid ${dotColor}`,
                      }}
                    />
                    <div
                      className="text-[12px] text-[#98A2B3]"
                      style={{ marginBottom: '2px' }}
                    >
                      {formatDateTime(item.followAt)}
                    </div>
                    <div
                      className="text-[14px] text-[#1D2733] whitespace-pre-wrap break-all"
                    >
                      {item.content}
                    </div>
                    {item.result && (
                      <div
                        className="text-[12px] text-[#5B6773] inline-block rounded-[6px] bg-[#F2F4F7]"
                        style={{ marginTop: '4px', padding: '2px 8px' }}
                      >
                        {item.result}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {/* 添加跟进表单 */}
            <Form {...followForm}>
              <form
                onSubmit={followForm.handleSubmit(handleAddFollowUp)}
                className="rounded-[8px] bg-[#F2F4F7]"
                style={{ padding: '14px', marginTop: '16px' }}
              >
                <div
                  className="text-[13px] font-semibold text-[#1D2733]"
                  style={{ marginBottom: '8px' }}
                >
                  添加跟进
                </div>
                <FormField
                  control={followForm.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          placeholder="请输入跟进内容"
                          className="w-full rounded-[8px] border border-[#E4E7EC] bg-white outline-none resize-y min-h-[64px] shadow-none focus-visible:ring-1 focus-visible:ring-primary/30"
                          style={{ padding: '8px 10px' }}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div
                  className="flex items-center flex-wrap"
                  style={{ gap: '10px', marginTop: '10px' }}
                >
                  <FormField
                    control={followForm.control}
                    name="followAt"
                    render={({ field }) => (
                      <FormItem className="mb-0">
                        <FormControl>
                          <Input
                            type="datetime-local"
                            className="rounded-[8px] border border-[#E4E7EC] bg-white outline-none shadow-none focus-visible:ring-1 focus-visible:ring-primary/30"
                            style={{ padding: '7px 10px' }}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={followForm.control}
                    name="result"
                    render={({ field }) => (
                      <FormItem className="mb-0 flex-1 min-w-[160px]">
                        <FormControl>
                          <Input
                            placeholder="结果（选填）"
                            className="rounded-[8px] border border-[#E4E7EC] bg-white outline-none shadow-none focus-visible:ring-1 focus-visible:ring-primary/30"
                            style={{ padding: '7px 10px' }}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex-1" />
                  <Button
                    type="submit"
                    disabled={followForm.formState.isSubmitting}
                    data-ai-section-type="button"
                    className="bg-[#0E7C6B] text-white hover:bg-[#0B6356]"
                    style={{ padding: '8px 14px', borderRadius: '8px' }}
                  >
                    {followForm.formState.isSubmitting ? '保存中...' : '保存'}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      </div>

      {/* 删除确认对话框 */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除客户「{customer.name}」吗？此操作不可撤销，该客户的所有跟进记录也会被一并删除。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
              data-ai-section-type="button"
            >
              {deleting ? '删除中...' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomerDetailPage;
