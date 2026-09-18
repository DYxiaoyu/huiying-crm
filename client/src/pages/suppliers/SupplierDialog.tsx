import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Image as ImageIcon, FileUp, X } from 'lucide-react';
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
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  wechat: z.string().optional(),
  address: z.string().optional(),
  mainCategory: z.string().optional(),
  productUrl: z.string().optional(),
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
  const [images, setImages] = useState<string[]>([]);
  const [files, setFiles] = useState<SupplierFile[]>([]);
  const imgInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const compressImage = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const maxW = 800;
          const scale = Math.min(1, maxW / img.width);
          const canvas = document.createElement('canvas');
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject(new Error('canvas error'));
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.72));
        };
        img.onerror = reject;
        img.src = reader.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleImgPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files || []);
    if (list.length === 0) return;
    for (const f of list) {
      try {
        const data = await compressImage(f);
        setImages((prev) => [...prev, data]);
      } catch {
        toast.error(`图片 ${f.name} 处理失败`);
      }
    }
    if (imgInputRef.current) imgInputRef.current.value = '';
  };

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files || []);
    for (const f of list) {
      if (f.size > 50 * 1024 * 1024) {
        toast.error(`${f.name} 超过50MB`);
        continue;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setFiles((prev) => [...prev, { name: f.name, size: f.size, data: reader.result as string }]);
      };
      reader.readAsDataURL(f);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

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
      contactName: '',
      contactPhone: '',
      wechat: '',
      address: '',
      mainCategory: '',
      productUrl: '',
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
          contactName: product.contactName ?? '',
          contactPhone: product.contactPhone ?? '',
          wechat: product.wechat ?? '',
          address: product.address ?? '',
          mainCategory: product.mainCategory ?? '',
          productUrl: product.productUrl ?? '',
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
          contactName: '',
          contactPhone: '',
          wechat: '',
          address: '',
          mainCategory: '',
          productUrl: '',
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
          contactName: values.contactName || undefined,
          contactPhone: values.contactPhone || undefined,
          wechat: values.wechat || undefined,
          address: values.address || undefined,
          mainCategory: values.mainCategory || undefined,
          productUrl: values.productUrl || undefined,
          images,
          files,
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
          contactName: values.contactName || undefined,
          contactPhone: values.contactPhone || undefined,
          wechat: values.wechat || undefined,
          address: values.address || undefined,
          mainCategory: values.mainCategory || undefined,
          productUrl: values.productUrl || undefined,
          images: images.length > 0 ? images : undefined,
          files: files.length > 0 ? files : undefined,
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
      <DialogContent className="max-w-lg w-[calc(100vw-16px)] max-h-[88vh] overflow-y-auto p-4">
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

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-1 border-t border-[#F0F2F5]">
              <FormField
                control={form.control}
                name="contactName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>联系人</FormLabel>
                    <FormControl>
                      <Input placeholder="如：王经理" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contactPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>联系电话</FormLabel>
                    <FormControl>
                      <Input placeholder="手机或座机" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="wechat"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>微信</FormLabel>
                    <FormControl>
                      <Input placeholder="微信号" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mainCategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>主营分类</FormLabel>
                    <FormControl>
                      <Input placeholder="如：锯片/电动工具" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>所在地区</FormLabel>
                    <FormControl>
                      <Input placeholder="如：江苏南通" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="productUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>商品链接</FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." {...field} />
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

            {/* 图片上传 */}
            <div className="border-t border-[#F0F2F5] pt-3">
              <label className="text-sm font-medium text-[#1D2733]">商品图片（最多500张，自动压缩）</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {images.map((img, idx) => (
                  <div key={idx} className="relative size-20 rounded-lg overflow-hidden border border-[#E4E7EC]">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setImages((prev) => prev.filter((_, i) => i !== idx))}
                      className="absolute top-0.5 right-0.5 size-4 rounded-full bg-black/60 text-white flex items-center justify-center"
                    >
                      <X className="size-2.5" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => imgInputRef.current?.click()}
                  className="size-20 rounded-lg border-2 border-dashed border-[#D9DDE3] text-[#98A2B3] flex flex-col items-center justify-center gap-1 hover:border-[#D97706] hover:text-[#D97706] transition-colors"
                >
                  <ImageIcon className="size-5" />
                  <span className="text-[11px]">选择图片</span>
                </button>
              </div>
              <input ref={imgInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => void handleImgPick(e)} />
            </div>

            {/* 文件上传 */}
            <div>
              <label className="text-sm font-medium text-[#1D2733]">商品资料文件（PDF/Excel/压缩包，单个≤50MB）</label>
              <div className="mt-2 space-y-1.5">
                {files.map((f, idx) => (
                  <div key={idx} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#FFFBF5] border border-[#FDE8C8]">
                    <FileUp className="size-4 text-[#D97706] shrink-0" />
                    <span className="flex-1 text-[12.5px] text-[#1D2733] truncate">{f.name}</span>
                    <span className="text-[11px] text-[#98A2B3]">{(f.size/1024/1024).toFixed(2)}MB</span>
                    <button type="button" onClick={() => setFiles((prev) => prev.filter((_, i) => i !== idx))}>
                      <X className="size-3.5 text-rose-500" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-3 rounded-lg border-2 border-dashed border-[#D9DDE3] text-[#98A2B3] text-sm hover:border-[#D97706] hover:text-[#D97706] transition-colors"
                >
                  点击上传文件（支持多选）
                </button>
              </div>
              <input ref={fileInputRef} type="file" multiple accept=".pdf,.xlsx,.xls,.doc,.docx,.csv,.zip,.rar,.7z" className="hidden" onChange={handleFilePick} />
            </div>

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
