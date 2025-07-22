import React, { useState, useEffect } from 'react';
import '../../styles/dashboard.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

interface Prospect {
  id: string;
  session_id: string;
  company_name: string;
  contact_name: string;
  email: string;
  industry?: string;
  company_size?: string;
  created_at: string;
}

interface Conversation {
  messages: Message[];
  readiness_score: number;
  category: string;
  score_breakdown: any;
  project_details: any;
  summary: string;
}

interface ConversationViewerProps {
  sessionId: string;
  onBack: () => void;
  onGenerateMatches?: (prospectId: string) => void;
}

export const ConversationViewer: React.FC<ConversationViewerProps> = ({ 
  sessionId, 
  onBack, 
  onGenerateMatches 
}) => {
  const [prospect, setProspect] = useState<Prospect | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchConversationData();
  }, [sessionId]);

  const fetchConversationData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.REACT_APP_API_URL}/prospects/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setProspect(data.prospect);
        setConversation(data.conversation);
      } else {
        setError('Failed to fetch conversation data');
      }
    } catch (err) {
      setError('Network error while fetching conversation');
    } finally {
      setLoading(false);
    }
  };

  const getReadinessColor = (category: string) => {
    switch (category) {
      case 'HOT': return '#dc2626';
      case 'WARM': return '#ea580c';
      case 'COOL': return '#0891b2';
      case 'COLD': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getReadinessIcon = (category: string) => {
    switch (category) {
      case 'HOT': return '🔥';
      case 'WARM': return '⚡';
      case 'COOL': return '❄️';
      case 'COLD': return '🧊';
      default: return '❓';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderScoreBreakdown = (breakdown: any) => {
    if (!breakdown) return null;

    const categories = [
      { key: 'technical_capability', label: 'Technical Capability', max: 25 },
      { key: 'budget_readiness', label: 'Budget Readiness', max: 25 },
      { key: 'timeline_urgency', label: 'Timeline Urgency', max: 25 },
      { key: 'decision_authority', label: 'Decision Authority', max: 25 }
    ];

    return (
      <div style={{ display: 'grid', gap: '1rem' }}>
        {categories.map(({ key, label, max }) => {
          const score = breakdown[key] || 0;
          const percentage = (score / max) * 100;
          
          return (
            <div key={key}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                marginBottom: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}>
                <span>{label}</span>
                <span>{score}/{max}</span>
              </div>
              <div style={{
                width: '100%',
                height: '8px',
                backgroundColor: '#e5e7eb',
                borderRadius: '4px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${percentage}%`,
                  height: '100%',
                  backgroundColor: score >= max * 0.8 ? '#16a34a' : 
                                   score >= max * 0.6 ? '#eab308' : '#dc2626',
                  transition: 'width 0.3s ease'
                }}></div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="content-card">
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Loading conversation...</div>
        </div>
      </div>
    );
  }

  if (error || !prospect || !conversation) {
    return (
      <div className="content-card">
        <div style={{ textAlign: 'center', padding: '2rem', color: '#dc2626' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Error</div>
          <div>{error || 'Conversation not found'}</div>
          <button 
            onClick={onBack}
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Back to Prospects
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <button
          onClick={onBack}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            backgroundColor: '#f3f4f6',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            cursor: 'pointer',
            marginBottom: '1rem',
            fontSize: '0.875rem'
          }}
        >
          ← Back to Prospects
        </button>
        
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827', marginBottom: '0.5rem' }}>
          Conversation Analysis
        </h2>
        <p style={{ color: '#6b7280' }}>
          AI conversation review for {prospect.company_name || 'Unknown Company'}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Left Column - Prospect Info & Analysis */}
        <div>
          {/* Prospect Information */}
          <div className="content-card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1rem', color: '#111827' }}>
              Prospect Information
            </h3>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: '500' }}>
                  Company
                </label>
                <div style={{ fontWeight: '500', color: '#111827' }}>
                  {prospect.company_name || 'Unknown'}
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: '500' }}>
                  Contact
                </label>
                <div style={{ color: '#111827' }}>{prospect.contact_name || 'Unknown'}</div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>{prospect.email}</div>
              </div>
              {prospect.industry && (
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: '500' }}>
                    Industry
                  </label>
                  <div style={{ color: '#111827' }}>{prospect.industry}</div>
                </div>
              )}
              <div>
                <label style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: '500' }}>
                  Conversation Date
                </label>
                <div style={{ color: '#111827' }}>{formatDate(prospect.created_at)}</div>
              </div>
            </div>
          </div>

          {/* AI Readiness Score */}
          <div className="content-card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1rem', color: '#111827' }}>
              AI Readiness Assessment
            </h3>
            
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1rem 2rem',
                backgroundColor: '#f9fafb',
                borderRadius: '8px',
                border: `3px solid ${getReadinessColor(conversation.category)}`
              }}>
                <span style={{ fontSize: '2rem' }}>
                  {getReadinessIcon(conversation.category)}
                </span>
                <div>
                  <div style={{
                    fontSize: '2rem',
                    fontWeight: 'bold',
                    color: getReadinessColor(conversation.category)
                  }}>
                    {conversation.readiness_score}/100
                  </div>
                  <div style={{
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: getReadinessColor(conversation.category)
                  }}>
                    {conversation.category}
                  </div>
                </div>
              </div>
            </div>

            {conversation.score_breakdown && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '1rem', color: '#374151' }}>
                  Score Breakdown
                </h4>
                {renderScoreBreakdown(conversation.score_breakdown)}
              </div>
            )}

            {conversation.summary && (
              <div>
                <h4 style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: '#374151' }}>
                  AI Summary
                </h4>
                <div style={{
                  padding: '1rem',
                  backgroundColor: '#f9fafb',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  lineHeight: '1.5',
                  color: '#374151'
                }}>
                  {conversation.summary}
                </div>
              </div>
            )}
          </div>

          {/* Project Details */}
          {conversation.project_details && (
            <div className="content-card">
              <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1rem', color: '#111827' }}>
                Project Details
              </h3>
              <div style={{ fontSize: '0.875rem', lineHeight: '1.5', color: '#374151' }}>
                <pre style={{ 
                  whiteSpace: 'pre-wrap', 
                  fontFamily: 'inherit',
                  margin: 0
                }}>
                  {JSON.stringify(conversation.project_details, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Conversation Messages */}
        <div>
          <div className="content-card">
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem'
            }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#111827' }}>
                Conversation History
              </h3>
              {onGenerateMatches && conversation.category === 'HOT' && (
                <button
                  onClick={() => onGenerateMatches(prospect.id)}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#dc2626',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}
                >
                  🔥 Generate Matches
                </button>
              )}
            </div>

            <div style={{
              maxHeight: '600px',
              overflowY: 'auto',
              border: '1px solid #e5e7eb',
              borderRadius: '8px'
            }}>
              {conversation.messages.map((message, index) => (
                <div
                  key={index}
                  style={{
                    padding: '1rem',
                    borderBottom: index < conversation.messages.length - 1 ? '1px solid #e5e7eb' : 'none',
                    backgroundColor: message.role === 'assistant' ? '#f9fafb' : 'white'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.5rem'
                  }}>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: message.role === 'assistant' ? '#2563eb' : '#16a34a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      color: 'white',
                      fontWeight: 'bold'
                    }}>
                      {message.role === 'assistant' ? 'AI' : 'U'}
                    </div>
                    <span style={{
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: '#374151'
                    }}>
                      {message.role === 'assistant' ? 'Yenta AI' : 'Prospect'}
                    </span>
                  </div>
                  <div style={{
                    fontSize: '0.875rem',
                    lineHeight: '1.5',
                    color: '#111827',
                    marginLeft: '2rem'
                  }}>
                    {message.content}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConversationViewer;