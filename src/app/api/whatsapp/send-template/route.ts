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
function createTemplateComponents(templateName: string, leadName: string | null = null, imageUrl: string | null = null, templateVariables: Record<number, string> | null = null) {
  const components: any[] = [];
  
  console.log('Creating template components for:', {
    templateName,
    hasLeadName: !!leadName,
    hasImageUrl: !!imageUrl,
    hasTemplateVariables: !!templateVariables,
    templateVariablesKeys: templateVariables ? Object.keys(templateVariables) : []
  });
  
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
  
  // For all other templates with images, we must include a header component
  if (imageUrl) {
    console.log('Adding image header component with URL:', imageUrl);
    
    // Make sure the URL is properly formatted and accessible
    const formattedImageUrl = imageUrl.trim();
    console.log('Using formatted image URL:', formattedImageUrl);
    
    // Ensure we're using the correct structure for header with image
    components.push({
      type: 'header',
      parameters: [
        {
          type: 'image',
          image: {
            link: formattedImageUrl
          }
        }
      ]
    });
  }
  
  // For the body component, always include it even if empty
  // WhatsApp requires this component, even if it has no parameters
  let bodyParameters: any[] = [];
  
  // Add template variables to body parameters if provided
  if (templateVariables && Object.keys(templateVariables).length > 0) {
    bodyParameters = formatTemplateParameters(templateVariables);
    console.log(`Using ${bodyParameters.length} formatted parameters for body`);
  } 
  // Fallback to just using leadName if no template variables provided but name exists
  else if (leadName) {
    bodyParameters = [{ type: 'text', text: leadName ? String(leadName).trim() : '' }];
    console.log('Using leadName as single body parameter');
  }
  
  // Always add the body component, even with empty parameters
  // This is required by WhatsApp's API
  components.push({
    type: 'body',
    parameters: bodyParameters
  });
  
  // Some templates may also need a footer or buttons component
  // For now we're not handling these, but they would be added here
  
  console.log('Final components structure:', JSON.stringify(components, null, 2));
  return components;
}

// Add a helper function to safely format template parameters
function formatTemplateParameters(templateVariables: Record<number, string> | null) {
  if (!templateVariables || Object.keys(templateVariables).length === 0) {
    return [];
  }
  
  try {
    // Ensure all parameters are properly formatted as text
    return Object.entries(templateVariables)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .map(([_, value]: [string, any]) => {
        // Ensure value is a non-empty string
        const stringValue = value != null ? String(value).trim() : '';
        
        // Log each parameter for debugging
        console.log(`Parameter value: "${stringValue}" (type: ${typeof value})`);
        
        return { 
          type: 'text', 
          text: stringValue
        };
      });
  } catch (error) {
    console.error('Error formatting template parameters:', error);
    // Return empty array as fallback
    return [];
  }
}

