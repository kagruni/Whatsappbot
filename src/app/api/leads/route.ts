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

// Helper function to split array into chunks
const chunkArray = <T>(array: T[], chunkSize: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
};

// Normalize phone numbers to a consistent format
const normalizePhoneNumber = (phone: string): string => {
  if (!phone) return '';
  
  // Remove all non-numeric characters
  let cleaned = phone.replace(/\D/g, '');
  
  // Handle international format
  if (cleaned.startsWith('00')) {
    // Convert 00 prefix to +
    cleaned = '+' + cleaned.substring(2);
  } else if (!cleaned.startsWith('+') && cleaned.length > 10) {
    // Add + for international numbers without + that are longer than 10 digits
    if (cleaned.startsWith('1') && cleaned.length === 11) {
      // US/Canada number
      cleaned = '+' + cleaned;
    } else {
      // Other international number, assume it has a country code
      cleaned = '+' + cleaned;
    }
  } else if (cleaned.length === 10) {
    // Assume US/Canada format if 10 digits
    cleaned = '+1' + cleaned;
  }
  
  // Format number for more readability if it has a + prefix
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  
  // Return the cleaned number if we couldn't determine a standard format
  return cleaned;
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
    
    // Get the column mapping if provided
    let columnMapping: Record<string, string> = {};
    const mappingStr = formData.get('columnMapping') as string;
    
    if (mappingStr) {
      try {
        columnMapping = JSON.parse(mappingStr);
        console.log('Column mapping received:', columnMapping);
      } catch (e) {
        console.error('Error parsing column mapping:', e);
        // Continue with empty mapping if parsing fails
      }
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
    let skippedRecords = 0;
    let duplicatePhones = new Set<string>();
    
    await new Promise<void>((resolve, reject) => {
      readableStream
        .pipe(csvParser({
          separator, // Use detected separator
          skipComments: true,
          strict: true
        }))
        .on('data', (record: any) => {
          // Map the record using column mapping
          const mappedRecord: any = { user_id: userId };
          let hasRequiredFields = true;
          
          // Check if we have mapping for required field (phone)
          let rawPhone = '';
          if (columnMapping.phone) {
            // Get the value using the mapped column name
            rawPhone = record[columnMapping.phone];
            
            if (!rawPhone) {
              hasRequiredFields = false;
            } else {
              // Normalize the phone number
              const normalizedPhone = normalizePhoneNumber(rawPhone);
              
              // Skip record if phone number couldn't be normalized
              if (!normalizedPhone) {
                hasRequiredFields = false;
                skippedRecords++;
                console.log(`Skipping record with invalid phone: ${rawPhone}`);
              } else {
                mappedRecord.phone = normalizedPhone;
                
                // Check for duplicate phone in current import
                if (duplicatePhones.has(normalizedPhone)) {
                  console.log(`Skipping duplicate phone number: ${normalizedPhone}`);
                  skippedRecords++;
                  hasRequiredFields = false;
                } else {
                  duplicatePhones.add(normalizedPhone);
                }
              }
            }
          } else {
            // Fall back to direct column name if no mapping
            rawPhone = record.phone;
            if (!rawPhone) {
              hasRequiredFields = false;
            } else {
              // Normalize the phone number
              const normalizedPhone = normalizePhoneNumber(rawPhone);
              
              // Skip record if phone number couldn't be normalized
              if (!normalizedPhone) {
                hasRequiredFields = false;
                skippedRecords++;
                console.log(`Skipping record with invalid phone: ${rawPhone}`);
              } else {
                mappedRecord.phone = normalizedPhone;
                
                // Check for duplicate phone in current import
                if (duplicatePhones.has(normalizedPhone)) {
                  console.log(`Skipping duplicate phone number: ${normalizedPhone}`);
                  skippedRecords++;
                  hasRequiredFields = false;
                } else {
                  duplicatePhones.add(normalizedPhone);
                }
              }
            }
          }
          
          if (hasRequiredFields) {
            // Add optional fields if they are in the mapping
            const optionalFields = [
              'name', 'email', 'title', 'first_name', 'last_name', 
              'city', 'company_name'
            ];
            
            optionalFields.forEach(field => {
              if (columnMapping[field] && record[columnMapping[field]]) {
                mappedRecord[field] = record[columnMapping[field]];
              } else if (record[field]) {
                // Fall back to direct column name
                mappedRecord[field] = record[field];
              }
            });
            
            // Set required defaults
            if (!mappedRecord.name) {
              // Generate name from first_name and last_name if available
              if (mappedRecord.first_name || mappedRecord.last_name) {
                mappedRecord.name = [mappedRecord.first_name, mappedRecord.last_name]
                  .filter(Boolean)
                  .join(' ');
              } else {
                // Use phone number as name if nothing else is available
                mappedRecord.name = `Lead (${mappedRecord.phone})`;
              }
            }
            
            // Always set these fields automatically
            mappedRecord.status = 'New Lead';
            mappedRecord.source = source;
            mappedRecord.created_at = new Date().toISOString();
            
            results.push(mappedRecord);
          } else if (!hasRequiredFields && !rawPhone) {
            console.log('Invalid record - missing required phone field:', record);
            skippedRecords++;
          }
        })
        .on('end', () => resolve())
        .on('error', (error: Error) => reject(error));
    });
    
    if (results.length === 0) {
      return NextResponse.json({ 
        error: 'No valid records found in CSV. Please ensure your file contains the required fields and data.'
      }, { status: 400 });
    }
    
    console.log(`Processing ${results.length} leads to insert into database (${skippedRecords} records skipped)`);
    
    // Split results into chunks of 1000 to avoid Supabase limitations
    const CHUNK_SIZE = 1000;
    const chunkedResults = chunkArray(results, CHUNK_SIZE);
    let insertedCount = 0;
    let insertErrors = [];
    
    // Process each chunk
    for (let i = 0; i < chunkedResults.length; i++) {
      const chunk = chunkedResults[i];
      console.log(`Inserting chunk ${i+1}/${chunkedResults.length} (${chunk.length} records)`);
      
      try {
        const { data, error } = await supabase
          .from('leads')
          .insert(chunk);
        
        if (error) {
          console.error(`Error inserting chunk ${i+1}:`, error);
          insertErrors.push({ chunk: i+1, error: error.message });
        } else {
          insertedCount += chunk.length;
          console.log(`Successfully inserted chunk ${i+1} (${chunk.length} records)`);
        }
      } catch (err: any) {
        console.error(`Exception inserting chunk ${i+1}:`, err);
        insertErrors.push({ chunk: i+1, error: err.message });
      }
    }
    
    if (insertedCount === 0 && insertErrors.length > 0) {
      // All chunks failed
      return NextResponse.json({ 
        error: `Failed to insert any leads: ${insertErrors[0].error}` 
      }, { status: 500 });
    }
    
    console.log(`CSV import completed: ${insertedCount}/${results.length} leads inserted successfully (${skippedRecords} records skipped)`);
    
    return NextResponse.json({ 
      message: `Successfully imported ${insertedCount} leads`,
      skipped: skippedRecords,
      failed: results.length - insertedCount,
      errors: insertErrors.length > 0 ? insertErrors : undefined
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