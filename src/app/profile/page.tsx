'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import Link from 'next/link';

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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white shadow-md rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-6">Profile</h1>
        
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Account Information</h2>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">Email</label>
            <input
              type="email"
              readOnly
              value={email}
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
            />
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Security</h2>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/reset-password"
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition duration-200"
            >
              Change Password
            </Link>
          </div>
        </div>

        <div className="pt-6 border-t border-gray-200">
          <button
            onClick={handleSignOut}
            disabled={isLoading}
            className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition duration-200"
          >
            {isLoading ? 'Signing out...' : 'Sign Out'}
          </button>
        </div>
      </div>
    </div>
  );
} 