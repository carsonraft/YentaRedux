import React from 'react';

interface SimpleLayoutProps {
  children: React.ReactNode;
}

const SimpleLayout: React.FC<SimpleLayoutProps> = ({ children }) => {
  return (
    <div style={{ 
      paddingTop: '60px', // Reduced space for fixed navigation
      minHeight: '100vh',
      width: '100%',
      background: '#FFF5F0', // Soft peachy background
      position: 'relative',
      overflow: 'hidden'
    }}>
      {children}
    </div>
  );
};

export default SimpleLayout;