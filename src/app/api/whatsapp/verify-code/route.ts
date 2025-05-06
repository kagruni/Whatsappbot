import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import axios from 'axios';

export async function POST(request: Request) {
  try {
    // Parse request body
    const body = await request.json();
    const { code, userId, phone_number_id } = body;
    
    // Validate required fields
    if (!code) {
      return NextResponse.json(
        { error: 'Missing verification code.' },
        { status: 400 }
      );
    }
    
    // Check if we have a phone number ID (needed for Cloud API)
    if (!phone_number_id) {
      return NextResponse.json(
        { error: 'Missing phone_number_id. You need to provide the WhatsApp Phone Number ID for verification.' },
        { status: 400 }
      );
    }
    
    try {
      // Use the WhatsApp token from environment variables
      const whatsappToken = process.env.WHATSAPP_TOKEN;
      
      if (!whatsappToken) {
        return NextResponse.json(
          { error: 'WhatsApp API token is not configured' },
          { status: 500 }
        );
      }
      
      console.log('Making WhatsApp code verification request');
      
      // Make API request to WhatsApp Cloud API to verify the code
      const response = await axios.post(
        `https://graph.facebook.com/v16.0/${phone_number_id}/verify_code`,
        { 
          messaging_product: "whatsapp",
          code 
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${whatsappToken}`
          }
        }
      );
      
      console.log('WhatsApp code verification response:', response.status, response.data);
      
      // Save user's WhatsApp phone ID to user settings if userId is provided
      if (response.status === 200 && userId) {
        try {
          // We already have the phone ID from the request
          const phoneId = phone_number_id;
          
          if (phoneId) {
            const cookieStore = cookies();
            const supabase = createServerClient(cookieStore);
            
            await supabase
              .from('user_settings')
              .upsert({
                user_id: userId,
                whatsapp_phone_id: phoneId,
                updated_at: new Date().toISOString()
              }, {
                onConflict: 'user_id'
              });
              
            console.log(`Saved WhatsApp phone ID ${phoneId} to user ${userId}`);
          }
        } catch (settingsError: any) {
          console.error('Error saving WhatsApp phone ID to user settings:', settingsError.message);
          // Continue without failing since the verification was successful
        }
      }
      
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
                          'Failed to verify WhatsApp code';
      
      return NextResponse.json(
        { error: errorMessage, details: errorResponse },
        { status: errorStatus }
      );
    }
    
  } catch (error: any) {
    console.error('Unexpected error in verify-code endpoint:', error.message);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 