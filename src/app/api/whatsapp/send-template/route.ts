import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/supabase/server';
import axios from 'axios';
import {
  normalizeGermanPhoneNumber,
  checkDailyMessageLimit,
  recordConversation,
  updateLeadStatus
} from '@/lib/whatsapp-utils';

// Helper function to create template components based on template name and parameters
function createTemplateComponents(templateName: string, leadName: string | null = null, imageUrl: string | null = null) {
  const components: any[] = [];
  
  // Handle specific templates based on their known structure
  if (templateName === 'hello_world') {
    // hello_world template typically has no parameters in the body
    console.log('Using special handling for hello_world template - no parameters');
    
    // Add header component with image if provided
    if (imageUrl) {
      components.push({
        type: 'header',
        parameters: [
          {
            type: 'image',
            image: {
              link: imageUrl
            }
          }
        ]
      });
    }
    
    // THE KEY FIX: hello_world template must have a body component with EMPTY parameters array
    components.push({
      type: 'body',
      parameters: [] // EMPTY parameters array, not undefined
    });
    
    return components;
  }
  
  // Default handling for other templates
  
  // Add header component with image if provided
  if (imageUrl) {
    components.push({
      type: 'header',
      parameters: [
        {
          type: 'image',
          image: {
            link: imageUrl
          }
        }
      ]
    });
  }
  
  // Add body component with lead name parameter if provided
  if (leadName) {
    components.push({
      type: 'body',
      parameters: [
        { type: 'text', text: leadName }
      ]
    });
  }
  
  return components;
}

