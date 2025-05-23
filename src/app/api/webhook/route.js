import { NextResponse } from 'next/server';
import { verifyWhatsAppWebhook, processWhatsAppWebhook } from '../lib/whatsapp';
import userSettings from '../userSettings';
import { supabase } from '../lib/supabase';

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

// Check if a phone number ID is registered in our system
async function isPhoneNumberIdRegistered(phoneNumberId) {
  try {
    console.log(`[FILTER] Checking if phone number ID exists in database: ${phoneNumberId}`);
    
    // Query Supabase to check if this phone number ID exists in user_settings
    const { data, error } = await supabase
      .from('user_settings')
      .select('id, user_id')
      .eq('whatsapp_phone_id', phoneNumberId)
      .limit(1);
    
    if (error) {
      console.error('[FILTER] Error checking phone number ID:', error);
      return false;
    }
    
    if (!data || data.length === 0) {
      console.log(`[FILTER] No user found with WhatsApp phone number ID: ${phoneNumberId}`);
      return false;
    }
    
    console.log(`[FILTER] Found user ${data[0].user_id} with WhatsApp phone number ID: ${phoneNumberId}`);
    return true;
  } catch (error) {
    console.error('[FILTER] Error checking if phone number ID is registered:', error);
    return false;
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

// POST handler for WhatsApp webhook
export async function POST(request) {
  try {
    await ensureInitialized();
    
    // Parse JSON body
    const body = await request.json();
    
    // Debug log the webhook event
    console.log('================ WEBHOOK RECEIVED ================');
    console.log('WhatsApp webhook POST received:', new Date().toISOString());
    console.log('Webhook payload:', JSON.stringify(body, null, 2));
    
    if (!body) {
      console.error('Empty webhook body received');
      return NextResponse.json({ error: 'Empty request body' }, { status: 400 });
    }
    
    if (!body.object) {
      console.error('Invalid webhook format - missing object property');
      return NextResponse.json({ error: 'Invalid webhook format' }, { status: 400 });
    }
    
    // Set proper content type
    const headers = {
      'Content-Type': 'application/json'
    };
    
    // Process the webhook
    if (body.object === 'whatsapp_business_account') {
      console.log('Valid WhatsApp Business Account webhook');
      
      if (!body.entry || !Array.isArray(body.entry) || body.entry.length === 0) {
        console.error('No entries in webhook payload');
        return NextResponse.json({ error: 'No entries in webhook payload' }, { status: 400 });
      }
      
      // Early filter by phone number ID
      console.log('===== WEBHOOK PHONE NUMBER ID FILTERING =====');
      let phoneNumberId = null;
      
      if (body.entry[0]?.changes && 
          body.entry[0].changes[0]?.value?.metadata) {
        
        phoneNumberId = body.entry[0].changes[0].value.metadata.phone_number_id;
        
        if (phoneNumberId) {
          console.log(`[FILTER] Received webhook for phone number ID: ${phoneNumberId}`);
          const isRegistered = await isPhoneNumberIdRegistered(phoneNumberId);
          
          if (!isRegistered) {
            console.log(`[FILTER] REJECTED: Phone number ID ${phoneNumberId} not registered in our system`);
            // Still return 200 OK to prevent Meta from retrying
            return NextResponse.json(
              { success: true, message: 'Phone number ID not registered' }, 
              { status: 200, headers }
            );
          }
          
          console.log(`[FILTER] ACCEPTED: Phone number ID ${phoneNumberId} is registered, continuing with processing`);
        } else {
          console.log('[FILTER] WARNING: No phone number ID found in webhook metadata, processing anyway');
        }
      } else {
        console.log('[FILTER] WARNING: Could not extract metadata from webhook, processing anyway');
      }
      console.log('===== END WEBHOOK FILTERING =====');
      
      try {
        // Look for messages in the webhook payload
        let hasMessages = false;
        let messageCount = 0;
        let messageDetails = [];
        
        for (const entry of body.entry) {
          if (!entry.changes || !Array.isArray(entry.changes)) continue;
          
          for (const change of entry.changes) {
            if (change.value && change.value.messages && Array.isArray(change.value.messages)) {
              hasMessages = true;
              messageCount += change.value.messages.length;
              
              // Log message details for debugging
              change.value.messages.forEach(msg => {
                messageDetails.push({
                  id: msg.id,
                  from: msg.from,
                  type: msg.type,
                  text: msg.text?.body || 'non-text message',
                  timestamp: msg.timestamp
                });
              });
            }
          }
        }
        
        console.log(`WEBHOOK SUMMARY: Found ${messageCount} messages`);
        if (messageDetails.length > 0) {
          console.log('Message details:', messageDetails);
        }
        
        console.log(`Webhook contains ${messageCount} messages, processing...`);
        
        // Process the webhook with our handler
        const result = await processWhatsAppWebhook(body, phoneNumberId);
        console.log('Webhook processing result:', result);
        
        if (result) {
          console.log('Successfully processed webhook');
          return NextResponse.json({ success: true, processed: true, phoneNumberId }, { status: 200, headers });
        } else {
          if (hasMessages) {
            console.warn('Webhook contained messages but no processing occurred');
            return NextResponse.json(
              { success: false, error: 'Failed to process messages', phoneNumberId }, 
              { status: 500, headers }
            );
          } else {
            // This might be a status update or another type of webhook
            console.log('Webhook processed (no messages to handle)');
            return NextResponse.json({ success: true, processed: false, phoneNumberId }, { status: 200, headers });
          }
        }
      } catch (processingError) {
        console.error('Error in webhook processing:', processingError);
        return NextResponse.json({ 
          error: 'Error processing webhook', 
          message: processingError.message,
          phoneNumberId,
          stack: process.env.NODE_ENV === 'development' ? processingError.stack : undefined
        }, { status: 500, headers });
      }
    } else {
      console.log(`Invalid object type: ${body.object}`);
      return NextResponse.json({ error: 'Invalid request', object: body.object }, { status: 404, headers });
    }
  } catch (error) {
    console.error('Error processing webhook:', error);
    console.error('Stack trace:', error.stack);
    
    return NextResponse.json(
      { 
        error: 'Error processing webhook', 
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
      }, 
      { status: 500 }
    );
  }
} 