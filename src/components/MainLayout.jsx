import React, { useState } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

const MainLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen(prev => !prev);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="app-container">
      {/* Overlay backdrop for mobile */}
      <div 
        className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`} 
        onClick={closeSidebar}
      />
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      <main className="main-content">
        <TopBar onToggleSidebar={toggleSidebar} />
        <div className="page-content">
          {children}
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
