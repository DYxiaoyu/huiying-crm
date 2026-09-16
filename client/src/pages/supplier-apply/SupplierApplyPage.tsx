import { useRef, useState } from 'react';
import {
  ShieldCheck,
  ArrowLeft,
  Building2,
  User,
  Phone,
  MessageCircle,
  MapPin,
  Tags,
  Package,
  Coins,
  Boxes,
  Ruler,
  Link2,
  ImagePlus,
  Paperclip,
  CheckCircle2,
  X,
  FileText,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';

import { applySupplier } from '@/api/public';
import type { SupplierFile } from '@shared/api.interface';

const OFFICIAL_SITE = 'https://hyjjls.cn';

const IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const DOC_MIME = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/csv',
];
const MAX_IMAGE_MB = 3;
const MAX_FILE_MB = 8;
const MAX_FILES = 5;

interface RejectedRecord {
  productName: string;
  rejectReason: string;
  updatedAt: string;
}

type Step = 'key' | 'form' | 'success';

const inputCls =
  'w-full px-3.5 py-2.5 rounded-lg border border-[#E4E7EC] bg-white text-[14px] text-[#1D2733] placeholder:text-[#98A2B3] outline-none focus:border-[#D97706] focus:ring-2 focus:ring-[#D97706]/20 transition-all';
const labelCls = 'block text-[13px] font-medium text-[#5B6773] mb-1.5';

