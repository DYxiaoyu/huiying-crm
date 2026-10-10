import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { getStats } from '@/api/dashboard';
import {
  STAGE_NAMES,
  STAGE_ORDER,
  type DashboardResponse,
  type CustomerStage,
} from '@shared/api.interface';

const STAGE_BAR_COLORS: Record<CustomerStage, string> = {
  new: '#64748B',
  contacted: '#2563EB',
  following: '#D97706',
  closed: '#059669',
  lost: '#DC2626',
  quoted: '#0891B2',
  negotiating: '#7C3AED',
  invalid: '#6B7280',
  duplicate: '#B45309',
};

const STAGE_TAG_STYLES: Record<CustomerStage, { bg: string; color: string }> = {
  new: { bg: '#EFF1F4', color: '#64748B' },
  contacted: { bg: '#E8EFFD', color: '#2563EB' },
  following: { bg: '#FDF3E3', color: '#D97706' },
  closed: { bg: '#E5F4EC', color: '#059669' },
  lost: { bg: '#FDECEC', color: '#DC2626' },
  quoted: { bg: '#E0F2FE', color: '#0891B2' },
  negotiating: { bg: '#F1E8FC', color: '#7C3AED' },
  invalid: { bg: '#EFF1F4', color: '#6B7280' },
  duplicate: { bg: '#FDF0E2', color: '#B45309' },
};

interface StatCardProps {
  label: string;
  value: number | string;
  color: string;
  onClick?: () => void;
}

function StatCard({ label, value, color, onClick }: StatCardProps) {
  return (
    <div
      onClick={onClick}
      className={`rounded-[10px] p-3 md:p-4 ${
        onClick ? 'cursor-pointer transition-shadow hover:shadow-md active:scale-[.98]' : ''
      }`}
      style={{
        background: '#fff',
        border: '1px solid #E4E7EC',
        boxShadow:
          '0 1px 3px rgba(16,24,40,.08), 0 1px 2px rgba(16,24,40,.04)',
      }}
    >
      <div className="text-[12px] md:text-[13px]" style={{ color: '#5B6773' }}>
        {label}
      </div>
      <div
        className="text-[20px] md:text-[24px] font-bold mt-1 break-all"
        style={{ color }}
      >
        {value}
      </div>
    </div>
  );
}

