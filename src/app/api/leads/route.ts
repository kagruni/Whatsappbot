import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import csvParser from 'csv-parser';
import { Readable } from 'stream';

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

export async function GET(req: NextRequest) {
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
    
    // Get leads for the user
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
      
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error in GET /api/leads:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  console.log('POST /api/leads - Request received');
  
  try {
    const supabase = await createServerClient(req);
    
    // Get user ID from authorization header
    const authHeader = req.headers.get('authorization');
    let userId: string | null = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      console.log('Auth header found, extracting token');
      // Get user info from the token using the service role key
      const accessToken = authHeader.replace('Bearer ', '');
      const { data: { user }, error } = await supabase.auth.getUser(accessToken);
      
      console.log('User authentication result:', { 
        hasUser: !!user, 
        hasError: !!error,
        errorMessage: error?.message
      });
      
      if (error || !user) {
        console.log('Token authentication failed');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      
      userId = user.id;
      console.log('Authenticated with token as user:', userId);
    } else {
      // Fallback to cookie auth
      console.log('No auth header, trying cookie auth');
      const { data } = await supabase.auth.getSession();
      if (!data.session?.user) {
        console.log('Cookie authentication failed - no session');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      userId = data.session.user.id;
      console.log('Authenticated with cookie as user:', userId);
    }
    
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }
    
    // Get the filename to use as source
    const fileName = file.name;
    const source = fileName ? fileName.replace(/\.[^/.]+$/, '') : 'CSV Import'; // Remove file extension
    console.log(`Using source: "${source}" from filename: "${fileName}"`);
    
    console.log('Processing CSV file');
    // Parse CSV file
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Detect the delimiter by looking at the first line
    const fileContent = buffer.toString('utf-8');
    const firstLine = fileContent.split('\n')[0];
    
    // Determine if semicolon or comma is used as separator
    const separator = firstLine.includes(';') ? ';' : ',';
    console.log(`Detected CSV separator: "${separator}"`);
    
    const readableStream = new Readable();
    readableStream.push(buffer);
    readableStream.push(null);
    
    const results: any[] = [];
    
    await new Promise<void>((resolve, reject) => {
      readableStream
        .pipe(csvParser({
          separator, // Use detected separator
          skipComments: true,
          strict: true
        }))
        .on('data', (record: any) => {
          // Validate the record has the required fields
          console.log('CSV row:', record); // Log each record for debugging
          if (record.name && record.phone) {
            results.push({
              user_id: userId,
              name: record.name,
              phone: record.phone,
              email: record.email || null,
              status: record.status || 'New Lead',
              source: record.source || source, // Use filename as source, fallback to record.source if it exists
              created_at: new Date().toISOString()
            });
          } else {
            console.log('Invalid record - missing name or phone:', record);
          }
        })
        .on('end', () => resolve())
        .on('error', (error: Error) => reject(error));
    });
    
    if (results.length === 0) {
      return NextResponse.json({ error: 'No valid records found in CSV' }, { status: 400 });
    }
    
    console.log(`Inserting ${results.length} leads into database`);
    // Insert the parsed data into the database
    const { data, error } = await supabase
      .from('leads')
      .insert(results)
      .select();
      
    if (error) {
      console.error('Database insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    console.log('CSV import successful');
    return NextResponse.json({ 
      message: `Successfully imported ${results.length} leads`,
      data 
    });
    
  } catch (error: any) {
    console.error('Error in POST /api/leads:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

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
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 });
    }
    
    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
      
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ message: 'Lead deleted successfully' });
  } catch (error: any) {
    console.error('Error in DELETE /api/leads:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 