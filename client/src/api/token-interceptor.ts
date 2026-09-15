/**
 * 全局 token 注入拦截器（模块顶层注册，不依赖 React 生命周期）。
 * 在 index.tsx 顶部最先 import，确保任何 API 请求发出前 Authorization 已挂上。
 */
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';

const TOKEN_KEY = 'crm_token';

axiosForBackend.interceptors.request.use(
  (config) => {
    // 浏览器环境才读取 localStorage
    if (typeof window !== 'undefined') {
      const token = window.localStorage.getItem(TOKEN_KEY);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export {};
