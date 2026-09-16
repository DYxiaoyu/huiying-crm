import React, { useState, type FormEvent } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { LogIn, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';

import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { useAuth } from '@client/src/contexts/AuthContext';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, isAuthenticated } = useAuth();
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
            客户管理系统
          </h1>
          <p className="text-sm" style={{ color: '#5B6773' }}>
            员工登录后录入自己名下的客户与跟进进度
          </p>
        </div>

        {/* 登录表单 */}
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
          <div
            className="flex items-start gap-2 p-3 rounded-lg mt-2"
            style={{ backgroundColor: '#F7F9FA', border: '1px solid #E4E7EC' }}
          >
            <ShieldCheck className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#5B6773' }} />
            <p className="text-[12px] leading-relaxed" style={{ color: '#8A94A6' }}>
              账号由管理员统一开通。忘记密码请联系管理员在「老板后台」重置。
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
