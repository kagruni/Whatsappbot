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
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Dashboard</h1>
        <p style={{ color: '#4b5563' }}>
          Overview of your WhatsApp AI chatbot performance
        </p>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', 
        gap: '1.5rem', 
        marginBottom: '2rem'
      }}>
        <StatCard 
          title="Active Sessions" 
          value="24" 
          description="Current active conversations" 
          icon={<HiOutlineStatusOnline style={{ width: '2rem', height: '2rem', color: '#22c55e' }} />} 
        />
        <StatCard 
          title="Total Leads" 
          value="1,843" 
          description="Total leads in the system" 
          icon={<HiOutlineUserGroup style={{ width: '2rem', height: '2rem', color: '#3b82f6' }} />} 
        />
        <StatCard 
          title="Daily Conversations" 
          value="142" 
          description="Messages exchanged today" 
          icon={<HiOutlineChatAlt2 style={{ width: '2rem', height: '2rem', color: '#8b5cf6' }} />} 
        />
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: isTablet || isMobile ? '1fr' : 'repeat(2, 1fr)',
        gap: '1.5rem'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
          padding: '1rem',
          marginBottom: '1rem'
        }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Conversations This Week</h3>
          <p>Daily conversation volume</p>
          <div style={{ 
            marginTop: '1rem', 
            height: '18rem', 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            backgroundColor: '#f3f4f6', 
            borderRadius: '0.5rem' 
          }}>
            Chart placeholder - would display bar chart in real implementation
          </div>
        </div>

        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
          padding: '1rem',
          marginBottom: '1rem'
        }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Response Types</h3>
          <p>Distribution of response generation methods</p>
          <div style={{ 
            marginTop: '1rem', 
            height: '18rem', 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            backgroundColor: '#f3f4f6', 
            borderRadius: '0.5rem' 
          }}>
            Chart placeholder - would display donut chart in real implementation  
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function StatCard({ title, value, description, icon }: StatCardProps) {
  return (
    <div style={{ 
      backgroundColor: 'white',
      borderRadius: '0.5rem', 
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
      padding: '1rem',
      marginBottom: '1rem',
      maxWidth: '20rem',
      margin: '0 auto'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#4b5563' }}>{title}</p>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{value}</p>
          <p style={{ fontSize: '0.75rem', color: '#4b5563' }}>{description}</p>
        </div>
        <div style={{ 
          padding: '0.75rem', 
          borderRadius: '9999px', 
          backgroundColor: '#f3f4f6' 
        }}>
          {icon}
        </div>
      </div>
    </div>
  );
} 