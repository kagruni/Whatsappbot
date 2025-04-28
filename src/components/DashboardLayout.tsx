import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import { usePathname } from 'next/navigation';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname();
  
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Initial check
    checkScreenSize();

    // Add event listener
    window.addEventListener('resize', checkScreenSize);

    // Cleanup
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  return (
    <div style={{ 
      display: 'flex', 
      minHeight: '100vh',
      backgroundColor: '#f8fafc'
    }}>
      <Sidebar />
      <main style={{ 
        flex: '1 1 0%', 
        overflowY: 'auto', 
        padding: pathname === '/leads' ? '1rem' : '2rem',
        marginLeft: isMobile ? '0' : '16rem',
        backgroundImage: 'radial-gradient(circle at top right, rgba(59, 130, 246, 0.03), transparent 400px), radial-gradient(circle at bottom left, rgba(139, 92, 246, 0.03), transparent 400px)',
        position: 'relative',
        width: '100%',
        transition: 'margin-left 0.3s ease'
      }}>
        <div style={{ 
          maxWidth: pathname === '/conversations' || pathname === '/leads' ? 'none' : '1400px',
          margin: '0 auto',
          paddingTop: isMobile ? '3.5rem' : '0'
        }}>
          {children}
        </div>
      </main>
    </div>
  );
} 