import React, { useState } from 'react';

interface StripeCheckoutProps {
  meetingId: number;
  amount: number;
  vendorCompany: string;
  prospectCompany: string;
}

const StripeCheckout: React.FC<StripeCheckoutProps> = ({ 
  meetingId, 
  amount, 
  vendorCompany, 
  prospectCompany 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get auth token from localStorage or context
      const token = localStorage.getItem('authToken');
      
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/payments/create-checkout-session`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            meeting_id: meetingId,
            amount: amount.toFixed(2),
            success_url: `${window.location.origin}/payment-success?meeting_id=${meetingId}`,
            cancel_url: `${window.location.origin}/meetings/${meetingId}`
          })
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Failed to create checkout session');
      }

      const { checkout_url } = await response.json();
      
      // Redirect to Stripe Checkout
      window.location.href = checkout_url;
      
    } catch (err) {
      console.error('Checkout error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      background: 'white',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
      maxWidth: '400px',
      margin: '0 auto'
    }}>
      <h3 style={{ marginBottom: '20px', color: '#1f2937' }}>
        Meeting Payment
      </h3>
      
      <div style={{
        background: '#f8fafc',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '20px'
      }}>
        <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#6b7280' }}>
          <strong>Meeting:</strong> {vendorCompany} + {prospectCompany}
        </p>
        <p style={{ margin: '0', fontSize: '24px', fontWeight: '600', color: '#1f2937' }}>
          ${amount.toFixed(2)}
        </p>
      </div>

      {error && (
        <div style={{
          background: '#fee2e2',
          border: '1px solid #ef4444',
          borderRadius: '6px',
          padding: '12px',
          marginBottom: '16px',
          color: '#dc2626',
          fontSize: '14px'
        }}>
          ❌ {error}
        </div>
      )}

      <button
        onClick={handleCheckout}
        disabled={isLoading}
        style={{
          width: '100%',
          background: isLoading ? '#9ca3af' : '#3b82f6',
          color: 'white',
          padding: '12px 20px',
          border: 'none',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: '600',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}
      >
        {isLoading ? (
          <>Processing...</>
        ) : (
          <>
            💳 Pay with Stripe
          </>
        )}
      </button>

      <p style={{
        textAlign: 'center',
        marginTop: '16px',
        fontSize: '12px',
        color: '#9ca3af'
      }}>
        Powered by Stripe • Secure payment processing
      </p>
    </div>
  );
};

export default StripeCheckout;

// Example usage in a meeting details page:
/*
const MeetingPayment = () => {
  const meeting = {
    id: 123,
    vendor_company: "AI Solutions Inc",
    prospect_company: "Tech Corp",
    payment_amount: 2500
  };

  return (
    <div>
      <h2>Complete Meeting Payment</h2>
      <StripeCheckout
        meetingId={meeting.id}
        amount={meeting.payment_amount}
        vendorCompany={meeting.vendor_company}
        prospectCompany={meeting.prospect_company}
      />
    </div>
  );
};
*/