const SupplierApplyPage = () => {
  const [step, setStep] = useState<Step>('key');

  const [keyValue, setKeyValue] = useState('');
  const [checkingKey, setCheckingKey] = useState(false);
  const [keyVerified, setKeyVerified] = useState(false);
  const [rejectedRecords, setRejectedRecords] = useState<RejectedRecord[]>([]);

  // 供应商信息
  const [supplierName, setSupplierName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [wechat, setWechat] = useState('');
  const [address, setAddress] = useState('');
  const [mainCategory, setMainCategory] = useState('');

  // 商品信息
  const [productName, setProductName] = useState('');
  const [price, setPrice] = useState('');
  const [unit, setUnit] = useState('');
  const [spec, setSpec] = useState('');
  const [productUrl, setProductUrl] = useState('');
  const [remark, setRemark] = useState('');

  const [imageData, setImageData] = useState('');
  const [imageName, setImageName] = useState('');
  const [files, setFiles] = useState<SupplierFile[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleVerifyKey = async () => {
    const key = keyValue.trim();
    if (!key) {
      toast.error('请先填写合作密钥');
      return;
    }
    setCheckingKey(true);
    try {
      const res = await fetch('/api/public/supplier/verify-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      });
      const data = (await res.json()) as { ok?: boolean; label?: string; message?: string };
      if (res.ok && data.ok) {
        const rejectedRes = await fetch(`/api/public/supplier/rejected?key=${encodeURIComponent(key)}`);
        if (rejectedRes.ok) {
          setRejectedRecords((await rejectedRes.json()) as RejectedRecord[]);
        }
        setKeyVerified(true);
        setStep('form');
        if (data.label) {
          toast.success(`密钥有效，欢迎 ${data.label}`);
        }
      } else {
        toast.error(data.message || '密钥校验失败，请检查后重试');
      }
    } catch (error) {
      logger.error('密钥校验失败', error as Error);
      toast.error('网络异常，请稍后重试');
    } finally {
      setCheckingKey(false);
    }
  };

  const readImage = (file: File) => {
    if (!IMAGE_MIME.includes(file.type)) {
      toast.error('仅支持 jpg / png / webp / gif 图片');
      return;
    }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      toast.error(`图片不能超过 ${MAX_IMAGE_MB}MB`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImageData(String(reader.result));
      setImageName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const readFile = (file: File) => {
    if (!DOC_MIME.includes(file.type)) {
      toast.error(`「${file.name}」格式不支持，仅支持 PDF / Excel / Word / CSV`);
      return;
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      toast.error(`「${file.name}」不能超过 ${MAX_FILE_MB}MB`);
      return;
    }
    if (files.length >= MAX_FILES) {
      toast.error(`最多上传 ${MAX_FILES} 个文件`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setFiles((prev) => [
        ...prev,
        { name: file.name, mime: file.type, size: file.size, data: String(reader.result) },
      ]);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!supplierName.trim()) return toast.error('请填写供应商名称');
    if (!contactName.trim()) return toast.error('请填写联系人姓名');
    if (!contactPhone.trim()) return toast.error('请填写联系电话');
    if (!productName.trim()) return toast.error('请填写商品名称');

    setSubmitting(true);
    try {
      const res = await applySupplier({
        key: keyValue.trim(),
        supplierName: supplierName.trim(),
        contactName: contactName.trim(),
        contactPhone: contactPhone.trim(),
        wechat: wechat.trim() || undefined,
        address: address.trim() || undefined,
        mainCategory: mainCategory.trim() || undefined,
        productName: productName.trim(),
        price: price.trim() || undefined,
        unit: unit.trim() || undefined,
        spec: spec.trim() || undefined,
        productUrl: productUrl.trim() || undefined,
        remark: remark.trim() || undefined,
        imageData: imageData || undefined,
        files: files.length > 0 ? files : undefined,
      });
      if (res.ok) {
        setStep('success');
      } else {
        toast.error(res.message || '提交失败，请稍后重试');
      }
    } catch (error) {
      logger.error('供应商提交失败', error as Error);
      toast.error('提交失败，请检查密钥和文件后重试');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSupplierName('');
    setContactName('');
    setContactPhone('');
    setWechat('');
    setAddress('');
    setMainCategory('');
    setProductName('');
    setPrice('');
    setUnit('');
    setSpec('');
    setProductUrl('');
    setRemark('');
    setImageData('');
    setImageName('');
    setFiles([]);
    setRejectedRecords([]);
    setStep('form');
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background:
          'linear-gradient(160deg, #FFF7ED 0%, #FFEDD5 45%, #FDE8C8 100%)',
      }}
    >
      {/* 顶栏 */}
      <header className="sticky top-0 z-20 bg-white/85 backdrop-blur-md border-b border-[#E4E7EC]">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="size-8 rounded-lg flex items-center justify-center text-white"
              style={{ background: 'linear-gradient(120deg, #B45309, #D97706)' }}
            >
              <Building2 className="size-4.5" />
            </div>
            <div className="leading-tight">
              <div className="text-[15px] font-semibold text-[#1D2733]">汇金供应链</div>
              <div className="text-[11px] text-[#98A2B3]">供应商商品提交</div>
            </div>
          </div>
          <a
            href={OFFICIAL_SITE}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-medium text-[#B45309] bg-[#FFF7E6] hover:bg-[#FDE8C8] transition-colors"
          >
            <ArrowLeft className="size-4" />
            回到官网主页
          </a>
        </div>
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-6 pb-16">
        {/* ========== 步骤1：密钥 ========== */}
        {step === 'key' && (
          <div className="rounded-2xl bg-white shadow-sm border border-[#E4E7EC] overflow-hidden">
            <div
              className="px-6 py-8 text-white relative overflow-hidden"
              style={{ background: 'linear-gradient(120deg, #B45309 0%, #D97706 55%, #F59E0B 100%)' }}
            >
              <div className="absolute -right-6 -top-8 size-32 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }} />
              <div className="relative">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 text-white text-[12px] font-medium mb-3">
                  <Sparkles className="size-3.5" />
                  合作供应商专享
                </div>
                <h1 className="text-[22px] font-semibold">供应商商品提交</h1>
                <p className="mt-1.5 text-[13.5px] text-white/85 leading-relaxed">
                  填写商品资料后提交，我司将在 1-2 个工作日内审核并上架展示。
                </p>
              </div>
            </div>

            <div className="p-6">
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-[#FFF7E6] border border-[#FDE8C8]">
                <ShieldCheck className="size-5 text-[#D97706] shrink-0 mt-0.5" />
                <p className="text-[13px] text-[#7A5A28] leading-relaxed">
                  需要<b>合作密钥</b>才能提交。密钥由我司对接人提供，
                  <b>没有密钥</b>请联系对接人获取，或先
                  <a
                    href={OFFICIAL_SITE}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#B45309] font-medium underline underline-offset-2"
                  >
                    前往官网
                  </a>
                  了解合作方式。
                </p>
              </div>

              <div className="mt-5">
                <label className={labelCls}>合作密钥</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={keyValue}
                    onChange={(e) => setKeyValue(e.target.value)}
                    placeholder="例如：HYJJ-1A2B-3C4D"
                    className={`${inputCls} flex-1 uppercase tracking-wide`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void handleVerifyKey();
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => void handleVerifyKey()}
                    disabled={checkingKey}
                    className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-white text-[14px] font-semibold disabled:opacity-60 transition-all hover:shadow-md"
                    style={{ background: 'linear-gradient(120deg, #B45309, #D97706)' }}
                  >
                    {checkingKey ? '校验中...' : '下一步'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========== 步骤2：表单 ========== */}
        {step === 'form' && (
          <div className="space-y-4">
            {/* 驳回提示 */}
            {rejectedRecords.length > 0 && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
                <div className="flex items-center gap-2 text-[14px] font-medium text-amber-800 mb-2">
                  <CheckCircle2 className="size-4.5" />
                  您之前提交的商品有被驳回的记录，请修改后重新提交
                </div>
                <div className="space-y-1.5">
                  {rejectedRecords.map((r, idx) => (
                    <div key={idx} className="text-[12.5px] text-amber-700 leading-relaxed">
                      <span className="font-medium">「{r.productName}」</span>
                      驳回原因：{r.rejectReason}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 供应商信息 */}
            <section className="rounded-2xl bg-white shadow-sm border border-[#E4E7EC] overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[#F0F2F5] flex items-center gap-2 bg-[#FFFBF5]">
                <Building2 className="size-4.5 text-[#D97706]" />
                <h2 className="text-[15px] font-semibold text-[#1D2733]">供应商信息</h2>
                <span className="text-[12px] text-[#98A2B3]">（必填项带 *）</span>
              </div>
              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className={labelCls}>
                    <span className="text-rose-500 mr-0.5">*</span>供应商名称
                  </label>
                  <input type="text" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} placeholder="如：南通东成工具厂" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>
                    <span className="text-rose-500 mr-0.5">*</span>联系人姓名
                  </label>
                  <input type="text" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="如：王经理" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>
                    <span className="text-rose-500 mr-0.5">*</span>联系电话
                  </label>
                  <input type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="手机或座机" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>微信</label>
                  <input type="text" value={wechat} onChange={(e) => setWechat(e.target.value)} placeholder="方便对接的微信号" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>所在地区</label>
                  <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="如：江苏南通" className={inputCls} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>主营分类</label>
                  <input type="text" value={mainCategory} onChange={(e) => setMainCategory(e.target.value)} placeholder="如：锯片 / 电动工具 / 钻孔设备（便于分类展示）" className={inputCls} />
                </div>
              </div>
            </section>

            {/* 商品信息 */}
            <section className="rounded-2xl bg-white shadow-sm border border-[#E4E7EC] overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[#F0F2F5] flex items-center gap-2 bg-[#FFFBF5]">
                <Package className="size-4.5 text-[#D97706]" />
                <h2 className="text-[15px] font-semibold text-[#1D2733]">商品信息</h2>
              </div>
              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className={labelCls}>
                    <span className="text-rose-500 mr-0.5">*</span>商品名称
                  </label>
                  <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="如：角向棘轮扳手 3/8" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>价格</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[14px] text-[#98A2B3]">¥</span>
                    <input type="text" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" className={`${inputCls} pl-8`} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>单位</label>
                  <input type="text" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="把 / 台 / 片" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>规格型号</label>
                  <input type="text" value={spec} onChange={(e) => setSpec(e.target.value)} placeholder="如：DCZC 22" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>商品链接</label>
                  <input type="text" value={productUrl} onChange={(e) => setProductUrl(e.target.value)} placeholder="https://...（选填）" className={inputCls} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>备注</label>
                  <textarea value={remark} onChange={(e) => setRemark(e.target.value)} rows={2} placeholder="交期、起订量、优势等补充说明（选填）" className={`${inputCls} resize-none`} />
                </div>
              </div>
            </section>

            {/* 图片与文件 */}
            <section className="rounded-2xl bg-white shadow-sm border border-[#E4E7EC] overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[#F0F2F5] flex items-center gap-2 bg-[#FFFBF5]">
                <ImagePlus className="size-4.5 text-[#D97706]" />
                <h2 className="text-[15px] font-semibold text-[#1D2733]">图片与资料</h2>
                <span className="text-[12px] text-[#98A2B3]">图片 ≤ {MAX_IMAGE_MB}MB，文件 ≤ {MAX_FILE_MB}MB</span>
              </div>
              <div className="p-5 space-y-4">
                {/* 商品图片 */}
                <div>
                  <label className={labelCls}>商品图片（1 张）</label>
                  {imageData ? (
                    <div className="relative inline-block rounded-xl overflow-hidden border border-[#E4E7EC]">
                      <img src={imageData} alt="商品图片" className="w-44 h-32 object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          setImageData('');
                          setImageName('');
                        }}
                        className="absolute top-1.5 right-1.5 size-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                      >
                        <X className="size-4" />
                      </button>
                      <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded bg-black/50 text-white text-[11px] max-w-[70%] truncate">
                        {imageName}
                      </span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      className="w-full sm:w-56 h-32 rounded-xl border-2 border-dashed border-[#E4E7EC] bg-[#FBFCFE] flex flex-col items-center justify-center gap-1.5 text-[#98A2B3] hover:border-[#D97706] hover:text-[#D97706] transition-colors"
                    >
                      <ImagePlus className="size-7" />
                      <span className="text-[13px]">点击上传商品图片</span>
                    </button>
                  )}
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) readImage(file);
                      e.target.value = '';
                    }}
                  />
                </div>

                {/* 资料文件 */}
                <div>
                  <label className={labelCls}>商品资料文件（报价单 / 产品目录 PDF / 表格等，最多 {MAX_FILES} 个）</label>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-lg border border-[#E4E7EC] bg-white text-[13.5px] text-[#5B6773] hover:border-[#D97706] hover:text-[#B45309] inline-flex items-center gap-2 transition-colors"
                  >
                    <Paperclip className="size-4" />
                    选择文件
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.xlsx,.xls,.doc,.docx,.csv"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) readFile(file);
                      e.target.value = '';
                    }}
                  />
                  {files.length > 0 && (
                    <ul className="mt-3 space-y-2">
                      {files.map((f, idx) => (
                        <li
                          key={idx}
                          className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg bg-[#FFFBF5] border border-[#FDE8C8]"
                        >
                          <FileText className="size-4.5 text-[#D97706] shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-medium text-[#1D2733] truncate">{f.name}</div>
                            <div className="text-[11px] text-[#98A2B3]">
                              {(f.size / 1024 / 1024).toFixed(2)} MB
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setFiles((prev) => prev.filter((_, i) => i !== idx))}
                            className="size-7 rounded-lg text-[#98A2B3] hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors"
                          >
                            <X className="size-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </section>

            {/* 提交按钮 */}
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={submitting}
              className="w-full py-4 rounded-xl text-white text-[16px] font-semibold disabled:opacity-60 transition-all hover:shadow-lg hover:-translate-y-px"
              style={{ background: 'linear-gradient(120deg, #B45309, #D97706)' }}
            >
              {submitting ? '正在提交，请稍候...' : '提交商品资料'}
            </button>
            <p className="text-center text-[12px] text-[#98A2B3]">
              提交后我司将在 1-2 个工作日内审核，审核通过后即可在商品库中展示
            </p>
          </div>
        )}

        {/* ========== 步骤3：成功 ========== */}
        {step === 'success' && (
          <div className="rounded-2xl bg-white shadow-sm border border-[#E4E7EC] p-8 text-center">
            <div
              className="mx-auto size-16 rounded-full flex items-center justify-center text-white mb-4"
              style={{ background: 'linear-gradient(120deg, #16A34A, #22C55E)' }}
            >
              <CheckCircle2 className="size-9" />
            </div>
            <h1 className="text-[20px] font-semibold text-[#1D2733]">提交成功！</h1>
            <p className="mt-2 text-[14px] text-[#5B6773] leading-relaxed">
              感谢您的合作。我们将在 <b>1-2 个工作日内</b>完成审核，
              <br className="hidden sm:block" />
              审核结果会同步到商品库，您可以继续提交其他商品。
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white text-[14px] font-semibold transition-all hover:shadow-md"
                style={{ background: 'linear-gradient(120deg, #B45309, #D97706)' }}
              >
                <Package className="size-4" />
                再提交一条
              </button>
              <a
                href={OFFICIAL_SITE}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-[#E4E7EC] text-[14px] font-medium text-[#5B6773] hover:bg-[#F7F9FA] transition-colors"
              >
                <ArrowLeft className="size-4" />
                回到官网主页
              </a>
            </div>
          </div>
        )}
      </main>

      <footer className="pb-6 text-center text-[12px] text-[#B8C0CC]">
        汇金供应链 · 供应商合作平台
      </footer>
    </div>
  );
};

export default SupplierApplyPage;
