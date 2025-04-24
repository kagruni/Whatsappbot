'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

interface RouteGuardProps {
  children: React.ReactNode;
}

export default function RouteGuard({ children }: RouteGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      // Define public routes that don't require authentication
      const publicRoutes = ['/login', '/register', '/forgot-password', '/reset-password'];
      const isPublicRoute = publicRoutes.includes(pathname);

      // Redirect logic
      if (!user && !isPublicRoute) {
        // Redirect to login if trying to access a protected route without authentication
        router.push('/login');
      } else if (user && isPublicRoute) {
        // Redirect to dashboard if already logged in and trying to access login/register
        router.push('/');
      }
    }
  }, [user, loading, pathname, router]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Public routes are accessible without auth
  const publicRoutes = ['/login', '/register', '/forgot-password', '/reset-password'];
  const isPublicRoute = publicRoutes.includes(pathname);

  // Render children if user is authenticated or it's a public route
  if ((user && !isPublicRoute) || isPublicRoute) {
    return <>{children}</>;
  }

  // Don't render anything during redirects
  return null;
} 