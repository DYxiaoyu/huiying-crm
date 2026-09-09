import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';

import type { Employee } from '@shared/api.interface';
import { login as loginApi, register as registerApi } from '@client/src/api/auth';

const TOKEN_KEY = 'crm_token';
const EMPLOYEE_KEY = 'crm_employee';

interface AuthContextValue {
  employee: Employee | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (name: string, username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
  });
  const [employee, setEmployee] = useState<Employee | null>(() => {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem(EMPLOYEE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored) as Employee;
      } catch {
        return null;
      }
    }
    return null;
  });

  const isAuthenticated = Boolean(token && employee);

  const clearAuth = useCallback(() => {
    setToken(null);
    setEmployee(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EMPLOYEE_KEY);
  }, []);

  const setAuth = useCallback((newToken: string, newEmployee: Employee) => {
    setToken(newToken);
    setEmployee(newEmployee);
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(EMPLOYEE_KEY, JSON.stringify(newEmployee));
  }, []);

  const login = useCallback(
    async (username: string, password: string) => {
      const result = await loginApi({ username, password });
      setAuth(result.token, result.employee);
    },
    [setAuth]
  );

  const register = useCallback(
    async (name: string, username: string, password: string) => {
      const result = await registerApi({ name, username, password });
      setAuth(result.token, result.employee);
    },
    [setAuth]
  );

  const logout = useCallback(() => {
    clearAuth();
    logger.info('用户已登出');
  }, [clearAuth]);

  // 请求拦截器：添加 Authorization header
  useEffect(() => {
    const requestInterceptor = axiosForBackend.interceptors.request.use(
      (config) => {
        const currentToken = localStorage.getItem(TOKEN_KEY);
        if (currentToken) {
          // eslint-disable-next-line no-param-reassign
          config.headers.Authorization = `Bearer ${currentToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    return () => {
      axiosForBackend.interceptors.request.eject(requestInterceptor);
    };
  }, []);

  // 响应拦截器：401 清除登录态并跳转到登录页
  useEffect(() => {
    const responseInterceptor = axiosForBackend.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error?.response?.status === 401) {
          clearAuth();
          if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
            navigate('/login');
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axiosForBackend.interceptors.response.eject(responseInterceptor);
    };
  }, [clearAuth]);

  const value = useMemo<AuthContextValue>(
    () => ({
      employee,
      token,
      isAuthenticated,
      login,
      register,
      logout,
    }),
    [employee, token, isAuthenticated, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
