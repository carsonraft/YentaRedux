import React, { useState, useEffect } from 'react';
import '../../styles/design-system.css';

interface Prospect {
  id: string;
  session_id: string;
  company_name: string;
  contact_name: string;
  email: string;
  industry?: string;
  company_size?: string;
  created_at: string;
  readiness_score?: number;
  readiness_category?: string;
  ai_summary?: string;
}

interface ProspectsManagementProps {
  onViewConversation: (sessionId: string) => void;
}

const ReadinessGlow: React.FC<{ category: string; score?: number }> = ({ category, score }) => {
  const configs = {
    HOT: { 
      icon: '🔥', 
      glow: '0 0 24px rgba(239, 68, 68, 0.6)',
      gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      pulse: 'rgba(239, 68, 68, 0.4)'
    },
    WARM: { 
      icon: '⚡', 
      glow: '0 0 24px rgba(245, 158, 11, 0.6)',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      pulse: 'rgba(245, 158, 11, 0.4)'
    },
    COOL: { 
      icon: '❄️', 
      glow: '0 0 24px rgba(14, 165, 233, 0.6)',
      gradient: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
      pulse: 'rgba(14, 165, 233, 0.4)'
    },
    COLD: { 
      icon: '🧊', 
      glow: '0 0 24px rgba(107, 114, 128, 0.6)',
      gradient: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
      pulse: 'rgba(107, 114, 128, 0.4)'
    }
  };

  const config = configs[category as keyof typeof configs] || configs.COLD;

  return (
    <div style={{
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '64px',
      height: '64px',
      background: config.gradient,
      borderRadius: 'var(--radius-2xl)',
      boxShadow: config.glow,
      fontSize: '1.75rem',
      animation: category === 'HOT' ? 'pulse 2s infinite' : 'none'
    }}>
      {config.icon}
      {score && (
        <div style={{
          position: 'absolute',
          bottom: '-8px',
          right: '-8px',
          background: 'var(--color-surface-elevated)',
          border: '2px solid var(--color-border)',
          borderRadius: 'var(--radius-full)',
          padding: '4px 8px',
          fontSize: '11px',
          fontWeight: 'var(--font-weight-bold)',
          color: 'var(--color-text-primary)',
          boxShadow: 'var(--shadow-lg)',
          minWidth: '32px',
          textAlign: 'center'
        }}>
          {score}
        </div>
      )}
    </div>
  );
};

const FilterChip: React.FC<{
  active: boolean;
  icon: string;
  label: string;
  count: number;
  onClick: () => void;
}> = ({ active, icon, label, count, onClick }) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-2)',
      padding: 'var(--space-3) var(--space-4)',
      background: active 
        ? 'var(--gradient-teal)' 
        : 'rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(10px)',
      border: active 
        ? 'none' 
        : '1px solid rgba(255, 255, 255, 0.2)',
      borderRadius: 'var(--radius-xl)',
      color: active ? '#ffffff' : 'rgba(255, 255, 255, 0.9)',
      fontSize: 'var(--text-sm)',
      fontWeight: 'var(--font-weight-medium)',
      cursor: 'pointer',
      transition: 'all var(--duration-base) var(--ease-out)',
      boxShadow: active ? '0 8px 32px rgba(20, 184, 166, 0.3)' : 'none'
    }}
    className="hover-lift"
  >
    <span>{icon}</span>
    <span>{label}</span>
    <span style={{
      background: active 
        ? 'rgba(255, 255, 255, 0.2)' 
        : 'rgba(255, 255, 255, 0.1)',
      borderRadius: 'var(--radius-full)',
      padding: '2px 8px',
      fontSize: 'var(--text-xs)',
      fontWeight: 'var(--font-weight-bold)'
    }}>
      {count}
    </span>
  </button>
);

