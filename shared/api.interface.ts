export type CustomerStage = 'new' | 'contacted' | 'following' | 'quoted' | 'negotiating' | 'closed' | 'lost' | 'invalid' | 'duplicate';

export const STAGE_NAMES: Record<CustomerStage, string> = {
  new: '新客户',
  contacted: '已联系',
  following: '跟进中',
  quoted: '已报价',
  negotiating: '谈判中',
  closed: '已成交',
  lost: '已流失',
  invalid: '无效客户',
  duplicate: '重复客户',
};

export const STAGE_ORDER: CustomerStage[] = ['new', 'contacted', 'following', 'quoted', 'negotiating', 'closed', 'lost', 'invalid', 'duplicate'];

export type EmployeeRole = 'admin' | 'employee';

export interface Employee {
  id: string;
  name: string;
  username: string;
  role: EmployeeRole;
}

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  company: string | null;
  source: string | null;
  stage: CustomerStage;
  remark: string | null;
  tags: string[];
  employeeId: string;
  createdAt: string;
  updatedAt: string;
  lastFollowAt: string | null;
  isOverdue: boolean;
  isFavorite: boolean;
}

export interface FollowUp {
  id: string;
  customerId: string;
  customerName: string;
  content: string;
  result: string | null;
  followAt: string;
  employeeId: string;
  createdAt: string;
}

export type TimeRange = '7d' | '30d' | '90d' | '1y';

export interface CustomerListQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
  stage?: CustomerStage | '';
  sortBy?: 'updatedAt' | 'createdAt' | 'name';
  sortOrder?: 'asc' | 'desc';
  favoriteOnly?: boolean;
  tag?: string;
  timeRange?: TimeRange;
}

