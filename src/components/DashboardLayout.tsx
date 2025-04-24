import React from 'react';
import Sidebar from './Sidebar';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div style={{ 
      display: 'flex', 
      height: '100vh', 
      backgroundColor: '#f9fafb'
    }}>
      <Sidebar />
      <main style={{ 
        flex: '1 1 0%', 
        overflowY: 'auto', 
        padding: '1.5rem', 
        marginLeft: '16rem'
      }}>
        {children}
      </main>
    </div>
  );
} 