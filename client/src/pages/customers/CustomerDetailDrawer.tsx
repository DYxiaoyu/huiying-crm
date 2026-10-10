import { useCallback, useEffect, useRef, useState } from 'react';
import { X, Phone, Trash2, Star, Paperclip, Download, Loader2, Users, Pencil, Plus } from 'lucide-react';
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
import { Input } from '@/components/ui/input';

import * as customersApi from '@/api/customers';
import * as followUpsApi from '@/api/follow-ups';
import type {
  Customer,
  CustomerContact,
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
  const [contacts, setContacts] = useState<CustomerContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // 联系人表单
  const [contactFormOpen, setContactFormOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<CustomerContact | null>(null);
  const [contactName, setContactName] = useState('');
  const [contactPosition, setContactPosition] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactWechat, setContactWechat] = useState('');
  const [contactSubmitting, setContactSubmitting] = useState(false);

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
      const [cust, list, contactList] = await Promise.all([
        customersApi.getDetail(customerId),
        followUpsApi.listByCustomer(customerId),
        customersApi.listContacts(customerId),
      ]);
      setCustomer(cust);
      setFollowUps(list);
      setContacts(contactList);
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
      setContacts([]);
      void fetchData();
    }
  }, [customerId, fetchData]);

  // ===================== 联系人 =====================
  const openAddContact = () => {
    setEditingContact(null);
    setContactName('');
    setContactPosition('');
    setContactPhone('');
    setContactWechat('');
    setContactFormOpen(true);
  };

  const openEditContact = (contact: CustomerContact) => {
    setEditingContact(contact);
    setContactName(contact.name);
    setContactPosition(contact.position ?? '');
    setContactPhone(contact.phone ?? '');
    setContactWechat(contact.wechat ?? '');
    setContactFormOpen(true);
  };

  const handleContactSubmit = async () => {
    if (!customerId) return;
    if (!contactName.trim()) {
      toast.error('联系人姓名不能为空');
      return;
    }
    setContactSubmitting(true);
    try {
      if (editingContact) {
        await customersApi.updateContact(customerId, editingContact.id, {
          name: contactName.trim(),
          position: contactPosition || undefined,
          phone: contactPhone || undefined,
          wechat: contactWechat || undefined,
        });
        toast.success('联系人已更新');
      } else {
        await customersApi.addContact(customerId, {
          name: contactName.trim(),
          position: contactPosition || undefined,
          phone: contactPhone || undefined,
          wechat: contactWechat || undefined,
        });
        toast.success('联系人已添加');
      }
      setContactFormOpen(false);
      void fetchData();
      onSuccess?.();
    } catch (err) {
      logger.error('保存联系人失败', err as Error);
      toast.error('保存失败，请重试');
    } finally {
      setContactSubmitting(false);
    }
  };

  const handleRemoveContact = async (contact: CustomerContact) => {
    if (!customerId) return;
    const confirmed = await showConfirm(`确定删除联系人「${contact.name}」吗？`);
    if (!confirmed) return;
    try {
      await customersApi.removeContact(customerId, contact.id);
      toast.success('联系人已删除');
      void fetchData();
    } catch (err) {
      logger.error('删除联系人失败', err as Error);
      toast.error('删除失败，请重试');
    }
  };

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
    const confirmed = await showConfirm('确定将该客户移入回收站吗？30 天内可在回收站恢复。');
    if (!confirmed) return;
    setDeleting(true);
    try {
      await customersApi.remove(customer.id);
      toast.success('客户已移入回收站');
      onClose();
      onSuccess?.();
    } catch (err) {
      logger.error('删除客户失败', err as Error);
    } finally {
      setDeleting(false);
    }
  };

  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUploadAttachment = async (file?: File | null) => {
    if (!file || !customer) return;
    if (file.size > 50 * 1024 * 1024) {
      toast.error('单个附件最大 50MB');
      return;
    }
    setUploading(true);
    try {
      const updated = await customersApi.uploadAttachment(customer.id, file);
      setCustomer(updated);
      onSuccess?.();
      toast.success('附件已上传');
    } catch (err) {
      logger.error('上传附件失败', err as Error);
      toast.error('附件上传失败，请重试');
    } finally {
      setUploading(false);
      if (attachmentInputRef.current) attachmentInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = async (url: string) => {
    if (!customer) return;
    const confirmed = await showConfirm('确定移除该附件吗？（磁盘文件仍保留在文件管理）');
    if (!confirmed) return;
    try {
      const updated = await customersApi.removeAttachment(customer.id, url);
      setCustomer(updated);
      onSuccess?.();
      toast.success('附件已移除');
    } catch (err) {
      logger.error('移除附件失败', err as Error);
    }
  };

  const isImage = (type: string, name: string): boolean => {
    return /^image\//.test(type) || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(name);
  };

  /** 附件是否到期标红（下次跟进在今天之内/已过期） */
  const nextFollowDue = (): boolean => {
    if (!customer?.nextFollowAt) return false;
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return new Date(customer.nextFollowAt).getTime() <= end.getTime();
  };

  const sortedFollowUps = [...followUps].sort(
    (a, b) => new Date(b.followAt).getTime() - new Date(a.followAt).getTime()
  );

  // 未指定客户时不渲染（避免出现空抽屉壳）
  if (!customerId) return null;

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
                    ['成交金额', customer.dealAmount ? `¥${Number(customer.dealAmount).toLocaleString('zh-CN', { maximumFractionDigits: 2 })}` : '-'],
                    ['预计成交金额', customer.expectedAmount ? `¥${Number(customer.expectedAmount).toLocaleString('zh-CN', { maximumFractionDigits: 2 })}` : '-'],
                    ['下次跟进', customer.nextFollowAt ? formatDateTime(customer.nextFollowAt) : '-'],
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
                      <div
                        className={`flex-1 text-[14px] break-all whitespace-pre-wrap ${
                          label === '下次跟进' && nextFollowDue()
                            ? 'text-[#DC2626] font-medium'
                            : 'text-[#1D2733]'
                        }`}
                      >
                        {value}
                        {label === '下次跟进' && nextFollowDue() && (
                          <span className="ml-2 text-[11px] font-medium px-1.5 py-0.5 rounded bg-red-50 text-[#DC2626]">
                            已到期
                          </span>
                        )}
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
                    {deleting ? '删除中...' : '移入回收站'}
                  </Button>
                </div>
              </div>

              {/* 客户联系人（多联系人） */}
              <div className="rounded-xl border border-[#E4E7EC] bg-white shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[14px] font-semibold text-[#1D2733] flex items-center gap-1.5">
                    <Users className="size-4 text-[#5B6773]" />
                    联系人
                    <span className="text-[12px] font-normal text-[#98A2B3]">
                      （{contacts.length} 个）
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={openAddContact}
                  >
                    <Plus className="size-3.5" />
                    添加联系人
                  </Button>
                </div>

                {contacts.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {contacts.map((contact) => (
                      <div
                        key={contact.id}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-[#E4E7EC] bg-[#F9FAFB]"
                      >
                        <div className="size-9 rounded-full bg-[#0E7C6B] text-white flex items-center justify-center text-[13px] font-semibold shrink-0">
                          {contact.name.slice(0, 1)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[13px] font-medium text-[#1D2733]">
                              {contact.name}
                            </span>
                            {contact.position && (
                              <span className="px-1.5 py-0.5 rounded-full text-[11px] bg-blue-50 text-blue-700">
                                {contact.position}
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 text-[12px] text-[#5B6773] flex items-center gap-3 flex-wrap">
                            {contact.phone && (
                              <span className="inline-flex items-center gap-1">
                                <Phone className="size-3" />
                                {contact.phone}
                              </span>
                            )}
                            {contact.wechat && (
                              <span>微信：{contact.wechat}</span>
                            )}
                            {!contact.phone && !contact.wechat && (
                              <span className="text-[#98A2B3]">无联系方式</span>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="p-1.5 rounded-md text-[#5B6773] hover:bg-[#E4E7EC] transition-colors"
                          title="编辑联系人"
                          onClick={() => openEditContact(contact)}
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          type="button"
                          className="p-1.5 rounded-md text-[#98A2B3] hover:bg-[#FDECEC] hover:text-[#DC2626] transition-colors"
                          title="删除联系人"
                          onClick={() => void handleRemoveContact(contact)}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-[12px] text-[#98A2B3]">
                    暂无联系人，可添加职位/电话/微信等信息
                  </div>
                )}
              </div>

              {/* 客户附件（报价单/聊天截图等） */}
              <div className="rounded-xl border border-[#E4E7EC] bg-white shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[14px] font-semibold text-[#1D2733] flex items-center gap-1.5">
                    <Paperclip className="size-4 text-[#5B6773]" />
                    附件
                    <span className="text-[12px] font-normal text-[#98A2B3]">
                      （{customer.attachments?.length ?? 0} 个）
                    </span>
                  </div>
                  <input
                    ref={attachmentInputRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => void handleUploadAttachment(e.target.files?.[0])}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={uploading}
                    onClick={() => attachmentInputRef.current?.click()}
                  >
                    {uploading ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Paperclip className="size-3.5" />
                    )}
                    {uploading ? '上传中...' : '上传附件'}
                  </Button>
                </div>

                {customer.attachments && customer.attachments.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {customer.attachments.map((att) => (
                      <div
                        key={att.url}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg border border-[#E4E7EC] bg-[#F9FAFB]"
                      >
                        {isImage(att.type, att.name) ? (
                          <img
                            src={att.url}
                            alt={att.name}
                            className="size-10 rounded-md object-cover shrink-0 border border-[#E4E7EC]"
                          />
                        ) : (
                          <div className="size-10 rounded-md bg-[#E5F4EC] text-[#0E7C6B] flex items-center justify-center shrink-0">
                            <Paperclip className="size-4" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] text-[#1D2733] truncate">
                            {att.name}
                          </div>
                          <div className="text-[11px] text-[#98A2B3]">
                            {att.size > 0 ? `${(att.size / 1024 / 1024).toFixed(1)}MB` : ''}
                            {att.uploadedAt ? ` · ${formatDateTime(att.uploadedAt)}` : ''}
                          </div>
                        </div>
                        <a
                          href={att.url}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-md text-[#5B6773] hover:bg-[#E4E7EC] transition-colors"
                          title="查看/下载"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Download className="size-4" />
                        </a>
                        <button
                          type="button"
                          className="p-1.5 rounded-md text-[#98A2B3] hover:bg-[#FDECEC] hover:text-[#DC2626] transition-colors"
                          title="移除附件"
                          onClick={() => void handleRemoveAttachment(att.url)}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-[12px] text-[#98A2B3]">
                    暂无附件，可上传报价单、聊天截图等（单个≤50MB）
                  </div>
                )}
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

      {/* 联系人表单弹层 */}
      {contactFormOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-[60]"
            onClick={() => !contactSubmitting && setContactFormOpen(false)}
          />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] max-w-[400px] bg-white rounded-xl shadow-2xl z-[70] p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[15px] font-semibold text-[#1D2733]">
                {editingContact ? '编辑联系人' : '添加联系人'}
              </div>
              <button
                type="button"
                onClick={() => setContactFormOpen(false)}
                className="p-1.5 rounded-lg text-[#98A2B3] hover:bg-[#F2F4F7] transition-colors"
                aria-label="关闭"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[13px] font-medium text-[#344054]">
                  姓名 <span className="text-[#DC2626]">*</span>
                </label>
                <Input
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="联系人姓名"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-[13px] font-medium text-[#344054]">职位</label>
                <Input
                  value={contactPosition}
                  onChange={(e) => setContactPosition(e.target.value)}
                  placeholder="如：采购经理"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-[13px] font-medium text-[#344054]">电话</label>
                <Input
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="如：+7 912 345-67-89"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-[13px] font-medium text-[#344054]">微信</label>
                <Input
                  value={contactWechat}
                  onChange={(e) => setContactWechat(e.target.value)}
                  placeholder="微信号 / WhatsApp"
                  className="mt-1"
                />
              </div>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setContactFormOpen(false)}
                disabled={contactSubmitting}
              >
                取消
              </Button>
              <Button
                type="button"
                onClick={() => void handleContactSubmit()}
                disabled={contactSubmitting}
              >
                {contactSubmitting ? '保存中...' : '保存'}
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default CustomerDetailDrawer;
