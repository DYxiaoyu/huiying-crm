/* 客户管理系统 Service Worker - 卸载清理版
 * 原因：旧版 SW（crm-shell-v1）在部分内嵌浏览器中缓存了旧页面导致布局错乱。
 * 此版本不做任何缓存/拦截，激活时清空全部缓存并注销自身，之后页面走纯网络。
 */
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.claim())
  );
});

// 不注册 fetch 监听：所有请求走默认网络，不再有缓存优先导致的旧资源问题
