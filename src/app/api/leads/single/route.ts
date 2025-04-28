import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Create a Supabase client for server-side usage
const createServerClient = (cookieStore: ReturnType<typeof cookies>) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        cookie: cookieStore.toString(),
      },
    },
  });
};

// Create admin client for token verification and bypassing RLS
const createAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  
  if (!supabaseServiceKey) {
    console.error('SUPABASE_SERVICE_ROLE_KEY is not defined in environment variables');
    throw new Error('Server configuration error');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  });
};

export async function POST(req: NextRequest) {
  const cookieStore = cookies();
  const supabase = createServerClient(cookieStore);
  // Create admin client for bypassing RLS
  const adminClient = createAdminClient();
  
  let userId: string | undefined;
  
  // First try to get user from Authorization header
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // Get user info from the token using service role key
    const accessToken = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await adminClient.auth.getUser(accessToken);
    
    if (!error && user) {
      userId = user.id;
    }
  }
  
  // If not found in header, try cookie session
  if (!userId) {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    userId = session.user.id;
  }
  
  // At this point, if we still don't have a userId, return unauthorized
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const { name, phone, email, source } = await req.json();
    
    // Validate required fields
    if (!name || !phone) {
      return NextResponse.json({ error: 'Name and phone are required' }, { status: 400 });
    }
    
    // Insert new lead - Use the adminClient to bypass RLS
    const { data, error } = await adminClient
      .from('leads')
      .insert({
        user_id: userId,
        name,
        phone,
        email: email || null,
        source: source || 'Manual Entry',
        status: 'New Lead',
        created_at: new Date().toISOString()
      })
      .select();
      
    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ 
      message: 'Lead added successfully',
      data 
    });
    
  } catch (error: any) {
    console.error('Error in POST /api/leads/single:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 