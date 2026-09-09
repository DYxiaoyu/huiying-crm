import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, LogOut } from 'lucide-react';

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
];

const getPageTitle = (pathname: string): string => {
  if (pathname === '/' || pathname.startsWith('/dashboard')) return '概览';
  if (pathname === '/customers') return '客户列表';
  if (pathname.startsWith('/customers/')) return '客户详情';
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

const Layout = () => {
  const { employee, logout } = useAuth();
  const location = useLocation();
  const pageTitle = getPageTitle(location.pathname);

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
      `}</style>

      {/* 侧边栏 */}
      <aside
        className="fixed top-0 left-0 bottom-0 w-[220px] flex flex-col"
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
          {navItems.map((item) => (
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

      {/* 主内容区 */}
      <main
        className="min-h-screen flex flex-col"
        style={{ marginLeft: '220px' }}
      >
        {/* 顶栏 */}
        <header
          className="h-[60px] flex items-center justify-between px-6 bg-white sticky top-0 z-10"
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
        <div className="p-6 flex-1">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