function formatMoney(n: number): string {
  const v = n || 0;
  return '¥' + v.toLocaleString('zh-CN', { maximumFractionDigits: 2 });
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getStats()
      .then((res: DashboardResponse) => {
        if (!cancelled) {
          setData(res);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div
        style={{
          padding: '24px',
          background: '#F2F4F7',
          minHeight: '100%',
          color: '#5B6773',
        }}
      >
        加载中...
      </div>
    );
  }

  if (!data) return null;

  const { stats, stageDistribution, recentFollowUps } = data;
  const maxCount = Math.max(
    ...stageDistribution.map((s) => s.count),
    1,
  );

  const statCards: { label: string; value: number | string; color: string; stage?: CustomerStage }[] = [
    { label: '总成交额', value: formatMoney(stats.totalDealAmount), color: '#059669' },
    { label: '总预计成交额', value: formatMoney(stats.totalExpectedAmount), color: '#0891B2' },
    { label: '客户总数', value: stats.total, color: '#1D2733' },
    { label: '待跟进', value: stats.overdue, color: '#DC2626' },
    { label: '新客户', value: stats.newCustomers, color: '#64748B', stage: 'new' },
    { label: '已联系', value: stageDistribution.find(s => s.stage === 'contacted')?.count ?? 0, color: '#2563EB', stage: 'contacted' },
    { label: '跟进中', value: stats.following, color: '#D97706', stage: 'following' },
    { label: '已报价', value: stats.quoted, color: '#0891B2', stage: 'quoted' },
    { label: '谈判中', value: stats.negotiating, color: '#7C3AED', stage: 'negotiating' },
    { label: '已成交', value: stats.closed, color: '#059669', stage: 'closed' },
    { label: '已流失', value: stats.lost, color: '#DC2626', stage: 'lost' },
    { label: '无效', value: stats.invalid, color: '#6B7280', stage: 'invalid' },
    { label: '重复', value: stats.duplicate, color: '#B45309', stage: 'duplicate' },
  ];

  const goToList = (stage?: CustomerStage) => {
    navigate(stage ? `/customers?stage=${stage}` : '/customers');
  };

  return (
    <div
      className="flex flex-col gap-4 md:gap-4"
      style={{
        background: '#F2F4F7',
        minHeight: '100%',
      }}
    >
      {/* 统计卡片：手机 2 列，平板 3 列，桌面 6 列；点击直达客户列表 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-[14px]">
        {statCards.map((card) => (
          <StatCard
            key={card.label}
            label={card.label}
            value={card.value}
            color={card.color}
            onClick={() => goToList(card.stage)}
          />
        ))}
      </div>

      {/* 阶段分布 */}
      <div
        style={{
          background: '#fff',
          border: '1px solid #E4E7EC',
          borderRadius: '10px',
          boxShadow:
            '0 1px 3px rgba(16,24,40,.08), 0 1px 2px rgba(16,24,40,.04)',
        }}
      >
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid #E4E7EC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontWeight: 600,
          }}
        >
          <span>阶段分布</span>
          <span style={{ fontSize: '12px', color: '#98A2B3', fontWeight: 400 }}>
            点击客户列表可查看明细
          </span>
        </div>
        <div style={{ padding: '16px 18px 18px' }}>
          {/* 第一行：5 个阶段标签横排（不换行） */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
            {STAGE_ORDER.map((stage) => {
              const tag = STAGE_TAG_STYLES[stage];
              return (
                <div
                  key={stage}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: tag.color,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '999px',
                      flexShrink: 0,
                      background: tag.color,
                    }}
                  />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {STAGE_NAMES[stage]}
                  </span>
                </div>
              );
            })}
          </div>
          {/* 第二行：5 条进度条 */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
            {STAGE_ORDER.map((stage) => {
              const item = stageDistribution.find((s) => s.stage === stage);
              const count = item?.count ?? 0;
              const width = (count / maxCount) * 100;
              return (
                <div
                  key={stage}
                  style={{
                    flex: 1,
                    height: '10px',
                    background: '#F2F4F7',
                    borderRadius: '6px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${width}%`,
                      height: '100%',
                      borderRadius: '6px',
                      background: STAGE_BAR_COLORS[stage],
                    }}
                  />
                </div>
              );
            })}
          </div>
          {/* 第三行：5 个数字 */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {STAGE_ORDER.map((stage) => {
              const item = stageDistribution.find((s) => s.stage === stage);
              return (
                <div
                  key={stage}
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    fontSize: '13px',
                    color: '#5B6773',
                  }}
                >
                  {item?.count ?? 0}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 成交漏斗 */}
      <div
        style={{
          background: '#fff',
          border: '1px solid #E4E7EC',
          borderRadius: '10px',
          boxShadow:
            '0 1px 3px rgba(16,24,40,.08), 0 1px 2px rgba(16,24,40,.04)',
        }}
      >
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid #E4E7EC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontWeight: 600,
          }}
        >
          <span>成交漏斗</span>
          <span style={{ fontSize: '12px', color: '#98A2B3', fontWeight: 400 }}>
            新客户 → 已联系 → 跟进中 → 已成交
          </span>
        </div>
        <div style={{ padding: '18px' }}>
          {(() => {
            const funnelStages: { stage: CustomerStage; label: string; color: string }[] = [
              { stage: 'new', label: '新客户', color: '#64748B' },
              { stage: 'contacted', label: '已联系', color: '#2563EB' },
              { stage: 'following', label: '跟进中', color: '#D97706' },
              { stage: 'closed', label: '已成交', color: '#059669' },
            ];
            const counts = funnelStages.map(
              (f) => stageDistribution.find((s) => s.stage === f.stage)?.count ?? 0,
            );
            const maxCount = Math.max(...counts, 1);
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {funnelStages.map((f, i) => {
                  const count = counts[i];
                  const widthPct = Math.max((count / maxCount) * 100, 8);
                  const rate =
                    i > 0 && counts[i - 1] > 0
                      ? Math.round((count / counts[i - 1]) * 100)
                      : null;
                  return (
                    <div
                      key={f.stage}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                      }}
                    >
                      <div
                        style={{
                          flex: 1,
                          display: 'flex',
                          justifyContent: 'center',
                        }}
                      >
                        <div
                          style={{
                            width: `${widthPct}%`,
                            height: '36px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: f.color,
                            opacity: 0.92,
                            clipPath: 'polygon(0 0, 100% 0, 92% 100%, 8% 100%)',
                            color: '#fff',
                            fontSize: '13px',
                            fontWeight: 600,
                            minWidth: '60px',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {count}
                        </div>
                      </div>
                      <div
                        style={{
                          width: '92px',
                          flexShrink: 0,
                          fontSize: '12px',
                          color: '#5B6773',
                          textAlign: 'left',
                        }}
                      >
                        {f.label}
                        {rate !== null && (
                          <span style={{ color: '#98A2B3', marginLeft: '4px' }}>
                            {rate}%
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>

      {/* 最近跟进记录 */}
      <div
        style={{
          background: '#fff',
          border: '1px solid #E4E7EC',
          borderRadius: '10px',
          boxShadow:
            '0 1px 3px rgba(16,24,40,.08), 0 1px 2px rgba(16,24,40,.04)',
        }}
      >
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid #E4E7EC',
            fontWeight: 600,
          }}
        >
          最近跟进记录
        </div>
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: '0 18px',
          }}
        >
          {recentFollowUps.map((followUp, index) => (
            <li
              key={followUp.id}
              onClick={() => navigate(`/customers/${followUp.customerId}`)}
              className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3"
              style={{
                padding: '10px 0',
                borderBottom:
                  index === recentFollowUps.length - 1
                    ? 'none'
                    : '1px solid #E4E7EC',
                cursor: 'pointer',
              }}
            >
              <span
                className="text-[13px] md:text-[14px] font-medium"
                style={{
                  minWidth: '110px',
                  flexShrink: 0,
                }}
              >
                {followUp.customerName}
              </span>
              <span
                className="text-[12px] md:text-[13px]"
                style={{
                  color: '#5B6773',
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {followUp.content}
              </span>
              <span
                className="text-[11px] md:text-[12px]"
                style={{
                  color: '#98A2B3',
                  flexShrink: 0,
                }}
              >
                {formatDateTime(followUp.followAt)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
