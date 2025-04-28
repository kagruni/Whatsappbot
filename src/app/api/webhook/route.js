import { NextResponse } from 'next/server';
import { verifyWhatsAppWebhook, processWhatsAppWebhook } from '../lib/whatsapp';
import userSettings from '../userSettings';

// Initialize user settings
let initialized = false;
async function ensureInitialized() {
  if (!initialized) {
    try {
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

    // Use a fallback verify token if admin settings aren't available yet
    let verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'bot2';
    
    try {
      const adminSettings = await userSettings.getUserSettings('admin');
      if (adminSettings && adminSettings.whatsappVerifyToken) {
        verifyToken = adminSettings.whatsappVerifyToken;
      }
    } catch (error) {
      console.error('Error getting admin settings, using fallback verify token:', error);
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
    await ensureInitialized();
    
    const body = await request.json();
    console.log('Received webhook payload:', JSON.stringify(body, null, 2));
    
    if (body.object === 'whatsapp_business_account') {
      await processWhatsAppWebhook(body);
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Invalid request' }, { status: 404 });
    }
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Error processing webhook' }, 
      { status: 500 }
    );
  }
} 