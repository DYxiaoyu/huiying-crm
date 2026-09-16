import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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

import * as suppliersApi from '@/api/suppliers';
import type {
  CreateSupplierProductDto,
  SupplierProduct,
  UpdateSupplierProductDto,
} from '@shared/api.interface';

const supplierSchema = z.object({
  productName: z.string().min(1, '请输入商品名称'),
  supplierName: z.string().min(1, '请输入供应商名称'),
  category: z.string().optional(),
  price: z.string().optional(),
  unit: z.string().optional(),
  spec: z.string().optional(),
  remark: z.string().optional(),
});

type SupplierFormValues = z.infer<typeof supplierSchema>;

interface SupplierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: SupplierProduct | null;
  onSuccess?: () => void;
}

export function SupplierDialog({
  open,
  onOpenChange,
  product,
  onSuccess,
}: SupplierDialogProps) {
  const isEdit = !!product;

  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      productName: '',
      supplierName: '',
      category: '',
      price: '',
      unit: '',
      spec: '',
      remark: '',
    },
  });

  useEffect(() => {
    if (open) {
      if (product) {
        form.reset({
          productName: product.productName,
          supplierName: product.supplierName,
          category: product.category ?? '',
          price: product.price ?? '',
          unit: product.unit ?? '',
          spec: product.spec ?? '',
          remark: product.remark ?? '',
        });
      } else {
        form.reset({
          productName: '',
          supplierName: '',
          category: '',
          price: '',
          unit: '',
          spec: '',
          remark: '',
        });
      }
    }
  }, [open, product, form]);

  const onSubmit = async (values: SupplierFormValues) => {
    try {
      if (isEdit && product) {
        const dto: UpdateSupplierProductDto = {
          productName: values.productName,
          supplierName: values.supplierName,
          category: values.category || undefined,
          price: values.price || undefined,
          unit: values.unit || undefined,
          spec: values.spec || undefined,
          remark: values.remark || undefined,
        };
        await suppliersApi.update(product.id, dto);
      } else {
        const dto: CreateSupplierProductDto = {
          productName: values.productName,
          supplierName: values.supplierName,
          category: values.category || undefined,
          price: values.price || undefined,
          unit: values.unit || undefined,
          spec: values.spec || undefined,
          remark: values.remark || undefined,
        };
        await suppliersApi.create(dto);
      }
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      logger.error('保存供应商商品失败', error as Error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? '编辑商品' : '新增商品'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="productName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      商品名称<span className="text-rose-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="如：角向棘轮扳手 3/8" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="supplierName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      供应商名称<span className="text-rose-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="如：南通XX工具厂" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>分类</FormLabel>
                    <FormControl>
                      <Input placeholder="如：扳手" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>价格</FormLabel>
                    <FormControl>
                      <Input placeholder="如：68" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>单位</FormLabel>
                    <FormControl>
                      <Input placeholder="件/台/套" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="spec"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>规格型号</FormLabel>
                  <FormControl>
                    <Input placeholder="如：DCZC 22 / 3/8英寸" {...field} />
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
                      placeholder="起订量、交货期、付款方式等补充信息"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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

export default SupplierDialog;
