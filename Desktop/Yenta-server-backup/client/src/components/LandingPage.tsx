import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/design-system.css';
import './LandingPage.css';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="landing-page-container">
      <div className="landing-card">
        <div className="landing-top-bar">
          <div className="login-section">
            <span className="login-text">Already have an account?</span>
            <button 
              className="login-button"
              onClick={() => navigate('/login')}
            >
              Log In
            </button>
          </div>
        </div>

        <div className="landing-header">
          <div className="yenta-logo-large">
            <span className="logo-text">Yenta</span>
            <span className="logo-tagline">AI Vendor Matchmaking</span>
          </div>
          
          <h1>Find Your Perfect AI Solution</h1>
          <p className="landing-subtitle">
            Whether you're looking for AI vendors or you are an AI vendor looking for clients, 
            we'll make the perfect match.
          </p>
        </div>

        <div className="landing-options">
          <div className="option-card">
            <div className="option-icon">🔍</div>
            <h2>I Need an AI Solution</h2>
            <p>Looking for the right AI vendor to solve your business challenges</p>
            <button 
              className="landing-button primary"
              onClick={() => navigate('/prospect')}
            >
              Find AI Vendors
            </button>
          </div>

          <div className="option-card">
            <div className="option-icon">🚀</div>
            <h2>I Am an AI Vendor</h2>
            <p>Connect with qualified businesses actively seeking AI solutions</p>
            <button 
              className="landing-button secondary"
              onClick={() => navigate('/vendor')}
            >
              Join as Vendor
            </button>
          </div>
        </div>

        <div className="landing-stats">
          <div className="stat-item">
            <span className="stat-number">500+</span>
            <span className="stat-label">AI Vendors</span>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-item">
            <span className="stat-number">1000+</span>
            <span className="stat-label">Matches Made</span>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-item">
            <span className="stat-number">95%</span>
            <span className="stat-label">Success Rate</span>
          </div>
        </div>

        <div className="landing-footer">
          <p>Trusted by leading companies to find their perfect AI partners</p>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;