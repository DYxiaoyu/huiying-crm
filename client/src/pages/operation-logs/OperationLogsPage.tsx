import { useCallback, useEffect, useState } from 'react';
import { History, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';

import { useAuth } from '@/contexts/AuthContext';
import * as operationLogsApi from '@/api/operation-logs';
import { getAdminOverview } from '@/api/admin';
import type {
  AdminEmployeeItem,
  OperationLog,
} from '@shared/api.interface';

const ACTION_LABELS: Record<string, { label: string; cls: string }> = {
  create: { label: '新增', cls: 'bg-emerald-50 text-emerald-700' },
  update: { label: '修改', cls: 'bg-blue-50 text-blue-700' },
  delete: { label: '删除', cls: 'bg-rose-50 text-rose-600' },
  restore: { label: '恢复', cls: 'bg-teal-50 text-teal-700' },
  purge: { label: '彻底删除', cls: 'bg-gray-100 text-gray-600' },
  assign: { label: '分配', cls: 'bg-violet-50 text-violet-700' },
  followup: { label: '跟进', cls: 'bg-amber-50 text-amber-700' },
  contact_add: { label: '新增联系人', cls: 'bg-emerald-50 text-emerald-700' },
  contact_update: { label: '修改联系人', cls: 'bg-blue-50 text-blue-700' },
  contact_delete: { label: '删除联系人', cls: 'bg-rose-50 text-rose-600' },
};

const TARGET_LABELS: Record<string, string> = {
  customer: '客户',
  followup: '跟进',
  contact: '联系人',
};

function formatDateTime(value: string): string {
  const date = new Date(value);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${hh}:${mm}`;
}

const OperationLogsPage = () => {
  const { employee } = useAuth();
  const isAdmin = employee?.role === 'admin';

  const [items, setItems] = useState<OperationLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [employees, setEmployees] = useState<AdminEmployeeItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await operationLogsApi.getList({
        page,
        pageSize,
        employeeId: employeeFilter || undefined,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (error) {
      logger.error('加载操作日志失败', error as Error);
      toast.error('加载操作日志失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, employeeFilter]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  // 管理员加载员工列表（筛选用）
  useEffect(() => {
    if (!isAdmin) return;
    getAdminOverview()
      .then((res) => setEmployees(res.employees))
      .catch((e) => logger.error('加载员工列表失败', e as Error));
  }, [isAdmin]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const resetPage = (target: number) => {
    if (target < 1 || target > totalPages) return;
    setPage(target);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* 头部 */}
      <div className="bg-white rounded-xl border border-[#E4E7EC] shadow-sm p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-[15px] font-semibold text-[#1D2733]">
          <History className="size-4 text-[#0E7C6B]" />
          操作日志
          <span className="text-[12px] font-normal text-[#98A2B3]">
            共 {total} 条
          </span>
        </div>
        {isAdmin && (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[13px] text-[#5B6773]">操作人</span>
            <select
              value={employeeFilter}
              onChange={(e) => {
                setEmployeeFilter(e.target.value);
                setPage(1);
              }}
              className="h-9 px-3 rounded-lg border border-[#E4E7EC] bg-white text-[13px] outline-none focus:border-[#0E7C6B]"
            >
              <option value="">全部员工</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}（{emp.username}）
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 日志列表 */}
      <div className="bg-white rounded-xl border border-[#E4E7EC] shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-14 text-[13px] text-[#98A2B3]">
            <Loader2 className="size-4 animate-spin mr-2" />
            加载中...
          </div>
        ) : items.length === 0 ? (
          <div className="py-14 text-center text-[13px] text-[#98A2B3]">
            暂无操作日志
          </div>
        ) : (
          <div className="divide-y divide-[#EAECF0]">
            {items.map((log) => {
              const actionMeta = ACTION_LABELS[log.action] ?? {
                label: log.action,
                cls: 'bg-gray-100 text-gray-600',
              };
              return (
                <div key={log.id} className="px-4 py-3 flex items-start gap-3">
                  <span
                    className={`shrink-0 mt-0.5 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${actionMeta.cls}`}
                  >
                    {actionMeta.label}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] text-[#1D2733] break-all">
                      {log.detail || log.targetName || '-'}
                    </div>
                    <div className="mt-1 text-[12px] text-[#98A2B3] flex items-center gap-2 flex-wrap">
                      <span>{log.employeeName}</span>
                      <span>·</span>
                      <span>{TARGET_LABELS[log.targetType] ?? log.targetType}</span>
                      <span>·</span>
                      <span>{formatDateTime(log.createdAt)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 分页 */}
      <div className="flex flex-wrap items-center justify-between gap-[10px] px-4 py-3 bg-white border border-[#E4E7EC] rounded-[10px]">
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-[#98A2B3]">每页</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="h-9 px-2 rounded-lg border border-[#E4E7EC] bg-white text-[13px] outline-none focus:border-[#0E7C6B]"
          >
            {[10, 20, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size} 条
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => resetPage(page - 1)}
            className="px-3 h-9 rounded-lg border border-[#E4E7EC] bg-white text-[13px] text-[#5B6773] hover:bg-[#F7F9FA] disabled:opacity-40 transition-colors"
          >
            上一页
          </button>
          <span className="text-[13px] text-[#5B6773]">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => resetPage(page + 1)}
            className="px-3 h-9 rounded-lg border border-[#E4E7EC] bg-white text-[13px] text-[#5B6773] hover:bg-[#F7F9FA] disabled:opacity-40 transition-colors"
          >
            下一页
          </button>
          <div className="flex items-center gap-1.5 ml-2">
            <span className="text-[13px] text-[#98A2B3]">跳至</span>
            <input
              type="number"
              min={1}
              max={totalPages}
              defaultValue={page}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const target = Number((e.target as HTMLInputElement).value);
                  resetPage(target);
                }
              }}
              className="w-16 h-9 px-2 rounded-lg border border-[#E4E7EC] bg-white text-[13px] outline-none focus:border-[#0E7C6B]"
            />
            <span className="text-[13px] text-[#98A2B3]">页</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OperationLogsPage;
