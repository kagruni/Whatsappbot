'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import Link from 'next/link';
import { motion } from 'framer-motion';
import DashboardLayout from '@/components/DashboardLayout';
import { 
  HiOutlineKey, 
  HiOutlineMail, 
  HiOutlineUser, 
  HiOutlineLogout, 
  HiOutlineClock, 
  HiOutlineCalendar, 
  HiOutlineShieldCheck, 
  HiOutlineExclamationCircle,
  HiOutlineChartBar
} from 'react-icons/hi';

// Animation variants
const fadeIn = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 }
};

export default function Profile() {
  const { user, loading, signOut } = useAuth();
  const [email, setEmail] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (user) {
      setEmail(user.email || '');
    }
  }, [user]);

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await signOut();
      toast.success('Signed out successfully');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign out';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 mx-auto text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-3 text-gray-600 font-medium">Loading your profile...</p>
        </div>
      </div>
    );
  }

  // Generate initials from email for avatar
  const getInitials = () => {
    if (!email) return '?';
    const parts = email.split('@')[0].split('.');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  // Name from email
  const getUserName = () => {
    if (!email) return 'User';
    const name = email.split('@')[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-white pb-12">
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={fadeIn}
          transition={{ duration: 0.3 }}
          className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8"
        >
          {/* Header Section */}
          <div className="pt-8 pb-6">
            <div className="flex flex-col items-center sm:items-start">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                Welcome, {getUserName()}
              </h1>
              <p className="text-gray-600 text-base">
                Manage your personal account settings and preferences
              </p>
            </div>
          </div>
          
          {/* Stats Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <motion.div 
              variants={fadeIn}
              transition={{ delay: 0.1, duration: 0.3 }}
              className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm"
            >
              <div className="flex items-center">
                <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                  <HiOutlineClock className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</h3>
                  <p className="mt-1 text-xl font-semibold text-gray-900">25/04/2025</p>
                </div>
              </div>
            </motion.div>
            
            <motion.div 
              variants={fadeIn}
              transition={{ delay: 0.2, duration: 0.3 }}
              className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm"
            >
              <div className="flex items-center">
                <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-4">
                  <HiOutlineShieldCheck className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Account Status</h3>
                  <p className="mt-1 text-xl font-semibold text-green-600">Active</p>
                </div>
              </div>
            </motion.div>
            
            <motion.div 
              variants={fadeIn}
              transition={{ delay: 0.3, duration: 0.3 }}
              className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm"
            >
              <div className="flex items-center">
                <div className="flex-shrink-0 w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center mr-4">
                  <HiOutlineCalendar className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Member Since</h3>
                  <p className="mt-1 text-xl font-semibold text-gray-900">2025</p>
                </div>
              </div>
            </motion.div>
          </div>
          
          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Account Information */}
            <motion.div 
              variants={fadeIn}
              transition={{ delay: 0.4, duration: 0.3 }}
              className="lg:col-span-2 space-y-8"
            >
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
                  <h2 className="text-lg font-medium text-gray-900 flex items-center">
                    <HiOutlineUser className="mr-2 h-5 w-5 text-gray-500" />
                    Account Information
                  </h2>
                </div>
                
                <div className="p-6">
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <HiOutlineMail className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="email"
                        readOnly
                        value={email}
                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm"
                      />
                    </div>
                    <p className="mt-2 text-sm text-gray-500">Your account is linked to this email address</p>
                  </div>

                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="text-base font-medium text-gray-900 mb-3">Security Settings</h3>
                    <Link
                      href="/reset-password"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                    >
                      <HiOutlineKey className="mr-2 -ml-0.5 h-5 w-5" />
                      Change Password
                    </Link>
                  </div>
                </div>
              </div>
              
              {/* Activity Section */}
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
                  <h2 className="text-lg font-medium text-gray-900 flex items-center">
                    <HiOutlineChartBar className="mr-2 h-5 w-5 text-gray-500" />
                    Recent Activity
                  </h2>
                </div>
                
                <div className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                        <HiOutlineUser className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Logged in</p>
                        <p className="text-xs text-gray-500">2 hours ago</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center mr-3">
                        <HiOutlineKey className="h-4 w-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Updated security settings</p>
                        <p className="text-xs text-gray-500">3 days ago</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center mr-3">
                        <HiOutlineUser className="h-4 w-4 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Connected new device</p>
                        <p className="text-xs text-gray-500">1 week ago</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Account Actions */}
            <motion.div 
              variants={fadeIn}
              transition={{ delay: 0.5, duration: 0.3 }}
              className="lg:col-span-1"
            >
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
                  <h2 className="text-lg font-medium text-gray-900 flex items-center">
                    <HiOutlineLogout className="mr-2 h-5 w-5 text-gray-500" />
                    Account Actions
                  </h2>
                </div>
                
                <div className="p-6">
                  <div className="mb-6 rounded-lg bg-blue-50 p-4 border border-blue-100">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <HiOutlineExclamationCircle className="h-5 w-5 text-blue-400" />
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-blue-800">Need help with your account?</h3>
                        <div className="mt-2 text-sm text-blue-700">
                          <p>If you need assistance, our support team is here to help you.</p>
                        </div>
                        <div className="mt-4">
                          <button
                            type="button"
                            className="px-3 py-1.5 rounded-md text-sm font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                          >
                            Contact Support
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-t border-gray-200 pt-4">
                    <p className="text-sm text-gray-500 mb-4">
                      Signing out will end your current session. You will need to log in again to access your account.
                    </p>
                    <button
                      onClick={handleSignOut}
                      disabled={isLoading}
                      className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
                    >
                      <HiOutlineLogout className="-ml-1 mr-2 h-5 w-5 text-gray-500" />
                      {isLoading ? 'Signing out...' : 'Sign Out'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
} 