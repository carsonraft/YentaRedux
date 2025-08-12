import React, { useState } from 'react';
import './MultiAuthSignIn.css';

interface MultiAuthSignInProps {
  onSuccess: (token: string, user: any) => void;
  userType?: 'prospect' | 'vendor';
}

export const MultiAuthSignIn: React.FC<MultiAuthSignInProps> = ({ onSuccess, userType = 'prospect' }) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

  // Traditional email/password authentication
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const endpoint = mode === 'signin' ? '/auth/login' : '/auth/register';
      const body = mode === 'signin' 
        ? { email, password }
        : { email, password, firstName, lastName, role: userType };

      const response = await fetch(`${apiUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      onSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // OAuth authentication handlers
  const handleOAuthSignIn = async (provider: 'google' | 'microsoft' | 'linkedin') => {
    try {
      setLoading(true);
      setError('');

      // Get OAuth URL from backend
      const response = await fetch(`${apiUrl}/auth/${provider}`);
      const { authUrl } = await response.json();

      // Open OAuth popup
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const popup = window.open(
        authUrl,
        `${provider}Auth`,
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
      );

      // Listen for OAuth callback
      const handleMessage = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;

        if (event.data.type === `${provider.toUpperCase()}_AUTH_SUCCESS`) {
          window.removeEventListener('message', handleMessage);
          popup?.close();

          // Exchange code for token
          const callbackResponse = await fetch(`${apiUrl}/auth/${provider}/callback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              code: event.data.code,
              state: event.data.state 
            })
          });

          const data = await callbackResponse.json();

          if (!callbackResponse.ok) {
            throw new Error(data.error || 'OAuth authentication failed');
          }

          // If new user, might need to collect additional info
          if (data.isNewUser && userType === 'vendor') {
            // Could redirect to vendor profile setup
          }

          onSuccess(data.token, data.user);
        } else if (event.data.type === `${provider.toUpperCase()}_AUTH_ERROR`) {
          window.removeEventListener('message', handleMessage);
          popup?.close();
          setError(event.data.error || 'Authentication cancelled');
        }
      };

      window.addEventListener('message', handleMessage);

      // Cleanup if popup is closed manually
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', handleMessage);
          setLoading(false);
        }
      }, 1000);

    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="multi-auth-container">
      <div className="auth-card">
        <h2>{mode === 'signin' ? 'Sign In' : 'Create Account'}</h2>
        <p className="auth-subtitle">
          {userType === 'vendor' 
            ? 'Join as an AI vendor to connect with qualified prospects'
            : 'Find the perfect AI solution for your business'}
        </p>

        {/* OAuth Options */}
        <div className="oauth-buttons">
          <button
            type="button"
            className="oauth-button google"
            onClick={() => handleOAuthSignIn('google')}
            disabled={loading}
          >
            <svg className="oauth-icon" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <button
            type="button"
            className="oauth-button microsoft"
            onClick={() => handleOAuthSignIn('microsoft')}
            disabled={loading}
          >
            <svg className="oauth-icon" viewBox="0 0 24 24">
              <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zm12.6 0H12.6V0H24v11.4z" fill="#00BCF2"/>
            </svg>
            Continue with Microsoft
          </button>

          <button
            type="button"
            className="oauth-button linkedin"
            onClick={() => handleOAuthSignIn('linkedin')}
            disabled={loading}
          >
            <svg className="oauth-icon" viewBox="0 0 24 24">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" fill="#0A66C2"/>
            </svg>
            Continue with LinkedIn
          </button>
        </div>

        <div className="auth-divider">
          <span>or</span>
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleEmailAuth} className="auth-form">
          {mode === 'signup' && (
            <div className="name-fields">
              <input
                type="text"
                placeholder="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className="auth-input half"
              />
              <input
                type="text"
                placeholder="Last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                className="auth-input half"
              />
            </div>
          )}

          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="auth-input"
          />

          <div className="password-field">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="auth-input"
              minLength={8}
            />
            <button
              type="button"
              className="toggle-password"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? 'Processing...' : (mode === 'signin' ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        {mode === 'signin' && (
          <a href="#" className="forgot-password">Forgot password?</a>
        )}

        <div className="auth-switch">
          {mode === 'signin' ? (
            <>
              Don't have an account?{' '}
              <button onClick={() => setMode('signup')} className="auth-link">
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button onClick={() => setMode('signin')} className="auth-link">
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};