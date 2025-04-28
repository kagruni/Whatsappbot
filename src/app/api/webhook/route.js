import { NextResponse } from 'next/server';
import { verifyWhatsAppWebhook, processWhatsAppWebhook } from '../lib/whatsapp';
import userSettings from '../userSettings';

// Initialize user settings
let initialized = false;
async function ensureInitialized() {
  if (!initialized) {
    try {
      // Log environment variables for debugging
      console.log('Environment variables status:', {
        hasOpenAIKey: !!process.env.OPENAI_API_KEY,
        openAIKeyLength: process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.length : 0,
        hasWhatsAppToken: !!process.env.WHATSAPP_TOKEN,
        whatsAppTokenLength: process.env.WHATSAPP_TOKEN ? process.env.WHATSAPP_TOKEN.length : 0,
        hasWhatsAppPhoneId: !!process.env.WHATSAPP_PHONE_NUMBER_ID,
        whatsAppPhoneId: process.env.WHATSAPP_PHONE_NUMBER_ID,
        hasWhatsAppVerifyToken: !!process.env.WHATSAPP_VERIFY_TOKEN,
        hasWhatsAppTemplateId: !!process.env.WHATSAPP_TEMPLATE_ID,
        openAIModel: process.env.OPENAI_MODEL || 'not set'
      });
      
      await userSettings.init();
      initialized = true;
      console.log('User settings initialized in webhook route');
    } catch (error) {
      console.error('Error initializing user settings:', error);
    }
  }
}

// WhatsApp webhook verification (GET)
export async function GET(request) {
  try {
    await ensureInitialized();

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    console.log('Webhook verification request received:');
    console.log('hub.mode:', mode);
    console.log('hub.verify_token:', token);
    console.log('hub.challenge:', challenge);

    // Use environment variable for verify token
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
    
    if (!verifyToken) {
      console.error('CRITICAL: WHATSAPP_VERIFY_TOKEN is not set in environment variables');
    }

    // Validate the webhook
    if (mode === 'subscribe' && token === verifyToken) {
      console.log('Webhook verified successfully');
      return new Response(challenge, { 
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      });
    } else {
      console.log('Webhook verification failed');
      console.log('Expected token:', verifyToken);
      return new Response('Verification failed', { 
        status: 403,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
  } catch (error) {
    console.error('Error in webhook verification:', error);
    return new Response('Error in webhook verification', { 
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

// WhatsApp message webhook (POST)
export async function POST(request) {
  try {
    console.log('POST /api/webhook - Webhook called');
    await ensureInitialized();
    
    const body = await request.json();
    console.log('Received webhook payload:', JSON.stringify(body, null, 2));
    
    // Validate Supabase connection and check if there are valid users
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      if (!supabaseUrl || !supabaseServiceKey) {
        console.error('CRITICAL: Supabase configuration missing - URL or service key not found!');
      } else {
        console.log('Supabase configuration found in environment');
        
        // Check if we have user settings
        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
          auth: { persistSession: false, autoRefreshToken: false }
        });
        
        const { data, error } = await supabase
          .from('user_settings')
          .select('user_id, openai_api_key, whatsapp_phone_id')
          .limit(5);
          
        if (error) {
          console.error('Error querying Supabase for user settings:', error);
        } else if (!data || data.length === 0) {
          console.error('CRITICAL: No users found in Supabase user_settings table!');
        } else {
          console.log(`Found ${data.length} users in database. First user:`, {
            userId: data[0].user_id,
            hasApiKey: !!data[0].openai_api_key,
            hasPhoneId: !!data[0].whatsapp_phone_id
          });
        }
      }
    } catch (configError) {
      console.error('Error testing Supabase configuration:', configError);
    }
    
    // Process the webhook
    if (body.object === 'whatsapp_business_account') {
      console.log('Valid WhatsApp Business Account webhook');
      
      try {
        await processWhatsAppWebhook(body);
        console.log('Successfully processed webhook');
        return NextResponse.json({ success: true });
      } catch (processingError) {
        console.error('Error in webhook processing:', processingError);
        return NextResponse.json({ 
          error: 'Error processing webhook', 
          message: processingError.message 
        }, { status: 500 });
      }
    } else {
      console.log(`Invalid object type: ${body.object}`);
      return NextResponse.json({ error: 'Invalid request' }, { status: 404 });
    }
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Error processing webhook', message: error.message }, 
      { status: 500 }
    );
  }
} 