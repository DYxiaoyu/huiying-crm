import path from 'path';
import { defineConfig } from '@lark-apaas/coding-preset-vite-react';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'client/src'),
    },
  },
  define: {
    // 独立部署模式：禁用 client-toolkit 的豆包水印/平台徽标渲染
    'process.env.MIAODA_BUILD_TARGET': JSON.stringify('standalone'),
  },
});
