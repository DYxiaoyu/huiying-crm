import { useCallback, useEffect, useState } from 'react';
import {
  KeyRound,
  Plus,
  Copy,
  Power,
  Trash2,
  Link2,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import * as supplierKeysApi from '@/api/supplierKeys';
import type { SupplierKey } from '@shared/api.interface';

const APPLY_URL = 'https://hyjj.shop/join';

const SupplierKeysPage = () => {
  const [keys, setKeys] = useState<SupplierKey[]>([]);
  const [loading, setLoading] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [creating, setCreating] = useState(false);

  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingKey, setDeletingKey] = useState<SupplierKey | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchKeys = useCallback(async () => {
    setLoading(true);
    try {
      const list = await supplierKeysApi.getKeys();
      setKeys(list);
    } catch (error) {
      logger.error('加载密钥失败', error as Error);
      toast.error('加载密钥失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchKeys();
  }, [fetchKeys]);

  const handleCreate = async () => {
    if (!label.trim()) {
      toast.error('请填写备注（如供应商公司名）');
      return;
    }
    setCreating(true);
    try {
      const created = await supplierKeysApi.createKey({ label: label.trim() });
      setCreateOpen(false);
      setLabel('');
      toast.success('密钥已生成');
      await fetchKeys();
      navigator.clipboard?.writeText(created.key).catch(() => undefined);
      toast.info('密钥已复制到剪贴板，发给供应商即可');
    } catch (error) {
      logger.error('生成密钥失败', error as Error);
      toast.error('生成失败，请重试');
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (key: SupplierKey) => {
    setTogglingId(key.id);
    try {
      const updated = await supplierKeysApi.updateKey(key.id, { enabled: !key.enabled });
      setKeys((prev) => prev.map((k) => (k.id === key.id ? updated : k)));
      toast.success(updated.enabled ? '密钥已启用' : '密钥已停用');
    } catch (error) {
      logger.error('切换密钥状态失败', error as Error);
      toast.error('操作失败，请重试');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deletingKey) return;
    setDeleting(true);
    try {
      await supplierKeysApi.deleteKey(deletingKey.id);
      setDeleteDialogOpen(false);
      setDeletingKey(null);
      setKeys((prev) => prev.filter((k) => k.id !== deletingKey.id));
      toast.success('密钥已删除');
    } catch (error) {
      logger.error('删除密钥失败', error as Error);
      toast.error('删除失败，请重试');
    } finally {
      setDeleting(false);
    }
  };

  const copyText = (text: string) => {
    navigator.clipboard?.writeText(text).then(
      () => toast.success('已复制'),
      () => toast.error('复制失败，请手动复制'),
    );
  };

  return (
    <div className="p-6 flex flex-col gap-6">
      {/* 页面横幅 */}
      <div
        className="relative overflow-hidden rounded-2xl px-6 py-5 text-white shadow-lg"
        style={{
          background: 'linear-gradient(120deg, #0E7C6B 0%, #14A085 60%, #2BB3A0 100%)',
          boxShadow: '0 8px 24px rgba(14,124,107,0.25)',
        }}
      >
        <div
          className="absolute -right-8 -top-10 size-36 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #ffffff 0%, transparent 70%)' }}
        />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-wide">供应商合作密钥</h1>
            <p className="mt-1 text-[13px] text-white/80">
              每个合作供应商一个密钥，发给他们即可自助提交商品资料
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            data-ai-section-type="button"
            className="inline-flex items-center gap-2 px-[16px] py-2 rounded-lg bg-white text-[#0E7C6B] text-sm font-semibold shadow-md hover:shadow-lg hover:-translate-y-px transition-all"
          >
            <Plus className="size-4" />
            生成新密钥
          </button>
        </div>
      </div>

      {/* 提交入口提示 */}
      <div
        className="flex flex-wrap items-center gap-2 px-4 py-3 rounded-xl bg-[#EFF8F6] border border-[#CBE8E2] text-[13.5px] text-[#0B6356]"
        data-ai-section-type="link"
      >
        <ShieldCheck className="size-4.5 shrink-0" />
        <span className="font-medium">供应商提交入口：</span>
        <a
          href={APPLY_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-semibold underline underline-offset-2 hover:text-[#0E7C6B]"
        >
          {APPLY_URL}
          <ExternalLink className="size-3.5" />
        </a>
        <button
          type="button"
          onClick={() => copyText(APPLY_URL)}
          className="inline-flex items-center gap-1 ml-1 px-2.5 py-1 rounded-lg bg-white border border-[#CBE8E2] text-[12.5px] font-medium hover:bg-white/70 transition-colors"
        >
          <Copy className="size-3.5" />
          复制链接
        </button>
        <span className="text-[12.5px] text-[#5B7D77]">
          （此链接建议放在官网右上角"供应商入驻"按钮）
        </span>
      </div>

      {/* 密钥列表 */}
      <div className="bg-white rounded-xl border border-[#E4E7EC] shadow-sm">
        {loading ? (
          <div className="p-10 text-center text-sm text-[#98A2B3]">加载中...</div>
        ) : keys.length === 0 ? (
          <div className="p-10 text-center">
            <KeyRound className="mx-auto size-10 text-[#C8D3CF] mb-3" />
            <div className="text-[14px] font-medium text-[#1D2733]">还没有密钥</div>
            <p className="mt-1 text-[13px] text-[#98A2B3]">
              点击右上角"生成新密钥"，发给第一家合作供应商
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#F0F2F5]">
            {keys.map((keyItem) => (
              <div
                key={keyItem.id}
                className="px-5 py-4 flex flex-wrap items-center gap-3"
              >
                {/* 状态灯 */}
                <div
                  className="shrink-0 size-2.5 rounded-full"
                  style={{ backgroundColor: keyItem.enabled ? '#22C55E' : '#CBD5E1' }}
                  title={keyItem.enabled ? '使用中' : '已停用'}
                />
                <div className="flex-1 min-w-[180px]">
                  <div className="text-[14px] font-semibold text-[#1D2733]">
                    {keyItem.label}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2">
                    <code className="px-2 py-0.5 rounded bg-[#F2F4F7] text-[12.5px] font-mono text-[#0E7C6B] tracking-wide">
                      {keyItem.key}
                    </code>
                    <button
                      type="button"
                      onClick={() => copyText(keyItem.key)}
                      title="复制密钥"
                      className="inline-flex items-center justify-center size-6 rounded text-[#98A2B3] hover:text-[#0E7C6B] hover:bg-[#EFF8F6] transition-colors"
                    >
                      <Copy className="size-3.5" />
                    </button>
                  </div>
                </div>
                <div className="text-[12px] text-[#98A2B3]">
                  {new Date(keyItem.createdAt).toLocaleDateString('zh-CN')} 创建
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => void handleToggle(keyItem)}
                    disabled={togglingId === keyItem.id}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-medium border transition-colors disabled:opacity-60 ${
                      keyItem.enabled
                        ? 'text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100'
                        : 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                    }`}
                  >
                    <Power className="size-3.5" />
                    {keyItem.enabled ? '停用' : '启用'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDeletingKey(keyItem);
                      setDeleteDialogOpen(true);
                    }}
                    title="删除"
                    className="inline-flex items-center justify-center size-8 rounded-lg text-[#98A2B3] hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 生成密钥弹窗 */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>生成新密钥</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <label className="block text-[13px] font-medium text-[#5B6773] mb-1.5">
              备注（供应商公司名）
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="如：南通东成工具厂"
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#E4E7EC] bg-white text-[14px] text-[#1D2733] placeholder:text-[#98A2B3] outline-none focus:border-[#0E7C6B] focus:ring-2 focus:ring-[#0E7C6B]/20 transition-all"
            />
            <p className="flex items-start gap-1.5 text-[12.5px] text-[#98A2B3]">
              <Link2 className="size-3.5 shrink-0 mt-0.5" />
              生成后自动复制密钥，发给供应商后他们在提交页输入即可
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              取消
            </Button>
            <Button
              type="button"
              onClick={() => void handleCreate()}
              disabled={creating}
              className="bg-[#0E7C6B] hover:bg-[#0B6356] text-white"
            >
              {creating ? '生成中...' : '生成'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除密钥</AlertDialogTitle>
            <AlertDialogDescription>
              确定删除「{deletingKey?.label ?? ''}」的密钥吗？删除后该供应商将无法再提交，
              已提交的商品不受影响。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDelete()}
              className="bg-rose-600 hover:bg-rose-700 text-white"
              disabled={deleting}
            >
              {deleting ? '删除中...' : '删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SupplierKeysPage;
