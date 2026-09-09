import React, { useState, type FormEvent } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { UserPlus, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';

import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { useAuth } from '@client/src/contexts/AuthContext';

type TabType = 'login' | 'register';

const LoginPage = () => {
  const [activeTab, setActiveTab] = useState<TabType>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.error('请输入账号和密码');
      return;
    }
    setLoading(true);
    try {
      await login(username.trim(), password);
      toast.success('登录成功');
      navigate('/', { replace: true });
    } catch (error) {
      logger.error('登录失败', error as Error);
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || '登录失败，请检查账号密码');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim() || !username.trim() || !password.trim()) {
      toast.error('请填写完整信息');
      return;
    }
    if (password.length < 6) {
      toast.error('密码长度不能少于 6 位');
      return;
    }
    setLoading(true);
    try {
      await register(name.trim(), username.trim(), password);
      toast.success('注册成功');
      navigate('/', { replace: true });
    } catch (error) {
      logger.error('注册失败', error as Error);
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || '注册失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const switchTab = (tab: TabType) => {
    setActiveTab(tab);
    setUsername('');
    setPassword('');
    setName('');
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-4"
      style={{
        background: 'linear-gradient(160deg, #0B6356 0%, #0E7C6B 50%, #1F9D8C 100%)',
      }}
    >
      <div
        className="w-full max-w-[400px] bg-white p-8"
        style={{ borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}
      >
        {/* 标题 */}
        <div className="text-center mb-6">
          <h1
            className="text-xl font-semibold mb-2"
            style={{ color: '#1D2733' }}
          >
            客户跟进管理系统
          </h1>
          <p className="text-sm" style={{ color: '#5B6773' }}>
            员工登录后录入自己名下的客户与跟进进度
          </p>
        </div>

        {/* Tab 切换 */}
        <div className="flex mb-6" style={{ borderRadius: '8px', background: '#F2F4F7' }}>
          <button
            type="button"
            onClick={() => switchTab('login')}
            className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-all"
            style={{
              borderRadius: '8px',
              backgroundColor: activeTab === 'login' ? '#0E7C6B' : 'transparent',
              color: activeTab === 'login' ? '#ffffff' : '#5B6773',
            }}
          >
            <LogIn className="size-4" />
            登录
          </button>
          <button
            type="button"
            onClick={() => switchTab('register')}
            className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-all"
            style={{
              borderRadius: '8px',
              backgroundColor: activeTab === 'register' ? '#0E7C6B' : 'transparent',
              color: activeTab === 'register' ? '#ffffff' : '#5B6773',
            }}
          >
            <UserPlus className="size-4" />
            注册
          </button>
        </div>

        {/* 登录表单 */}
        {activeTab === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" style={{ color: '#1D2733' }}>
                账号
              </label>
              <Input
                type="text"
                placeholder="请输入账号"
                value={username}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                style={{ borderRadius: '8px' }}
                autoComplete="username"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" style={{ color: '#1D2733' }}>
                密码
              </label>
              <Input
                type="password"
                placeholder="请输入密码"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                style={{ borderRadius: '8px' }}
                autoComplete="current-password"
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              style={{
                backgroundColor: '#0E7C6B',
                color: '#ffffff',
                borderRadius: '8px',
              }}
              disabled={loading}
            >
              {loading ? '登录中...' : '登录'}
            </Button>
            <p className="text-center text-sm" style={{ color: '#5B6773' }}>
              还没有账号？{' '}
              <button
                type="button"
                onClick={() => switchTab('register')}
                className="font-medium hover:underline"
                style={{ color: '#0E7C6B' }}
              >
                立即注册
              </button>
            </p>
          </form>
        )}

        {/* 注册表单 */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" style={{ color: '#1D2733' }}>
                姓名
              </label>
              <Input
                type="text"
                placeholder="请输入姓名"
                value={name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                style={{ borderRadius: '8px' }}
                autoComplete="name"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" style={{ color: '#1D2733' }}>
                账号
              </label>
              <Input
                type="text"
                placeholder="请输入账号"
                value={username}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                style={{ borderRadius: '8px' }}
                autoComplete="username"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" style={{ color: '#1D2733' }}>
                密码
              </label>
              <Input
                type="password"
                placeholder="请输入密码（至少 6 位）"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                style={{ borderRadius: '8px' }}
                autoComplete="new-password"
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              style={{
                backgroundColor: '#0E7C6B',
                color: '#ffffff',
                borderRadius: '8px',
              }}
              disabled={loading}
            >
              {loading ? '注册中...' : '注册'}
            </Button>
            <p className="text-center text-sm" style={{ color: '#5B6773' }}>
              已有账号？{' '}
              <button
                type="button"
                onClick={() => switchTab('login')}
                className="font-medium hover:underline"
                style={{ color: '#0E7C6B' }}
              >
                去登录
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
