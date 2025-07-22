import React, { useState } from 'react';
import EnhancedProspectIntake from './components/prospect/EnhancedProspectIntake';
import FrontendProgress from './components/FrontendProgress';
import './App.css';

function App() {
  const [currentView, setCurrentView] = useState<'progress' | 'intake'>('intake');

  return (
    <div className="App">
      {currentView === 'progress' && <FrontendProgress />}
      {currentView === 'intake' && <EnhancedProspectIntake />}
      
      {/* Development Toggle */}
      <div style={{ 
        position: 'fixed', 
        top: '20px', 
        right: '20px', 
        zIndex: 9999,
        background: 'rgba(255,255,255,0.9)',
        padding: '10px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <button 
          onClick={() => setCurrentView(currentView === 'progress' ? 'intake' : 'progress')}
          style={{
            background: '#2563EB',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          {currentView === 'progress' ? '🤖 View Intake' : '📊 View Progress'}
        </button>
      </div>
    </div>
  );
}

export default App;
