import axios from 'axios';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import userSettings from '../userSettings';
import { supabase } from './supabase';

// Keep the important maps and variables
const conversationHistory = new Map();
const leadInfo = new Map();

// Verify WhatsApp webhook
export function verifyWhatsAppWebhook(mode, token, challenge, verifyToken) {
  console.log('Verifying WhatsApp webhook');
  console.log('Mode:', mode);
  console.log('Token:', token);
  console.log('Challenge:', challenge);
  console.log('Expected token:', verifyToken);

  if (mode && token) {
    if (mode === 'subscribe' && token === verifyToken) {
      console.log('Webhook verified successfully');
      return { status: 200, body: challenge };
    } else {
      console.log('Webhook verification failed');
      return { status: 403, body: 'Forbidden' };
    }
  } else {
    console.log('Missing mode or token');
    return { status: 400, body: 'Bad Request' };
  }
}

// Process WhatsApp webhook
export async function processWhatsAppWebhook(body) {
  console.log('Processing webhook payload:', JSON.stringify(body, null, 2));

  if (body.object === 'whatsapp_business_account') {
    for (const entry of body.entry) {
      for (const change of entry.changes) {
        if (change.value.messages) {
          const message = change.value.messages[0];
          console.log('Received message:', JSON.stringify(message, null, 2));

          const from = message.from;
          let userMessage;
          let messageType;

          if (message.type === 'button') {
            console.log('Button message detected');
            userMessage = message.button.text;
            messageType = 'button';
            console.log(`Received button press from ${from}: ${userMessage}`);
          } else if (message.type === 'interactive') {
            console.log('Interactive message detected');
            if (message.interactive.type === 'button_reply') {
              userMessage = message.interactive.button_reply.title;
              messageType = 'button';
              console.log(`Received button press from ${from}: ${userMessage}`);
            } else if (message.interactive.type === 'list_reply') {
              userMessage = message.interactive.list_reply.title;
              messageType = 'list';
              console.log(`Received list selection from ${from}: ${userMessage}`);
            } else {
              console.log('Received an unsupported interactive message type:', message.interactive.type);
              continue;
            }
          } else if (message.type === 'text' && message.text && message.text.body) {
            userMessage = message.text.body;
            messageType = 'text';
            console.log(`Received text message from ${from}: ${userMessage}`);
          } else {
            console.log('Received a non-text or unsupported message type:', message.type);
            continue;
          }

          if (message.context) {
            console.log('Message has context:', JSON.stringify(message.context, null, 2));
          }

          try {
            // Call handleMessage function which includes OpenAI API call
            await handleMessage({
              from: from,
              type: messageType,
              text: { body: userMessage },
              context: message.context
            });
          } catch (error) {
            console.error('Error handling message:', error);
          }
        }

        if (change.value.statuses) {
          change.value.statuses.forEach(status => {
            handleMessageStatus(status);
          });
        }
      }
    }
    
    return true;
  }
  
  return false;
}

// Normalize phone number
function normalizePhoneNumber(phone) {
  phone = phone.replace(/\D/g, '').replace(/^0+/, '');
  if (!phone.startsWith('49')) {
    phone = `49${phone}`;
  }
  return phone;
}

