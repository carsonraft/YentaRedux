import React, { useState, useEffect } from 'react';
import '../../styles/design-system.css';

interface DashboardStats {
  prospects: {
    total_prospects: number;
    hot_prospects: number;
    warm_prospects: number;
    cool_prospects: number;
    cold_prospects: number;
    avg_readiness_score: number;
  };
  meetings: {
    total_meetings: number;
    scheduled_meetings: number;
    completed_meetings: number;
    opportunities: number;
    closed_won: number;
  };
  vendors: {
    total_vendors: number;
    active_vendors: number;
  };
  recent_activity: Array<{
    type: string;
    name: string;
    date: string;
  }>;
}

interface GlassMetricCardProps {
  title: string;
  value: number;
  change?: { value: number; direction: 'up' | 'down' };
  icon: string;
  gradient?: string;
}

const GlassMetricCard: React.FC<GlassMetricCardProps> = ({ 
  title, 
  value, 
  change, 
  icon,
  gradient = 'var(--gradient-teal)'
}) => (
  <div style={{
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: 'var(--radius-2xl)',
    padding: 'var(--space-6)',
    position: 'relative',
    overflow: 'hidden',
    transition: 'all var(--duration-base) var(--ease-out)',
    cursor: 'pointer'
  }}
  className="hover-lift">
    {/* Background gradient overlay */}
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: gradient,
      opacity: 0.05,
      pointerEvents: 'none'
    }} />
    
    <div className="flex items-start justify-between" style={{ position: 'relative', zIndex: 1 }}>
      <div>
        <div style={{
          fontSize: 'var(--text-sm)',
          fontWeight: 'var(--font-weight-medium)',
          color: 'rgba(255, 255, 255, 0.8)',
          marginBottom: 'var(--space-2)',
          textTransform: 'uppercase',
          letterSpacing: '0.025em'
        }}>
          {title}
        </div>
        
        <div style={{
          fontSize: 'var(--text-4xl)',
          fontWeight: 'var(--font-weight-bold)',
          color: '#ffffff',
          lineHeight: '1',
          marginBottom: change ? 'var(--space-2)' : 0
        }}>
          {value.toLocaleString()}
        </div>

        {change && (
          <div className="flex items-center gap-1">
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-1)',
              padding: '2px 8px',
              borderRadius: 'var(--radius-full)',
              background: change.direction === 'up' 
                ? 'rgba(52, 211, 153, 0.2)' 
                : 'rgba(251, 191, 36, 0.2)',
              fontSize: 'var(--text-xs)',
              fontWeight: 'var(--font-weight-medium)',
              color: change.direction === 'up' ? '#34d399' : '#fbbf24'
            }}>
              <span>{change.direction === 'up' ? '↗' : '↘'}</span>
              <span>{Math.abs(change.value)}%</span>
            </div>
            <span style={{
              fontSize: 'var(--text-xs)',
              color: 'rgba(255, 255, 255, 0.6)'
            }}>
              vs last month
            </span>
          </div>
        )}
      </div>

      <div style={{
        fontSize: '2.5rem',
        opacity: 0.8,
        filter: 'brightness(0) invert(1)'
      }}>
        {icon}
      </div>
    </div>
  </div>
);

