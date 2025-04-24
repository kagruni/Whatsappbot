import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  HiOutlineHome, 
  HiOutlineChat, 
  HiOutlineUsers, 
  HiOutlineCog, 
  HiOutlineDocumentText 
} from 'react-icons/hi';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

export default function Sidebar() {
  const pathname = usePathname();
  
  const navItems: NavItem[] = [
    { label: 'Dashboard', href: '/', icon: <HiOutlineHome style={{ height: '1.25rem', width: '1.25rem' }} /> },
    { label: 'Conversations', href: '/conversations', icon: <HiOutlineChat style={{ height: '1.25rem', width: '1.25rem' }} /> },
    { label: 'Leads', href: '/leads', icon: <HiOutlineUsers style={{ height: '1.25rem', width: '1.25rem' }} /> },
    { label: 'Analytics', href: '/analytics', icon: <HiOutlineDocumentText style={{ height: '1.25rem', width: '1.25rem' }} /> },
    { label: 'Settings', href: '/settings', icon: <HiOutlineCog style={{ height: '1.25rem', width: '1.25rem' }} /> },
  ];

  return (
    <div style={{
      height: '100%', 
      width: '16rem', 
      backgroundColor: '#111827', 
      color: 'white', 
      padding: '1rem',
      position: 'fixed',
      left: 0,
      top: 0,
      bottom: 0,
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
    }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>WhatsApp Bot</h1>
        <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Management Dashboard</p>
      </div>
      
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0.5rem 0.75rem',
                borderRadius: '0.375rem',
                transition: 'background-color 150ms, color 150ms',
                backgroundColor: isActive ? '#2563eb' : 'transparent',
                color: isActive ? 'white' : '#d1d5db',
                fontWeight: isActive ? 500 : 'normal',
              }}
            >
              <span style={{ marginRight: '0.75rem' }}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      
      <div style={{ 
        position: 'absolute', 
        bottom: '1rem', 
        left: '1rem', 
        right: '1rem' 
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          padding: '0.5rem 0.75rem', 
          borderRadius: '0.375rem', 
          backgroundColor: '#1f2937' 
        }}>
          <div style={{ 
            height: '2rem', 
            width: '2rem', 
            borderRadius: '9999px', 
            backgroundColor: '#3b82f6', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            marginRight: '0.75rem'
          }}>
            <span style={{ fontWeight: 500 }}>AI</span>
          </div>
          <div>
            <p style={{ fontSize: '0.875rem', fontWeight: 500 }}>WhatsApp AI Bot</p>
            <p style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Online</p>
          </div>
        </div>
      </div>
    </div>
  );
} 