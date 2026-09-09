# 客户信息管理系统

## 应用概览
员工顾客信息管理系统，支持员工登录后录入、编辑自己名下的顾客信息及跟进记录，不同员工数据相互隔离。

## 技术架构
- 前端：React 19 + TypeScript + Tailwind CSS + shadcn/ui
- 后端：NestJS 10 + Drizzle ORM + PostgreSQL
- 鉴权：平台内置登录，RLS 行级权限隔离员工数据

## 核心模块
1. **客户管理**：客户信息 CRUD、关键词搜索、按阶段筛选
2. **跟进记录**：每个客户的跟进历史、新增跟进
3. **数据隔离**：基于 RLS，员工只能看到自己的客户

## 数据库表
- `customers`：客户表（姓名、电话、公司、来源、阶段、备注等）
- `follow_ups`：跟进记录表（客户ID、跟进时间、内容、结果）

## 设计规范

### 色彩系统
- 主色：蓝色系 `#2563eb`（primary）
- 背景：`#f8fafc`（slate-50）
- 卡片：白色背景 + 1px 边框 + 轻阴影
- 文本：主文本 `#0f172a`（slate-900），次要文本 `#64748b`（slate-500）

### 间距基线
- 页面内边距：p-6 (24px)
- 卡片内边距：p-5 (20px)
- 区块间距：gap-6 (24px)
- 元素间距：gap-3 (12px) / gap-4 (16px)

### 排版
- 页面标题：text-xl font-semibold
- 卡片标题：text-base font-semibold
- 正文：text-sm
- 次要信息：text-xs text-slate-500

### 布局
- 左侧导航栏（240px 宽）+ 右侧主内容区
- 内容区：最大宽度自适应，最小 320px
- 列表使用 Table 组件，表单使用 shadcn Form

### 客户阶段色标
- 新客户：bg-slate-100 text-slate-700
- 已联系：bg-blue-100 text-blue-700
- 跟进中：bg-amber-100 text-amber-700
- 已成交：bg-emerald-100 text-emerald-700
- 已流失：bg-rose-100 text-rose-700
