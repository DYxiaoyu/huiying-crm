export type CustomerStage = 'new' | 'contacted' | 'following' | 'closed' | 'lost';

export const STAGE_NAMES: Record<CustomerStage, string> = {
  new: '新客户',
  contacted: '已联系',
  following: '跟进中',
  closed: '已成交',
  lost: '已流失',
};

export const STAGE_ORDER: CustomerStage[] = ['new', 'contacted', 'following', 'closed', 'lost'];

export interface Employee {
  id: string;
  name: string;
  username: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  company: string | null;
  source: string | null;
  stage: CustomerStage;
  remark: string | null;
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

export interface CustomerListQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
  stage?: CustomerStage | '';
  sortBy?: 'updatedAt' | 'createdAt' | 'name';
  sortOrder?: 'asc' | 'desc';
  favoriteOnly?: boolean;
}

export interface CustomerListResponse {
  items: Customer[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateCustomerDto {
  name: string;
  phone?: string;
  company?: string;
  source?: string;
  stage?: CustomerStage;
  remark?: string;
}

export interface UpdateCustomerDto {
  name?: string;
  phone?: string;
  company?: string;
  source?: string;
  stage?: CustomerStage;
  remark?: string;
  isFavorite?: boolean;
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
}

export interface LoginDto {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  employee: Employee;
}

export interface DashboardStats {
  total: number;
  overdue: number;
  following: number;
  closed: number;
  newCustomers: number;
  lost: number;
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
