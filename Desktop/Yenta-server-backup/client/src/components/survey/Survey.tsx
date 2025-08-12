import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

interface SurveyParams extends Record<string, string | undefined> {
  meetingId: string;
  respondentId: string;
  respondentRole: string;
}

interface MeetingDetails {
  id: number;
  scheduled_at: string;
  vendor_company: string;
  prospect_company: string;
  vendor_contact: string;
  prospect_contact: string;
}

const Survey: React.FC = () => {
  const { meetingId, respondentId, respondentRole } = useParams<SurveyParams>();
  const navigate = useNavigate();
  
  const [rating, setRating] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>('');
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [meetingDetails, setMeetingDetails] = useState<MeetingDetails | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchMeetingDetails();
  }, [meetingId]);

  const fetchMeetingDetails = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/meetings/${meetingId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setMeetingDetails(data.meeting);
      } else {
        setErrorMessage('Meeting not found');
        setSubmitStatus('error');
      }
    } catch (error) {
      console.error('Error fetching meeting details:', error);
      setErrorMessage('Failed to load meeting details');
      setSubmitStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) {
      setErrorMessage('Please select a rating');
      setSubmitStatus('error');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/surveys`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            meetingId: parseInt(meetingId!),
            respondentId: parseInt(respondentId!),
            respondentRole,
            rating,
            feedback: feedback.trim() || null,
          }),
        }
      );

      if (response.ok) {
        setSubmitStatus('success');
        // Redirect after 3 seconds
        setTimeout(() => {
          navigate('/');
        }, 3000);
      } else {
        const data = await response.json();
        setErrorMessage(data.error || 'Failed to submit survey');
        setSubmitStatus('error');
      }
    } catch (error) {
      console.error('Survey submission error:', error);
      setErrorMessage('Network error. Please try again.');
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRatingText = (rating: number): string => {
    switch (rating) {
      case 1: return 'Poor';
      case 2: return 'Fair';
      case 3: return 'Good';
      case 4: return 'Very Good';
      case 5: return 'Excellent';
      default: return '';
    }
  };

  const getRatingColor = (rating: number): string => {
    switch (rating) {
      case 1: return '#ef4444';
      case 2: return '#f97316';
      case 3: return '#eab308';
      case 4: return '#22c55e';
      case 5: return '#10b981';
      default: return '#d1d5db';
    }
  };

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        fontSize: '18px',
        color: '#6b7280'
      }}>
        Loading survey...
      </div>
    );
  }

  if (submitStatus === 'success') {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        padding: '20px',
        textAlign: 'center'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '40px',
          maxWidth: '500px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>✅</div>
          <h2 style={{ color: '#22c55e', marginBottom: '20px' }}>Thank You!</h2>
          <p style={{ color: '#6b7280', marginBottom: '20px' }}>
            Your feedback has been submitted successfully. This helps us improve our matchmaking service.
          </p>
          <p style={{ fontSize: '14px', color: '#6b7280' }}>
            Redirecting to homepage in 3 seconds...
          </p>
        </div>
      </div>
    );
  }

  const isVendor = respondentRole === 'vendor';
  const otherPartyCompany = isVendor 
    ? meetingDetails?.prospect_company 
    : meetingDetails?.vendor_company;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '40px',
        maxWidth: '600px',
        width: '100%',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
          <h1 style={{ color: '#1f2937', marginBottom: '8px' }}>Post-Meeting Survey</h1>
          <p style={{ color: '#6b7280', fontSize: '16px' }}>
            How was your {isVendor ? 'consultation' : 'meeting'} with <strong>{otherPartyCompany}</strong>?
          </p>
        </div>

        {meetingDetails && (
          <div style={{
            background: '#f8fafc',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '30px',
            border: '1px solid #e5e7eb'
          }}>
            <h3 style={{ margin: '0 0 8px 0', color: '#374151' }}>Meeting Details</h3>
            <p style={{ margin: '4px 0', color: '#6b7280', fontSize: '14px' }}>
              <strong>Date:</strong> {new Date(meetingDetails.scheduled_at).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
              })}
            </p>
            <p style={{ margin: '4px 0', color: '#6b7280', fontSize: '14px' }}>
              <strong>Participants:</strong> {meetingDetails.vendor_company} ↔ {meetingDetails.prospect_company}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Rating Section */}
          <div style={{ marginBottom: '30px' }}>
            <label style={{
              display: 'block',
              marginBottom: '16px',
              fontSize: '18px',
              fontWeight: '600',
              color: '#374151'
            }}>
              Overall, how would you rate this meeting? *
            </label>
            
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '8px',
              marginBottom: '12px'
            }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '36px',
                    cursor: 'pointer',
                    color: (hoveredRating || rating) >= star ? getRatingColor(star) : '#d1d5db',
                    transition: 'color 0.2s ease',
                    padding: '4px'
                  }}
                >
                  ⭐
                </button>
              ))}
            </div>
            
            {(rating > 0 || hoveredRating > 0) && (
              <div style={{
                textAlign: 'center',
                fontSize: '16px',
                fontWeight: '500',
                color: getRatingColor(hoveredRating || rating)
              }}>
                {getRatingText(hoveredRating || rating)}
              </div>
            )}
          </div>

          {/* Feedback Section */}
          <div style={{ marginBottom: '30px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '16px',
              fontWeight: '500',
              color: '#374151'
            }}>
              Additional feedback (optional)
            </label>
            <p style={{
              fontSize: '14px',
              color: '#6b7280',
              marginBottom: '12px'
            }}>
              Help us improve: What went well? What could be better? Any suggestions for future matches?
            </p>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              style={{
                width: '100%',
                minHeight: '120px',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                resize: 'vertical',
                fontFamily: 'inherit',
                lineHeight: '1.5'
              }}
              placeholder={isVendor 
                ? "e.g., The prospect was well-prepared and asked great questions. It would be helpful to know their timeline beforehand..."
                : "e.g., The vendor understood our needs well and provided clear solutions. Would like to see more case studies upfront..."
              }
              maxLength={1000}
            />
            <div style={{
              textAlign: 'right',
              fontSize: '13px',
              color: '#6b7280',
              marginTop: '4px'
            }}>
              {feedback.length}/1000 characters
            </div>
          </div>

          {/* Error Display */}
          {submitStatus === 'error' && (
            <div style={{
              background: '#fee2e2',
              border: '1px solid #ef4444',
              borderRadius: '6px',
              padding: '12px',
              marginBottom: '20px',
              color: '#dc2626'
            }}>
              ❌ {errorMessage}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || rating === 0}
            style={{
              width: '100%',
              background: isSubmitting || rating === 0 ? '#9ca3af' : '#3b82f6',
              color: 'white',
              padding: '14px 20px',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: isSubmitting || rating === 0 ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s ease'
            }}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Survey'}
          </button>
        </form>

        <div style={{
          textAlign: 'center',
          marginTop: '20px',
          fontSize: '14px',
          color: '#6b7280'
        }}>
          Your feedback helps improve our AI-powered matchmaking platform
        </div>
      </div>
    </div>
  );
};

export default Survey;