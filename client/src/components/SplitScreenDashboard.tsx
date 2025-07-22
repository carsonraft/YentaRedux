import React, { useState } from 'react';
import AdminDashboard from './admin/AdminDashboard.v3';
import ProspectsManagement from './admin/ProspectsManagement.v3';
import SplitScreenShowcase from './SplitScreenShowcase.v5';
import '../styles/design-system.css';

export const SplitScreenDashboard: React.FC = () => {
  const [activeView, setActiveView] = useState('showcase');
  const [selectedProspectSession, setSelectedProspectSession] = useState<string | null>(null);

  const handleViewConversation = (sessionId: string) => {
    setSelectedProspectSession(sessionId);
    console.log('View conversation for session:', sessionId);
  };

  const NavButton: React.FC<{ 
    id: string; 
    icon: string; 
    label: string; 
    active: boolean;
    onClick: () => void;
  }> = ({ id, icon, label, active, onClick }) => (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        padding: 'var(--space-3) var(--space-5)',
        background: active 
          ? 'var(--gradient-teal)' 
          : 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        border: 'none',
        borderRadius: 'var(--radius-xl)',
        color: '#ffffff',
        fontSize: 'var(--text-sm)',
        fontWeight: 'var(--font-weight-semibold)',
        cursor: 'pointer',
        transition: 'all var(--duration-base) var(--ease-out)',
        boxShadow: active ? '0 8px 32px rgba(20, 184, 166, 0.4)' : 'none'
      }}
      className="hover-lift"
    >
      <span style={{ fontSize: '1.125rem' }}>{icon}</span>
      <span>{label}</span>
    </button>
  );

  return (
    <div style={{
      minHeight: '100vh'
    }}>
      {/* Floating Navigation */}
      <div style={{
        position: 'fixed',
        top: 'var(--space-6)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 'var(--z-sticky)',
        display: 'flex',
        gap: 'var(--space-3)',
        background: 'rgba(30, 41, 59, 0.8)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 'var(--radius-2xl)',
        padding: 'var(--space-3)',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)'
      }}>
        <NavButton
          id="showcase"
          icon="🎨"
          label="Platform Overview"
          active={activeView === 'showcase'}
          onClick={() => setActiveView('showcase')}
        />
        <NavButton
          id="dashboard"
          icon="📊"
          label="Admin Dashboard"
          active={activeView === 'dashboard'}
          onClick={() => setActiveView('dashboard')}
        />
        <NavButton
          id="prospects"
          icon="👥"
          label="Prospects"
          active={activeView === 'prospects'}
          onClick={() => setActiveView('prospects')}
        />
      </div>

      {/* Content Area */}
      <div style={{ paddingTop: 'var(--space-20)' }}>
        {activeView === 'showcase' && <SplitScreenShowcase />}
        {activeView === 'dashboard' && <AdminDashboard />}
        {activeView === 'prospects' && (
          <ProspectsManagement onViewConversation={handleViewConversation} />
        )}
      </div>

      {/* Conversation Modal Placeholder */}
      {selectedProspectSession && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 'var(--z-modal)',
          padding: 'var(--space-8)'
        }}>
          <div style={{
            background: 'var(--color-surface-elevated)',
            borderRadius: 'var(--radius-2xl)',
            padding: 'var(--space-8)',
            maxWidth: '800px',
            width: '100%',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            <div className="flex items-center justify-between mb-6">
              <h2 style={{
                fontSize: 'var(--text-2xl)',
                fontWeight: 'var(--font-weight-bold)',
                color: 'var(--color-text-primary)',
                margin: 0
              }}>
                Conversation Details
              </h2>
              <button
                onClick={() => setSelectedProspectSession(null)}
                style={{
                  background: 'var(--color-gray-200)',
                  border: 'none',
                  borderRadius: 'var(--radius-full)',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '1.25rem'
                }}
              >
                ×
              </button>
            </div>
            
            <div style={{
              padding: 'var(--space-6)',
              background: 'var(--color-gray-50)',
              borderRadius: 'var(--radius-lg)',
              textAlign: 'center',
              color: 'var(--color-text-secondary)'
            }}>
              <div style={{ fontSize: '2rem', marginBottom: 'var(--space-2)' }}>💬</div>
              <p style={{ margin: 0 }}>
                Conversation viewer for session: <strong>{selectedProspectSession}</strong>
              </p>
              <p style={{ margin: 'var(--space-2) 0 0 0', fontSize: 'var(--text-sm)' }}>
                This would show the full AI conversation history, analysis, and matching recommendations.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SplitScreenDashboard;