import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Store, LogOut, KeyRound, ShieldCheck, FolderOpen, X } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@client/src/contexts/AuthContext';
import { changePassword } from '@client/src/api/auth';

interface NavItemConfig {
  path: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
}

const navItems: NavItemConfig[] = [
  { path: '/', label: '概览', icon: LayoutDashboard, end: true },
  { path: '/customers', label: '客户列表', icon: Users },
  { path: '/suppliers', label: '供应商列表', icon: Store },
  { path: '/supplier-keys', label: '供应商密钥', icon: KeyRound },
  { path: '/files', label: '文件管理', icon: FolderOpen },
];

/** 老板专属导航项（仅管理员可见） */
const adminNavItem: NavItemConfig = {
  path: '/admin',
  label: '老板后台',
  icon: ShieldCheck,
};

const getPageTitle = (pathname: string): string => {
  if (pathname === '/' || pathname.startsWith('/dashboard')) return '概览';
  if (pathname === '/customers') return '客户列表';
  if (pathname.startsWith('/customers/')) return '客户详情';
  if (pathname === '/suppliers') return '供应商列表';
  if (pathname === '/supplier-keys') return '供应商密钥';
  if (pathname === '/files') return '文件管理';
  if (pathname === '/admin') return '老板后台';
  return '';
};

const SIDEBAR_BG = '#102A26';
const ACTIVE_BG = '#0E7C6B';
const LOGOUT_COLOR = '#8FA8A3';
const TOPBAR_BORDER = '#E4E7EC';
const AVATAR_BG = '#E4F2EF';
const AVATAR_TEXT = '#0E7C6B';
const PAGE_BG = '#F2F4F7';
const SIDEBAR_DIVIDER = 'rgba(255,255,255,.08)';

const NavItem = ({ item }: { item: NavItemConfig }) => {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.path}
      end={item.end}
      className={({ isActive }) =>
        [
          'sidebar-nav-item flex items-center gap-3 px-3 py-[10px] rounded-lg text-[14px] transition-colors',
          isActive ? 'sidebar-nav-item--active' : '',
        ].join(' ')
      }
    >
      <Icon className="w-4 h-4" />
      <span>{item.label}</span>
    </NavLink>
  );
};

/** 手机端顶栏导航项（紧凑样式） */
const MobileNavItem = ({ item }: { item: NavItemConfig }) => {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.path}
      end={item.end}
      className={({ isActive }) =>
        [
          'mobile-nav-item flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] whitespace-nowrap transition-colors',
          isActive ? 'mobile-nav-item--active' : '',
        ].join(' ')
      }
    >
      <Icon className="w-4 h-4" />
      <span>{item.label}</span>
    </NavLink>
  );
};