const ProspectCard: React.FC<{
  prospect: Prospect;
  onViewConversation: (sessionId: string) => void;
}> = ({ prospect, onViewConversation }) => {
  return (
    <div 
      style={{
        background: 'var(--color-surface-elevated)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-2xl)',
        padding: 'var(--space-6)',
        cursor: 'pointer',
        transition: 'all var(--duration-base) var(--ease-out)',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        position: 'relative',
        overflow: 'hidden'
      }}
      className="hover-lift"
      onClick={() => onViewConversation(prospect.session_id)}
    >
      {/* Subtle gradient overlay for hot prospects */}
      {prospect.readiness_category === 'HOT' && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.02) 0%, transparent 50%)',
          pointerEvents: 'none'
        }} />
      )}

      <div className="flex items-start gap-4" style={{ position: 'relative', zIndex: 1 }}>
        <ReadinessGlow 
          category={prospect.readiness_category || 'COLD'} 
          score={prospect.readiness_score}
        />
        
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 style={{
                fontSize: 'var(--text-xl)',
                fontWeight: 'var(--font-weight-bold)',
                color: 'var(--color-text-primary)',
                marginBottom: 'var(--space-2)',
                margin: '0 0 var(--space-2) 0'
              }}>
                {prospect.company_name || 'Unknown Company'}
              </h3>
              
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: 'var(--color-success-500)'
                  }} />
                  <span style={{
                    fontSize: 'var(--text-sm)',
                    color: 'var(--color-text-secondary)',
                    fontWeight: 'var(--font-weight-medium)'
                  }}>
                    {prospect.contact_name || 'Unknown Contact'}
                  </span>
                </div>
                
                {prospect.industry && (
                  <span style={{
                    background: 'var(--gradient-teal-soft)',
                    color: 'var(--color-primary-700)',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 'var(--font-weight-medium)',
                    border: '1px solid var(--color-primary-200)'
                  }}>
                    {prospect.industry}
                  </span>
                )}
              </div>
              
              <div style={{
                fontSize: 'var(--text-sm)',
                color: 'var(--color-text-tertiary)',
                marginBottom: 'var(--space-4)'
              }}>
                {prospect.email}
              </div>
            </div>
            
            {prospect.readiness_score && (
              <div style={{
                textAlign: 'center',
                padding: 'var(--space-3) var(--space-4)',
                background: 'var(--gradient-teal-soft)',
                borderRadius: 'var(--radius-xl)',
                border: '1px solid var(--color-primary-200)'
              }}>
                <div style={{
                  fontSize: 'var(--text-2xl)',
                  fontWeight: 'var(--font-weight-bold)',
                  color: 'var(--color-primary-700)',
                  lineHeight: '1'
                }}>
                  {prospect.readiness_score}
                </div>
                <div style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-primary-600)',
                  fontWeight: 'var(--font-weight-medium)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.025em'
                }}>
                  AI Score
                </div>
              </div>
            )}
          </div>

          {prospect.ai_summary && (
            <div style={{
              padding: 'var(--space-4)',
              background: 'var(--color-gray-50)',
              borderRadius: 'var(--radius-lg)',
              marginBottom: 'var(--space-4)',
              fontSize: 'var(--text-sm)',
              lineHeight: 'var(--line-height-relaxed)',
              color: 'var(--color-text-secondary)',
              fontStyle: 'italic'
            }}>
              "{prospect.ai_summary.length > 120 
                ? `${prospect.ai_summary.substring(0, 120)}...` 
                : prospect.ai_summary}"
            </div>
          )}

          <div className="flex items-center justify-between">
            <div style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-tertiary)'
            }}>
              {new Date(prospect.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
            
            <button
              style={{
                background: 'var(--gradient-teal)',
                color: '#ffffff',
                border: 'none',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-2) var(--space-4)',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-weight-semibold)',
                cursor: 'pointer',
                transition: 'all var(--duration-base) var(--ease-out)',
                boxShadow: '0 4px 14px 0 rgba(20, 184, 166, 0.4)'
              }}
              className="hover-lift"
              onClick={(e) => {
                e.stopPropagation();
                onViewConversation(prospect.session_id);
              }}
            >
              View Details →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ProspectsManagement: React.FC<ProspectsManagementProps> = ({ onViewConversation }) => {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Mock data simulation
    setTimeout(() => {
      setProspects([
        {
          id: '1',
          session_id: 'sess_1',
          company_name: 'TechCorp Industries',
          contact_name: 'Sarah Johnson',
          email: 'sarah.johnson@techcorp.com',
          industry: 'Construction Tech',
          created_at: new Date().toISOString(),
          readiness_score: 85,
          readiness_category: 'HOT',
          ai_summary: 'Construction company with established data infrastructure. High budget allocation for AI implementation. Currently using advanced project management systems and ready for ML integration.'
        },
        {
          id: '2',
          session_id: 'sess_2',
          company_name: 'DataFlow Solutions',
          contact_name: 'Mike Chen',
          email: 'mike.chen@dataflow.com',
          industry: 'Healthcare',
          created_at: new Date(Date.now() - 3600000).toISOString(),
          readiness_score: 72,
          readiness_category: 'WARM',
          ai_summary: 'Healthcare data analytics company. Good technical foundation but needs infrastructure upgrades before AI implementation. Moderate budget available.'
        },
        {
          id: '3',
          session_id: 'sess_3',
          company_name: 'BuildCorp',
          contact_name: 'Lisa Rodriguez',
          email: 'lisa@buildcorp.com',
          industry: 'Construction',
          created_at: new Date(Date.now() - 7200000).toISOString(),
          readiness_score: 45,
          readiness_category: 'COOL',
          ai_summary: 'Traditional construction company just starting digital transformation. Limited technical infrastructure but interested in exploring AI solutions.'
        }
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  const filteredProspects = prospects.filter(prospect => {
    if (filterCategory !== 'all' && prospect.readiness_category !== filterCategory) {
      return false;
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        prospect.company_name?.toLowerCase().includes(term) ||
        prospect.contact_name?.toLowerCase().includes(term) ||
        prospect.email?.toLowerCase().includes(term) ||
        prospect.industry?.toLowerCase().includes(term)
      );
    }
    return true;
  });

  const stats = {
    total: prospects.length,
    hot: prospects.filter(p => p.readiness_category === 'HOT').length,
    warm: prospects.filter(p => p.readiness_category === 'WARM').length,
    cool: prospects.filter(p => p.readiness_category === 'COOL').length,
    cold: prospects.filter(p => p.readiness_category === 'COLD').length
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
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
          <h3 style={{ color: '#ffffff', margin: 0 }}>Loading prospects...</h3>
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
            <span>👥</span>
            <span>{prospects.length} Total Prospects</span>
          </div>
          
          <h1 style={{
            fontSize: 'var(--text-5xl)',
            fontWeight: 'var(--font-weight-bold)',
            color: '#ffffff',
            margin: '0 0 var(--space-4) 0',
            lineHeight: 'var(--line-height-tight)'
          }}>
            Prospect Management
          </h1>
          <p style={{
            fontSize: 'var(--text-xl)',
            color: 'rgba(255, 255, 255, 0.8)',
            margin: 0
          }}>
            Review and manage AI-powered prospect conversations and insights
          </p>
        </div>

        {/* Filter Chips */}
        <div style={{
          display: 'flex',
          gap: 'var(--space-3)',
          marginBottom: 'var(--space-8)',
          flexWrap: 'wrap'
        }}>
          <FilterChip
            active={filterCategory === 'all'}
            icon="🎯"
            label="All Prospects"
            count={stats.total}
            onClick={() => setFilterCategory('all')}
          />
          <FilterChip
            active={filterCategory === 'HOT'}
            icon="🔥"
            label="Hot Leads"
            count={stats.hot}
            onClick={() => setFilterCategory('HOT')}
          />
          <FilterChip
            active={filterCategory === 'WARM'}
            icon="⚡"
            label="Warm Leads"
            count={stats.warm}
            onClick={() => setFilterCategory('WARM')}
          />
          <FilterChip
            active={filterCategory === 'COOL'}
            icon="❄️"
            label="Cool Leads"
            count={stats.cool}
            onClick={() => setFilterCategory('COOL')}
          />
          <FilterChip
            active={filterCategory === 'COLD'}
            icon="🧊"
            label="Cold Leads"
            count={stats.cold}
            onClick={() => setFilterCategory('COLD')}
          />
        </div>

        {/* Search Bar */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: 'var(--radius-2xl)',
          padding: 'var(--space-4)',
          marginBottom: 'var(--space-8)'
        }}>
          <div style={{ position: 'relative' }}>
            <div style={{
              position: 'absolute',
              left: 'var(--space-4)',
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '1.25rem',
              pointerEvents: 'none'
            }}>
              🔍
            </div>
            <input
              type="text"
              placeholder="Search prospects by company, contact, email, or industry..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                paddingLeft: 'var(--space-12)',
                paddingRight: 'var(--space-4)',
                paddingTop: 'var(--space-4)',
                paddingBottom: 'var(--space-4)',
                fontSize: 'var(--text-lg)',
                color: '#ffffff',
                fontWeight: 'var(--font-weight-medium)'
              }}
            />
          </div>
        </div>

        {/* Prospects Grid */}
        {filteredProspects.length === 0 ? (
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: 'var(--radius-2xl)',
            padding: 'var(--space-12)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '4rem', marginBottom: 'var(--space-4)' }}>🔍</div>
            <h3 style={{ color: '#ffffff', marginBottom: 'var(--space-2)' }}>No prospects found</h3>
            <p style={{ color: 'rgba(255, 255, 255, 0.7)', margin: 0 }}>
              {searchTerm || filterCategory !== 'all' ? 
                'Try adjusting your search or filter criteria' : 
                'No prospects have been added yet'
              }
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(600px, 1fr))',
            gap: 'var(--space-6)'
          }}>
            {filteredProspects.map((prospect) => (
              <ProspectCard
                key={prospect.id}
                prospect={prospect}
                onViewConversation={onViewConversation}
              />
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ProspectsManagement;