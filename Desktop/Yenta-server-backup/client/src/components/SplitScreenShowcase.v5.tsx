import React, { useState } from 'react';
import '../styles/design-system.css';

interface Feature {
  icon: string;
  title: string;
  description: string;
}

interface MetricCardProps {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, change, trend }) => (
  <div style={{
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 'var(--radius-3xl)',
    padding: 'var(--space-8)',
    transition: 'all var(--duration-base) var(--ease-out)',
    position: 'relative',
    overflow: 'hidden',
    boxShadow: 'var(--shadow-drop-lg)'
  }}>
    {/* Subtle elegant green accent */}
    <div style={{
      position: 'absolute',
      top: '-30px',
      right: '-30px',
      width: '120px',
      height: '120px',
      background: 'radial-gradient(circle, rgba(6, 78, 59, 0.04) 0%, transparent 70%)',
      borderRadius: '50%',
      pointerEvents: 'none'
    }} />
    
    <div style={{
      fontSize: 'var(--text-sm)',
      color: 'rgba(255, 255, 255, 0.8)',
      marginBottom: 'var(--space-3)',
      fontWeight: 'var(--font-weight-medium)',
      textTransform: 'uppercase',
      letterSpacing: '0.05em'
    }}>
      {title}
    </div>
    
    <div style={{
      fontSize: '2.5rem',
      fontWeight: 'var(--font-weight-bold)',
      color: '#ffffff',
      marginBottom: 'var(--space-2)',
      textShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
    }}>
      {value}
    </div>
    
    <div style={{
      fontSize: 'var(--text-sm)',
      color: trend === 'up' ? '#10b981' : '#ef4444',
      fontWeight: 'var(--font-weight-semibold)'
    }}>
      {change} vs last month
    </div>
  </div>
);

const FeatureCard: React.FC<Feature> = ({ icon, title, description }) => (
  <div style={{
    background: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 'var(--radius-3xl)',
    padding: 'var(--space-10)',
    transition: 'all var(--duration-base) var(--ease-out)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    position: 'relative',
    overflow: 'hidden',
    boxShadow: 'var(--shadow-drop-md)'
  }}
  className="hover-lift">
    {/* Radical flatness - no patterns */}
    
    <div style={{
      width: '64px',
      height: '64px',
      background: 'rgba(255, 255, 255, 0.05)',
      borderRadius: 'var(--radius-flat)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 'var(--space-6)',
      fontSize: '2rem',
      boxShadow: 'var(--shadow-drop-sm)'
    }}>
      {icon}
    </div>
    
    <h3 style={{
      fontSize: 'var(--text-xl)',
      fontWeight: 'var(--font-weight-bold)',
      color: '#ffffff',
      marginBottom: 'var(--space-3)',
      textShadow: '0 2px 10px rgba(0, 0, 0, 0.2)'
    }}>
      {title}
    </h3>
    
    <p style={{
      fontSize: 'var(--text-base)',
      color: 'rgba(255, 255, 255, 0.8)',
      lineHeight: 'var(--line-height-relaxed)'
    }}>
      {description}
    </p>
  </div>
);

const ActionButton: React.FC<{ variant: 'primary' | 'secondary'; children: React.ReactNode }> = ({ variant, children }) => (
  <button style={{
    padding: 'var(--space-4) var(--space-8)',
    borderRadius: 'var(--radius-3xl)',
    fontSize: 'var(--text-base)',
    fontWeight: 'var(--font-weight-semibold)',
    cursor: 'pointer',
    transition: 'all var(--duration-base) var(--ease-out)',
    border: variant === 'primary' ? 'none' : '1px solid rgba(255, 255, 255, 0.2)',
    background: variant === 'primary'
      ? 'rgba(255, 255, 255, 0.05)'
      : 'transparent',
    backdropFilter: 'blur(16px)',
    color: '#ffffff',
    boxShadow: variant === 'primary' ? 'var(--shadow-drop-lg)' : 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--space-2)'
  }}
  className="hover-lift">
    {children}
  </button>
);

const SplitScreenShowcase: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'process' | 'benefits'>('overview');

  const features: Feature[] = [
    {
      icon: '🤖',
      title: 'Intelligent AI Conversations',
      description: 'Advanced GPT-4 powered system that conducts natural, contextual business discovery conversations to assess AI readiness.'
    },
    {
      icon: '🎯',
      title: 'Precision Matching',
      description: 'Sophisticated ML algorithms analyze conversation data to create perfect vendor-prospect matches based on 50+ signals.'
    },
    {
      icon: '📊',
      title: 'Real-time Analytics',
      description: 'Live dashboards with actionable insights, conversion tracking, and AI-powered recommendations for optimal outcomes.'
    },
    {
      icon: '🔗',
      title: 'Enterprise Integration',
      description: 'Seamless calendar sync, CRM connections, and automated workflow triggers for effortless operations.'
    }
  ];

  const metrics = [
    { title: 'AI Readiness Score', value: '87%', change: '+12%', trend: 'up' as const },
    { title: 'Match Success Rate', value: '94%', change: '+8%', trend: 'up' as const },
    { title: 'Active Prospects', value: '1,247', change: '+23%', trend: 'up' as const },
    { title: 'Revenue Pipeline', value: '$2.4M', change: '+18%', trend: 'up' as const }
  ];

  return (
    <div style={{
      minHeight: '100vh',
      padding: '80px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      position: 'relative'
    }}>
      {/* Background overlay for readability */}
      <div style={{
        position: 'absolute',
        inset: '80px',
        background: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(20px)',
        borderRadius: 'var(--radius-lg)',
        zIndex: -1
      }} />

      {/* Main Content Container */}
      <div style={{
        maxWidth: '1200px',
        width: '100%',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Header Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
          background: 'rgba(255, 255, 255, 0.06)',
          backdropFilter: 'blur(16px)',
          padding: 'var(--space-3) var(--space-6)',
          borderRadius: 'var(--radius-4xl)',
          marginBottom: 'var(--space-10)',
          fontSize: 'var(--text-base)',
          color: 'rgba(255, 255, 255, 0.95)',
          fontWeight: 'var(--font-weight-semibold)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: 'var(--shadow-drop-md)'
        }}>
          <span style={{ fontSize: '1.25rem' }}>🌿</span>
          <span>Enterprise AI Platform</span>
        </div>

        {/* Hero Title */}
        <h1 style={{
          fontSize: '3.5rem',
          fontWeight: 'var(--font-weight-bold)',
          color: '#ffffff',
          marginBottom: 'var(--space-4)',
          lineHeight: 'var(--line-height-tight)',
          textShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          textAlign: 'center'
        }}>
          Sophisticated B2B Intelligence
        </h1>

        {/* Hero Description */}
        <p style={{
          fontSize: 'var(--text-lg)',
          color: 'rgba(255, 255, 255, 0.9)',
          lineHeight: 'var(--line-height-normal)',
          marginBottom: 'var(--space-8)',
          maxWidth: '600px',
          margin: '0 auto var(--space-8) auto',
          fontWeight: 'var(--font-weight-medium)',
          textAlign: 'center'
        }}>
          AI-driven B2B matchmaking through conversational intelligence.
        </p>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: 'var(--space-6)',
          marginBottom: 'var(--space-16)',
          justifyContent: 'center'
        }}>
          <ActionButton variant="primary">
            🎯 Experience Platform
          </ActionButton>
          <ActionButton variant="secondary">
            📈 View Insights
          </ActionButton>
        </div>

        {/* Metrics Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: 'var(--space-6)',
          marginBottom: 'var(--space-20)'
        }}>
          {metrics.map((metric, index) => (
            <MetricCard key={index} {...metric} />
          ))}
        </div>

        {/* Features Section */}
        <div style={{
          marginTop: 'var(--space-12)'
        }}>
          <h2 style={{
            fontSize: 'var(--text-3xl)',
            fontWeight: 'var(--font-weight-bold)',
            color: '#ffffff',
            textAlign: 'center',
            marginBottom: 'var(--space-12)',
            textShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
          }}>
            Enterprise-Grade Features
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 'var(--space-8)'
          }}>
            {features.map((feature, index) => (
              <FeatureCard key={index} {...feature} />
            ))}
          </div>
        </div>

        {/* Platform Demo Section */}
        <div style={{
          marginTop: 'var(--space-12)',
          background: 'rgba(255, 255, 255, 0.03)',
          borderRadius: 'var(--radius-3xl)',
          padding: 'var(--space-12)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(16px)'
        }}>
          <h2 style={{
            fontSize: 'var(--text-3xl)',
            fontWeight: 'var(--font-weight-bold)',
            color: '#ffffff',
            textAlign: 'center',
            marginBottom: 'var(--space-8)',
            textShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
          }}>
            See Yenta in Action
          </h2>

          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: 'var(--radius-2xl)',
            height: '400px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            marginBottom: 'var(--space-8)'
          }}>
            <div style={{
              textAlign: 'center',
              color: 'rgba(255, 255, 255, 0.8)'
            }}>
              <div style={{ fontSize: '4rem', marginBottom: 'var(--space-4)' }}>🎬</div>
              <p style={{ fontSize: 'var(--text-lg)' }}>Interactive Platform Demo</p>
              <p style={{ fontSize: 'var(--text-base)', opacity: 0.7 }}>Experience the AI conversation flow and intelligent matching</p>
            </div>
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'center'
          }}>
            <ActionButton variant="primary">
              🚀 Launch Interactive Demo
            </ActionButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SplitScreenShowcase;