import React, { useState, useEffect } from 'react';
import '../../styles/dashboard.css';

interface Vendor {
  id: string;
  company_name: string;
  industry: string;
  expertise: string[];
  email: string;
  user_id: string;
}

interface Match {
  vendor: Vendor;
  match_score: number;
  reasoning: string;
  industry_fit: number;
  expertise_match: number;
  availability_score: number;
  recommendation: 'strong' | 'moderate' | 'weak';
}

interface Prospect {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  industry?: string;
  ai_summary?: string;
}

interface MatchManagementProps {
  prospectId?: string;
  onBack?: () => void;
}

export const MatchManagement: React.FC<MatchManagementProps> = ({ 
  prospectId, 
  onBack 
}) => {
  const [prospect, setProspect] = useState<Prospect | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatingMatches, setGeneratingMatches] = useState(false);
  const [schedulingMeeting, setSchedulingMeeting] = useState<string | null>(null);

  useEffect(() => {
    if (prospectId) {
      fetchProspectData();
    }
  }, [prospectId]);

  const fetchProspectData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.REACT_APP_API_URL}/admin/prospects/${prospectId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setProspect(data.prospect);
      } else {
        setError('Failed to fetch prospect data');
      }
    } catch (err) {
      setError('Network error while fetching prospect');
    } finally {
      setLoading(false);
    }
  };

  const generateMatches = async () => {
    if (!prospectId) return;

    try {
      setGeneratingMatches(true);
      setError(null);
      
      const response = await fetch(`${process.env.REACT_APP_API_URL}/admin/prospects/${prospectId}/matches`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMatches(data.matches || []);
      } else {
        setError('Failed to generate matches');
      }
    } catch (err) {
      setError('Network error while generating matches');
    } finally {
      setGeneratingMatches(false);
    }
  };

  const scheduleMeeting = async (vendorId: string, match: Match) => {
    try {
      setSchedulingMeeting(vendorId);
      
      const response = await fetch(`${process.env.REACT_APP_API_URL}/admin/meetings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          vendor_id: vendorId,
          prospect_id: prospectId,
          match_score: match.match_score,
          match_reasons: match.reasoning,
          scheduled_at: null // Admin will set this later
        })
      });

      if (response.ok) {
        alert('Meeting scheduled successfully! Vendor will be notified.');
        // Remove the matched vendor from the list
        setMatches(prev => prev.filter(m => m.vendor.id !== vendorId));
      } else {
        const errorData = await response.json();
        alert(errorData.error?.message || 'Failed to schedule meeting');
      }
    } catch (err) {
      alert('Network error while scheduling meeting');
    } finally {
      setSchedulingMeeting(null);
    }
  };

  const getMatchColor = (recommendation: string) => {
    switch (recommendation) {
      case 'strong': return '#16a34a';
      case 'moderate': return '#eab308';
      case 'weak': return '#dc2626';
      default: return '#6b7280';
    }
  };

  const getMatchIcon = (recommendation: string) => {
    switch (recommendation) {
      case 'strong': return '🎯';
      case 'moderate': return '⚡';
      case 'weak': return '⚠️';
      default: return '❓';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#16a34a';
    if (score >= 60) return '#eab308';
    if (score >= 40) return '#ea580c';
    return '#dc2626';
  };

  if (!prospectId) {
    return (
      <div className="content-card">
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: '#111827' }}>
            Vendor Matching System
          </h3>
          <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
            Select a prospect from the prospects management page to generate AI-powered vendor matches.
          </p>
          {onBack && (
            <button
              onClick={onBack}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Back to Prospects
            </button>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="content-card">
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Loading prospect data...</div>
        </div>
      </div>
    );
  }

  if (error || !prospect) {
    return (
      <div className="content-card">
        <div style={{ textAlign: 'center', padding: '2rem', color: '#dc2626' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Error</div>
          <div>{error || 'Prospect not found'}</div>
          {onBack && (
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
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        {onBack && (
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
        )}
        
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827', marginBottom: '0.5rem' }}>
          Vendor Matching
        </h2>
        <p style={{ color: '#6b7280' }}>
          Generate AI-powered vendor matches for {prospect.company_name}
        </p>
      </div>

      {/* Prospect Summary */}
      <div className="content-card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1rem', color: '#111827' }}>
          Prospect Summary
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: '500' }}>
              Company
            </label>
            <div style={{ fontWeight: '500', color: '#111827' }}>
              {prospect.company_name}
            </div>
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: '500' }}>
              Contact
            </label>
            <div style={{ color: '#111827' }}>{prospect.contact_name}</div>
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
        </div>
        
        {prospect.ai_summary && (
          <div style={{ marginTop: '1rem' }}>
            <label style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: '500' }}>
              AI Summary
            </label>
            <div style={{
              padding: '1rem',
              backgroundColor: '#f9fafb',
              borderRadius: '6px',
              fontSize: '0.875rem',
              lineHeight: '1.5',
              color: '#374151',
              marginTop: '0.5rem'
            }}>
              {prospect.ai_summary}
            </div>
          </div>
        )}
      </div>

      {/* Generate Matches Button */}
      {matches.length === 0 && (
        <div className="content-card" style={{ marginBottom: '2rem' }}>
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: '#111827' }}>
              🤖 AI Vendor Matching
            </h3>
            <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
              Generate intelligent vendor matches based on prospect requirements, industry fit, and technical expertise.
            </p>
            <button
              onClick={generateMatches}
              disabled={generatingMatches}
              style={{
                padding: '1rem 2rem',
                backgroundColor: generatingMatches ? '#6b7280' : '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: generatingMatches ? 'not-allowed' : 'pointer',
                fontSize: '1rem',
                fontWeight: '500'
              }}
            >
              {generatingMatches ? '🤖 Generating Matches...' : '🎯 Generate AI Matches'}
            </button>
          </div>
        </div>
      )}

      {/* Matches Results */}
      {matches.length > 0 && (
        <div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem'
          }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#111827' }}>
              AI-Generated Vendor Matches ({matches.length})
            </h3>
            <button
              onClick={generateMatches}
              disabled={generatingMatches}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              🔄 Regenerate
            </button>
          </div>

          <div style={{ display: 'grid', gap: '1.5rem' }}>
            {matches.map((match, index) => (
              <div 
                key={match.vendor.id}
                className="content-card"
                style={{
                  border: `2px solid ${getMatchColor(match.recommendation)}`,
                  position: 'relative'
                }}
              >
                {/* Match Rank Badge */}
                <div style={{
                  position: 'absolute',
                  top: '-12px',
                  left: '1rem',
                  backgroundColor: getMatchColor(match.recommendation),
                  color: 'white',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: 'bold'
                }}>
                  #{index + 1} Match
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '2rem' }}>
                  <div>
                    {/* Vendor Info */}
                    <div style={{ marginBottom: '1.5rem' }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        marginBottom: '0.75rem'
                      }}>
                        <h4 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#111827', margin: 0 }}>
                          {match.vendor.company_name}
                        </h4>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.25rem 0.75rem',
                          backgroundColor: getMatchColor(match.recommendation),
                          color: 'white',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: '500'
                        }}>
                          {getMatchIcon(match.recommendation)}
                          {match.recommendation.toUpperCase()}
                        </div>
                      </div>
                      
                      <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                        {match.vendor.email} • {match.vendor.industry}
                      </div>
                      
                      {match.vendor.expertise && match.vendor.expertise.length > 0 && (
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          {match.vendor.expertise.map((skill, skillIndex) => (
                            <span
                              key={skillIndex}
                              style={{
                                padding: '0.25rem 0.5rem',
                                backgroundColor: '#e5e7eb',
                                color: '#374151',
                                borderRadius: '4px',
                                fontSize: '0.75rem'
                              }}
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Match Scores */}
                    <div style={{ marginBottom: '1.5rem' }}>
                      <h5 style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '1rem', color: '#374151' }}>
                        Match Analysis
                      </h5>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                        <div>
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '0.75rem',
                            marginBottom: '0.25rem'
                          }}>
                            <span>Overall Match</span>
                            <span style={{ fontWeight: 'bold', color: getScoreColor(match.match_score) }}>
                              {match.match_score}%
                            </span>
                          </div>
                          <div style={{
                            width: '100%',
                            height: '6px',
                            backgroundColor: '#e5e7eb',
                            borderRadius: '3px',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              width: `${match.match_score}%`,
                              height: '100%',
                              backgroundColor: getScoreColor(match.match_score)
                            }}></div>
                          </div>
                        </div>

                        <div>
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '0.75rem',
                            marginBottom: '0.25rem'
                          }}>
                            <span>Industry Fit</span>
                            <span style={{ fontWeight: 'bold', color: getScoreColor(match.industry_fit) }}>
                              {match.industry_fit}%
                            </span>
                          </div>
                          <div style={{
                            width: '100%',
                            height: '6px',
                            backgroundColor: '#e5e7eb',
                            borderRadius: '3px',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              width: `${match.industry_fit}%`,
                              height: '100%',
                              backgroundColor: getScoreColor(match.industry_fit)
                            }}></div>
                          </div>
                        </div>

                        <div>
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '0.75rem',
                            marginBottom: '0.25rem'
                          }}>
                            <span>Expertise</span>
                            <span style={{ fontWeight: 'bold', color: getScoreColor(match.expertise_match) }}>
                              {match.expertise_match}%
                            </span>
                          </div>
                          <div style={{
                            width: '100%',
                            height: '6px',
                            backgroundColor: '#e5e7eb',
                            borderRadius: '3px',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              width: `${match.expertise_match}%`,
                              height: '100%',
                              backgroundColor: getScoreColor(match.expertise_match)
                            }}></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* AI Reasoning */}
                    <div>
                      <h5 style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: '#374151' }}>
                        AI Reasoning
                      </h5>
                      <div style={{
                        padding: '1rem',
                        backgroundColor: '#f9fafb',
                        borderRadius: '6px',
                        fontSize: '0.875rem',
                        lineHeight: '1.5',
                        color: '#374151'
                      }}>
                        {match.reasoning}
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <button
                      onClick={() => scheduleMeeting(match.vendor.id, match)}
                      disabled={schedulingMeeting === match.vendor.id}
                      style={{
                        padding: '1rem 1.5rem',
                        backgroundColor: schedulingMeeting === match.vendor.id ? '#6b7280' : getMatchColor(match.recommendation),
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: schedulingMeeting === match.vendor.id ? 'not-allowed' : 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {schedulingMeeting === match.vendor.id ? '📅 Scheduling...' : '📅 Schedule Meeting'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchManagement;