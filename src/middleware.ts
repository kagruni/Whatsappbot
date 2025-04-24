import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import * as SupabaseSSR from '@supabase/ssr';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  
  // Create a Supabase client
  const supabase = SupabaseSSR.createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => req.cookies.get(name)?.value,
        set: (name: string, value: string, options: SupabaseSSR.CookieOptions) => {
          res.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove: (name: string, options: SupabaseSSR.CookieOptions) => {
          res.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );
  
  // Check if the user is authenticated
  const { data: { session } } = await supabase.auth.getSession();
  
  // Get the pathname from the URL
  const pathname = req.nextUrl.pathname;
  
  // Define public routes that don't require authentication
  const publicRoutes = ['/login', '/register', '/forgot-password', '/reset-password'];
  const isPublicRoute = publicRoutes.includes(pathname);
  
  // Redirect logic
  if (!session && !isPublicRoute) {
    // Redirect to login if trying to access a protected route without a session
    const redirectUrl = new URL('/login', req.url);
    return NextResponse.redirect(redirectUrl);
  }
  
  if (session && isPublicRoute) {
    // Redirect to dashboard if already logged in and trying to access login/register
    const redirectUrl = new URL('/', req.url);
    return NextResponse.redirect(redirectUrl);
  }
  
  return res;
}

// Specify which routes this middleware should run on
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}; 