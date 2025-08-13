import React from 'react';
import '../styles/dashboard.css';

interface ComponentStatus {
  name: string;
  status: 'completed' | 'in-progress' | 'pending';
  description: string;
}

export const FrontendProgress: React.FC = () => {
  const components: ComponentStatus[] = [
    // Authentication & Routing
    { name: 'AuthContext', status: 'completed', description: 'JWT authentication with role-based access' },
    { name: 'ProtectedRoute', status: 'completed', description: 'Route protection with role validation' },
    { name: 'LoginForm', status: 'completed', description: 'Login/register forms with demo accounts' },
    { name: 'Layout', status: 'completed', description: 'Navigation sidebar with role-specific menus' },
    
    // Dashboard Components
    { name: 'AdminDashboard', status: 'completed', description: 'Admin overview with stats and metrics' },
    { name: 'VendorDashboard', status: 'completed', description: 'Vendor meetings and MDF tracking' },
    { name: 'ProspectIntake', status: 'completed', description: 'AI-powered conversation interface' },
    
    // Admin Interface (Completed/Pending)
    { name: 'ProspectsManagement', status: 'completed', description: 'List, filter, and review prospects' },
    { name: 'ConversationViewer', status: 'completed', description: 'View prospect AI conversations' },
    { name: 'MatchingInterface', status: 'completed', description: 'Approve/reject AI matches' },
    { name: 'AuthenticatedRouting', status: 'completed', description: 'Protected routes with role-based access' },
    { name: 'MeetingsAdmin', status: 'pending', description: 'Meetings administration panel' },
    { name: 'VendorManagement', status: 'pending', description: 'Vendor profiles and performance' },
    { name: 'MDFAllocations', status: 'pending', description: 'MDF budget management' },
    { name: 'PlatformAnalytics', status: 'pending', description: 'Analytics and reporting dashboard' },
    
    // Vendor Interface (Completed/Pending)
    { name: 'VendorProfile', status: 'completed', description: 'Profile setup and editing' },
    { name: 'MeetingManagement', status: 'completed', description: 'Meeting list and feedback' },
    { name: 'MDFBudgetDashboard', status: 'completed', description: 'Budget utilization tracking' },
    { name: 'PaymentHistory', status: 'pending', description: 'Payment history and analytics' },
    { name: 'CalendarIntegration', status: 'pending', description: 'Google Calendar setup UI' },
    
    // Shared Components (Pending)
    { name: 'DataTables', status: 'pending', description: 'Sorting and filtering tables' },
    { name: 'Charts', status: 'pending', description: 'Data visualization components' },
    { name: 'Modals', status: 'pending', description: 'Modal dialogs and forms' },
    { name: 'FormValidation', status: 'pending', description: 'Form validation components' },
    { name: 'FileUpload', status: 'pending', description: 'File upload interface' },
    
    // UI/UX Polish (Pending)
    { name: 'ResponsiveDesign', status: 'pending', description: 'Mobile-responsive layouts' },
    { name: 'ThemeToggle', status: 'pending', description: 'Dark/light theme switcher' },
    { name: 'SearchFunctionality', status: 'pending', description: 'Global search interface' },
    { name: 'ToastNotifications', status: 'pending', description: 'Error and success messages' },
    { name: 'LoadingStates', status: 'pending', description: 'Loading spinners and states' }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#16a34a'; // green
      case 'in-progress': return '#d97706'; // yellow
      case 'pending': return '#6b7280'; // gray
      default: return '#6b7280';
    }
  };

  const getStatusCount = (status: string) => {
    return components.filter(c => c.status === status).length;
  };

  const completionPercentage = Math.round((getStatusCount('completed') / components.length) * 100);

  return (
    <div style={{ padding: '2rem', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#111827', marginBottom: '1rem' }}>
            🚀 Yenta Frontend Development Progress
          </h1>
          <p style={{ fontSize: '1.1rem', color: '#6b7280', marginBottom: '2rem' }}>
            Complete React frontend for the AI-powered B2B matchmaking platform
          </p>
          
          {/* Progress Bar */}
          <div style={{ backgroundColor: '#e5e7eb', height: '12px', borderRadius: '6px', overflow: 'hidden', marginBottom: '1rem' }}>
            <div 
              style={{ 
                backgroundColor: '#2563eb', 
                height: '100%', 
                width: `${completionPercentage}%`,
                transition: 'width 0.3s ease'
              }}
            ></div>
          </div>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827' }}>
            {completionPercentage}% Complete ({getStatusCount('completed')}/{components.length} components)
          </p>
        </div>

        {/* Stats Grid */}
        <div className="dashboard-grid" style={{ marginBottom: '3rem' }}>
          <div className="stat-card">
            <div className="stat-icon green">✅</div>
            <div className="stat-value">{getStatusCount('completed')}</div>
            <div className="stat-label">Completed</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon yellow">🚧</div>
            <div className="stat-value">{getStatusCount('in-progress')}</div>
            <div className="stat-label">In Progress</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon gray">⏳</div>
            <div className="stat-value">{getStatusCount('pending')}</div>
            <div className="stat-label">Pending</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon blue">🎯</div>
            <div className="stat-value">{components.length}</div>
            <div className="stat-label">Total Components</div>
          </div>
        </div>

        {/* Backend Status */}
        <div className="content-card" style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', color: '#111827' }}>
            ✅ Backend Status: Fully Complete
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div style={{ padding: '1rem', backgroundColor: '#dcfce7', borderRadius: '6px' }}>
              <strong>APIs:</strong> All 8 route modules implemented
            </div>
            <div style={{ padding: '1rem', backgroundColor: '#dcfce7', borderRadius: '6px' }}>
              <strong>Database:</strong> PostgreSQL with full schema
            </div>
            <div style={{ padding: '1rem', backgroundColor: '#dcfce7', borderRadius: '6px' }}>
              <strong>AI Integration:</strong> GPT-4 conversation system
            </div>
            <div style={{ padding: '1rem', backgroundColor: '#dcfce7', borderRadius: '6px' }}>
              <strong>Calendar:</strong> Google Calendar integration
            </div>
            <div style={{ padding: '1rem', backgroundColor: '#dcfce7', borderRadius: '6px' }}>
              <strong>Payments:</strong> Stripe integration complete
            </div>
            <div style={{ padding: '1rem', backgroundColor: '#dcfce7', borderRadius: '6px' }}>
              <strong>Testing:</strong> Comprehensive test suite
            </div>
          </div>
        </div>

        {/* Component Categories */}
        {['Authentication & Routing', 'Dashboard Components', 'Admin Interface', 'Vendor Interface', 'Shared Components', 'UI/UX Polish'].map((category, categoryIndex) => {
          const categoryComponents = components.filter((_, index) => {
            if (category === 'Authentication & Routing') return index < 4;
            if (category === 'Dashboard Components') return index >= 4 && index < 7;
            if (category === 'Admin Interface') return index >= 7 && index < 14;
            if (category === 'Vendor Interface') return index >= 14 && index < 19;
            if (category === 'Shared Components') return index >= 19 && index < 24;
            if (category === 'UI/UX Polish') return index >= 24;
            return false;
          });

          return (
            <div key={category} className="content-card">
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', color: '#111827' }}>
                {category}
              </h3>
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {categoryComponents.map((component, index) => (
                  <div 
                    key={component.name}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0.75rem',
                      backgroundColor: '#f9fafb',
                      borderRadius: '6px',
                      borderLeft: `4px solid ${getStatusColor(component.status)}`
                    }}
                  >
                    <div style={{ 
                      width: '12px', 
                      height: '12px', 
                      borderRadius: '50%', 
                      backgroundColor: getStatusColor(component.status),
                      marginRight: '1rem'
                    }}></div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '500', color: '#111827' }}>{component.name}</div>
                      <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>{component.description}</div>
                    </div>
                    <div style={{ 
                      fontSize: '0.75rem', 
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      backgroundColor: component.status === 'completed' ? '#dcfce7' : 
                                       component.status === 'in-progress' ? '#fef3c7' : '#f3f4f6',
                      color: component.status === 'completed' ? '#166534' : 
                             component.status === 'in-progress' ? '#92400e' : '#374151',
                      textTransform: 'uppercase',
                      fontWeight: '500'
                    }}>
                      {component.status.replace('-', ' ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Next Steps */}
        <div className="content-card">
          <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', color: '#111827' }}>
            🎯 Next Development Priorities
          </h3>
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div style={{ padding: '1rem', backgroundColor: '#fef3c7', borderRadius: '6px', borderLeft: '4px solid #d97706' }}>
              <strong>High Priority:</strong> Admin prospect management and conversation viewer
            </div>
            <div style={{ padding: '1rem', backgroundColor: '#fef3c7', borderRadius: '6px', borderLeft: '4px solid #d97706' }}>
              <strong>High Priority:</strong> Vendor profile management and meeting interface
            </div>
            <div style={{ padding: '1rem', backgroundColor: '#e0f2fe', borderRadius: '6px', borderLeft: '4px solid #0284c7' }}>
              <strong>Medium Priority:</strong> Data visualization components with charts
            </div>
            <div style={{ padding: '1rem', backgroundColor: '#f3e8ff', borderRadius: '6px', borderLeft: '4px solid #9333ea' }}>
              <strong>Nice to Have:</strong> Mobile responsiveness and theme customization
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FrontendProgress;