import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const PaymentSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isVerifying, setIsVerifying] = useState(true);
  const [meetingDetails, setMeetingDetails] = useState<any>(null);
  
  const meetingId = searchParams.get('meeting_id');

  useEffect(() => {
    if (meetingId) {
      verifyPayment();
    }
  }, [meetingId]);

  const verifyPayment = async () => {
    try {
      const token = localStorage.getItem('authToken');
      
      // Fetch meeting details to confirm payment
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/meetings/${meetingId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setMeetingDetails(data.meeting);
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '48px',
        maxWidth: '500px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
      }}>
        {isVerifying ? (
          <>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
            <h2 style={{ color: '#1f2937', marginBottom: '16px' }}>
              Verifying Payment...
            </h2>
            <p style={{ color: '#6b7280' }}>
              Please wait while we confirm your payment.
            </p>
          </>
        ) : (
          <>
            <div style={{ fontSize: '72px', marginBottom: '20px' }}>✅</div>
            <h1 style={{ color: '#22c55e', marginBottom: '16px' }}>
              Payment Successful!
            </h1>
            
            {meetingDetails && (
              <div style={{
                background: '#f8fafc',
                borderRadius: '8px',
                padding: '20px',
                marginBottom: '24px',
                textAlign: 'left'
              }}>
                <h3 style={{ margin: '0 0 12px 0', color: '#374151' }}>
                  Meeting Details
                </h3>
                <p style={{ margin: '8px 0', color: '#6b7280' }}>
                  <strong>Meeting ID:</strong> #{meetingId}
                </p>
                <p style={{ margin: '8px 0', color: '#6b7280' }}>
                  <strong>Amount Paid:</strong> ${meetingDetails.payment_amount}
                </p>
                <p style={{ margin: '8px 0', color: '#6b7280' }}>
                  <strong>Status:</strong> {meetingDetails.payment_status}
                </p>
              </div>
            )}
            
            <p style={{ color: '#6b7280', marginBottom: '32px' }}>
              Your payment has been processed successfully. You will receive a confirmation email shortly.
            </p>
            
            <button
              onClick={() => navigate('/vendor/dashboard')}
              style={{
                background: '#3b82f6',
                color: 'white',
                padding: '12px 24px',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Return to Dashboard
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentSuccess;