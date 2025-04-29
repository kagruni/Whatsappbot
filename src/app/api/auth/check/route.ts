import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    // Initialize Supabase client
    const cookieStore = cookies();
    const supabase = createServerClient(cookieStore);
    
    // Get authenticated user's session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({
        authenticated: false,
        message: 'Not authenticated',
      });
    }
    
    // Get user info without sensitive data
    return NextResponse.json({
      authenticated: true,
      user: {
        id: session.user.id,
        email: session.user.email,
      },
      expires_at: session.expires_at,
    });
  } catch (error: any) {
    console.error('Error checking auth:', error);
    return NextResponse.json({
      authenticated: false,
      error: error.message || 'Unknown error checking authentication',
    }, { status: 500 });
  }
} 