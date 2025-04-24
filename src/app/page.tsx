'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { HiOutlineStatusOnline, HiOutlineUserGroup, HiOutlineChatAlt2 } from 'react-icons/hi';

// Mock data - in a real application, this would come from your API
const conversationData = [
  { day: 'Mon', conversations: 13 },
  { day: 'Tue', conversations: 18 },
  { day: 'Wed', conversations: 24 },
  { day: 'Thu', conversations: 19 },
  { day: 'Fri', conversations: 22 },
  { day: 'Sat', conversations: 15 },
  { day: 'Sun', conversations: 12 },
];

const responseTypeData = [
  { name: 'AI Generated', value: 68 },
  { name: 'Template Responses', value: 22 },
  { name: 'Human Escalated', value: 10 },
];

interface StatCardProps {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

export default function Home() {
  const [isMobile, setIsMobile] = useState(true);
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
      setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1024);
    };

    // Initial check
    checkScreenSize();

    // Add event listener
    window.addEventListener('resize', checkScreenSize);

    // Cleanup
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  return (
    <DashboardLayout>
      <div className="dashboard-header" style={{ 
        marginBottom: '2rem',
        borderBottom: '1px solid #e5e7eb',
        paddingBottom: '1.5rem'
      }}>
        <h1 style={{ 
          fontSize: '2rem', 
          fontWeight: 'bold', 
          marginBottom: '0.5rem',
          background: 'linear-gradient(to right, #3b82f6, #8b5cf6)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Dashboard
        </h1>
        <p style={{ 
          color: '#6b7280',
          fontSize: '1.1rem'
        }}>
          Overview of your WhatsApp AI chatbot performance
        </p>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', 
        gap: '1.5rem', 
        marginBottom: '2rem'
      }}>
        <StatCard 
          title="Active Sessions" 
          value="24" 
          description="Current active conversations" 
          icon={<HiOutlineStatusOnline style={{ width: '2rem', height: '2rem', color: 'white' }} />} 
          color="#22c55e"
        />
        <StatCard 
          title="Total Leads" 
          value="1,843" 
          description="Total leads in the system" 
          icon={<HiOutlineUserGroup style={{ width: '2rem', height: '2rem', color: 'white' }} />} 
          color="#3b82f6"
        />
        <StatCard 
          title="Daily Conversations" 
          value="142" 
          description="Messages exchanged today" 
          icon={<HiOutlineChatAlt2 style={{ width: '2rem', height: '2rem', color: 'white' }} />} 
          color="#8b5cf6"
        />
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: isTablet || isMobile ? '1fr' : 'repeat(2, 1fr)',
        gap: '1.5rem'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '1rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          padding: '1.5rem',
          marginBottom: '1rem',
          transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
          border: '1px solid #f3f4f6',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ 
                fontSize: '1.5rem', 
                fontWeight: 'bold',
                color: '#1f2937'
              }}>Conversations This Week</h3>
              <p style={{ color: '#6b7280' }}>Daily conversation volume</p>
            </div>
            <div style={{
              backgroundColor: '#f0f9ff',
              borderRadius: '0.5rem',
              padding: '0.5rem',
              color: '#3b82f6',
              fontWeight: '500',
              fontSize: '0.875rem'
            }}>
              +12% ↑
            </div>
          </div>
          <div style={{ 
            marginTop: '1rem', 
            height: '18rem', 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            backgroundColor: '#f9fafb', 
            borderRadius: '0.75rem',
            border: '1px dashed #e5e7eb'
          }}>
            Chart placeholder - would display bar chart in real implementation
          </div>
        </div>

        <div style={{
          backgroundColor: 'white',
          borderRadius: '1rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          padding: '1.5rem',
          marginBottom: '1rem',
          transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
          border: '1px solid #f3f4f6',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ 
                fontSize: '1.5rem', 
                fontWeight: 'bold',
                color: '#1f2937'
              }}>Response Types</h3>
              <p style={{ color: '#6b7280' }}>Distribution of response generation methods</p>
            </div>
            <div style={{
              backgroundColor: '#f0f9ff',
              borderRadius: '0.5rem',
              padding: '0.5rem',
              color: '#3b82f6',
              fontWeight: '500',
              fontSize: '0.875rem'
            }}>
              This Month
            </div>
          </div>
          <div style={{ 
            marginTop: '1rem', 
            height: '18rem', 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            backgroundColor: '#f9fafb', 
            borderRadius: '0.75rem',
            border: '1px dashed #e5e7eb'
          }}>
            Chart placeholder - would display donut chart in real implementation  
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function StatCard({ title, value, description, icon, color }: StatCardProps) {
  return (
    <div style={{ 
      backgroundColor: 'white',
      borderRadius: '1rem', 
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      padding: '1.5rem',
      marginBottom: '1rem',
      border: '1px solid #f3f4f6',
      height: '100%',
      transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{ 
        position: 'absolute', 
        top: 0, 
        right: 0, 
        width: '120px', 
        height: '120px', 
        background: `linear-gradient(45deg, transparent 50%, ${color}15 50%)`,
        borderRadius: '0 0 0 100%',
        zIndex: 0
      }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
        <div>
          <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#6b7280', marginBottom: '0.5rem' }}>{title}</p>
          <p style={{ 
            fontSize: '2rem', 
            fontWeight: 'bold', 
            color: '#1f2937',
            marginBottom: '0.5rem'
          }}>{value}</p>
          <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>{description}</p>
        </div>
        <div style={{ 
          padding: '1rem', 
          borderRadius: '0.75rem', 
          background: `linear-gradient(135deg, ${color}, ${color}dd)`,
          boxShadow: `0 4px 14px ${color}33`
        }}>
          {icon}
        </div>
      </div>
    </div>
  );
} 