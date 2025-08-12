import React from 'react';
import '../../styles/memphis.css';

interface MemphisLayoutProps {
  children: React.ReactNode;
}

const MemphisLayout: React.FC<MemphisLayoutProps> = ({ children }) => {
  return (
    <div style={{ 
      paddingTop: '60px',
      minHeight: '100vh',
      width: '100%',
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
      <div className="memphis-float-element" style={{ top: '150px', right: '10%' }}>
        <div className="memphis-chart">
          <div className="memphis-bar" style={{ height: '40%' }}></div>
          <div className="memphis-bar" style={{ height: '70%' }}></div>
          <div className="memphis-bar" style={{ height: '55%' }}></div>
          <div className="memphis-bar" style={{ height: '85%' }}></div>
        </div>
      </div>

      <div className="memphis-float-element" style={{ top: '300px', left: '5%' }}>
        <div className="memphis-pie"></div>
      </div>

      <div className="memphis-float-element" style={{ bottom: '200px', right: '15%' }}>
        <div className="memphis-building"></div>
      </div>

      <div className="memphis-float-element" style={{ top: '400px', right: '25%' }}>
        <div className="memphis-building" style={{ height: '60px', background: '#9B59B6' }}></div>
      </div>

      {/* Decorative elements */}
      <div className="memphis-squiggle" style={{ top: '250px', left: '20%' }}></div>
      <div className="memphis-dots" style={{ bottom: '150px', left: '10%' }}></div>
      <div className="memphis-dots" style={{ top: '180px', right: '30%', transform: 'rotate(45deg)' }}></div>

      {/* Main content */}
      <div style={{ position: 'relative', zIndex: 10 }}>
        {children}
      </div>
    </div>
  );
};

export default MemphisLayout;