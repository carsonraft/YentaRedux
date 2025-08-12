import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import LandingPageMemphis from './components/LandingPageMemphis';
import EnhancedProspectIntake from './components/prospect/EnhancedProspectIntake';
import VendorIntake from './components/vendor/VendorIntake';
import Survey from './components/survey/Survey';
import PaymentSuccess from './components/payments/PaymentSuccess';
import MemphisLayout from './components/layout/MemphisLayout';
import './App.css';

const Navigation: React.FC = () => {
  const location = useLocation();
  
  // Don't show navigation on survey pages or landing page
  if (location.pathname === '/' || location.pathname.startsWith('/survey/')) {
    return null;
  }

  return (
    <div style={{ 
      position: 'fixed', 
      top: '0', 
      left: '0',
      right: '0',
      zIndex: 1000,
      background: '#FFFFFF',
      padding: '16px 40px',
      boxShadow: '0 2px 20px rgba(26, 43, 92, 0.08)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }}>
      <div style={{ 
        fontSize: '24px', 
        fontWeight: '800', 
        color: '#1A2B5C',
        letterSpacing: '-0.5px'
      }}>
        YENTA
      </div>
      <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
        <Link 
          to="/"
          style={{
            color: '#1A2B5C',
            textDecoration: 'none',
            fontSize: '16px',
            fontWeight: '500',
            position: 'relative',
            padding: '8px 0',
            transition: 'color 0.3s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#FF6B4A'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#1A2B5C'}
        >
          Home
        </Link>
        <Link 
          to="/prospect"
          style={{
            color: location.pathname === '/prospect' ? '#FF6B4A' : '#1A2B5C',
            textDecoration: 'none',
            fontSize: '16px',
            fontWeight: '500',
            position: 'relative',
            padding: '8px 0',
            transition: 'color 0.3s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#FF6B4A'}
          onMouseLeave={(e) => e.currentTarget.style.color = location.pathname === '/prospect' ? '#FF6B4A' : '#1A2B5C'}
        >
          Prospect
        </Link>
        <Link 
          to="/vendor"
          style={{
            color: location.pathname === '/vendor' ? '#FF6B4A' : '#1A2B5C',
            textDecoration: 'none',
            fontSize: '16px',
            fontWeight: '500',
            position: 'relative',
            padding: '8px 0',
            transition: 'color 0.3s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#FF6B4A'}
          onMouseLeave={(e) => e.currentTarget.style.color = location.pathname === '/vendor' ? '#FF6B4A' : '#1A2B5C'}
        >
          Vendor
        </Link>
      </div>
    </div>
  );
};

function App() {
  return (
    <Router>
      <div className="App">
        <Navigation />
        
        <Routes>
          <Route path="/" element={<LandingPageMemphis />} />
          <Route path="/prospect" element={<MemphisLayout><EnhancedProspectIntake /></MemphisLayout>} />
          <Route path="/vendor" element={<MemphisLayout><VendorIntake /></MemphisLayout>} />
          <Route path="/survey/:meetingId/:respondentId/:respondentRole" element={<Survey />} />
          <Route path="/payment-success" element={<MemphisLayout><PaymentSuccess /></MemphisLayout>} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;