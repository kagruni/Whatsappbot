import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import axios from 'axios';

export async function POST(request: Request) {
  try {
    // Parse request body
    const body = await request.json();
    const { cc, phone_number, method, cert, pin, phone_number_id } = body;
    
    // Check if we have a phone number ID (needed for the WhatsApp API)
    if (!phone_number_id) {
      return NextResponse.json(
        { error: 'Missing phone_number_id. You need to provide the WhatsApp Phone Number ID.' },
        { status: 400 }
      );
    }
    
    // Use the WhatsApp token from environment variables
    const whatsappToken = process.env.WHATSAPP_TOKEN;
    
    if (!whatsappToken) {
      return NextResponse.json(
        { error: 'WhatsApp API token is not configured' },
        { status: 500 }
      );
    }

    console.log('Making WhatsApp register request');
    
    // For the Cloud API, we need to include messaging_product parameter
    const response = await axios.post(
      `https://graph.facebook.com/v16.0/${phone_number_id}/register`,
      {
        messaging_product: "whatsapp",
        cert: cert,
        pin: pin || undefined
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${whatsappToken}`
        }
      }
    );
    
    console.log('WhatsApp register response:', response.status, response.data);
    
    // Return the WhatsApp API response
    return NextResponse.json(
      response.data,
      { status: response.status || 200 }
    );
    
  } catch (apiError: any) {
    console.error('Error calling WhatsApp API:', apiError.message);
    
    if (apiError.response) {
      console.error('Response status:', apiError.response.status);
      console.error('Response data:', apiError.response.data);
    }
    
    // Get error details from the API response if available
    const errorResponse = apiError.response?.data;
    const errorStatus = apiError.response?.status || 500;
    const errorMessage = errorResponse?.error?.message || 
                        errorResponse?.detail || 
                        'Failed to register WhatsApp number';
    
    return NextResponse.json(
      { error: errorMessage, details: errorResponse },
      { status: errorStatus }
    );
  }
} 