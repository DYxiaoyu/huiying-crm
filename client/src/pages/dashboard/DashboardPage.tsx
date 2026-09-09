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
};

const STAGE_TAG_STYLES: Record<CustomerStage, { bg: string; color: string }> = {
  new: { bg: '#EFF1F4', color: '#64748B' },
  contacted: { bg: '#E8EFFD', color: '#2563EB' },
  following: { bg: '#FDF3E3', color: '#D97706' },
  closed: { bg: '#E5F4EC', color: '#059669' },
  lost: { bg: '#FDECEC', color: '#DC2626' },
};

interface StatCardProps {
  label: string;
  value: number;
  color: string;
}

function StatCard({ label, value, color }: StatCardProps) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #E4E7EC',
        borderRadius: '10px',
        boxShadow:
          '0 1px 3px rgba(16,24,40,.08), 0 1px 2px rgba(16,24,40,.04)',
        padding: '16px',
      }}
    >
      <div style={{ fontSize: '13px', color: '#5B6773' }}>{label}</div>
      <div
        style={{
          fontSize: '26px',
          fontWeight: 700,
          marginTop: '4px',
          color,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function StageTag({ stage }: { stage: CustomerStage }) {
  const style = STAGE_TAG_STYLES[stage];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '3px 10px',
        borderRadius: '999px',
        fontSize: '12px',
        fontWeight: 500,
        background: style.bg,
        color: style.color,
      }}
    >
      <span
        aria-hidden
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: 'currentColor',
        }}
      />
      {STAGE_NAMES[stage]}
    </span>
  );
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

  const statCards: { label: string; value: number; color: string }[] = [
    { label: '客户总数', value: stats.total, color: '#1D2733' },
    { label: '待跟进', value: stats.overdue, color: '#DC2626' },
    { label: '跟进中', value: stats.following, color: '#D97706' },
    { label: '已成交', value: stats.closed, color: '#059669' },
    { label: '新客户', value: stats.newCustomers, color: '#64748B' },
    { label: '已流失', value: stats.lost, color: '#DC2626' },
  ];

  return (
    <div
      style={{
        padding: '24px',
        background: '#F2F4F7',
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      {/* 统计卡片 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(148px, 1fr))',
          gap: '14px',
        }}
      >
        {statCards.map((card) => (
          <StatCard
            key={card.label}
            label={card.label}
            value={card.value}
            color={card.color}
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
        <div style={{ padding: '18px' }}>
          {STAGE_ORDER.map((stage) => {
            const item = stageDistribution.find((s) => s.stage === stage);
            const count = item?.count ?? 0;
            const width = (count / maxCount) * 100;
            return (
              <div
                key={stage}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '12px',
                }}
              >
                <div
                  style={{
                    width: '64px',
                    flexShrink: 0,
                    fontSize: '13px',
                    color: '#5B6773',
                  }}
                >
                  <StageTag stage={stage} />
                </div>
                <div
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
                <div
                  style={{
                    width: '44px',
                    textAlign: 'right',
                    fontSize: '13px',
                    color: '#5B6773',
                  }}
                >
                  {count}
                </div>
              </div>
            );
          })}
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
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 0',
                borderBottom:
                  index === recentFollowUps.length - 1
                    ? 'none'
                    : '1px solid #E4E7EC',
                cursor: 'pointer',
              }}
            >
              <span
                style={{
                  fontWeight: 500,
                  minWidth: '110px',
                  flexShrink: 0,
                }}
              >
                {followUp.customerName}
              </span>
              <span
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
                style={{
                  color: '#98A2B3',
                  fontSize: '12px',
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
