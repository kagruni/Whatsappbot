'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  HiOutlineHome, 
  HiOutlineChat, 
  HiOutlineUsers, 
  HiOutlineCog, 
  HiOutlineDocumentText,
  HiOutlineLogout,
  HiOutlineMenuAlt2,
  HiOutlineX,
  HiOutlineUser,
  HiOutlineMail
} from 'react-icons/hi';
import { useAuth } from '../context/AuthContext';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

export default function Sidebar() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const { user, signOut } = useAuth();

  useEffect(() => {
    // Check if we're on mobile
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
      // On larger screens, always keep sidebar open
      if (window.innerWidth >= 768) {
        setIsMenuOpen(true);
      }
    };

    // Initial check
    checkIfMobile();
    
    // Add resize listener
    window.addEventListener('resize', checkIfMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);
  
  const navItems: NavItem[] = [
    { label: 'Dashboard', href: '/', icon: <HiOutlineHome style={{ height: '1.25rem', width: '1.25rem' }} /> },
    { label: 'Conversations', href: '/conversations', icon: <HiOutlineChat style={{ height: '1.25rem', width: '1.25rem' }} /> },
    { label: 'Leads', href: '/leads', icon: <HiOutlineUsers style={{ height: '1.25rem', width: '1.25rem' }} /> },
    { label: 'Outreach', href: '/outreach', icon: <HiOutlineMail style={{ height: '1.25rem', width: '1.25rem' }} /> },
    { label: 'Analytics', href: '/analytics', icon: <HiOutlineDocumentText style={{ height: '1.25rem', width: '1.25rem' }} /> },
    { label: 'Settings', href: '/settings', icon: <HiOutlineCog style={{ height: '1.25rem', width: '1.25rem' }} /> },
    { label: 'Profile', href: '/profile', icon: <HiOutlineUser style={{ height: '1.25rem', width: '1.25rem' }} /> },
  ];

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <>
      {isMobile && (
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)} 
          style={{
            position: 'fixed',
            top: '1rem',
            left: isMenuOpen ? '17rem' : '1rem',
            zIndex: 30,
            backgroundColor: '#1f2937',
            color: 'white',
            borderRadius: '0.5rem',
            padding: '0.5rem',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 2px 5px rgba(0, 0, 0, 0.2)',
            transition: 'left 0.3s ease'
          }}
        >
          {isMenuOpen ? 
            <HiOutlineX style={{ height: '1.5rem', width: '1.5rem' }} /> : 
            <HiOutlineMenuAlt2 style={{ height: '1.5rem', width: '1.5rem' }} />
          }
        </button>
      )}

      <div style={{
        height: '100%', 
        width: '16rem', 
        background: 'linear-gradient(to bottom, #111827, #1f2937)',
        color: 'white', 
        padding: '1.5rem 1rem',
        position: 'fixed',
        left: isMenuOpen ? 0 : '-16rem',
        top: 0,
        bottom: 0,
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        borderRight: '1px solid rgba(255, 255, 255, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 20,
        transition: 'left 0.3s ease',
        overflowY: 'auto'
      }}>
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <div style={{
              width: '2.5rem',
              height: '2.5rem',
              borderRadius: '0.75rem',
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              fontSize: '1.25rem',
              boxShadow: '0 0 20px rgba(59, 130, 246, 0.3)'
            }}>
              WA
            </div>
            <div>
              <h1 style={{ 
                fontSize: '1.5rem', 
                fontWeight: 'bold',
                letterSpacing: '0.025em'
              }}>WhatsApp Bot</h1>
              <p style={{ 
                color: '#9ca3af', 
                fontSize: '0.75rem',
                letterSpacing: '0.05em',
                textTransform: 'uppercase' 
              }}>
                Management
              </p>
            </div>
          </div>
        </div>
        
        <div style={{ 
          marginTop: '1rem',
          marginBottom: '0.5rem',
          paddingLeft: '0.5rem',
          fontSize: '0.75rem',
          color: '#9ca3af',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}>
          Main Menu
        </div>
        
        <nav style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '0.5rem',
          flex: '1 1 0%'
        }}>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0.75rem 1rem',
                  borderRadius: '0.5rem',
                  transition: 'all 150ms ease',
                  backgroundColor: isActive ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                  color: isActive ? 'white' : '#d1d5db',
                  fontWeight: isActive ? 500 : 'normal',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {isActive && (
                  <div style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: '4px',
                    background: 'linear-gradient(to bottom, #3b82f6, #8b5cf6)',
                    borderRadius: '0 4px 4px 0'
                  }} />
                )}
                <span style={{ 
                  marginRight: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  opacity: isActive ? 1 : 0.7
                }}>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        
        <div style={{ 
          marginTop: 'auto',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          paddingTop: '1rem'
        }}>
          {user && (
            <div style={{
              marginBottom: '1rem',
              padding: '0.75rem',
              backgroundColor: 'rgba(30, 41, 59, 0.5)',
              borderRadius: '0.5rem'
            }}>
              <div style={{
                fontSize: '0.875rem',
                fontWeight: 500,
                marginBottom: '0.25rem',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {user.email}
              </div>
              <div style={{
                fontSize: '0.75rem',
                color: '#9ca3af'
              }}>
                Logged in
              </div>
            </div>
          )}
          
          <button
            onClick={handleSignOut}
            style={{
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              padding: '0.75rem 1rem',
              borderRadius: '0.5rem',
              backgroundColor: 'rgba(220, 38, 38, 0.1)',
              color: '#f87171',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 150ms ease'
            }}
          >
            <HiOutlineLogout style={{ 
              height: '1.25rem', 
              width: '1.25rem', 
              marginRight: '0.75rem' 
            }} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </>
  );
} 