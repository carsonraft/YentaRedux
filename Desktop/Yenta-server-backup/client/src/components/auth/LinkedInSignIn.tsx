import React, { useState } from 'react';

interface LinkedInData {
  linkedinId: string;
  firstName: string;
  lastName: string;
  email: string;
  headline: string;
  industry: string;
  currentPosition: any;
  profileUrl: string;
  company?: {
    id: string;
    name: string;
    industry: string;
    website: string;
    description: string;
    size: number;
  };
}

interface Props {
  onLinkedInSuccess: (data: LinkedInData, suggestedRole: 'prospect' | 'vendor') => void;
  userType?: 'prospect' | 'vendor' | 'auto';
}

const LinkedInSignIn: React.FC<Props> = ({ onLinkedInSuccess, userType = 'auto' }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLinkedInSignIn = async () => {
    try {
      setIsLoading(true);
      setError('');

      // Get LinkedIn OAuth URL
      const authResponse = await fetch('/api/auth/linkedin');
      const { authUrl, state } = await authResponse.json();

      // Open LinkedIn OAuth in popup
      const popup = window.open(
        authUrl,
        'linkedinAuth',
        'width=600,height=600,scrollbars=yes,resizable=yes'
      );

      // Listen for the OAuth callback
      const handleMessage = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        
        if (event.data.type === 'LINKEDIN_AUTH_SUCCESS') {
          const { code } = event.data;
          popup?.close();
          
          // Exchange code for user data
          const callbackResponse = await fetch('/api/auth/linkedin/callback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, state })
          });

          const result = await callbackResponse.json();
          
          if (result.success) {
            // Get pre-filled form data
            const prefillResponse = await fetch('/api/auth/prefill-form', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                linkedinData: result.userData,
                userType: userType === 'auto' ? result.suggestedRole : userType
              })
            });

            const prefillData = await prefillResponse.json();
            
            onLinkedInSuccess({
              ...result.userData,
              prefillData: userType === 'prospect' ? prefillData.prospectData : prefillData.vendorData
            }, result.suggestedRole);
          } else {
            setError(result.error || 'LinkedIn authentication failed');
          }
        } else if (event.data.type === 'LINKEDIN_AUTH_ERROR') {
          popup?.close();
          setError('LinkedIn authentication was cancelled or failed');
        }
        
        window.removeEventListener('message', handleMessage);
      };

      window.addEventListener('message', handleMessage);

      // Check if popup was closed manually
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', handleMessage);
          setIsLoading(false);
        }
      }, 1000);

    } catch (error) {
      console.error('LinkedIn sign-in error:', error);
      setError('Failed to initiate LinkedIn sign-in');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="linkedin-signin">
      <button
        onClick={handleLinkedInSignIn}
        disabled={isLoading}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 24px',
          background: '#0A66C2',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontSize: '16px',
          fontWeight: '600',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          opacity: isLoading ? 0.7 : 1,
          transition: 'all 0.2s ease',
          width: '100%',
          justifyContent: 'center'
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>
        {isLoading ? 'Connecting...' : 'Continue with LinkedIn'}
      </button>

      {error && (
        <div style={{
          marginTop: '12px',
          padding: '8px 12px',
          background: '#fee2e2',
          border: '1px solid #fecaca',
          borderRadius: '6px',
          color: '#dc2626',
          fontSize: '14px'
        }}>
          {error}
        </div>
      )}

      <div style={{
        marginTop: '16px',
        fontSize: '13px',
        color: '#6b7280',
        textAlign: 'center'
      }}>
        We'll use your LinkedIn profile to pre-fill your information and better match you with relevant {userType === 'prospect' ? 'vendors' : 'prospects'}.
      </div>
    </div>
  );
};

export default LinkedInSignIn;