export async function POST(request: Request) {
  try {
    console.log('WhatsApp template API: Received request');
    
    // Get the request body
    const body = await request.json();
    const { 
      phoneNumber, 
      leadName, 
      leadId, 
      userId: requestUserId, 
      templateVariables,
      templateId: requestTemplateId,
      templateLanguage: requestLanguage,
      whatsappPhoneId: requestPhoneId,
      templateImageUrl: requestImageUrl,
      needsHeaderComponent = false,
      isFallback = false,
      skipImageHeader = false,
      explicitComponents = null
    } = body;

    console.log('Request body:', {
      hasPhoneNumber: !!phoneNumber,
      hasLeadName: !!leadName,
      hasLeadId: !!leadId,
      hasRequestUserId: !!requestUserId,
      hasTemplateVariables: !!templateVariables,
      templateVariablesCount: templateVariables ? Object.keys(templateVariables).length : 0,
      hasRequestTemplateId: !!requestTemplateId,
      hasRequestLanguage: !!requestLanguage,
      hasRequestPhoneId: !!requestPhoneId,
      hasRequestImageUrl: !!requestImageUrl,
      needsHeaderComponent,
      isFallback,
      skipImageHeader,
      hasExplicitComponents: !!explicitComponents
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
      whatsapp_phone_id: dbPhoneId,
      whatsapp_template_id: dbTemplateId,
      whatsapp_language: dbLanguage,
      whatsapp_template_image_url: dbImageUrl,
      message_limit_24h: messageLimit
    } = userSettings;
    
    // Prioritize client-sent values over database settings
    const phoneId = requestPhoneId || dbPhoneId;
    const templateId = requestTemplateId || dbTemplateId;
    const language = requestLanguage || dbLanguage;
    const imageUrl = requestImageUrl || dbImageUrl;
    
    console.log('Using parameters:', {
      phoneId,
      templateId,
      language,
      hasImageUrl: !!imageUrl
    });
    
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
        }
      }
    };
    
    // Get components for the template
    try {
      // If client provided explicit components, use those directly
      if (explicitComponents) {
        console.log('Using explicit components from client');
        
        // Build components array from explicit structure
        const components = [];
        
        // Add header if provided
        if (explicitComponents.header) {
          components.push(explicitComponents.header);
        }
        
        // Always add body
        if (explicitComponents.body) {
          components.push(explicitComponents.body);
        } else {
          // Fallback body if none provided
          components.push({
            type: 'body',
            parameters: templateVariables ? 
              formatTemplateParameters(templateVariables) : []
          });
        }
        
        // Add footer if provided
        if (explicitComponents.footer) {
          components.push(explicitComponents.footer);
        }
        
        console.log('Using explicit components structure:', JSON.stringify(components, null, 2));
        requestPayload.template.components = components;
      }
      // For skip image mode, just focus on the body parameters
      else if (skipImageHeader) {
        console.log('Explicitly skipping header image as requested');
        
        if (templateVariables && Object.keys(templateVariables).length > 0) {
          // Use our safe parameter formatter 
          const parameters = formatTemplateParameters(templateVariables);
          
          requestPayload.template.components = [
            {
              type: 'body',
              parameters
            }
          ];
          
          console.log('Created body-only template with parameters');
        } else {
          // No parameters, just use an empty body component
          requestPayload.template.components = [
            {
              type: 'body',
              parameters: []
            }
          ];
          console.log('Created body-only template with empty parameters');
        }
      }
      // Conditional component creation logic based on if this is a fallback attempt
      else if (isFallback) {
        // For fallback mode, use a minimal component structure that should work
        // with most templates - just a body with parameters
        console.log('Using fallback template structure (no images)');
        
        if (templateVariables && Object.keys(templateVariables).length > 0) {
          // Use our safe parameter formatter
          const parameters = formatTemplateParameters(templateVariables);
          
          requestPayload.template.components = [
            {
              type: 'body',
              parameters
            }
          ];
        } else {
          // No parameters, just use an empty body component
          requestPayload.template.components = [
            {
              type: 'body',
              parameters: []
            }
          ];
        }
      } else {
        // Normal mode - use our component creation logic
        const components = createTemplateComponents(templateId, leadName, imageUrl, templateVariables);
        
        // Only add components if there are any (prevents null/undefined values)
        if (components && components.length > 0) {
          // Properly structuring the template with components
          // WhatsApp API expects specific component structure
          requestPayload.template.components = components;
        } else {
          // Even if no custom components, ensure we have a valid structure
          // Some templates require at minimum an empty body component
          requestPayload.template.components = [
            {
              type: 'body',
              parameters: []
            }
          ];
        }
        
        // Special check for templates with images but missing header
        if (imageUrl && needsHeaderComponent && !components.some((comp: any) => comp.type === 'header')) {
          console.warn('Template has image URL but no header component. Adding header component.');
          requestPayload.template.components.unshift({
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
        
        // Create and test for valid structure
        if (!requestPayload.template.components.some((comp: any) => comp.type === 'body')) {
          console.warn('Template missing required body component. Adding empty body component.');
          requestPayload.template.components.push({
            type: 'body',
            parameters: []
          });
        }
      }
    } catch (error: any) {
      console.error('Error creating template components:', error);
      return NextResponse.json(
        { error: `Failed to create template components: ${error.message}` },
        { status: 400 }
      );
    }

    console.log('WhatsApp API request payload (without sensitive data):', {
      to: normalizedPhone,
      templateName: templateId,
      languageCode: language,
      hasImageUrl: !!imageUrl,
      hasLeadName: !!leadName,
      componentsCount: requestPayload.template.components?.length || 0
    });

    // Log detailed request payload for debugging
    console.log('Full WhatsApp API request payload:', JSON.stringify(requestPayload, null, 2));
    
    // Add informative warning about template parameters
    console.log('⚠️ IMPORTANT: If you get an error about number of parameters, make sure:');
    console.log('1. The template_id matches an approved template in your WhatsApp Business Account');
    console.log('2. You are providing the exact number of parameters the template requires');
    console.log('3. The parameter types (text, image, etc.) match what the template expects');
    console.log('4. For templates with images, ensure the image URL is publicly accessible');
    
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
        
        // Log specific details about missing parameters
        if (error.response.data.error.code === 131008 || 
            error.response.data.error.message?.includes('Required parameter')) {
          console.error('WhatsApp ERROR: Missing required parameter. Check:');
          console.error('1. Template exists in Business Manager and is approved');
          console.error('2. Template components have required structure (header/body/footer)');
          console.error('3. Required parameters match template definition exactly');
          console.error('4. For image templates, the image URL is valid and accessible');
          console.error('5. Full request payload:', JSON.stringify(requestPayload, null, 2));
        }
        
        // Log specific details about parameter format mismatches
        if (error.response.data.error.code === 132012 || 
            error.response.data.error.message?.includes('Parameter format')) {
          console.error('WhatsApp ERROR: Parameter format mismatch. Check:');
          console.error('1. Each parameter must match the type defined in the template (text/image/currency etc.)');
          console.error('2. The number of parameters must match exactly what the template expects');
          console.error('3. Parameter order must match template definition');
          console.error('4. For text parameters, ensure values are valid strings with no special formatting');
          console.error('5. Parameters being sent:', JSON.stringify(requestPayload.template.components, null, 2));
          
          // Try a simplified approach with fewer parameters as a last resort
          try {
            // Create a simplified payload with only the first parameter (if any)
            let simplifiedComponents = [];
            
            // Keep header if it exists
            const headerComponent = requestPayload.template.components.find((c: any) => c.type === 'header');
            if (headerComponent) {
              simplifiedComponents.push(headerComponent);
            }
            
            // Add a body with minimal parameters
            const bodyComponent = requestPayload.template.components.find((c: any) => c.type === 'body');
            if (bodyComponent && bodyComponent.parameters && bodyComponent.parameters.length > 0) {
              // Just use the first parameter to test
              const firstParam = bodyComponent.parameters[0];
              simplifiedComponents.push({
                type: 'body',
                parameters: [firstParam]
              });
            } else {
              // Add empty body if needed
              simplifiedComponents.push({
                type: 'body',
                parameters: []
              });
            }
            
            console.log('Trying last resort approach with simplified components:', 
                        JSON.stringify(simplifiedComponents, null, 2));
                        
            // Update the payload with simplified components
            requestPayload.template.components = simplifiedComponents;
            
            // Make one more attempt with the simplified payload
            const simplifiedResponse = await axios.post(url, requestPayload, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
            
            console.log('Last resort approach succeeded:', {
              status: simplifiedResponse.status,
              hasMessages: !!simplifiedResponse.data?.messages,
              messageCount: simplifiedResponse.data?.messages?.length || 0
            });
            
            return NextResponse.json({
              success: true,
              messageId: simplifiedResponse.data.messages?.[0]?.id,
              data: simplifiedResponse.data,
              note: 'Used simplified parameters due to format mismatch'
            });
          } catch (simplifiedError: any) {
            console.error('Last resort approach also failed:', simplifiedError.message);
            // Continue with normal error handling
          }
        }
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