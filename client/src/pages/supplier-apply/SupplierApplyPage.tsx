import { useEffect, useRef, useState } from 'react';
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
  Plus,
  ChevronDown,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';

import { applySupplier } from '@/api/public';
import type { SupplierFile } from '@shared/api.interface';

const OFFICIAL_SITE = 'https://hyjjls.cn';

type Lang = 'zh' | 'ru' | 'en';

/** 供应商表单页文案（默认中文，可切俄/英） */
const t = {
  zh: {
    lang: '语言',
    brand: '汇金供应链',
    headerSub: '供应商商品提交',
    backHome: '回到官网主页',
    footer: '汇金供应链 · 供应商合作平台',
    exclusive: '合作供应商专享',
    keyTitle: '供应商商品提交',
    keyDesc: '填写商品资料后提交，我司将在 1-2 个工作日内审核并上架展示。',
    keyNotice1: '需要',
    keyNotice2: '合作密钥',
    keyNotice3: '才能提交。密钥由我司对接人提供，',
    keyNotice4: '没有密钥',
    keyNotice5: '请联系对接人获取，或先',
    keyNotice6: '前往官网',
    keyNotice7: '了解合作方式。',
    keyLabel: '合作密钥',
    keyPh: '例如：HYJJ-1A2B-3C4D',
    verifying: '校验中...',
    next: '下一步',
    keyInvalid: '合作密钥无效或已停用，请联系对接人确认',
    rejectedTitle: '您之前提交的商品有被驳回的记录，请修改后重新提交',
    rejectedReason: '驳回原因',
    supplierTitle: '供应商信息',
    requiredHint: '（必填项带 *）',
    supplierName: '供应商名称',
    supplierNamePh: '如：南通东成工具厂',
    contactName: '联系人姓名',
    contactNamePh: '如：王经理',
    contactPhone: '联系电话',
    contactPhonePh: '手机或座机',
    wechat: '微信',
    wechatPh: '方便对接的微信号',
    address: '所在地区',
    addressPh: '如：江苏南通',
    mainCategory: '主营分类',
    mainCategoryPh: '如：锯片 / 电动工具 / 钻孔设备（便于分类展示）',
    mediaTitle: '图片与资料',
    mediaHint: (a: number, b: number, c: number) => `图片最多 ${a} 张 · 文件最多 ${b} 个（≤${c}MB）`,
    imageLabel: (a: number) => `商品图片（最多 ${a} 张，自动压缩）`,
    chooseImages: (n: number) => `选择图片${n > 0 ? `（已 ${n} 张）` : ''}`,
    filesLabel: (a: number) => `商品资料文件（报价单 / 产品目录 PDF / Excel / Word / 压缩包，最多 ${a} 个）`,
    clickUpload: '点击上传文件',
    uploadHint: (a: number) => `支持多选 · 单个不超过 ${a}MB（含压缩包）· 主要文件传这里`,
    uploading: (n: string) => `正在上传「${n}」…（大文件请耐心等待）`,
    clickView: '点击查看',
    productTitle: '商品信息',
    filledCount: (n: number) => `已填 ${n} 个 · 名称选填`,
    productX: (i: number, s: string) => `商品 ${i} · ${s}`,
    unnamed: (i: number) => `未命名商品 ${i}`,
    deleteProduct: '删除此商品',
    productName: '商品名称（选填）',
    productNamePh: '如：角向棘轮扳手 3/8',
    price: '价格',
    unit: '单位',
    unitPh: '把 / 台 / 片',
    netdisk: '网盘链接',
    netdiskPh: '如：百度网盘 / 阿里云盘 / 夸克网盘 / 腾讯微云 等等',
    productLink: '商品链接',
    productLinkPh: 'https://...（选填）',
    remark: '备注',
    remarkPh: '交期、起订量、优势等补充说明（选填）',
    addProduct: '添加一个商品',
    submit: '提交商品资料',
    submitting: '正在提交，请稍候...',
    uploadingSubmit: (n: string) => `文件上传中，请等待…（${n}）`,
    uploadWait: '文件上传中，请等待上传完成后点击提交',
    submitHint: '提交后我司将在 1-2 个工作日内审核，审核通过后即可在商品库中展示',
    successTitle: '提交成功！',
    successDesc1: '感谢您的合作。我们将在',
    successDesc2: '1-2 个工作日内',
    successDesc3: '完成审核，审核结果会同步到商品库，您可以继续提交其他商品。',
    submitAgain: '再提交一条',
    errSupplier: '请填写供应商名称',
    errContact: '请填写联系人姓名',
    errPhone: '请填写联系电话',
    submitFail: '提交失败，请稍后重试',
    keyVerifyFail: '密钥校验失败，请稍后重试',
    uploadFail: '上传失败，请重试',
    fileUploading: '文件上传中，请等待文件上传成功后提交',
    errKeyEmpty: '请先填写合作密钥',
    keyValid: (label: string) => `密钥有效，欢迎 ${label}`,
    netErr: '网络异常，请稍后重试',
    maxImages: (a: number) => `最多上传 ${a} 张图片`,
    overImages: (a: number, n: number) => `超出 ${a} 张，仅添加前 ${n} 张`,
    imgFormat: (n: string) => `「${n}」格式不支持，仅支持 jpg / png / webp / gif`,
    imgFail: (n: string) => `「${n}」处理失败`,
    maxFiles: (a: number) => `最多上传 ${a} 个文件`,
    overFiles: (a: number, n: number) => `超出 ${a} 个文件，仅添加前 ${n} 个`,
    fileFormat: (n: string) => `「${n}」格式不支持，仅支持 PDF / Excel / Word / CSV / 压缩包`,
    fileTooLarge: (n: string, a: number) => `「${n}」不能超过 ${a}MB`,
    uploadFailed: (n: string) => `「${n}」上传失败：请重试`,
  },
  ru: {
    lang: 'Язык',
    brand: 'Huiying Supply Chain',
    headerSub: 'Подача товаров поставщика',
    backHome: 'На главный сайт',
    footer: 'Huiying Supply Chain · Платформа сотрудничества с поставщиками',
    exclusive: 'Только для поставщиков-партнёров',
    keyTitle: 'Подача товаров поставщика',
    keyDesc: 'Заполните информацию о товарах и отправьте — мы проверим в течение 1–2 рабочих дней.',
    keyNotice1: 'Для подачи необходим ',
    keyNotice2: 'ключ сотрудничества',
    keyNotice3: '. Ключ выдаёт наш менеджер. ',
    keyNotice4: 'Нет ключа',
    keyNotice5: '? Свяжитесь с менеджером или ',
    keyNotice6: 'перейдите на сайт',
    keyNotice7: ' чтобы узнать о сотрудничестве.',
    keyLabel: 'Ключ сотрудничества',
    keyPh: 'Например: HYJJ-1A2B-3C4D',
    verifying: 'Проверка...',
    next: 'Далее',
    keyInvalid: 'Ключ недействителен или отключён, обратитесь к менеджеру',
    rejectedTitle: 'Ваши предыдущие товары были отклонены — исправьте и отправьте снова',
    rejectedReason: 'Причина отклонения',
    supplierTitle: 'Информация о поставщике',
    requiredHint: '（поля с * обязательны）',
    supplierName: 'Название компании',
    supplierNamePh: 'Например: Nantong Dongcheng Tool Factory',
    contactName: 'Контактное лицо',
    contactNamePh: 'Например: Менеджер Ван',
    contactPhone: 'Телефон',
    contactPhonePh: 'Мобильный или городской',
    wechat: 'WeChat',
    wechatPh: 'WeChat для связи',
    address: 'Регион',
    addressPh: 'Например: Jiangsu, Nantong',
    mainCategory: 'Основная категория',
    mainCategoryPh: 'Например: отрезные диски / электроинструменты / буровое оборудование',
    mediaTitle: 'Фото и документы',
    mediaHint: (a: number, b: number, c: number) => `Фото: до ${a} шт. · Файлы: до ${b} шт. (≤${c}MB)`,
    imageLabel: (a: number) => `Фото товара (до ${a} шт., авт. сжатие)`,
    chooseImages: (n: number) => `Выбрать фото${n > 0 ? ` (${n} шт.)` : ''}`,
    filesLabel: (a: number) => `Документы по товару (прайс / каталог PDF / Excel / Word / архив, до ${a} шт.)`,
    clickUpload: 'Загрузить файлы',
    uploadHint: (a: number) => `Несколько файлов · каждый до ${a}MB (вкл. архивы) · основные файлы сюда`,
    uploading: (n: string) => `Загрузка «${n}»… (большие файлы требуют ожидания)`,
    clickView: 'Просмотр',
    productTitle: 'Товары',
    filledCount: (n: number) => `Заполнено: ${n} · название необязательно`,
    productX: (i: number, s: string) => `Товар ${i} · ${s}`,
    unnamed: (i: number) => `Товар без названия ${i}`,
    deleteProduct: 'Удалить товар',
    productName: 'Название товара (необязательно)',
    productNamePh: 'Например: угловой трещоточный ключ 3/8',
    price: 'Цена',
    unit: 'Единица',
    unitPh: 'шт / комплект / набор',
    netdisk: 'Ссылка на облако',
    netdiskPh: 'Например: Baidu / Aliyun / Quark / Tencent Weiyun и др.',
    productLink: 'Ссылка на товар',
    productLinkPh: 'https://... (необязательно)',
    remark: 'Примечание',
    remarkPh: 'Срок поставки, мин. заказ, преимущества (необязательно)',
    addProduct: 'Добавить товар',
    submit: 'Отправить товары',
    submitting: 'Отправка...',
    uploadingSubmit: (n: string) => `Файлы загружаются… (${n})`,
    uploadWait: 'Идёт загрузка файлов — дождитесь окончания и отправьте',
    submitHint: 'После отправки мы проверим в течение 1–2 рабочих дней и опубликуем товары',
    successTitle: 'Успешно отправлено!',
    successDesc1: 'Спасибо за сотрудничество. Мы проверим в течение',
    successDesc2: '1–2 рабочих дней',
    successDesc3: 'и опубликуем результат. Вы можете продолжить подачу других товаров.',
    submitAgain: 'Отправить ещё',
    errSupplier: 'Укажите название компании',
    errContact: 'Укажите контактное лицо',
    errPhone: 'Укажите телефон',
    submitFail: 'Ошибка отправки, попробуйте позже',
    keyVerifyFail: 'Ошибка проверки ключа, попробуйте позже',
    uploadFail: 'Ошибка загрузки, попробуйте ещё раз',
    fileUploading: 'Идёт загрузка файлов — дождитесь окончания и отправьте',
    errKeyEmpty: 'Сначала укажите ключ сотрудничества',
    keyValid: (label: string) => `Ключ действителен, добро пожаловать, ${label}`,
    netErr: 'Сетевая ошибка, попробуйте позже',
    maxImages: (a: number) => `Максимум ${a} фото`,
    overImages: (a: number, n: number) => `Лимит ${a} фото, добавлены первые ${n}`,
    imgFormat: (n: string) => `«${n}» — недопустимый формат, только jpg / png / webp / gif`,
    imgFail: (n: string) => `«${n}» — ошибка обработки`,
    maxFiles: (a: number) => `Максимум ${a} файлов`,
    overFiles: (a: number, n: number) => `Лимит ${a} файлов, добавлены первые ${n}`,
    fileFormat: (n: string) => `«${n}» — недопустимый формат, только PDF / Excel / Word / CSV / архивы`,
    fileTooLarge: (n: string, a: number) => `«${n}» — размер более ${a}MB не допускается`,
    uploadFailed: (n: string) => `«${n}» — ошибка загрузки, попробуйте ещё раз`,
  },
  en: {
    lang: 'Language',
    brand: 'Huiying Supply Chain',
    headerSub: 'Supplier Product Submission',
    backHome: 'Back to Official Website',
    footer: 'Huiying Supply Chain · Supplier Cooperation Platform',
    exclusive: 'For Partner Suppliers',
    keyTitle: 'Supplier Product Submission',
    keyDesc: 'Submit your product details — we will review within 1–2 business days.',
    keyNotice1: 'A ',
    keyNotice2: 'cooperation key',
    keyNotice3: ' is required to submit. The key is provided by our contact person. ',
    keyNotice4: 'No key',
    keyNotice5: '? Contact our team or ',
    keyNotice6: 'visit our website',
    keyNotice7: ' to learn more.',
    keyLabel: 'Cooperation Key',
    keyPh: 'e.g. HYJJ-1A2B-3C4D',
    verifying: 'Verifying...',
    next: 'Next',
    keyInvalid: 'Invalid or disabled key, please contact your contact person',
    rejectedTitle: 'Your previous submissions were rejected — please revise and resubmit',
    rejectedReason: 'Rejection reason',
    supplierTitle: 'Supplier Information',
    requiredHint: '（fields marked * are required）',
    supplierName: 'Company Name',
    supplierNamePh: 'e.g. Nantong Dongcheng Tool Factory',
    contactName: 'Contact Person',
    contactNamePh: 'e.g. Manager Wang',
    contactPhone: 'Phone',
    contactPhonePh: 'Mobile or landline',
    wechat: 'WeChat',
    wechatPh: 'WeChat ID for contact',
    address: 'Region',
    addressPh: 'e.g. Jiangsu, Nantong',
    mainCategory: 'Main Category',
    mainCategoryPh: 'e.g. saw blades / power tools / drilling equipment',
    mediaTitle: 'Photos & Documents',
    mediaHint: (a: number, b: number, c: number) => `Images: up to ${a} · Files: up to ${b} (≤${c}MB)`,
    imageLabel: (a: number) => `Product Images (up to ${a}, auto-compressed)`,
    chooseImages: (n: number) => `Choose Images${n > 0 ? ` (${n})` : ''}`,
    filesLabel: (a: number) => `Product Documents (price list / catalog PDF / Excel / Word / archive, up to ${a})`,
    clickUpload: 'Upload Files',
    uploadHint: (a: number) => `Multi-select · each up to ${a}MB (incl. archives) · main files here`,
    uploading: (n: string) => `Uploading "${n}"… (large files may take time)`,
    clickView: 'View',
    productTitle: 'Products',
    filledCount: (n: number) => `${n} added · name optional`,
    productX: (i: number, s: string) => `Product ${i} · ${s}`,
    unnamed: (i: number) => `Unnamed product ${i}`,
    deleteProduct: 'Delete this product',
    productName: 'Product Name (optional)',
    productNamePh: 'e.g. angle ratchet wrench 3/8',
    price: 'Price',
    unit: 'Unit',
    unitPh: 'pcs / set / box',
    netdisk: 'Cloud Storage Link',
    netdiskPh: 'e.g. Baidu / Aliyun / Quark / Tencent Weiyun etc.',
    productLink: 'Product Link',
    productLinkPh: 'https://... (optional)',
    remark: 'Remark',
    remarkPh: 'Lead time, MOQ, advantages (optional)',
    addProduct: 'Add a Product',
    submit: 'Submit Products',
    submitting: 'Submitting...',
    uploadingSubmit: (n: string) => `Files uploading… (${n})`,
    uploadWait: 'Files are uploading — please wait and then submit',
    submitHint: 'We will review within 1–2 business days and publish your products',
    successTitle: 'Submitted Successfully!',
    successDesc1: 'Thank you for your cooperation. We will review within',
    successDesc2: '1–2 business days',
    successDesc3: ' and sync the result to the product library. You can continue submitting more products.',
    submitAgain: 'Submit Another',
    errSupplier: 'Please enter company name',
    errContact: 'Please enter contact person',
    errPhone: 'Please enter phone number',
    submitFail: 'Submission failed, please try again later',
    keyVerifyFail: 'Key verification failed, please try again later',
    uploadFail: 'Upload failed, please retry',
    fileUploading: 'Files are uploading — please wait until upload completes and then submit',
    errKeyEmpty: 'Please enter the cooperation key first',
    keyValid: (label: string) => `Key is valid, welcome ${label}`,
    netErr: 'Network error, please try again later',
    maxImages: (a: number) => `Up to ${a} images`,
    overImages: (a: number, n: number) => `Limit ${a} images, only first ${n} added`,
    imgFormat: (n: string) => `"${n}" format not supported, only jpg / png / webp / gif`,
    imgFail: (n: string) => `"${n}" processing failed`,
    maxFiles: (a: number) => `Up to ${a} files`,
    overFiles: (a: number, n: number) => `Limit ${a} files, only first ${n} added`,
    fileFormat: (n: string) => `"${n}" format not supported, only PDF / Excel / Word / CSV / archives`,
    fileTooLarge: (n: string, a: number) => `"${n}" exceeds ${a}MB limit`,
    uploadFailed: (n: string) => `"${n}" upload failed: please retry`,
  },
};


const IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const DOC_MIME = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/csv',
  'application/zip',
  'application/x-zip-compressed',
  'application/x-rar-compressed',
  'application/vnd.rar',
  'application/x-7z-compressed',
  'application/x-tar',
  'application/gzip',
];
// 浏览器对部分压缩包/文件会识别成 application/octet-stream 或空类型，按扩展名兜底
const DOC_EXTS = ['pdf', 'xls', 'xlsx', 'doc', 'docx', 'csv', 'zip', 'rar', '7z', 'gz', 'tgz', 'tar'];
const MAX_IMAGES = 500;
const MAX_FILE_MB = 200;
const MAX_FILES = 20;
const IMG_MAX_EDGE = 800;
const IMG_QUALITY = 0.72;

const isDocFile = (f: File): boolean =>
  DOC_MIME.includes(f.type) ||
  DOC_EXTS.includes((f.name.split('.').pop() || '').toLowerCase());

/** 独立上传单个文件到服务器（先传后存，免卡顿），返回磁盘路径 */
function uploadFileToServer(file: File, key: string): Promise<SupplierFile> {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('key', key);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/public/supplier/upload-file');
    xhr.onload = () => {
      let j: any = null;
      try {
        j = JSON.parse(xhr.responseText);
      } catch {
        reject(new Error('上传响应解析失败'));
        return;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ name: j.name, size: j.size, mime: j.mime || file.type, url: j.url });
      } else {
        reject(new Error(j.message || j.error?.message || `上传失败(${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error('网络异常，请重试'));
    xhr.ontimeout = () => reject(new Error('上传超时，请重试'));
    xhr.send(fd);
  });
}

interface RejectedRecord {
  productName: string;
  rejectReason: string;
  updatedAt: string;
}

interface ProductItem {
  productName: string;
  price: string;
  unit: string;
  spec: string;
  productUrl: string;
  remark: string;
}

type Step = 'key' | 'form' | 'success';

const inputCls =
  'w-full px-3.5 py-2.5 rounded-lg border border-[#E4E7EC] bg-white text-[14px] text-[#1D2733] placeholder:text-[#98A2B3] outline-none focus:border-[#D97706] focus:ring-2 focus:ring-[#D97706]/20 transition-all';
const labelCls = 'block text-[13px] font-medium text-[#5B6773] mb-1.5';

const emptyProduct = (): ProductItem => ({
  productName: '',
  price: '',
  unit: '',
  spec: '',
  productUrl: '',
  remark: '',
});

const compressImage = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        if (w > IMG_MAX_EDGE || h > IMG_MAX_EDGE) {
          const r = Math.min(IMG_MAX_EDGE / w, IMG_MAX_EDGE / h);
          w = Math.round(w * r);
          h = Math.round(h * r);
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('canvas'));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', IMG_QUALITY));
      };
      img.onerror = reject;
      img.src = String(reader.result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const SupplierApplyPage = () => {
  const [lang, setLang] = useState<Lang>('zh');
  const T = t[lang];

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

  // 多商品
  const [products, setProducts] = useState<ProductItem[]>([emptyProduct()]);
  const [openIdx, setOpenIdx] = useState(0);

  // 多图 + 文件
  const [images, setImages] = useState<{ dataUrl: string; name: string }[]>([]);
  const [files, setFiles] = useState<SupplierFile[]>([]);
  const [uploadingName, setUploadingName] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /** 删除已上传但未提交的文件（密钥校验 + 引用保护，已挂商品的自动被拒绝） */
  const deleteUploadedFiles = (urls: string[], key: string): void => {
    const list = (urls || []).filter((u) => u && u.startsWith('/uploads/public/'));
    if (!list.length || !key) return;
    for (const url of list) {
      fetch('/api/public/supplier/delete-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, url }),
        keepalive: true,
      }).catch(() => undefined);
    }
  };

  // 离开页面 / 刷新时，尽力清理本次上传但未提交的文件（未提交不占用服务器空间）
  useEffect(() => {
    const clean = () => {
      const urls = files.filter((f) => f.url).map((f) => f.url as string);
      if (urls.length) deleteUploadedFiles(urls, keyValue.trim());
    };
    window.addEventListener('pagehide', clean);
    window.addEventListener('beforeunload', clean);
    return () => {
      window.removeEventListener('pagehide', clean);
      window.removeEventListener('beforeunload', clean);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files, keyValue]);

  const handleVerifyKey = async () => {
    const key = keyValue.trim();
    if (!key) {
      toast.error(T.errKeyEmpty);
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
          toast.success(T.keyValid(data.label));
        }
      } else {
        toast.error(data.message || T.keyInvalid);
      }
    } catch (error) {
      logger.error('密钥校验失败', error as Error);
      toast.error(T.netErr);
    } finally {
      setCheckingKey(false);
    }
  };

  const handleImagesPicked = async (fileList: FileList | null) => {
    if (!fileList) return;
    const arr = Array.from(fileList);
    const remain = MAX_IMAGES - images.length;
    if (remain <= 0) {
      toast.error(T.maxImages(MAX_IMAGES));
      return;
    }
    const picked = arr.slice(0, remain);
    if (arr.length > remain) toast.warning(T.overImages(MAX_IMAGES, remain));
    const added: { dataUrl: string; name: string }[] = [];
    for (const f of picked) {
      if (!IMAGE_MIME.includes(f.type)) {
        toast.error(T.imgFormat(f.name));
        continue;
      }
      try {
        const url = await compressImage(f);
        added.push({ dataUrl: url, name: f.name });
      } catch {
        toast.error(T.imgFail(f.name));
      }
    }
    if (added.length) setImages((prev) => [...prev, ...added]);
  };

  const handleFilesPicked = async (fileList: FileList | null) => {
    if (!fileList) return;
    const arr = Array.from(fileList);
    const remain = MAX_FILES - files.length;
    if (remain <= 0) {
      toast.error(T.maxFiles(MAX_FILES));
      return;
    }
    const picked = arr.slice(0, remain);
    if (arr.length > remain) toast.warning(T.overFiles(MAX_FILES, remain));
    for (const f of picked) {
      if (!isDocFile(f)) {
        toast.error(T.fileFormat(f.name));
        continue;
      }
      if (f.size > MAX_FILE_MB * 1024 * 1024) {
        toast.error(T.fileTooLarge(f.name, MAX_FILE_MB));
        continue;
      }
      setUploadingName(f.name);
      try {
        const up = await uploadFileToServer(f, keyValue.trim());
        setFiles((prev) => [...prev, up]);
      } catch (e) {
        toast.error(T.uploadFailed(f.name));
      } finally {
        setUploadingName(null);
      }
    }
  };

  const updateProduct = (idx: number, patch: Partial<ProductItem>) => {
    setProducts((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  };

  const addProduct = () => {
    setProducts((prev) => [...prev, emptyProduct()]);
    setOpenIdx(products.length);
  };

  const removeProduct = (idx: number) => {
    setProducts((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      if (next.length === 0) next.push(emptyProduct());
      return next;
    });
    setOpenIdx(0);
  };

  const handleSubmit = async () => {
    // 文件正在上传时禁止提交，显著提示
    if (uploadingName) {
      toast.error(T.fileUploading, {
        duration: 3500,
        style: { background: '#B45309', color: '#fff', fontWeight: 600, border: 'none' },
      });
      return;
    }
    if (!supplierName.trim()) return toast.error(T.errSupplier);
    if (!contactName.trim()) return toast.error(T.errContact);
    if (!contactPhone.trim()) return toast.error(T.errPhone);

    const validProducts = products.filter(
      (p) => p.productName.trim() || p.price.trim() || p.spec.trim() || p.remark.trim() || p.productUrl.trim(),
    );
    const payloadProducts = validProducts.length > 0 ? validProducts : [emptyProduct()];

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
        products: payloadProducts.map((p) => ({
          productName: p.productName.trim() || undefined,
          price: p.price.trim() || undefined,
          unit: p.unit.trim() || undefined,
          spec: p.spec.trim() || undefined,
          productUrl: p.productUrl.trim() || undefined,
          remark: p.remark.trim() || undefined,
        })),
        images: images.map((i) => i.dataUrl),
        files: files.length > 0 ? files : undefined,
      });
      if (res.ok) {
        // 提交成功：文件已被商品引用（引用保护），前端清空待删列表，避免离开页面时误发删除请求
        setFiles([]);
        setStep('success');
      } else {
        // 提交失败：清理已上传未提交的文件
        deleteUploadedFiles(files.filter((f) => f.url).map((f) => f.url as string), keyValue.trim());
        toast.error(res.message || T.submitFail);
      }
    } catch (error) {
      // 网络/异常失败：同样清理已上传未提交的文件
      deleteUploadedFiles(files.filter((f) => f.url).map((f) => f.url as string), keyValue.trim());
      logger.error('供应商提交失败', error as Error);
      toast.error(T.submitFail);
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
    setProducts([emptyProduct()]);
    setOpenIdx(0);
    setImages([]);
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
              <div className="text-[15px] font-semibold text-[#1D2733]">{T.brand}</div>
              <div className="text-[11px] text-[#98A2B3]">{T.headerSub}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* 语言切换 */}
            <div className="flex items-center rounded-lg border border-[#E4E7EC] overflow-hidden">
              {(['zh', 'ru', 'en'] as Lang[]).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLang(l)}
                  className={`px-2.5 py-1.5 text-[12px] font-medium transition-colors ${lang === l ? 'bg-[#D97706] text-white' : 'bg-white text-[#5B6773] hover:bg-[#FFF7E6]'}`}
                >
                  {l === 'zh' ? '中' : l === 'ru' ? 'RU' : 'EN'}
                </button>
              ))}
            </div>
            <a
              href={OFFICIAL_SITE}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-medium text-[#B45309] bg-[#FFF7E6] hover:bg-[#FDE8C8] transition-colors"
            >
              <ArrowLeft className="size-4" />
              {T.backHome}
            </a>
          </div>
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
                  {T.exclusive}
                </div>
                <h1 className="text-[22px] font-semibold">{T.keyTitle}</h1>
                <p className="mt-1.5 text-[13.5px] text-white/85 leading-relaxed">
                  {T.keyDesc}
                </p>
              </div>
            </div>

            <div className="p-6">
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-[#FFF7E6] border border-[#FDE8C8]">
                <ShieldCheck className="size-5 text-[#D97706] shrink-0 mt-0.5" />
                <p className="text-[13px] text-[#7A5A28] leading-relaxed">
                  {T.keyNotice1}<b>{T.keyNotice2}</b>{T.keyNotice3}
                  <b>{T.keyNotice4}</b>{T.keyNotice5}
                  <a
                    href={OFFICIAL_SITE}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#B45309] font-medium underline underline-offset-2"
                  >
                    {T.keyNotice6}
                  </a>
                  {T.keyNotice7}
                </p>
              </div>

              <div className="mt-5">
                <label className={labelCls}>{T.keyLabel}</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={keyValue}
                    onChange={(e) => setKeyValue(e.target.value)}
                    placeholder={T.keyPh}
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
                    {checkingKey ? T.verifying : T.next}
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
                  {T.rejectedTitle}
                </div>
                <div className="space-y-1.5">
                  {rejectedRecords.map((r, idx) => (
                    <div key={idx} className="text-[12.5px] text-amber-700 leading-relaxed">
                      <span className="font-medium">「{r.productName}」</span>
                      {T.rejectedReason}：{r.rejectReason}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 供应商信息 */}
            <section className="rounded-2xl bg-white shadow-sm border border-[#E4E7EC] overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[#F0F2F5] flex items-center gap-2 bg-[#FFFBF5]">
                <Building2 className="size-4.5 text-[#D97706]" />
                <h2 className="text-[15px] font-semibold text-[#1D2733]">{T.supplierTitle}</h2>
                <span className="text-[12px] text-[#98A2B3]">{T.requiredHint}</span>
              </div>
              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className={labelCls}>
                    <span className="text-rose-500 mr-0.5">*</span>{T.supplierName}
                  </label>
                  <input type="text" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} placeholder={T.supplierNamePh} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>
                    <span className="text-rose-500 mr-0.5">*</span>{T.contactName}
                  </label>
                  <input type="text" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder={T.contactNamePh} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>
                    <span className="text-rose-500 mr-0.5">*</span>{T.contactPhone}
                  </label>
                  <input type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder={T.contactPhonePh} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{T.wechat}</label>
                  <input type="text" value={wechat} onChange={(e) => setWechat(e.target.value)} placeholder={T.wechatPh} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{T.address}</label>
                  <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder={T.addressPh} className={inputCls} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>{T.mainCategory}</label>
                  <input type="text" value={mainCategory} onChange={(e) => setMainCategory(e.target.value)} placeholder={T.mainCategoryPh} className={inputCls} />
                </div>
              </div>
            </section>

            {/* 图片与资料 */}
            <section className="rounded-2xl bg-white shadow-sm border border-[#E4E7EC] overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[#F0F2F5] flex items-center gap-2 bg-[#FFFBF5]">
                <ImagePlus className="size-4.5 text-[#D97706]" />
                <h2 className="text-[15px] font-semibold text-[#1D2733]">{T.mediaTitle}</h2>
                <span className="text-[12px] text-[#98A2B3]">
                  {T.mediaHint(MAX_IMAGES, MAX_FILES, MAX_FILE_MB)}
                </span>
              </div>
              <div className="p-5 space-y-5">
                {/* 商品图片：紧凑网格，小一点 */}
                <div>
                  <label className={labelCls}>{T.imageLabel(MAX_IMAGES)}</label>
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="w-full sm:w-44 h-20 rounded-xl border-2 border-dashed border-[#E4E7EC] bg-[#FBFCFE] flex flex-col items-center justify-center gap-1 text-[#98A2B3] hover:border-[#D97706] hover:text-[#D97706] transition-colors"
                  >
                    <ImagePlus className="size-5" />
                    <span className="text-[12.5px]">{T.chooseImages(images.length)}</span>
                  </button>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      void handleImagesPicked(e.target.files);
                      e.target.value = '';
                    }}
                  />
                  {images.length > 0 && (
                    <div className="mt-3 grid grid-cols-4 sm:grid-cols-5 gap-2">
                      {images.map((img, idx) => (
                        <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-[#E4E7EC] group">
                          <img src={img.dataUrl} alt={img.name} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setImages((prev) => prev.filter((_, i) => i !== idx))}
                            className="absolute top-0.5 right-0.5 size-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="size-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 资料文件：大区域 */}
                <div>
                  <label className={labelCls}>{T.filesLabel(MAX_FILES)}</label>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full min-h-[120px] rounded-xl border-2 border-dashed border-[#E4E7EC] bg-[#FFFBF5] flex flex-col items-center justify-center gap-2 text-[#98A2B3] hover:border-[#D97706] hover:text-[#B45309] transition-colors py-6"
                  >
                    <Paperclip className="size-8" />
                    <span className="text-[14px] font-medium">{T.clickUpload}</span>
                    <span className="text-[11.5px]">{T.uploadHint(MAX_FILE_MB)}</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.xlsx,.xls,.doc,.docx,.csv,.zip,.rar,.7z,.gz,.tgz,.tar"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      void handleFilesPicked(e.target.files);
                      e.target.value = '';
                    }}
                  />
                  {uploadingName && (
                    <div className="mt-2 text-[12px] text-[#B45309] flex items-center gap-1.5">
                      <span className="inline-block size-3 rounded-full border-2 border-[#D97706] border-t-transparent animate-spin" />
                      {T.uploading(uploadingName)}
                    </div>
                  )}
                  {files.length > 0 && (
                    <ul className="mt-3 space-y-2">
                      {files.map((f, idx) => (
                        <li
                          key={idx}
                          className="flex items-center gap-2.5 px-4 py-3 rounded-lg bg-[#FFFBF5] border border-[#FDE8C8]"
                        >
                          <FileText className="size-5 text-[#D97706] shrink-0" />
                          <a
                            href={f.url || '#'}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 min-w-0 group"
                            onClick={(e) => {
                              if (!f.url) e.preventDefault();
                            }}
                          >
                            <div className="text-[13.5px] font-medium text-[#1D2733] truncate group-hover:text-[#D97706]">
                              {f.name}
                            </div>
                            <div className="text-[11.5px] text-[#98A2B3]">
                              {(f.size / 1024 / 1024).toFixed(2)} MB{f.url ? ` · ${T.clickView}` : ''}
                            </div>
                          </a>
                          <button
                            type="button"
                            onClick={() => {
                              const removed = files[idx];
                              setFiles((prev) => prev.filter((_, i) => i !== idx));
                              if (removed?.url) deleteUploadedFiles([removed.url], keyValue.trim());
                            }}
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

            {/* 商品信息（可添加多个，可折叠） */}
            <section className="rounded-2xl bg-white shadow-sm border border-[#E4E7EC] overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[#F0F2F5] flex items-center gap-2 bg-[#FFFBF5]">
                <Package className="size-4.5 text-[#D97706]" />
                <h2 className="text-[15px] font-semibold text-[#1D2733]">{T.productTitle}</h2>
                <span className="text-[12px] text-[#98A2B3]">{T.filledCount(products.length)}</span>
              </div>
              <div className="p-5 space-y-3">
                {products.map((p, idx) => {
                  const open = openIdx === idx;
                  const summary = p.productName.trim() || T.unnamed(idx + 1);
                  return (
                    <div key={idx} className="rounded-xl border border-[#E4E7EC] overflow-hidden">
                      <div
                        className="flex items-center gap-2 px-4 py-3 bg-[#FBFCFE] cursor-pointer select-none"
                        onClick={() => setOpenIdx(open ? -1 : idx)}
                      >
                        <ChevronDown className={`size-4 text-[#98A2B3] transition-transform ${open ? '' : '-rotate-90'}`} />
                        <span className="text-[13px] font-medium text-[#1D2733] flex-1 truncate">
                          {T.productX(idx + 1, summary)}
                        </span>
                        {products.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeProduct(idx);
                            }}
                            className="size-7 rounded-lg text-[#98A2B3] hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors"
                            title={T.deleteProduct}
                          >
                            <Trash2 className="size-4" />
                          </button>
                        )}
                      </div>
                      {open && (
                        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="sm:col-span-2">
                            <label className={labelCls}>{T.productName}</label>
                            <input type="text" value={p.productName} onChange={(e) => updateProduct(idx, { productName: e.target.value })} placeholder={T.productNamePh} className={inputCls} />
                          </div>
                          <div>
                            <label className={labelCls}>{T.price}</label>
                            <div className="relative">
                              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[14px] text-[#98A2B3]">¥</span>
                              <input type="text" value={p.price} onChange={(e) => updateProduct(idx, { price: e.target.value })} placeholder="0.00" className={`${inputCls} pl-8`} />
                            </div>
                          </div>
                          <div>
                            <label className={labelCls}>{T.unit}</label>
                            <input type="text" value={p.unit} onChange={(e) => updateProduct(idx, { unit: e.target.value })} placeholder={T.unitPh} className={inputCls} />
                          </div>
                          <div>
                            <label className={labelCls}>{T.netdisk}</label>
                            <input type="text" value={p.spec} onChange={(e) => updateProduct(idx, { spec: e.target.value })} placeholder={T.netdiskPh} className={inputCls} />
                          </div>
                          <div>
                            <label className={labelCls}>{T.productLink}</label>
                            <input type="text" value={p.productUrl} onChange={(e) => updateProduct(idx, { productUrl: e.target.value })} placeholder={T.productLinkPh} className={inputCls} />
                          </div>
                          <div className="sm:col-span-2">
                            <label className={labelCls}>{T.remark}</label>
                            <textarea value={p.remark} onChange={(e) => updateProduct(idx, { remark: e.target.value })} rows={2} placeholder={T.remarkPh} className={`${inputCls} resize-none`} />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                <button
                  type="button"
                  onClick={addProduct}
                  className="w-full py-3 rounded-xl border-2 border-dashed border-[#E4E7EC] text-[13.5px] font-medium text-[#D97706] bg-[#FFFBF5] hover:bg-[#FDE8C8] hover:border-[#D97706] transition-colors inline-flex items-center justify-center gap-1.5"
                >
                  <Plus className="size-4" />
                  {T.addProduct}
                </button>
              </div>
            </section>

            {/* 提交按钮 */}
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={submitting}
              className="w-full py-4 rounded-xl text-white text-[16px] font-semibold disabled:opacity-60 transition-all hover:shadow-lg hover:-translate-y-px"
              style={{ background: uploadingName ? 'linear-gradient(120deg, #A16207, #CA8A04)' : 'linear-gradient(120deg, #B45309, #D97706)' }}
            >
              {uploadingName ? T.uploadingSubmit(uploadingName) : submitting ? T.submitting : T.submit}
            </button>
            {uploadingName && (
              <p className="text-center text-[13px] font-semibold text-[#B45309] mt-1 animate-pulse">
                {T.uploadWait}
              </p>
            )}
            <p className="text-center text-[12px] text-[#98A2B3]">
              {T.submitHint}
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
            <h1 className="text-[20px] font-semibold text-[#1D2733]">{T.successTitle}</h1>
            <p className="mt-2 text-[14px] text-[#5B6773] leading-relaxed">
              {T.successDesc1} <b>{T.successDesc2}</b> {T.successDesc3}
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white text-[14px] font-semibold transition-all hover:shadow-md"
                style={{ background: 'linear-gradient(120deg, #B45309, #D97706)' }}
              >
                <Package className="size-4" />
                {T.submitAgain}
              </button>
              <a
                href={OFFICIAL_SITE}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-[#E4E7EC] text-[14px] font-medium text-[#5B6773] hover:bg-[#F7F9FA] transition-colors"
              >
                <ArrowLeft className="size-4" />
                {T.backHome}
              </a>
            </div>
          </div>
        )}
      </main>

      <footer className="pb-6 text-center text-[12px] text-[#B8C0CC]">
        {T.footer}
      </footer>
    </div>
  );
};

export default SupplierApplyPage;