// Handle individual message
export async function handleMessage(message) {
  console.log('Processing message:', JSON.stringify(message, null, 2));
  const phoneNumber = normalizePhoneNumber(message.from);
  const userMessage = message.text.body;

  try {
    // Get lead info including the assigned userId if available
    const leadData = leadInfo.get(phoneNumber) || { name: 'WhatsApp User' };
    
    // Use assigned userId from lead info if available, otherwise try to resolve from phone
    let userId = leadData.userId;
    if (!userId) {
      userId = await userSettings.getUserIdByPhone(phoneNumber);
      console.log(`Resolved phone ${phoneNumber} to user ${userId} from phone mapping`);
    } else {
      console.log(`Using assigned user ${userId} for phone ${phoneNumber} from lead info`);
    }

    // Find or create a lead ID for this phone number
    let leadId;
    try {
      const { data: existingLead } = await supabase
        .from('leads')
        .select('id')
        .eq('phone_number', phoneNumber)
        .single();
      
      if (existingLead) {
        leadId = existingLead.id;
      } else {
        // Create a new lead if none exists
        const { data: newLead, error } = await supabase
          .from('leads')
          .insert({
            name: leadData.name || 'WhatsApp User',
            phone_number: phoneNumber,
            status: 'New',
            user_id: userId
          })
          .select('id')
          .single();
        
        if (error) throw error;
        leadId = newLead.id;
      }
    } catch (error) {
      console.error('Error finding/creating lead:', error);
      throw error;
    }
    
    // Store the incoming message in the database
    const { data: messageRecord } = await supabase
      .from('lead_conversations')
      .insert({
        user_id: userId,
        lead_id: leadId,
        message_id: message.id || crypto.randomUUID(),
        message_content: userMessage,
        direction: 'inbound',
        message_type: 'text',
        created_at: new Date().toISOString(),
        status: 'delivered'
      })
      .select('id')
      .single();
    
    // Get conversation history from database (last 10 messages)
    const { data: conversationHistory } = await supabase
      .from('lead_conversations')
      .select('message_content, direction, created_at')
      .eq('lead_id', leadId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);
    
    // Format the messages for the OpenAI API
    let userHistory = conversationHistory
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      .map(msg => ({
        role: msg.direction === 'inbound' ? 'user' : 'assistant',
        content: msg.message_content
      }));
    
    // Get user-specific system prompt
    const systemPrompt = await userSettings.getSystemPromptForUser(userId);
    
    // Get user-specific OpenAI instance and model
    const openai = await userSettings.getOpenAIForUser(userId);
    const model = await userSettings.getOpenAIModel(userId);
    
    // Generate AI response using user-specific settings
    const aiResponse = await generateAIResponseForUser(userHistory, systemPrompt, openai, model);
    
    // Record the AI response in the database
    await supabase
      .from('lead_conversations')
      .insert({
        user_id: userId,
        lead_id: leadId,
        message_id: crypto.randomUUID(),
        message_content: aiResponse,
        direction: 'outbound',
        message_type: 'text',
        created_at: new Date().toISOString(),
        status: 'sent'
      });
    
    // Send WhatsApp message using user-specific settings
    await sendWhatsAppMessageForUser(userId, phoneNumber, aiResponse);
    await markLeadAsContacted(phoneNumber);

    // Check for trigger words
    if (isLeadInterested(userMessage, aiResponse)) {
      console.log(`Trigger words detected for ${phoneNumber}. Lead is interested.`);
      // Handle interested leads (add your logic here)
    }
    
    console.log('Message handling completed successfully');
    return true;
  } catch (error) {
    console.error('Error handling message:', error);
    return false;
  }
}

// Generate AI response for user
async function generateAIResponseForUser(userHistory, systemPrompt, openai, model) {
  try {
    console.log(`Generating AI response with model: ${model}`);
    
    const response = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: "system", content: systemPrompt },
        ...userHistory
      ],
      max_tokens: 150
    });
    
    console.log('AI response generated successfully');
    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error generating AI response:', error);
    console.error('OpenAI error details:', {
      message: error.message,
      type: error.type,
      code: error.code,
      statusCode: error.status || error.statusCode,
      model: model
    });
    
    // Fallback to a safe response if there's an error
    return "Thank you for your message. I'm having trouble processing that right now. Please try again in a moment.";
  }
}

