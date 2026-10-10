import { useState } from 'react';
import { toast } from 'sonner';

type Lang = 'ru' | 'zh' | 'en';

const t = {
  ru: {
    title: 'Регистрация заинтересованного клиента',
    subtitle: 'После заполнения формы с вами свяжется наш специалист',
    name: 'Имя',
    namePh: 'Ваше имя',
    phone: 'Телефон',
    phonePh: '+7 900 000-00-00',
    whatsapp: 'WhatsApp',
    whatsappPh: '+7 900 000-00-00',
    telegram: 'Telegram',
    telegramPh: '@username',
    email: 'Электронная почта',
    emailPh: 'you@example.com',
    company: 'Компания',
    companyPh: 'Название вашей компании',
    address: 'Адрес',
    addressPh: 'Город, страна',
    product: 'Интересующий товар',
    productPh: 'Какой товар вас интересует?',
    budget: 'Бюджет',
    budgetPh: 'Например: 500 000 руб.',
    requirement: 'Описание потребности',
    requirementPh: 'Расскажите подробнее, что вам нужно...',
    submit: 'Отправить заявку',
    submitting: 'Отправка...',
    success: 'Заявка успешно отправлена! Мы свяжемся с вами в ближайшее время.',
    errName: 'Укажите имя',
    errPhone: 'Укажите корректный телефон',
    errRequirement: 'Опишите вашу потребность',
    required: 'обязательно',
    lang: 'Язык',
  },
  zh: {
    title: '意向客户登记',
    subtitle: '填完信息会有专员回复您',
    name: '姓名',
    namePh: '您的姓名',
    phone: '手机号',
    phonePh: '+86 138 0000 0000',
    whatsapp: 'WhatsApp',
    whatsappPh: '+86 138 0000 0000',
    telegram: 'Telegram',
    telegramPh: '@username',
    email: '邮箱',
    emailPh: 'you@example.com',
    company: '公司名称',
    companyPh: '您的公司名称',
    address: '地址',
    addressPh: '城市、国家',
    product: '意向产品',
    productPh: '您想了解什么产品？',
    budget: '预算',
    budgetPh: '例如：50万元人民币',
    requirement: '需求描述',
    requirementPh: '请详细描述您的需求...',
    submit: '提交登记',
    submitting: '提交中...',
    success: '提交成功！我们会尽快与您联系。',
    errName: '请填写姓名',
    errPhone: '请填写正确的手机号',
    errRequirement: '请填写需求描述',
    required: '必填',
    lang: '语言',
  },
  en: {
    title: 'Intended Customer Registration',
    subtitle: 'Our specialist will contact you after you submit the form',
    name: 'Full Name',
    namePh: 'Your name',
    phone: 'Phone',
    phonePh: '+1 555 000 0000',
    whatsapp: 'WhatsApp',
    whatsappPh: '+1 555 000 0000',
    telegram: 'Telegram',
    telegramPh: '@username',
    email: 'Email',
    emailPh: 'you@example.com',
    company: 'Company',
    companyPh: 'Your company name',
    address: 'Address',
    addressPh: 'City, Country',
    product: 'Product of Interest',
    productPh: 'Which product are you interested in?',
    budget: 'Budget',
    budgetPh: 'e.g. $10,000',
    requirement: 'Requirement Description',
    requirementPh: 'Describe your needs in detail...',
    submit: 'Submit',
    submitting: 'Submitting...',
    success: 'Submitted successfully! We will contact you soon.',
    errName: 'Please enter your name',
    errPhone: 'Please enter a valid phone number',
    errRequirement: 'Please describe your requirement',
    required: 'required',
    lang: 'Language',
  },
};

