import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/layout/Layout';
import LandingPageMemphis from './components/LandingPageMemphis';
import EnhancedProspectIntake from './components/prospect/EnhancedProspectIntake';
import VendorIntake from './components/vendor/VendorIntake';
import Survey from './components/survey/Survey';
import PaymentSuccess from './components/payments/PaymentSuccess';
import MemphisLayout from './components/layout/MemphisLayout';
import { LoginForm } from './components/auth/LoginForm';
import { AdminDashboard } from './components/dashboard/AdminDashboard';
import { VendorDashboard } from './components/dashboard/VendorDashboard';
import { ProspectsManagement } from './components/admin/ProspectsManagement';
import { ConversationViewer } from './components/admin/ConversationViewer';
import { MatchManagement } from './components/admin/MatchManagement';
import { VendorProfile } from './components/vendor/VendorProfile';
import { MeetingManagement } from './components/vendor/MeetingManagement';
import { MDFBudgetDashboard } from './components/vendor/MDFBudgetDashboard';
import { ConversationViewerWrapper, MatchManagementWrapper } from './components/RouteWrappers';
import './App.css';

// Simple unauthorized component
const UnauthorizedPage: React.FC = () => (
  <MemphisLayout>
    <div style={{ textAlign: 'center', padding: '3rem' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#dc2626' }}>Access Denied</h1>
      <p style={{ color: '#6b7280', marginBottom: '2rem' }}>You don't have permission to access this page.</p>
      <Link to="/" style={{ color: '#2563eb', textDecoration: 'underline' }}>Return to Home</Link>
    </div>
  </MemphisLayout>
);

// Dashboard redirect component
const DashboardRedirect: React.FC = () => {
  const { user } = useAuth();
  
  if (user?.role === 'admin') {
    return <Navigate to="/dashboard" replace />;
  } else if (user?.role === 'vendor') {
    return <Navigate to="/vendor-dashboard" replace />;
  }
  
  return <Navigate to="/login" replace />;
};

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
    <AuthProvider>
      <Router>
        <div className="App">
          <Navigation />
          
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPageMemphis />} />
            <Route path="/prospect" element={<MemphisLayout><EnhancedProspectIntake /></MemphisLayout>} />
            <Route path="/vendor" element={<MemphisLayout><VendorIntake /></MemphisLayout>} />
            <Route path="/survey/:meetingId/:respondentId/:respondentRole" element={<Survey />} />
            <Route path="/payment-success" element={<MemphisLayout><PaymentSuccess /></MemphisLayout>} />
            <Route path="/login" element={<MemphisLayout><LoginForm /></MemphisLayout>} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />
            <Route path="/app" element={<DashboardRedirect />} />
            
            {/* Protected Admin Routes */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <Layout><AdminDashboard /></Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/prospects" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <Layout><ProspectsManagement /></Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/conversation/:sessionId" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <Layout><ConversationViewerWrapper /></Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/matches" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <Layout><MatchManagement /></Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/matches/:prospectId" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <Layout><MatchManagementWrapper /></Layout>
                </ProtectedRoute>
              } 
            />
            
            {/* Protected Vendor Routes */}
            <Route 
              path="/vendor-dashboard" 
              element={
                <ProtectedRoute requiredRole="vendor">
                  <Layout><VendorDashboard /></Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute requiredRole="vendor">
                  <Layout><VendorProfile /></Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/meetings" 
              element={
                <ProtectedRoute>
                  <Layout><MeetingManagement /></Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/budget" 
              element={
                <ProtectedRoute requiredRole="vendor">
                  <Layout><MDFBudgetDashboard /></Layout>
                </ProtectedRoute>
              } 
            />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;