export async function POST(request: Request) {
  try {
    console.log('WhatsApp template API: Received request');
    
    // Get the request body
    const body = await request.json();
    const { phoneNumber, leadName, leadId, userId: requestUserId } = body;

    console.log('Request body:', {
      hasPhoneNumber: !!phoneNumber,
      hasLeadName: !!leadName,
      hasLeadId: !!leadId,
      hasRequestUserId: !!requestUserId
    });

    if (!phoneNumber) {
      console.log('WhatsApp API: Missing phone number');
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Initialize Supabase client
    const cookieStore = cookies();
    const supabase = createServerClient(cookieStore);

    // Get authenticated user's session
    console.log('WhatsApp API: Checking authentication');
    const { data: { session } } = await supabase.auth.getSession();
    console.log('Authentication check result:', { hasSession: !!session });
    
    // Get userId from session or request body
    let userId: string;
    
    if (session) {
      // User is authenticated via session
      userId = session.user.id;
      console.log('Using user ID from session:', userId);
    } else if (requestUserId) {
      // No session but userId provided in request
      userId = requestUserId;
      console.log('Using user ID from request body:', userId);
    } else {
      // Try to get the first admin user as fallback
      console.log('No session or request user ID, attempting to use admin user');
      const { data: adminUser } = await supabase
        .from('user_settings')
        .select('user_id')
        .limit(1)
        .single();
        
      if (adminUser) {
        userId = adminUser.user_id;
        console.log('Using admin user as fallback:', userId);
      } else {
        console.log('No admin user found, authentication failed');
        return NextResponse.json(
          { error: 'Not authenticated and no user ID provided' },
          { status: 401 }
        );
      }
    }

    // Fetch user-specific settings
    console.log('WhatsApp API: Fetching user settings for ID:', userId);
    const { data: userSettings, error: settingsError } = await supabase
      .from('user_settings')
      .select('whatsapp_phone_id, whatsapp_template_id, whatsapp_language, whatsapp_template_image_url, message_limit_24h')
      .eq('user_id', userId)
      .single();

    if (settingsError) {
      console.error('Error fetching user settings:', settingsError);
      return NextResponse.json(
        { error: `Error fetching user settings: ${settingsError.message}` },
        { status: 400 }
      );
    }

    if (!userSettings) {
      console.error('No user settings found');
      return NextResponse.json(
        { error: 'No WhatsApp settings found for this user' },
        { status: 400 }
      );
    }

    // Extract settings
    const {
      whatsapp_phone_id: phoneId,
      whatsapp_template_id: templateId,
      whatsapp_language: language,
      whatsapp_template_image_url: imageUrl,
      message_limit_24h: messageLimit
    } = userSettings;
    
    // Get WhatsApp token from environment variable
    const token = process.env.WHATSAPP_TOKEN;
    
    if (!token) {
      console.error('No WhatsApp token found in environment variables');
      return NextResponse.json(
        { error: 'WhatsApp API token not configured in environment variables' },
        { status: 400 }
      );
    }

    // Validate other required settings
    if (!phoneId) {
      console.error('Missing WhatsApp Phone ID');
      return NextResponse.json(
        { error: 'WhatsApp Phone ID is missing. Please configure this in your settings.' },
        { status: 400 }
      );
    }
    
    if (!templateId) {
      console.error('Missing WhatsApp Template ID');
      return NextResponse.json(
        { error: 'WhatsApp Template ID is missing. Please configure this in your settings.' },
        { status: 400 }
      );
    }
    
    if (!language) {
      console.error('Missing WhatsApp Language');
      return NextResponse.json(
        { error: 'WhatsApp Template Language is missing. Please configure this in your settings.' },
        { status: 400 }
      );
    }

    // Check daily message limit if set
    if (messageLimit) {
      try {
        const limitExceeded = await checkDailyMessageLimit(userId, messageLimit);
        if (limitExceeded) {
          return NextResponse.json(
            { error: `Daily message limit of ${messageLimit} reached` },
            { status: 429 }
          );
        }
      } catch (error: any) {
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        );
      }
    }

    // Normalize phone number
    const normalizedPhone = normalizeGermanPhoneNumber(phoneNumber);
    console.log('Normalized phone number:', { original: phoneNumber, normalized: normalizedPhone });

    // Prepare WhatsApp API request
    const apiVersion = process.env.WHATSAPP_API_VERSION || 'v17.0';
    const url = `https://graph.facebook.com/${apiVersion}/${phoneId}/messages`;
    console.log('WhatsApp API request URL:', url);

    // Create request payload
    const requestPayload: any = {
      messaging_product: 'whatsapp',
      to: normalizedPhone,
      type: 'template',
      template: {
        name: templateId,
        language: {
          code: language
        },
        // Use our universal helper function to create a template structure
        // that works with most WhatsApp templates
        components: createTemplateComponents(templateId, leadName, imageUrl)
      }
    };

    console.log('WhatsApp API request payload (without sensitive data):', {
      to: normalizedPhone,
      templateName: templateId,
      languageCode: language,
      hasImageUrl: !!imageUrl,
      hasLeadName: !!leadName
    });

    // Log detailed request payload for debugging
    console.log('Full WhatsApp API request payload:', JSON.stringify(requestPayload, null, 2));
    
    // Add informative warning about template parameters
    console.log('⚠️ IMPORTANT: If you get an error about number of parameters, make sure:');
    console.log('1. The template_id matches an approved template in your WhatsApp Business Account');
    console.log('2. You are providing the exact number of parameters the template requires');
    console.log('3. The parameter types (text, image, etc.) match what the template expects');
    
    // Make API call to WhatsApp
    console.log('Making WhatsApp API request...');
    try {
      const response = await axios.post(url, requestPayload, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('WhatsApp API response:', {
        status: response.status,
        hasMessages: !!response.data?.messages,
        messageCount: response.data?.messages?.length || 0
      });

      // If successful, log the conversation in the database
      if (response.data && response.data.messages && response.data.messages.length > 0) {
        const messageId = response.data.messages[0].id;
        console.log('Successfully sent WhatsApp message with ID:', messageId);

        // Record the conversation and update lead status
        if (leadId) {
          try {
            console.log('Recording conversation in database...');
            await recordConversation(userId, leadId, templateId, language, messageId);
            console.log('Successfully recorded conversation in database');
            
            console.log('Updating lead status...');
            await updateLeadStatus(leadId, 'Contacted');
            console.log('Successfully updated lead status to Contacted');
          } catch (error: any) {
            console.error('Error recording conversation:', error);
            // We continue since the message was sent successfully
          }
        } else {
          console.log('No leadId provided, skipping conversation recording');
        }
      } else {
        console.warn('WhatsApp API response did not contain expected message ID');
      }

      return NextResponse.json({
        success: true,
        messageId: response.data.messages?.[0]?.id,
        data: response.data
      });
    } catch (error: any) {
      console.error('Error making WhatsApp API request:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      // Log the complete error for debugging
      if (error.response?.data?.error) {
        console.error('Complete WhatsApp API error:', JSON.stringify(error.response.data.error, null, 2));
      }
      
      throw error; // Re-throw to be caught by the outer catch block
    }
  } catch (error: any) {
    console.error('Error sending WhatsApp template:', error);
    
    // Determine the error type and provide specific error messages
    let statusCode = 500;
    let errorMessage = 'Unknown error occurred';
    let errorDetails: Record<string, any> = {};
    
    if (error.response) {
      // This is an Axios error with a response from the server
      statusCode = error.response.status || 500;
      
      // Format WhatsApp API errors in a readable way
      if (error.response.data?.error) {
        const whatsappError = error.response.data.error;
        errorMessage = whatsappError.message || whatsappError.error_message || 'WhatsApp API error';
        errorDetails = {
          code: whatsappError.code || whatsappError.error_code,
          subcode: whatsappError.error_subcode,
          fbTraceId: whatsappError.fbtrace_id,
          details: whatsappError.error_data || whatsappError.details
        };
        
        // Special handling for parameter mismatch error
        if (whatsappError.code === 132000 || errorMessage.includes('parameters')) {
          errorMessage = "Template parameter mismatch: The number of parameters doesn't match what the template expects";
          errorDetails.troubleshooting = [
            "1. Check your WhatsApp template in Meta Business Manager to confirm its exact parameters",
            "2. For 'hello_world' template, typically no parameters are needed",
            "3. Try using a different template that matches your parameter structure",
            "4. Consider creating a custom template that accepts the parameters you want to send"
          ];
        }
        
        console.error('WhatsApp API error details:', errorDetails);
      } else {
        errorMessage = 'Error from WhatsApp API';
        errorDetails = error.response.data;
      }
    } else if (error.request) {
      // Request was made but no response received
      statusCode = 503;
      errorMessage = 'No response received from WhatsApp API';
      errorDetails = { message: 'The request was made but no response was received' };
    } else if (error.message) {
      // Error setting up the request
      errorMessage = error.message;
    }
    
    // Add helpful troubleshooting info for specific errors
    if (errorMessage.includes('token')) {
      errorDetails.troubleshooting = 'Please check your WhatsApp API token in user settings';
    } else if (errorMessage.includes('template')) {
      errorDetails.troubleshooting = 'Please verify your template ID exists and is approved';
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: errorDetails
      },
      { status: statusCode }
    );
  }
} 