import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Image as ImageIcon, FileUp, X, Loader2 } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';

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
  SupplierFile,
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
  const [uploading, setUploading] = useState<{ name: string; progress: number } | null>(null);
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
        // 压缩 → 转 blob → 立即上传到服务器磁盘，保存时提交 URL（与文件上传一致，避免 base64 存库）
        const data = await compressImage(f);
        const blob = await (await fetch(data)).blob();
        const fd = new FormData();
        fd.append('file', blob, f.name.replace(/[^\w.\-]/g, '_') || 'image.jpg');
        setUploading({ name: f.name, progress: 0 });
        const { data: up } = await axiosForBackend.post<{ url: string; name: string; size: number }>(
          '/api/files/upload',
          fd,
          {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: (p) => {
              if (p.total) setUploading({ name: f.name, progress: Math.round((p.loaded / p.total) * 100) });
            },
            timeout: 0,
          }
        );
        setImages((prev) => [...prev, up.url]);
        toast.success(`${f.name} 上传完成`);
      } catch {
        toast.error(`图片 ${f.name} 处理失败`);
      } finally {
        setUploading(null);
      }
    }
    if (imgInputRef.current) imgInputRef.current.value = '';
  };

  /** 参照大厂做法：选择文件后立即独立上传到服务器磁盘，保存时只提交 URL（避免大文件 JSON 超时/丢失） */
  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files || []);
    for (const f of list) {
      if (f.size > 200 * 1024 * 1024) {
        toast.error(`${f.name} 超过200MB`);
        continue;
      }
      setUploading({ name: f.name, progress: 0 });
      const fd = new FormData();
      fd.append('file', f);
      try {
        const { data } = await axiosForBackend.post<{ url: string; name: string; size: number }>(
          '/api/files/upload',
          fd,
          {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: (p) => {
              if (p.total) setUploading({ name: f.name, progress: Math.round((p.loaded / p.total) * 100) });
            },
            timeout: 0,
          }
        );
        setFiles((prev) => [...prev, { name: f.name, size: f.size, url: data.url }]);
        toast.success(`${f.name} 上传完成`);
      } catch (err) {
        logger.error(`上传文件失败: ${f.name}`, err as Error);
        toast.error(`${f.name} 上传失败，请重试`);
      } finally {
        setUploading(null);
      }
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
        setImages(product.images ?? []);
        setFiles(product.files ?? []);
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
        setImages([]);
        setFiles([]);
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
                  <FormLabel>网盘链接</FormLabel>
                  <FormControl>
                    <Input placeholder="如：百度网盘 / 阿里云盘 / 夸克网盘 / 腾讯微云 等等" {...field} />
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
              <label className="text-sm font-medium text-[#1D2733]">商品资料文件（PDF/Excel/压缩包，单个≤200MB）</label>
              <div className="mt-2 space-y-1.5">
                {uploading && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#FFFBF5] border border-[#FDE8C8]">
                    <Loader2 className="size-4 text-[#D97706] shrink-0 animate-spin" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[12.5px] text-[#1D2733] truncate">正在上传：{uploading.name}</div>
                      <div className="mt-1 h-1.5 rounded-full bg-[#FDE8C8] overflow-hidden">
                        <div className="h-full bg-[#D97706] transition-all" style={{ width: uploading.progress + '%' }} />
                      </div>
                    </div>
                    <span className="text-[11px] text-[#98A2B3] shrink-0">{uploading.progress}%</span>
                  </div>
                )}
                {files.map((f, idx) => {
                  const href = f.url || (typeof f.data === 'string' && (f.data.startsWith('/') || f.data.startsWith('data:')) ? f.data : '');
                  return (
                  <div key={idx} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#FFFBF5] border border-[#FDE8C8]">
                    <FileUp className="size-4 text-[#D97706] shrink-0" />
                    {href ? (
                      <a href={href} target="_blank" rel="noopener noreferrer" className="flex-1 text-[12.5px] text-[#1D2733] truncate hover:text-[#D97706] hover:underline">{f.name}</a>
                    ) : (
                      <span className="flex-1 text-[12.5px] text-[#1D2733] truncate">{f.name}</span>
                    )}
                    {href && (
                      <a
                        href={href}
                        download={f.name}
                        onClick={(e) => e.stopPropagation()}
                        className="text-[11px] text-[#D97706] hover:underline whitespace-nowrap shrink-0"
                      >
                        下载
                      </a>
                    )}
                    <span className="text-[11px] text-[#98A2B3]">{(f.size/1024/1024).toFixed(2)}MB</span>
                    <button type="button" onClick={() => setFiles((prev) => prev.filter((_, i) => i !== idx))}>
                      <X className="size-3.5 text-rose-500" />
                    </button>
                  </div>
                  );
                })}
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
