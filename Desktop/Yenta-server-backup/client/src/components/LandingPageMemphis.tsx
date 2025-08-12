import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/memphis.css';

const LandingPageMemphis: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{ 
      minHeight: '100vh',
      background: '#FFF5F0',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Organic background shapes */}
      <div className="memphis-background">
        <div className="memphis-shape memphis-shape-1"></div>
        <div className="memphis-shape memphis-shape-2"></div>
        <div className="memphis-shape memphis-shape-3"></div>
      </div>

      {/* Floating geometric elements */}
      <div className="memphis-float-element" style={{ top: '10%', right: '5%' }}>
        <div className="memphis-chart">
          <div className="memphis-bar" style={{ height: '60%', background: '#FF6B4A' }}></div>
          <div className="memphis-bar" style={{ height: '90%', background: '#FF9F45' }}></div>
          <div className="memphis-bar" style={{ height: '40%', background: '#FFD4A3' }}></div>
          <div className="memphis-bar" style={{ height: '75%', background: '#FF6B4A' }}></div>
        </div>
      </div>

      <div className="memphis-float-element" style={{ bottom: '15%', left: '8%' }}>
        <div className="memphis-pie"></div>
      </div>

      <div className="memphis-float-element" style={{ top: '45%', right: '10%' }}>
        <div className="memphis-building" style={{ background: '#7FCDCD' }}></div>
      </div>

      <div className="memphis-float-element" style={{ bottom: '25%', right: '20%' }}>
        <div className="memphis-building" style={{ height: '100px', background: '#9B59B6' }}></div>
      </div>

      {/* Decorative elements */}
      <div className="memphis-squiggle" style={{ top: '20%', left: '15%', transform: 'rotate(-15deg)' }}></div>
      <div className="memphis-dots" style={{ top: '60%', right: '25%' }}></div>
      <div className="memphis-dots" style={{ bottom: '10%', left: '20%', transform: 'rotate(45deg)' }}></div>

      {/* Main content */}
      <div style={{ 
        position: 'relative', 
        zIndex: 10,
        padding: '40px 20px',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {/* Top bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginBottom: '60px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ color: '#1A2B5C', fontSize: '16px' }}>Already have an account?</span>
            <button 
              className="memphis-button"
              onClick={() => navigate('/login')}
              style={{ padding: '12px 32px' }}
            >
              Log In
            </button>
          </div>
        </div>

        {/* Hero section */}
        <div style={{ textAlign: 'center', marginBottom: '80px' }}>
          <div style={{ marginBottom: '40px' }}>
            <h1 style={{ 
              fontSize: '80px', 
              fontWeight: '900', 
              color: '#1A2B5C',
              margin: '0',
              letterSpacing: '-3px',
              lineHeight: '0.9'
            }}>
              YENTA
            </h1>
            <p style={{
              fontSize: '24px',
              color: '#FF6B4A',
              fontWeight: '600',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              marginTop: '8px'
            }}>
              AI Vendor Matchmaking
            </p>
          </div>
          
          <h2 style={{
            fontSize: '48px',
            fontWeight: '700',
            color: '#1A2B5C',
            margin: '0 0 24px 0',
            lineHeight: '1.2'
          }}>
            Find Your Perfect<br/>AI Solution
          </h2>
          <p style={{
            fontSize: '20px',
            color: '#475569',
            maxWidth: '600px',
            margin: '0 auto',
            lineHeight: '1.6'
          }}>
            Whether you're looking for AI vendors or you are an AI vendor looking for clients, 
            we'll make the perfect match.
          </p>
        </div>

        {/* Options cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '32px',
          marginBottom: '80px'
        }}>
          <div className="memphis-card" style={{ 
            textAlign: 'center',
            transition: 'transform 0.3s ease',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-8px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{ 
              width: '80px',
              height: '80px',
              marginBottom: '24px',
              background: 'var(--memphis-coral)',
              borderRadius: '50%',
              margin: '0 auto 24px',
              position: 'relative'
            }}>
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '40px',
                height: '40px',
                border: '4px solid white',
                borderRadius: '50%'
              }}></div>
              <div style={{
                position: 'absolute',
                bottom: '10px',
                right: '10px',
                width: '20px',
                height: '4px',
                background: 'white',
                transform: 'rotate(45deg)',
                transformOrigin: 'left center'
              }}></div>
            </div>
            <h3 style={{
              fontSize: '28px',
              fontWeight: '700',
              color: '#1A2B5C',
              marginBottom: '16px'
            }}>
              I Need an AI Solution
            </h3>
            <p style={{
              fontSize: '16px',
              color: '#475569',
              marginBottom: '32px',
              lineHeight: '1.5'
            }}>
              Looking for the right AI vendor to solve your business challenges
            </p>
            <button 
              className="memphis-button"
              onClick={() => navigate('/prospect')}
              style={{
                width: '100%',
                fontSize: '18px'
              }}
            >
              Find AI Vendors
            </button>
          </div>

          <div className="memphis-card" style={{ 
            textAlign: 'center',
            transition: 'transform 0.3s ease',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-8px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{ 
              width: '80px',
              height: '80px',
              marginBottom: '24px',
              background: 'var(--memphis-mint)',
              margin: '0 auto 24px',
              position: 'relative',
              clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)'
            }}>
              <div style={{
                position: 'absolute',
                bottom: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '20px',
                height: '30px',
                background: 'white',
                borderRadius: '10px 10px 0 0'
              }}></div>
            </div>
            <h3 style={{
              fontSize: '28px',
              fontWeight: '700',
              color: '#1A2B5C',
              marginBottom: '16px'
            }}>
              I Am an AI Vendor
            </h3>
            <p style={{
              fontSize: '16px',
              color: '#475569',
              marginBottom: '32px',
              lineHeight: '1.5'
            }}>
              Connect with qualified businesses actively seeking AI solutions
            </p>
            <button 
              onClick={() => navigate('/vendor')}
              style={{
                width: '100%',
                fontSize: '18px',
                background: '#7FCDCD',
                color: 'white',
                border: '2px solid #7FCDCD',
                padding: '14px 32px',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'white';
                e.currentTarget.style.color = '#7FCDCD';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#7FCDCD';
                e.currentTarget.style.color = 'white';
              }}
            >
              Join as Vendor
            </button>
          </div>
        </div>

        {/* Stats section */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '48px',
          border: '2px solid var(--memphis-peach)',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          marginBottom: '60px'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '48px',
              fontWeight: '800',
              color: '#FF6B4A',
              marginBottom: '8px'
            }}>
              500+
            </div>
            <div style={{
              fontSize: '14px',
              color: '#1A2B5C',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              fontWeight: '600'
            }}>
              AI Vendors
            </div>
          </div>

          <div style={{
            width: '2px',
            height: '60px',
            background: '#FFD4A3'
          }}></div>

          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '48px',
              fontWeight: '800',
              color: '#FF9F45',
              marginBottom: '8px'
            }}>
              1000+
            </div>
            <div style={{
              fontSize: '14px',
              color: '#1A2B5C',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              fontWeight: '600'
            }}>
              Matches Made
            </div>
          </div>

          <div style={{
            width: '2px',
            height: '60px',
            background: '#FFD4A3'
          }}></div>

          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '48px',
              fontWeight: '800',
              color: '#9B59B6',
              marginBottom: '8px'
            }}>
              95%
            </div>
            <div style={{
              fontSize: '14px',
              color: '#1A2B5C',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              fontWeight: '600'
            }}>
              Success Rate
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center' }}>
          <p style={{
            color: '#475569',
            fontSize: '16px',
            margin: '0'
          }}>
            Trusted by leading companies to find their perfect AI partners
          </p>
        </div>
      </div>
    </div>
  );
};

export default LandingPageMemphis;