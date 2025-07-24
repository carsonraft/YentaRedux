import React, { useState, useEffect } from 'react';
import '../../styles/dashboard.css';

interface Meeting {
  id: string;
  prospect_company: string;
  contact_name: string;
  prospect_email: string;
  scheduled_at: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  outcome?: 'opportunity' | 'not_interested' | 'follow_up' | 'closed_won' | 'closed_lost';
  match_score: number;
  match_reasons: string;
  google_event_id?: string;
  meet_link?: string;
  notes?: string;
  created_at: string;
}

export const MeetingManagement: React.FC = () => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [showOutcomeModal, setShowOutcomeModal] = useState(false);
  const [outcome, setOutcome] = useState('');
  const [notes, setNotes] = useState('');
  const [updatingMeeting, setUpdatingMeeting] = useState(false);

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.REACT_APP_API_URL}/vendors/meetings`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMeetings(data.meetings || []);
      } else {
        setError('Failed to fetch meetings');
      }
    } catch (err) {
      setError('Network error while fetching meetings');
    } finally {
      setLoading(false);
    }
  };

  const updateMeetingOutcome = async () => {
    if (!selectedMeeting) return;

    try {
      setUpdatingMeeting(true);
      const response = await fetch(`${process.env.REACT_APP_API_URL}/meetings/${selectedMeeting.id}/feedback`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          outcome,
          feedback: notes,
          next_steps: '',
          rating: null
        })
      });

      if (response.ok) {
        await fetchMeetings();
        setShowOutcomeModal(false);
        setSelectedMeeting(null);
        setOutcome('');
        setNotes('');
      } else {
        setError('Failed to update meeting outcome');
      }
    } catch (err) {
      setError('Network error while updating meeting');
    } finally {
      setUpdatingMeeting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return '#2563eb';
      case 'completed': return '#16a34a';
      case 'cancelled': return '#dc2626';
      case 'no_show': return '#ea580c';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled': return '📅';
      case 'completed': return '✅';
      case 'cancelled': return '❌';
      case 'no_show': return '👻';
      default: return '❓';
    }
  };

  const getOutcomeColor = (outcome: string) => {
    switch (outcome) {
      case 'opportunity': return '#16a34a';
      case 'follow_up': return '#eab308';
      case 'closed_won': return '#059669';
      case 'closed_lost': return '#dc2626';
      case 'not_interested': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getOutcomeIcon = (outcome: string) => {
    switch (outcome) {
      case 'opportunity': return '🎯';
      case 'follow_up': return '🔄';
      case 'closed_won': return '🏆';
      case 'closed_lost': return '💔';
      case 'not_interested': return '🚫';
      default: return '❓';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      })
    };
  };

  const filteredMeetings = meetings.filter(meeting => {
    if (filterStatus === 'all') return true;
    return meeting.status === filterStatus;
  });

  const getMeetingStats = () => {
    return {
      total: meetings.length,
      scheduled: meetings.filter(m => m.status === 'scheduled').length,
      completed: meetings.filter(m => m.status === 'completed').length,
      opportunities: meetings.filter(m => m.outcome === 'opportunity' || m.outcome === 'closed_won').length
    };
  };

  const stats = getMeetingStats();

  if (loading) {
    return (
      <div className="content-card">
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Loading meetings...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="content-card">
        <div style={{ textAlign: 'center', padding: '2rem', color: '#dc2626' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Error</div>
          <div>{error}</div>
          <button 
            onClick={fetchMeetings}
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
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
    <div>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827', marginBottom: '0.5rem' }}>
          Meeting Management
        </h2>
        <p style={{ color: '#6b7280' }}>
          Track and manage your prospect meetings and outcomes
        </p>
      </div>

      {/* Stats Cards */}
      <div className="dashboard-grid" style={{ marginBottom: '2rem' }}>
        <div className="stat-card">
          <div className="stat-icon blue">📅</div>
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total Meetings</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon yellow">⏳</div>
          <div className="stat-value">{stats.scheduled}</div>
          <div className="stat-label">Scheduled</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">✅</div>
          <div className="stat-value">{stats.completed}</div>
          <div className="stat-label">Completed</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red">🎯</div>
          <div className="stat-value">{stats.opportunities}</div>
          <div className="stat-label">Opportunities</div>
        </div>
      </div>

      {/* Filters */}
      <div className="content-card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
            Filter by Status:
          </label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '0.875rem',
              backgroundColor: 'white'
            }}
          >
            <option value="all">All Meetings</option>
            <option value="scheduled">📅 Scheduled</option>
            <option value="completed">✅ Completed</option>
            <option value="cancelled">❌ Cancelled</option>
            <option value="no_show">👻 No Show</option>
          </select>
          <button
            onClick={fetchMeetings}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Meetings List */}
      <div className="content-card">
        {filteredMeetings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
            {filterStatus !== 'all' ? 
              `No ${filterStatus} meetings found` : 
              'No meetings scheduled yet'
            }
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {filteredMeetings.map((meeting) => {
              const formatted = formatDate(meeting.scheduled_at);
              return (
                <div
                  key={meeting.id}
                  style={{
                    padding: '1.5rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    borderLeft: `4px solid ${getStatusColor(meeting.status)}`
                  }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem' }}>
                    <div>
                      {/* Meeting Header */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        marginBottom: '0.75rem'
                      }}>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#111827', margin: 0 }}>
                          {meeting.prospect_company}
                        </h3>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.25rem 0.75rem',
                          backgroundColor: getStatusColor(meeting.status),
                          color: 'white',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: '500'
                        }}>
                          {getStatusIcon(meeting.status)}
                          {meeting.status.replace('_', ' ').toUpperCase()}
                        </div>
                        {meeting.outcome && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.25rem 0.75rem',
                            backgroundColor: getOutcomeColor(meeting.outcome),
                            color: 'white',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: '500'
                          }}>
                            {getOutcomeIcon(meeting.outcome)}
                            {meeting.outcome.replace('_', ' ').toUpperCase()}
                          </div>
                        )}
                      </div>

                      {/* Contact Info */}
                      <div style={{ marginBottom: '1rem' }}>
                        <div style={{ fontSize: '0.875rem', color: '#111827', marginBottom: '0.25rem' }}>
                          Contact: {meeting.contact_name}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                          {meeting.prospect_email}
                        </div>
                      </div>

                      {/* Meeting Details */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                        <div>
                          <label style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: '500' }}>
                            Date & Time
                          </label>
                          <div style={{ fontSize: '0.875rem', color: '#111827' }}>
                            {formatted.date} at {formatted.time}
                          </div>
                        </div>
                        <div>
                          <label style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: '500' }}>
                            Match Score
                          </label>
                          <div style={{
                            fontSize: '0.875rem',
                            fontWeight: 'bold',
                            color: meeting.match_score >= 80 ? '#16a34a' : 
                                   meeting.match_score >= 60 ? '#eab308' : '#dc2626'
                          }}>
                            {meeting.match_score}%
                          </div>
                        </div>
                        {meeting.meet_link && (
                          <div>
                            <label style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: '500' }}>
                              Meeting Link
                            </label>
                            <div>
                              <a
                                href={meeting.meet_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  fontSize: '0.875rem',
                                  color: '#2563eb',
                                  textDecoration: 'none'
                                }}
                              >
                                Join Meeting →
                              </a>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Match Reasoning */}
                      {meeting.match_reasons && (
                        <div style={{ marginBottom: '1rem' }}>
                          <label style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: '500' }}>
                            AI Match Reasoning
                          </label>
                          <div style={{
                            padding: '0.75rem',
                            backgroundColor: '#f9fafb',
                            borderRadius: '6px',
                            fontSize: '0.875rem',
                            lineHeight: '1.5',
                            color: '#374151',
                            marginTop: '0.25rem'
                          }}>
                            {meeting.match_reasons}
                          </div>
                        </div>
                      )}

                      {/* Notes */}
                      {meeting.notes && (
                        <div>
                          <label style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: '500' }}>
                            Notes
                          </label>
                          <div style={{
                            padding: '0.75rem',
                            backgroundColor: '#fef3c7',
                            borderRadius: '6px',
                            fontSize: '0.875rem',
                            lineHeight: '1.5',
                            color: '#374151',
                            marginTop: '0.25rem'
                          }}>
                            {meeting.notes}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
                      {meeting.status === 'scheduled' && (
                        <button
                          onClick={() => {
                            setSelectedMeeting(meeting);
                            setShowOutcomeModal(true);
                          }}
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: '#16a34a',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          Update Outcome
                        </button>
                      )}
                      
                      {meeting.meet_link && (
                        <a
                          href={meeting.meet_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: '#2563eb',
                            color: 'white',
                            textDecoration: 'none',
                            borderRadius: '6px',
                            fontSize: '0.875rem',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          Join Meeting
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Outcome Modal */}
      {showOutcomeModal && selectedMeeting && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '2rem',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', color: '#111827' }}>
              Update Meeting Outcome
            </h3>
            <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
              Meeting with {selectedMeeting.prospect_company}
            </p>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '0.875rem', 
                fontWeight: '500', 
                color: '#374151', 
                marginBottom: '0.5rem' 
              }}>
                Outcome
              </label>
              <select
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  backgroundColor: 'white'
                }}
              >
                <option value="">Select outcome</option>
                <option value="opportunity">🎯 Opportunity</option>
                <option value="follow_up">🔄 Follow Up Required</option>
                <option value="closed_won">🏆 Closed Won</option>
                <option value="closed_lost">💔 Closed Lost</option>
                <option value="not_interested">🚫 Not Interested</option>
              </select>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '0.875rem', 
                fontWeight: '500', 
                color: '#374151', 
                marginBottom: '0.5rem' 
              }}>
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Add meeting notes, next steps, or additional context..."
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowOutcomeModal(false);
                  setSelectedMeeting(null);
                  setOutcome('');
                  setNotes('');
                }}
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: '#f3f4f6',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                Cancel
              </button>
              <button
                onClick={updateMeetingOutcome}
                disabled={updatingMeeting}
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: updatingMeeting ? '#6b7280' : '#16a34a',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: updatingMeeting ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                {updatingMeeting ? 'Saving...' : 'Save Outcome'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MeetingManagement;