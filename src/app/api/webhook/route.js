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
      
      try {
        // Look for messages in the webhook payload
        let hasMessages = false;
        let messageCount = 0;
        
        for (const entry of body.entry) {
          if (!entry.changes || !Array.isArray(entry.changes)) continue;
          
          for (const change of entry.changes) {
            if (change.value && change.value.messages && Array.isArray(change.value.messages)) {
              hasMessages = true;
              messageCount += change.value.messages.length;
            }
          }
        }
        
        console.log(`Webhook contains ${messageCount} messages, processing...`);
        
        // Process the webhook with our handler
        const result = await processWhatsAppWebhook(body);
        console.log('Webhook processing result:', result);
        
        if (result) {
          console.log('Successfully processed webhook');
          return NextResponse.json({ success: true, processed: true }, { status: 200, headers });
        } else {
          if (hasMessages) {
            console.warn('Webhook contained messages but no processing occurred');
            return NextResponse.json(
              { success: false, error: 'Failed to process messages' }, 
              { status: 500, headers }
            );
          } else {
            // This might be a status update or another type of webhook
            console.log('Webhook processed (no messages to handle)');
            return NextResponse.json({ success: true, processed: false }, { status: 200, headers });
          }
        }
      } catch (processingError) {
        console.error('Error in webhook processing:', processingError);
        return NextResponse.json({ 
          error: 'Error processing webhook', 
          message: processingError.message,
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