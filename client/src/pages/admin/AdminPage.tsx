import React, { useCallback, useEffect, useState } from 'react';
import {
  Users,
  UserCog,
  KeyRound,
  ShieldCheck,
  Plus,
  Trash2,
  RefreshCw,
  X,
  Crown,
  User as UserIcon,
  Clock,
  Store,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  getAdminOverview,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} from '@client/src/api/admin';
import { useAuth } from '@client/src/contexts/AuthContext';
import type {
  AdminOverviewResponse,
  AdminEmployeeItem,
  EmployeeRole,
  StageDistribution,
} from '@shared/api.interface';

const PRIMARY = '#0E7C6B';
const BG = '#F2F4F7';
const CARD_BORDER = '#E4E7EC';

interface NewEmployeeForm {
  name: string;
  username: string;
  password: string;
  role: EmployeeRole;
}

interface ResetForm {
  password: string;
}

const AdminPage = () => {
  const { employee: me } = useAuth();
  const [data, setData] = useState<AdminOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // 新增员工弹窗
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<NewEmployeeForm>({
    name: '',
    username: '',
    password: '',
    role: 'employee',
  });
  const [creating, setCreating] = useState(false);

  // 重置密码弹窗
  const [resetTarget, setResetTarget] = useState<AdminEmployeeItem | null>(null);
  const [resetForm, setResetForm] = useState<ResetForm>({ password: '' });
  const [resetting, setResetting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminOverview();
      setData(res);
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || '加载老板后台数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim() || !createForm.username.trim() || !createForm.password.trim()) {
      toast.error('请填写完整信息');
      return;
    }
    if (createForm.password.length < 4) {
      toast.error('密码至少 4 位');
      return;
    }
    setCreating(true);
    try {
      await createEmployee({ ...createForm });
      toast.success('员工账号创建成功');
      setShowCreate(false);
      setCreateForm({ name: '', username: '', password: '', role: 'employee' });
      await load();
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || '创建失败');
    } finally {
      setCreating(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget) return;
    if (resetForm.password.length < 4) {
      toast.error('密码至少 4 位');
      return;
    }
    setResetting(true);
    try {
      await updateEmployee(resetTarget.id, { password: resetForm.password });
      toast.success(`已重置 ${resetTarget.name} 的密码`);
      setResetTarget(null);
      setResetForm({ password: '' });
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || '重置失败');
    } finally {
      setResetting(false);
    }
  };

  const handleDelete = async (item: AdminEmployeeItem) => {
    if (item.id === me?.id) {
      toast.error('不能删除自己的账号');
      return;
    }
    const ok = window.confirm(
      `确定删除员工「${item.name}」吗？\n\n该员工名下的 ${item.customerCount} 个客户、${item.supplierCount} 个供应商商品将自动转移到你的账号名下（数据不丢失），且无法恢复该账号。`
    );
    if (!ok) return;
    try {
      await deleteEmployee(item.id);
      toast.success(`已删除员工 ${item.name}，其名下数据已转移`);
      await load();
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || '删除失败');
    }
  };

  const overview = data?.overview;
  const employees = data?.employees ?? [];
  const stageDist: StageDistribution[] = overview?.customerByStage ?? [];
  const maxStage = Math.max(1, ...stageDist.map((s) => s.count));

  const statCards = [
    {
      label: '客户总数',
      value: overview?.customerTotal ?? 0,
      icon: Users,
      color: '#0E7C6B',
      bg: '#E4F2EF',
    },
    {
      label: '供应商总数',
      value: overview?.supplierTotal ?? 0,
      icon: Store,
      color: '#0E7C6B',
      bg: '#E4F2EF',
    },
    {
      label: '待审核供应商',
      value: overview?.supplierPending ?? 0,
      icon: Clock,
      color: '#B45309',
      bg: '#FDF0E3',
    },
    {
      label: '员工账号',
      value: overview?.employeeTotal ?? 0,
      icon: UserCog,
      color: '#1D4ED8',
      bg: '#E8EEFB',
    },
    {
      label: '供应商密钥',
      value: overview?.supplierKeyTotal ?? 0,
      icon: KeyRound,
      color: '#7C3AED',
      bg: '#F1EAFD',
    },
  ];

  return (
    <div className="space-y-5">
      {/* 头部 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" style={{ color: PRIMARY }} />
            <h2 className="text-[17px] font-semibold text-slate-900">老板后台</h2>
          </div>
          <p className="text-[13px] mt-1" style={{ color: '#5B6773' }}>
            全局数据一目了然，员工账号统一在此创建与管理
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void load()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] border transition-colors hover:bg-white"
            style={{ borderColor: CARD_BORDER, color: '#5B6773' }}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            刷新
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-medium text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: PRIMARY }}
          >
            <Plus className="w-4 h-4" />
            新增员工
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="py-16 text-center text-[14px]" style={{ color: '#8A94A6' }}>
          加载中...
        </div>
      ) : (
        <>
          {/* 统计卡片 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {statCards.map((c) => {
              const Icon = c.icon;
              return (
                <div
                  key={c.label}
                  className="bg-white rounded-xl p-4"
                  style={{ border: `1px solid ${CARD_BORDER}` }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[13px]" style={{ color: '#5B6773' }}>
                      {c.label}
                    </span>
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: c.bg }}
                    >
                      <Icon className="w-4 h-4" style={{ color: c.color }} />
                    </div>
                  </div>
                  <div className="text-[26px] font-semibold mt-1 text-slate-900">
                    {c.value}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            {/* 客户阶段分布 */}
            <div
              className="lg:col-span-1 bg-white rounded-xl p-4"
              style={{ border: `1px solid ${CARD_BORDER}` }}
            >
              <div className="text-[14px] font-semibold text-slate-900 mb-3">客户阶段分布</div>
              <div className="space-y-2.5">
                {stageDist.map((s) => (
                  <div key={s.stage}>
                    <div className="flex items-center justify-between text-[12px] mb-1">
                      <span style={{ color: '#5B6773' }}>{s.name}</span>
                      <span className="font-medium text-slate-700">{s.count}</span>
                    </div>
                    <div className="h-[6px] rounded-full overflow-hidden" style={{ backgroundColor: '#EFF1F4' }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.round((s.count / maxStage) * 100)}%`,
                          backgroundColor: PRIMARY,
                        }}
                      />
                    </div>
                  </div>
                ))}
                {stageDist.every((s) => s.count === 0) && (
                  <div className="text-[13px] py-6 text-center" style={{ color: '#8A94A6' }}>
                    暂无客户数据
                  </div>
                )}
              </div>
            </div>

            {/* 员工管理 */}
            <div
              className="lg:col-span-2 bg-white rounded-xl overflow-hidden"
              style={{ border: `1px solid ${CARD_BORDER}` }}
            >
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <div className="text-[14px] font-semibold text-slate-900">
                  员工账号管理
                  <span className="ml-2 text-[12px] font-normal" style={{ color: '#8A94A6' }}>
                    共 {employees.length} 人
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr
                      className="text-left"
                      style={{ color: '#8A94A6', borderBottom: `1px solid ${CARD_BORDER}` }}
                    >
                      <th className="px-4 py-2.5 font-medium">姓名</th>
                      <th className="px-4 py-2.5 font-medium">账号</th>
                      <th className="px-4 py-2.5 font-medium">角色</th>
                      <th className="px-4 py-2.5 font-medium">客户 / 供应商</th>
                      <th className="px-4 py-2.5 font-medium">创建时间</th>
                      <th className="px-4 py-2.5 font-medium text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((item) => {
                      const isMe = item.id === me?.id;
                      const isAdmin = item.role === 'admin';
                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-[#FAFBFC]"
                          style={{ borderBottom: `1px solid #EFF1F4` }}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-medium flex-shrink-0"
                                style={{
                                  backgroundColor: isAdmin ? '#FDF0E3' : '#E4F2EF',
                                  color: isAdmin ? '#B45309' : PRIMARY,
                                }}
                              >
                                {item.name.charAt(0)}
                              </div>
                              <span className="font-medium text-slate-900">
                                {item.name}
                                {isMe && (
                                  <span className="ml-1.5 text-[11px]" style={{ color: '#8A94A6' }}>
                                    (我)
                                  </span>
                                )}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3" style={{ color: '#5B6773' }}>
                            {item.username}
                          </td>
                          <td className="px-4 py-3">
                            {isAdmin ? (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[12px] font-medium"
                                style={{ backgroundColor: '#FDF0E3', color: '#B45309' }}
                              >
                                <Crown className="w-3 h-3" />
                                管理员
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[12px] font-medium"
                                style={{ backgroundColor: '#EFF1F4', color: '#5B6773' }}
                              >
                                <UserIcon className="w-3 h-3" />
                                员工
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3" style={{ color: '#5B6773' }} title="客户数 / 名下供应商数（不含供应商表单提交）">
                            {item.customerCount} / {item.supplierCount}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap" style={{ color: '#8A94A6' }}>
                            {new Date(item.createdAt).toLocaleDateString('zh-CN')}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setResetTarget(item)}
                                title="重置密码"
                                className="flex items-center gap-1 px-2 py-1.5 rounded-md text-[12px] transition-colors hover:bg-[#EFF1F4]"
                                style={{ color: '#1D4ED8' }}
                              >
                                <RefreshCw className="w-3 h-3" />
                                重置密码
                              </button>
                              {!isMe && (
                                <button
                                  onClick={() => handleDelete(item)}
                                  title="删除员工"
                                  className="flex items-center gap-1 px-2 py-1.5 rounded-md text-[12px] transition-colors hover:bg-[#FDECEC]"
                                  style={{ color: '#D92D20' }}
                                >
                                  <Trash2 className="w-3 h-3" />
                                  删除
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {employees.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center" style={{ color: '#8A94A6' }}>
                          还没有员工，点击右上角"新增员工"创建第一个账号
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 新增员工弹窗 */}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(15,23,42,.45)' }}
          onClick={() => setShowCreate(false)}
        >
          <form
            onSubmit={handleCreate}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[420px] bg-white rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[16px] font-semibold text-slate-900">新增员工账号</h3>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#F2F4F7]"
              >
                <X className="w-4 h-4" style={{ color: '#5B6773' }} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-slate-700">姓名 *</label>
                <input
                  type="text"
                  placeholder="如：王小明"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border text-[14px] outline-none focus:border-[#0E7C6B]"
                  style={{ borderColor: CARD_BORDER }}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-slate-700">登录账号 *</label>
                <input
                  type="text"
                  placeholder="3-20 位字母、数字或下划线"
                  value={createForm.username}
                  onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border text-[14px] outline-none focus:border-[#0E7C6B]"
                  style={{ borderColor: CARD_BORDER }}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-slate-700">初始密码 *</label>
                <input
                  type="text"
                  placeholder="至少 4 位，员工登录后可自己修改"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border text-[14px] outline-none focus:border-[#0E7C6B]"
                  style={{ borderColor: CARD_BORDER }}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-slate-700">角色</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCreateForm({ ...createForm, role: 'employee' })}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg border text-[13px] transition-colors"
                    style={{
                      borderColor: createForm.role === 'employee' ? PRIMARY : CARD_BORDER,
                      backgroundColor: createForm.role === 'employee' ? '#E4F2EF' : '#fff',
                      color: createForm.role === 'employee' ? PRIMARY : '#5B6773',
                    }}
                  >
                    <UserIcon className="w-3.5 h-3.5" />
                    员工（普通）
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateForm({ ...createForm, role: 'admin' })}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg border text-[13px] transition-colors"
                    style={{
                      borderColor: createForm.role === 'admin' ? '#B45309' : CARD_BORDER,
                      backgroundColor: createForm.role === 'admin' ? '#FDF0E3' : '#fff',
                      color: createForm.role === 'admin' ? '#B45309' : '#5B6773',
                    }}
                  >
                    <Crown className="w-3.5 h-3.5" />
                    管理员（老板）
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={creating}
              className="w-full mt-5 py-2.5 rounded-lg text-[14px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: PRIMARY }}
            >
              {creating ? '创建中...' : '创建账号'}
            </button>
          </form>
        </div>
      )}

      {/* 重置密码弹窗 */}
      {resetTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(15,23,42,.45)' }}
          onClick={() => setResetTarget(null)}
        >
          <form
            onSubmit={handleResetPassword}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[380px] bg-white rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[16px] font-semibold text-slate-900">
                重置 {resetTarget.name} 的密码
              </h3>
              <button
                type="button"
                onClick={() => setResetTarget(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#F2F4F7]"
              >
                <X className="w-4 h-4" style={{ color: '#5B6773' }} />
              </button>
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-slate-700">新密码</label>
              <input
                type="text"
                placeholder="至少 4 位"
                value={resetForm.password}
                onChange={(e) => setResetForm({ password: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border text-[14px] outline-none focus:border-[#0E7C6B]"
                style={{ borderColor: CARD_BORDER }}
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={resetting}
              className="w-full mt-5 py-2.5 rounded-lg text-[14px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: PRIMARY }}
            >
              {resetting ? '保存中...' : '确认重置'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
