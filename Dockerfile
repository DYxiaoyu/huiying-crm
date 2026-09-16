# ============ 构建阶段 ============
FROM node:22-alpine AS build
WORKDIR /app

# 先装依赖（利用缓存层）
COPY package.json package-lock.json .npmrc ./
RUN npm ci

# 再拷源码并构建
COPY . .
RUN npm run build:prod

# ============ 运行阶段 ============
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

EXPOSE 10000
CMD ["node", "dist/server/main.js"]
