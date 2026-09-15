import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertTriangle } from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import * as customersApi from '@/api/customers';
import type {
  CreateCustomerDto,
  Customer,
  CustomerStage,
  DuplicateCheckResult,
  UpdateCustomerDto,
} from '@shared/api.interface';
import { showConfirm } from '@lark-apaas/client-toolkit';

const customerSchema = z.object({
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

type CustomerFormValues = z.infer<typeof customerSchema>;

interface CustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer | null;
  onSuccess?: () => void;
}

const STAGE_OPTIONS: { value: CustomerStage; label: string }[] = [
  { value: 'new', label: '新客户' },
  { value: 'contacted', label: '已联系' },
  { value: 'following', label: '跟进中' },
  { value: 'closed', label: '已成交' },
  { value: 'lost', label: '已流失' },
];

export function CustomerDialog({
  open,
  onOpenChange,
  customer,
  onSuccess,
}: CustomerDialogProps) {
  const isEdit = !!customer;
  const [duplicateResult, setDuplicateResult] =
    useState<DuplicateCheckResult | null>(null);
  const [checking, setChecking] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: '',
      phone: '',
      company: '',
      source: '',
      stage: 'new',
      remark: '',
    },
  });

  const nameValue = form.watch('name');
  const phoneValue = form.watch('phone');

  useEffect(() => {
    if (open) {
      if (customer) {
        form.reset({
          name: customer.name,
          phone: customer.phone ?? '',
          company: customer.company ?? '',
          source: customer.source ?? '',
          stage: customer.stage,
          remark: customer.remark ?? '',
        });
      } else {
        form.reset({
          name: '',
          phone: '',
          company: '',
          source: '',
          stage: 'new',
          remark: '',
        });
      }
      setDuplicateResult(null);
    }
  }, [open, customer, form]);

  // 查重：姓名或电话变化时，防抖 300ms 调用接口
  useEffect(() => {
    if (!open) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const trimmedName = nameValue?.trim();
    const trimmedPhone = phoneValue?.trim();

    // 姓名和电话都为空时不查
    if (!trimmedName && !trimmedPhone) {
      setDuplicateResult(null);
      return;
    }

    debounceTimerRef.current = setTimeout(async () => {
      setChecking(true);
      try {
        const res = await customersApi.checkDuplicate({
          name: trimmedName || undefined,
          phone: trimmedPhone || undefined,
          excludeId: customer?.id,
        });
        setDuplicateResult(res);
      } catch (error) {
        logger.error('查重失败', error as Error);
        setDuplicateResult(null);
      } finally {
        setChecking(false);
      }
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [nameValue, phoneValue, open, customer]);

  const onSubmit = async (values: CustomerFormValues) => {
    // 提交时主动做一次查重（避免 debounce 未触发就提交）
    const trimmedName = values.name?.trim();
    const trimmedPhone = values.phone?.trim();
    let result = duplicateResult;
    if (trimmedName || trimmedPhone) {
      try {
        result = await customersApi.checkDuplicate({
          name: trimmedName || undefined,
          phone: trimmedPhone || undefined,
          excludeId: customer?.id,
        });
        setDuplicateResult(result);
      } catch (error) {
        logger.error('查重失败', error as Error);
      }
    }

    // 查重提示 - 发现重复时二次确认
    if (result?.hasDuplicate) {
      const dupName = result.duplicateName;
      const dupPhone = result.duplicatePhone;
      let msg = '';
      if (dupName && dupPhone) {
        msg = `已存在客户"${dupName}"（电话：${dupPhone}），确认继续${isEdit ? '编辑' : '新增'}吗？`;
      } else if (dupName) {
        msg = `已存在同名客户"${dupName}"，确认继续${isEdit ? '编辑' : '新增'}吗？`;
      } else if (dupPhone) {
        msg = `已存在同电话客户（电话：${dupPhone}），确认继续${isEdit ? '编辑' : '新增'}吗？`;
      } else {
        msg = `已存在重复客户，确认继续${isEdit ? '编辑' : '新增'}吗？`;
      }
      const confirmed = await showConfirm(msg);
      if (!confirmed) return;
    }

    try {
      if (isEdit && customer) {
        const dto: UpdateCustomerDto = {
          name: values.name,
          phone: values.phone || undefined,
          company: values.company || undefined,
          source: values.source || undefined,
          stage: values.stage,
          remark: values.remark || undefined,
        };
        await customersApi.update(customer.id, dto);
      } else {
        const dto: CreateCustomerDto = {
          name: values.name,
          phone: values.phone || undefined,
          company: values.company || undefined,
          source: values.source || undefined,
          stage: values.stage,
          remark: values.remark || undefined,
        };
        await customersApi.create(dto);
      }
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      logger.error('保存客户失败', error as Error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? '编辑客户' : '新增客户'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>姓名</FormLabel>
                  <FormControl>
                    <Input placeholder="请输入客户姓名" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>电话</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入电话" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="stage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>阶段</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
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
            </div>

            <FormField
              control={form.control}
              name="company"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>公司</FormLabel>
                  <FormControl>
                    <Input placeholder="请输入公司名称" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>来源</FormLabel>
                  <FormControl>
                    <Input placeholder="请输入客户来源" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="remark"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>备注</FormLabel>
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

            {/* 查重提示 */}
            {duplicateResult?.hasDuplicate && (
              <div className="flex items-start gap-2 px-3 py-2 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                <AlertTriangle className="size-4 shrink-0 mt-0.5 text-amber-600" />
                <span>
                  {duplicateResult.duplicateName && duplicateResult.duplicatePhone && (
                    <>
                      已存在客户"
                      <span className="font-medium">
                        {duplicateResult.duplicateName}
                      </span>
                      "（电话：
                      <span className="font-medium">
                        {duplicateResult.duplicatePhone}
                      </span>
                      ）
                    </>
                  )}
                  {duplicateResult.duplicateName && !duplicateResult.duplicatePhone && (
                    <>
                      已存在同名客户"
                      <span className="font-medium">
                        {duplicateResult.duplicateName}
                      </span>"
                    </>
                  )}
                  {!duplicateResult.duplicateName && duplicateResult.duplicatePhone && (
                    <>
                      已存在同电话客户（电话：
                      <span className="font-medium">
                        {duplicateResult.duplicatePhone}
                      </span>
                      ）
                    </>
                  )}
                  ，确认继续{isEdit ? '编辑' : '新增'}吗？
                </span>
              </div>
            )}
            {checking && (
              <div className="text-xs text-[#98A2B3]">正在查重...</div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                取消
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? '保存中...' : '保存'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default CustomerDialog;