export interface CustomerListResponse {
  items: Customer[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TagStat {
  name: string;
  count: number;
}

export interface CreateCustomerDto {
  name: string;
  phone?: string;
  company?: string;
  source?: string;
  stage?: CustomerStage;
  remark?: string;
  tags?: string[];
}

export interface UpdateCustomerDto {
  name?: string;
  phone?: string;
  company?: string;
  source?: string;
  stage?: CustomerStage;
  remark?: string;
  isFavorite?: boolean;
  tags?: string[];
}

export interface BatchUpdateStageDto {
  ids: string[];
  stage: CustomerStage;
}

export interface BatchUpdateTagsDto {
  ids: string[];
  tags: string[];
}

export interface BatchDeleteDto {
  ids: string[];
}

export interface BatchResult {
  updated: number;
}

export interface DuplicateCheckResult {
  hasDuplicate: boolean;
  duplicateName?: string;
  duplicatePhone?: string;
}

export interface CreateFollowUpDto {
  customerId: string;
  content: string;
  result?: string;
  followAt?: string;
}

export interface RegisterDto {
  name: string;
  username: string;
  password: string;
  role?: EmployeeRole;
}

export interface LoginDto {
  username: string;
  password: string;
}

/** 修改密码（本人操作） */
export interface ChangePasswordDto {
  oldPassword: string;
  newPassword: string;
}

export interface AuthResponse {
  token: string;
  employee: Employee;
}

export interface DashboardStats {
  total: number;
  overdue: number;
  following: number;
  quoted: number;
  negotiating: number;
  closed: number;
  newCustomers: number;
  lost: number;
  invalid: number;
  duplicate: number;
}

export interface StageDistribution {
  stage: CustomerStage;
  name: string;
  count: number;
}

export interface DashboardResponse {
  stats: DashboardStats;
  stageDistribution: StageDistribution[];
  recentFollowUps: FollowUp[];
}

// ===== 供应商商品 =====

export type SupplierStatus = 'pending' | 'approved' | 'rejected';

export interface SupplierFile {
  name: string;
  mime?: string;
  size: number;
  data?: string; // 兼容：base64（旧）或迁移后的磁盘路径（如 /uploads/xxx）
  url?: string;  // 磁盘路径（新上传）
}

export interface SupplierProduct {
  id: string;
  productName: string;
  supplierName: string;
  category: string | null;
  price: string | null;
  unit: string | null;
  spec: string | null;
  imageUrl: string | null;
  images: string[] | null;
  remark: string | null;
  // 供应商联系信息（公开提交时填写）
  contactName: string | null;
  contactPhone: string | null;
  wechat: string | null;
  address: string | null;
  mainCategory: string | null;
  productUrl: string | null;
  files: SupplierFile[] | null;
  status: SupplierStatus;
  rejectReason: string | null;
  submitKey: string | null;
  employeeId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierListQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
  category?: string;
  status?: SupplierStatus | '';
  /** 来源：form=供应商表单提交；admin=后台添加；空=全部 */
  source?: 'form' | 'admin' | '';
  sortBy?: 'updatedAt' | 'createdAt' | 'productName' | 'price';
  sortOrder?: 'asc' | 'desc';
}

export interface SupplierListResponse {
  items: SupplierProduct[];
  total: number;
  page: number;
  pageSize: number;
  supplierCount: number;
}

export interface CreateSupplierProductDto {
  productName: string;
  supplierName: string;
  category?: string;
  price?: string;
  unit?: string;
  spec?: string;
  imageUrl?: string;
  remark?: string;
  contactName?: string;
  contactPhone?: string;
  wechat?: string;
  address?: string;
  mainCategory?: string;
  productUrl?: string;
  images?: string[];
  files?: SupplierFile[];
}

export interface UpdateSupplierProductDto {
  productName?: string;
  supplierName?: string;
  category?: string;
  price?: string;
  unit?: string;
  spec?: string;
  imageUrl?: string;
  remark?: string;
  contactName?: string;
  contactPhone?: string;
  wechat?: string;
  address?: string;
  mainCategory?: string;
  productUrl?: string;
  images?: string[];
  files?: SupplierFile[];
}

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

export interface ImportCustomerItem {
  name: string;
  phone?: string;
  company?: string;
  source?: string;
  stage?: CustomerStage;
  remark?: string;
  tags?: string[];
}

export interface ImportSupplierItem {
  productName: string;
  supplierName: string;
  category?: string;
  price?: string;
  unit?: string;
  spec?: string;
  remark?: string;
}

// ===== 供应商公开提交 =====

export interface PublicProductItem {
  productName?: string;
  price?: string;
  unit?: string;
  spec?: string;
  productUrl?: string;
  remark?: string;
}

export interface PublicApplyDto {
  key: string;
  supplierName: string;
  contactName: string;
  contactPhone: string;
  wechat?: string;
  address?: string;
  mainCategory?: string;
  productName?: string; // 兼容旧版单个商品（非必填）
  price?: string;
  unit?: string;
  spec?: string;
  productUrl?: string;
  remark?: string;
  products?: PublicProductItem[]; // 多商品列表
  imageData?: string; // base64 单图（兼容旧版，作为封面）
  images?: string[]; // base64 多图
  files?: SupplierFile[];
}

export interface PublicApplyResponse {
  ok: boolean;
  appliedId?: string;
  message?: string;
}

// ===== 供应商密钥 =====

export interface SupplierKey {
  id: string;
  key: string;
  label: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSupplierKeyDto {
  label: string;
}

// ===== 老板后台（员工管理 + 全局总览） =====

export interface AdminEmployeeItem {
  id: string;
  name: string;
  username: string;
  role: EmployeeRole;
  createdAt: string;
  customerCount: number;
  supplierCount: number;
}

export interface CreateEmployeeDto {
  name: string;
  username: string;
  password: string;
  role?: EmployeeRole;
}

export interface UpdateEmployeeDto {
  name?: string;
  role?: EmployeeRole;
  password?: string;
}

export interface AdminOverview {
  customerTotal: number;
  customerByStage: StageDistribution[];
  supplierTotal: number;
  /** 供应商表单（入驻页）提交的商品数 */
  supplierFormTotal: number;
  supplierPending: number;
  employeeTotal: number;
  adminTotal: number;
  supplierKeyTotal: number;
  followUpTotal: number;
}

export interface AdminOverviewResponse {
  overview: AdminOverview;
  employees: AdminEmployeeItem[];
}