// Send WhatsApp message for user
async function sendWhatsAppMessageForUser(userId, to, message) {
  const phoneNumberId = await userSettings.getWhatsAppPhoneNumberId(userId);
  const token = await userSettings.getWhatsAppToken(userId);
  
  console.log(`Preparing to send WhatsApp message for user ${userId}:`, {
    hasPhoneId: !!phoneNumberId,
    phoneIdValue: phoneNumberId,
    hasToken: !!token,
    tokenLength: token ? token.length : 0,
    recipient: to,
    messageLength: message ? message.length : 0
  });
  
  if (!phoneNumberId) {
    throw new Error(`WhatsApp Phone Number ID not found for user ${userId}`);
  }
  
  if (!token) {
    throw new Error(`WhatsApp Token not found for user ${userId}`);
  }
  
  const url = `https://graph.facebook.com/v16.0/${phoneNumberId}/messages`;

  try {
    const response = await axios.post(
      url,
      {
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: {
          body: message
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('Message sent successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error sending WhatsApp message:', error.response ? error.response.data : error.message);
    console.error('WhatsApp request details:', {
      url,
      phoneNumberId,
      tokenLength: token.length,
      recipient: to
    });
    throw error;
  }
}

// Send WhatsApp template message for user
export async function sendWhatsAppTemplateMessageForUser(userId, to, components, imageUrl) {
  if (!to) {
    throw new Error('Recipient phone number is required');
  }

  const formattedNumber = to.startsWith('49') ? to : `49${to}`;
  
  // Get user-specific settings
  const phoneNumberId = await userSettings.getWhatsAppPhoneNumberId(userId);
  const token = await userSettings.getWhatsAppToken(userId);
  const templateId = await userSettings.getTemplateId(userId);

  try {
    console.log(`Sending template message to ${formattedNumber}: ${templateId}`);
    const response = await axios.post(
      `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: formattedNumber,
        type: 'template',
        template: {
          name: templateId,
          language: { code: 'en' },
          components: [
            {
              type: 'header',
              parameters: [
                {
                  type: 'image',
                  image: {
                    link: imageUrl
                  }
                }
              ]
            },
            ...components
          ]
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('Template message sent successfully:', response.data);
    return response.data.messages[0].id; // Return the message ID
  } catch (error) {
    console.error('Error sending template message:', error.response ? error.response.data : error.message);
    throw error;
  }
}

// Mark lead as contacted
export async function markLeadAsContacted(phone, status = 'contacted') {
  const phoneNumber = phone.replace(/\D/g, '');
  const STATUS_FILE_PATH = path.join(process.cwd(), 'lead_status.json');
  
  let currentStatus = {};

  try {
    const fileContent = fs.readFileSync(STATUS_FILE_PATH, 'utf8');
    currentStatus = JSON.parse(fileContent);
  } catch (error) {
    console.error('Error reading lead_status.json:', error);
    // If there's an error reading the file, we'll start with an empty object
  }

  if (!currentStatus[phoneNumber] || !currentStatus[phoneNumber].contacted) {
    currentStatus[phoneNumber] = {
      contacted: true,
      timestamp: new Date().toISOString(),
      status: status
    };

    fs.writeFileSync(STATUS_FILE_PATH, JSON.stringify(currentStatus, null, 2));
    console.log(`Updated local status for ${phoneNumber}: ${status}`);
  } else {
    console.log(`Skipped update for ${phoneNumber}: already contacted`);
  }
  
  return true;
}

// Handle message status updates
export function handleMessageStatus(status) {
  const { id, status: messageStatus, recipient_id } = status;
  console.log(`Message ${id} to ${recipient_id} status: ${messageStatus}`);
  
  // Implement additional handling if needed
}

// Check if lead is interested based on trigger words
export function isLeadInterested(userMessage, aiResponse) {
  const triggerWords = ['book', 'schedule', 'appointment', 'consultation', 'interested', 'learn more'];
  const lowerUserMessage = userMessage.toLowerCase();
  const lowerAiResponse = aiResponse.toLowerCase();
  
  const userTriggered = triggerWords.some(word => lowerUserMessage.includes(word));
  const aiTriggered = triggerWords.some(word => lowerAiResponse.includes(word));
  
  if (userTriggered || aiTriggered) {
    console.log(`Trigger words detected. User: ${userTriggered}, AI: ${aiTriggered}`);
    return true;
  }
  
  console.log('No trigger words detected.');
  return false;
} 