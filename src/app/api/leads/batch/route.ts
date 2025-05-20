import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create a Supabase client for server-side usage
const createServerClient = async (req: NextRequest) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  
  // Use service role key for server operations (more permissions)
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  
  if (!supabaseServiceKey) {
    console.error('SUPABASE_SERVICE_ROLE_KEY is not defined in environment variables');
    throw new Error('Server configuration error');
  }
  
  // Create admin client with service role key
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  });
};

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createServerClient(req);
    
    // Get user ID from authorization header
    const authHeader = req.headers.get('authorization');
    let userId: string | null = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Get user info from the token using the service role key
      const accessToken = authHeader.replace('Bearer ', '');
      const { data: { user }, error } = await supabase.auth.getUser(accessToken);
      
      if (error || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      
      userId = user.id;
    } else {
      // Fallback to cookie auth
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      userId = session.user.id;
    }
    
    const { searchParams } = new URL(req.url);
    const source = searchParams.get('source');
    
    if (!source) {
      return NextResponse.json({ error: 'Source parameter is required' }, { status: 400 });
    }
    
    // First count how many leads will be deleted
    const { count, error: countError } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('source', source)
      .eq('user_id', userId);
    
    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }
    
    // Delete all leads with the specified source for this user
    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('source', source)
      .eq('user_id', userId);
      
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ 
      message: `Successfully deleted all leads from source "${source}"`,
      count
    });
  } catch (error: any) {
    console.error('Error in DELETE /api/leads/batch:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 