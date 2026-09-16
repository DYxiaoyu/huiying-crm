import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Store, LogOut, KeyRound, ShieldCheck } from 'lucide-react';

import { useAuth } from '@client/src/contexts/AuthContext';

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
          'mobile-nav-item flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] transition-colors',
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
        {/* 手机顶栏（<768px）：导航 + 用户 */}
        <header
          className="md:hidden sticky top-0 z-20 flex items-center justify-between gap-2 px-4 h-[52px] bg-white"
          style={{ borderBottom: `1px solid ${TOPBAR_BORDER}` }}
        >
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
          <nav className="flex items-center gap-1 overflow-x-auto">
            {visibleNavItems.map((item) => (
              <MobileNavItem key={item.path} item={item} />
            ))}
          </nav>
          <div className="flex items-center gap-2 flex-shrink-0">
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
    </div>
  );
};

export default Layout;
