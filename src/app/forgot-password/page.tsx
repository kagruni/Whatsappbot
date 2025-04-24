'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { toast } from 'sonner';
import { CSSProperties } from 'react';

// Define local CSS styles
const styles: Record<string, CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    padding: '1rem'
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden'
  },
  cardHeader: {
    position: 'relative',
    height: '140px',
    background: 'linear-gradient(135deg, #4F46E5 0%, #3B82F6 100%)',
    color: 'white',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center'
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.2)'
  },
  logoWrapper: {
    position: 'relative',
    marginBottom: '0.5rem',
    background: 'rgba(255, 255, 255, 0.2)',
    borderRadius: '9999px',
    padding: '0.75rem',
    backdropFilter: 'blur(4px)'
  },
  title: {
    position: 'relative',
    fontSize: '1.5rem',
    fontWeight: 'bold',
    letterSpacing: '0.5px'
  },
  cardBody: {
    padding: '2rem'
  },
  heading: {
    fontSize: '1.25rem',
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: '0.25rem'
  },
  subHeading: {
    fontSize: '0.875rem',
    color: '#6B7280',
    marginBottom: '1.5rem'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem'
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '0.25rem'
  },
  inputWrapper: {
    position: 'relative'
  },
  inputIcon: {
    position: 'absolute',
    left: '0.75rem',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#9CA3AF',
    width: '1.25rem',
    height: '1.25rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  input: {
    width: '100%',
    padding: '0.75rem 0.75rem 0.75rem 2.5rem',
    border: '1px solid #D1D5DB',
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s'
  },
  button: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    padding: '0.75rem 1rem',
    backgroundColor: '#4F46E5',
    color: 'white',
    border: 'none',
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  successBox: {
    textAlign: 'center',
    padding: '1.5rem',
    backgroundColor: '#EFF6FF',
    borderRadius: '0.5rem',
  },
  successIcon: {
    width: '3rem',
    height: '3rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '9999px',
    backgroundColor: '#DCFCE7',
    marginLeft: 'auto',
    marginRight: 'auto',
    marginBottom: '1rem'
  },
  successTitle: {
    fontSize: '1.125rem',
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: '0.25rem'
  },
  successText: {
    fontSize: '0.875rem',
    color: '#4B5563',
    marginBottom: '1rem'
  },
  textButton: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#4F46E5',
    fontWeight: '500',
    cursor: 'pointer',
    fontSize: '0.875rem'
  },
  footer: {
    marginTop: '1.5rem',
    textAlign: 'center',
    fontSize: '0.875rem',
    color: '#6B7280'
  },
  link: {
    color: '#4F46E5',
    fontWeight: '500',
    textDecoration: 'none'
  }
};

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      await resetPassword(email);
      setSubmitted(true);
      toast.success('Password reset email sent');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send reset email';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <div style={styles.overlay}></div>
          <div style={styles.logoWrapper}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" 
              stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 style={styles.title}>WhatsApp Bot Dashboard</h1>
        </div>

        <div style={styles.cardBody}>
          <h2 style={styles.heading}>Reset your password</h2>
          <p style={styles.subHeading}>
            {submitted 
              ? "Check your email for a reset link" 
              : "Enter your email and we'll send you instructions to reset your password"}
          </p>

          {!submitted ? (
            <form style={styles.form} onSubmit={handleSubmit}>
              <div style={styles.formGroup}>
                <label htmlFor="email" style={styles.label}>Email address</label>
                <div style={styles.inputWrapper}>
                  <div style={styles.inputIcon}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" 
                      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={styles.input}
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  ...styles.button,
                  backgroundColor: loading ? '#818CF8' : '#4F46E5',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Sending email...' : 'Send reset instructions'}
              </button>
            </form>
          ) : (
            <div style={styles.successBox}>
              <div style={styles.successIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                  stroke="#16A34A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 style={styles.successTitle}>Email sent!</h3>
              <p style={styles.successText}>Check your inbox for instructions to reset your password</p>
              
              <button 
                onClick={() => setSubmitted(false)}
                style={styles.textButton}
              >
                Try a different email
              </button>
            </div>
          )}

          <div style={styles.footer}>
            <p>
              Remember your password?{' '}
              <Link href="/login" style={styles.link}>
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 