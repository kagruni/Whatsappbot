import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/supabase/server';

// GET handler to fetch user settings
export async function GET() {
  const cookieStore = cookies();
  const supabase = createServerClient(cookieStore);

  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401 }
    );
  }

  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', session.user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(data || {});
}

// POST handler to update user settings
export async function POST(request: Request) {
  const cookieStore = cookies();
  const supabase = createServerClient(cookieStore);
  const body = await request.json();

  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401 }
    );
  }

  // Check if settings already exist for this user
  const { data: existingSettings } = await supabase
    .from('user_settings')
    .select('id')
    .eq('user_id', session.user.id)
    .single();

  let result;
  
  if (existingSettings) {
    // Update existing settings
    const { data, error } = await supabase
      .from('user_settings')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', session.user.id)
      .select()
      .single();
      
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    result = data;
  } else {
    // Create new settings
    const { data, error } = await supabase
      .from('user_settings')
      .insert({
        user_id: session.user.id,
        ...body,
      })
      .select()
      .single();
      
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    result = data;
  }

  return NextResponse.json(result);
} 