const Layout = () => {
  const { employee, logout } = useAuth();
  const location = useLocation();
  const pageTitle = getPageTitle(location.pathname);

  // 修改密码弹窗状态
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [pwdForm, setPwdForm] = useState({ oldPassword: '', newPassword: '', confirm: '' });
  const [changing, setChanging] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwdForm.oldPassword || !pwdForm.newPassword) {
      toast.error('请填写旧密码与新密码');
      return;
    }
    if (pwdForm.newPassword.length < 4) {
      toast.error('新密码至少 4 位');
      return;
    }
    if (pwdForm.newPassword !== pwdForm.confirm) {
      toast.error('两次输入的新密码不一致');
      return;
    }
    setChanging(true);
    try {
      await changePassword({ oldPassword: pwdForm.oldPassword, newPassword: pwdForm.newPassword });
      toast.success('密码修改成功，请牢记新密码');
      setShowChangePwd(false);
      setPwdForm({ oldPassword: '', newPassword: '', confirm: '' });
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || '修改密码失败');
    } finally {
      setChanging(false);
    }
  };

  // 老板后台入口仅管理员可见
  const visibleNavItems: NavItemConfig[] =
    employee?.role === 'admin' ? [...navItems, adminNavItem] : navItems;

  const initial = employee?.name?.charAt(0) ?? '用';

  return (
    <div className="min-h-screen" style={{ backgroundColor: PAGE_BG }}>
      <style>{`
        .sidebar-nav-item {
          color: #A9C4BE;
          background-color: transparent;
        }
        .sidebar-nav-item:hover {
          color: #ffffff;
          background-color: rgba(255,255,255,.06);
        }
        .sidebar-nav-item--active {
          color: #ffffff;
          background-color: ${ACTIVE_BG};
        }
        .sidebar-nav-item--active:hover {
          background-color: ${ACTIVE_BG};
        }
        .mobile-nav-item {
          color: #5B6773;
          background-color: transparent;
        }
        .mobile-nav-item:hover {
          color: ${ACTIVE_BG};
          background-color: #E8F0EE;
        }
        .mobile-nav-item--active {
          color: ${ACTIVE_BG};
          background-color: #E4F2EF;
          font-weight: 600;
        }
      `}</style>

      {/* ===== 桌面侧边栏（≥768px）===== */}
      <aside
        className="hidden md:flex fixed top-0 left-0 bottom-0 w-[220px] flex-col"
        style={{ backgroundColor: SIDEBAR_BG }}
      >
        {/* Logo 区 */}
        <div
          className="px-[18px] py-5 flex items-center gap-3"
          style={{ borderBottom: `1px solid ${SIDEBAR_DIVIDER}` }}
        >
          <div
            className="w-[34px] h-[34px] rounded-[9px] flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: ACTIVE_BG }}
          >
            <LayoutDashboard className="w-5 h-5 text-white" />
          </div>
          <div className="text-[15px] font-semibold text-white">
            客户管理系统
          </div>
        </div>

        {/* 导航菜单 */}
        <nav className="p-[14px] flex flex-col gap-1 flex-1">
          {visibleNavItems.map((item) => (
            <NavItem key={item.path} item={item} />
          ))}
        </nav>

        {/* 用户区 */}
        <div
          className="px-4 py-[14px]"
          style={{ borderTop: `1px solid ${SIDEBAR_DIVIDER}` }}
        >
          <div className="text-[13px] font-medium text-white mb-2">
            {employee?.name ?? '加载中...'}
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-[12px] transition-colors hover:text-white"
            style={{ color: LOGOUT_COLOR }}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>退出登录</span>
          </button>
        </div>
      </aside>

      {/* ===== 主内容区 ===== */}
      <main
        className="min-h-screen flex flex-col md:ml-[220px]"
      >
        {/* 手机顶栏（<768px）：第一行 logo + 用户，第二行 全宽导航（横向滚动不挤压） */}
        <header
          className="md:hidden sticky top-0 z-20 bg-white"
          style={{ borderBottom: `1px solid ${TOPBAR_BORDER}` }}
        >
          <div className="flex items-center justify-between gap-2 px-4 h-[52px]">
            <div className="flex items-center gap-2 flex-shrink-0">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: ACTIVE_BG }}
              >
                <LayoutDashboard className="w-4 h-4 text-white" />
              </div>
              <span className="text-[13px] font-semibold text-slate-900">
                客户管理
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setShowChangePwd(true)}
                title="修改密码"
                className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-[#F2F4F7] transition-colors"
              >
                <KeyRound className="w-4 h-4" style={{ color: '#5B6773' }} />
              </button>
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-medium"
                style={{ backgroundColor: AVATAR_BG, color: AVATAR_TEXT }}
              >
                {initial}
              </div>
              <button
                onClick={logout}
                title="退出登录"
                className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-[#F2F4F7] transition-colors"
              >
                <LogOut className="w-4 h-4" style={{ color: LOGOUT_COLOR }} />
              </button>
            </div>
          </div>
          <nav className="flex items-center gap-1 px-3 pb-2 overflow-x-auto">
            {visibleNavItems.map((item) => (
              <MobileNavItem key={item.path} item={item} />
            ))}
          </nav>
        </header>

        {/* 桌面顶栏（≥768px） */}
        <header
          className="hidden md:flex h-[60px] items-center justify-between px-6 bg-white sticky top-0 z-10"
          style={{ borderBottom: `1px solid ${TOPBAR_BORDER}` }}
        >
          <h1 className="text-[16px] font-semibold text-slate-900">
            {pageTitle}
          </h1>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowChangePwd(true)}
              title="修改密码"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12.5px] border transition-colors hover:bg-[#F2F4F7]"
              style={{ borderColor: TOPBAR_BORDER, color: '#5B6773' }}
            >
              <KeyRound className="w-3.5 h-3.5" />
              修改密码
            </button>
            <span className="text-[14px] text-slate-700">
              {employee?.name ?? ''}
            </span>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-medium"
              style={{ backgroundColor: AVATAR_BG, color: AVATAR_TEXT }}
            >
              {initial}
            </div>
          </div>
        </header>

        {/* 页面内容 */}
        <div className="p-4 md:p-6 flex-1">
          <Outlet />
        </div>
      </main>

      {/* 修改密码弹窗 */}
      {showChangePwd && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(15,23,42,.45)' }}
          onClick={() => setShowChangePwd(false)}
        >
          <form
            onSubmit={handleChangePassword}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[380px] bg-white rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[16px] font-semibold text-slate-900">修改密码</h3>
              <button
                type="button"
                onClick={() => setShowChangePwd(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#F2F4F7]"
              >
                <X className="w-4 h-4" style={{ color: '#5B6773' }} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[13px] font-medium text-slate-700">旧密码</label>
                <input
                  type="password"
                  value={pwdForm.oldPassword}
                  onChange={(e) => setPwdForm({ ...pwdForm, oldPassword: e.target.value })}
                  className="mt-1 w-full px-3 py-2 rounded-lg border text-[14px] outline-none focus:border-[#0E7C6B]"
                  style={{ borderColor: TOPBAR_BORDER }}
                  placeholder="请输入当前密码"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-[13px] font-medium text-slate-700">新密码</label>
                <input
                  type="password"
                  value={pwdForm.newPassword}
                  onChange={(e) => setPwdForm({ ...pwdForm, newPassword: e.target.value })}
                  className="mt-1 w-full px-3 py-2 rounded-lg border text-[14px] outline-none focus:border-[#0E7C6B]"
                  style={{ borderColor: TOPBAR_BORDER }}
                  placeholder="至少 4 位"
                />
              </div>
              <div>
                <label className="text-[13px] font-medium text-slate-700">确认新密码</label>
                <input
                  type="password"
                  value={pwdForm.confirm}
                  onChange={(e) => setPwdForm({ ...pwdForm, confirm: e.target.value })}
                  className="mt-1 w-full px-3 py-2 rounded-lg border text-[14px] outline-none focus:border-[#0E7C6B]"
                  style={{ borderColor: TOPBAR_BORDER }}
                  placeholder="再次输入新密码"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={changing}
              className="mt-5 w-full py-2.5 rounded-lg text-[14px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: ACTIVE_BG }}
            >
              {changing ? '提交中...' : '确认修改'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default Layout;