export default function LeadFormPage() {
  const [lang, setLang] = useState<Lang>('ru');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', phone: '', whatsapp: '', telegram: '', email: '',
    company: '', address: '', product: '', budget: '', requirement: '',
  });
  const T = t[lang];

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error(T.errName);
    if (!/^\+?[0-9\s\-]{7,20}$/.test(form.phone.replace(/\s/g, ''))) return toast.error(T.errPhone);
    if (!form.requirement.trim()) return toast.error(T.errRequirement);
    setLoading(true);
    try {
      const res = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'error');
      }
      setDone(true);
    } catch (err: any) {
      toast.error(err.message || 'Submit failed');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#fef3e2,#fff)' }}>
        <div style={{ textAlign: 'center', padding: 40, maxWidth: 420 }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#d97706', color: '#fff', fontSize: 40, lineHeight: '72px', margin: '0 auto 20px' }}>✓</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12, color: '#1a1a1a' }}>{T.success}</h2>
          <p style={{ color: '#666', fontSize: 14 }}>Huiying Jijin</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#fef3e2 0%,#fff 100%', padding: '24px 16px 48px', fontFamily: "'PingFang SC','Segoe UI',Arial,sans-serif" }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        {/* 语言切换 */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 16 }}>
          {(['ru','zh','en'] as Lang[]).map((l) => (
            <button key={l} onClick={() => setLang(l)}
              style={{ padding: '6px 14px', borderRadius: 20, border: lang===l?'1px solid #d97706':'1px solid #e5e7eb',
                background: lang===l?'#d97706':'#fff', color: lang===l?'#fff':'#374151', cursor: 'pointer', fontSize: 13 }}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>

        <div style={{ background: '#fff', borderRadius: 16, padding: 28, boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a', margin: '0 0 6px' }}>{T.title}</h1>
          <p style={{ fontSize: 13, color: '#888', margin: '0 0 24px' }}>{T.subtitle}</p>

          <form onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label={T.name} required requiredText={T.required}><input value={form.name} onChange={set('name')} placeholder={T.namePh} style={inp} /></Field>
              <Field label={T.phone} required requiredText={T.required}><input value={form.phone} onChange={set('phone')} placeholder={T.phonePh} style={inp} /></Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label={T.whatsapp}><input value={form.whatsapp} onChange={set('whatsapp')} placeholder={T.whatsappPh} style={inp} /></Field>
              <Field label={T.telegram}><input value={form.telegram} onChange={set('telegram')} placeholder={T.telegramPh} style={inp} /></Field>
            </div>
            <Field label={T.email}><input value={form.email} onChange={set('email')} placeholder={T.emailPh} style={inp} /></Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label={T.company}><input value={form.company} onChange={set('company')} placeholder={T.companyPh} style={inp} /></Field>
              <Field label={T.address}><input value={form.address} onChange={set('address')} placeholder={T.addressPh} style={inp} /></Field>
            </div>
            <Field label={T.product}><input value={form.product} onChange={set('product')} placeholder={T.productPh} style={inp} /></Field>
            <Field label={T.budget}><input value={form.budget} onChange={set('budget')} placeholder={T.budgetPh} style={inp} /></Field>
            <Field label={T.requirement} required requiredText={T.required}><textarea value={form.requirement} onChange={set('requirement')} placeholder={T.requirementPh} style={{ ...inp, minHeight: 90, resize: 'vertical' }} /></Field>

            <button type="submit" disabled={loading}
              style={{ marginTop: 8, padding: '14px', borderRadius: 10, border: 'none', background: '#d97706', color: '#fff', fontSize: 15, fontWeight: 600, cursor: loading?'wait':'pointer' }}>
              {loading ? T.submitting : T.submit}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({ label, required, requiredText, children }: { label: string; required?: boolean; requiredText?: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ fontSize: 13, color: '#374151', marginBottom: 6, display: 'block' }}>
        {label} {required && (
          <span style={{ color: '#ef4444', fontSize: 17, fontWeight: 700, lineHeight: 1 }}>
            *<em style={{ fontStyle: 'normal', fontSize: 12, fontWeight: 500, marginLeft: 4 }}>（{requiredText}）</em>
          </span>
        )}
      </span>
      {children}
    </label>
  );
}

const inp: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb',
  fontSize: 14, boxSizing: 'border-box', outline: 'none', background: '#fafafa',
};