const ActivityFeed: React.FC<{ activities: Array<{ type: string; name: string; date: string }> }> = ({ activities }) => (
  <div style={{
    background: 'var(--color-surface-elevated)',
    borderRadius: 'var(--radius-2xl)',
    border: '1px solid var(--color-border)',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden'
  }}>
    <div style={{
      background: 'var(--gradient-teal)',
      padding: 'var(--space-6)',
      color: '#ffffff'
    }}>
      <h3 style={{
        fontSize: 'var(--text-xl)',
        fontWeight: 'var(--font-weight-bold)',
        margin: 0,
        marginBottom: 'var(--space-1)'
      }}>
        Recent Activity
      </h3>
      <p style={{
        fontSize: 'var(--text-sm)',
        color: 'rgba(255, 255, 255, 0.8)',
        margin: 0
      }}>
        Latest prospect interactions and meetings
      </p>
    </div>

    <div style={{ padding: 'var(--space-2)' }}>
      {activities.slice(0, 8).map((activity, index) => {
        const config = {
          prospect: { icon: '👤', color: 'var(--color-primary-500)', bg: 'var(--color-primary-50)' },
          meeting: { icon: '📅', color: 'var(--color-success-500)', bg: 'var(--color-success-50)' },
          match: { icon: '🎯', color: 'var(--color-warning-500)', bg: 'var(--color-warning-50)' }
        };
        const itemConfig = config[activity.type as keyof typeof config] || config.prospect;

        return (
          <div 
            key={index}
            className="flex items-center gap-4 p-3 hover-lift"
            style={{
              borderRadius: 'var(--radius-lg)',
              transition: 'all var(--duration-fast) var(--ease-out)',
              cursor: 'pointer'
            }}
          >
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-lg)',
              background: itemConfig.bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem'
            }}>
              {itemConfig.icon}
            </div>
            
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-weight-medium)',
                color: 'var(--color-text-primary)',
                marginBottom: '2px'
              }}>
                {activity.name}
              </div>
              <div style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--color-text-tertiary)'
              }}>
                {new Date(activity.date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

const QuickAction: React.FC<{ title: string; icon: string; onClick: () => void }> = ({ title, icon, onClick }) => (
  <button
    onClick={onClick}
    style={{
      background: 'var(--color-surface-elevated)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-xl)',
      padding: 'var(--space-4)',
      cursor: 'pointer',
      transition: 'all var(--duration-base) var(--ease-out)',
      textAlign: 'left',
      width: '100%',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
    }}
    className="hover-lift focus-ring"
  >
    <div className="flex items-center gap-3">
      <div style={{
        width: '40px',
        height: '40px',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--gradient-teal)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.25rem'
      }}>
        {icon}
      </div>
      <div style={{
        fontSize: 'var(--text-sm)',
        fontWeight: 'var(--font-weight-semibold)',
        color: 'var(--color-text-primary)'
      }}>
        {title}
      </div>
    </div>
  </button>
);

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simulate API call with mock data
    setTimeout(() => {
      setStats({
        prospects: {
          total_prospects: 1247,
          hot_prospects: 89,
          warm_prospects: 234,
          cool_prospects: 456,
          cold_prospects: 468,
          avg_readiness_score: 67
        },
        meetings: {
          total_meetings: 156,
          scheduled_meetings: 24,
          completed_meetings: 132,
          opportunities: 45,
          closed_won: 18
        },
        vendors: {
          total_vendors: 34,
          active_vendors: 28
        },
        recent_activity: [
          { type: 'prospect', name: 'TechCorp Inc - New AI readiness assessment', date: new Date().toISOString() },
          { type: 'meeting', name: 'DataFlow Solutions - Initial consultation scheduled', date: new Date(Date.now() - 3600000).toISOString() },
          { type: 'match', name: 'CloudTech matched with DataFlow Solutions', date: new Date(Date.now() - 7200000).toISOString() },
          { type: 'prospect', name: 'BuildCorp - Construction AI inquiry', date: new Date(Date.now() - 10800000).toISOString() },
          { type: 'meeting', name: 'FinanceFlow - Meeting completed successfully', date: new Date(Date.now() - 14400000).toISOString() }
        ]
      });
      setLoading(false);
    }, 1000);
  }, []);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--gradient-hero)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(16px)',
          borderRadius: 'var(--radius-2xl)',
          padding: 'var(--space-8)',
          textAlign: 'center',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid rgba(255, 255, 255, 0.3)',
            borderTop: '4px solid #ffffff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto var(--space-4) auto'
          }} />
          <h3 style={{ color: '#ffffff', margin: 0 }}>Loading Dashboard...</h3>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--gradient-hero)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(16px)',
          borderRadius: 'var(--radius-2xl)',
          padding: 'var(--space-8)',
          textAlign: 'center',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: 'var(--space-4)' }}>⚠️</div>
          <h3 style={{ color: '#ffffff', marginBottom: 'var(--space-4)' }}>Unable to load dashboard</h3>
          <button 
            onClick={() => window.location.reload()}
            style={{
              background: 'var(--gradient-teal)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-3) var(--space-6)',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      padding: 'var(--space-8)'
    }}>
      <div className="container">
        {/* Header */}
        <div style={{ marginBottom: 'var(--space-8)' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            background: 'rgba(255, 255, 255, 0.2)',
            padding: 'var(--space-2) var(--space-4)',
            borderRadius: 'var(--radius-full)',
            marginBottom: 'var(--space-4)',
            fontSize: 'var(--text-sm)',
            color: 'rgba(255, 255, 255, 0.9)',
            fontWeight: 'var(--font-weight-medium)'
          }}>
            <span>👋</span>
            <span>Welcome back, Admin</span>
          </div>
          
          <h1 style={{
            fontSize: 'var(--text-5xl)',
            fontWeight: 'var(--font-weight-bold)',
            color: '#ffffff',
            margin: '0 0 var(--space-4) 0',
            lineHeight: 'var(--line-height-tight)'
          }}>
            Dashboard Overview
          </h1>
          <p style={{
            fontSize: 'var(--text-xl)',
            color: 'rgba(255, 255, 255, 0.8)',
            margin: 0,
            maxWidth: '600px'
          }}>
            Monitor your platform performance and manage vendor-prospect relationships
          </p>
        </div>

        {/* Main Metrics Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: 'var(--space-6)',
          marginBottom: 'var(--space-8)'
        }}>
          <GlassMetricCard
            title="Total Prospects"
            value={stats.prospects.total_prospects}
            change={{ value: 12, direction: 'up' }}
            icon="👥"
          />
          <GlassMetricCard
            title="Hot Prospects"
            value={stats.prospects.hot_prospects}
            change={{ value: 25, direction: 'up' }}
            icon="🔥"
          />
          <GlassMetricCard
            title="Active Meetings"
            value={stats.meetings.scheduled_meetings}
            change={{ value: 8, direction: 'up' }}
            icon="📅"
          />
          <GlassMetricCard
            title="Revenue Pipeline"
            value={2400000}
            change={{ value: 18, direction: 'up' }}
            icon="💰"
          />
        </div>

        {/* Content Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: 'var(--space-8)'
        }}>
          {/* Activity Feed */}
          <ActivityFeed activities={stats.recent_activity} />

          {/* Quick Actions */}
          <div style={{
            background: 'var(--color-surface-elevated)',
            borderRadius: 'var(--radius-2xl)',
            border: '1px solid var(--color-border)',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden'
          }}>
            <div style={{
              background: 'var(--gradient-navy)',
              padding: 'var(--space-6)',
              color: '#ffffff'
            }}>
              <h3 style={{
                fontSize: 'var(--text-xl)',
                fontWeight: 'var(--font-weight-bold)',
                margin: 0,
                marginBottom: 'var(--space-1)'
              }}>
                Quick Actions
              </h3>
              <p style={{
                fontSize: 'var(--text-sm)',
                color: 'rgba(255, 255, 255, 0.8)',
                margin: 0
              }}>
                Common tasks and shortcuts
              </p>
            </div>
            
            <div style={{ padding: 'var(--space-6)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <QuickAction
                  title="Review Hot Prospects"
                  icon="🔥"
                  onClick={() => console.log('Navigate to hot prospects')}
                />
                <QuickAction
                  title="Generate Matches"
                  icon="🎯"
                  onClick={() => console.log('Navigate to matches')}
                />
                <QuickAction
                  title="Schedule Meetings"
                  icon="📅"
                  onClick={() => console.log('Navigate to calendar')}
                />
                <QuickAction
                  title="View Analytics"
                  icon="📊"
                  onClick={() => console.log('Navigate to analytics')}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;