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
              context: message.context,
              id: message.id // Pass the message ID
            });
          } catch (error) {
            console.error('Error handling message:', error);
          }
        }

        if (change.value.statuses) {
          console.log('====== RECEIVED STATUS UPDATES ======');
          console.log('Status updates:', JSON.stringify(change.value.statuses, null, 2));
          
          for (const status of change.value.statuses) {
            try {
              console.log(`Processing status update for message ${status.id}: ${status.status}`);
              await handleMessageStatus(status);
            } catch (statusError) {
              console.error('Error handling message status:', statusError);
            }
          }
          
          console.log('====== END STATUS UPDATES ======');
        }
      }
    }
    
    return true;
  }
  
  return false;
}

// Normalize phone number
function normalizePhoneNumber(phone) {
  if (!phone) return '';
  
  // Log the input format
  console.log(`Normalizing phone number: ${phone}`);
  
  // Remove ALL non-digit characters (spaces, dashes, parentheses, etc.)
  let normalized = phone.replace(/\D/g, '');
  
  // Remove leading zeros
  normalized = normalized.replace(/^0+/, '');
  
  // If number doesn't already have the German country code (49), add it
  if (!normalized.startsWith('49')) {
    normalized = `49${normalized}`;
  }
  
  // If the number has extra prefixes, try to remove them
  if (normalized.length > 13) {
    console.log(`Phone number unusually long: ${normalized}, might have extra prefix`);
    // Try to keep only the last 11-12 digits with country code
    if (normalized.length > 14) {
      const shorter = normalized.slice(-12);
      if (shorter.startsWith('49')) {
        console.log(`Trimming extra digits, from ${normalized} to ${shorter}`);
        normalized = shorter;
      }
    }
  }
  
  console.log(`Normalized phone number result: ${normalized}`);
  return normalized;
}

// Helper function to check all existing conversations for a phone number
async function debugExistingConversations(phoneNumber) {
  try {
    console.log(`----- DEBUG: Looking for all conversations for phone ${phoneNumber} -----`);
    
    // Step 1: Find all leads with this phone number
    const { data: leads } = await supabase
      .from('leads')
      .select('id, name, status, user_id')
      .eq('phone', phoneNumber);
    
    if (!leads || leads.length === 0) {
      console.log(`No leads found with phone number ${phoneNumber}`);
      return;
    }
    
    console.log(`Found ${leads.length} leads with phone ${phoneNumber}:`);
    leads.forEach((lead, index) => {
      console.log(`  [${index + 1}] Lead ID: ${lead.id}, Name: ${lead.name}, Status: ${lead.status}, User: ${lead.user_id}`);
    });
    
    // Step 2: Find all conversations for these leads
    for (const lead of leads) {
      const { data: conversations } = await supabase
        .from('lead_conversations')
        .select('id, message_id, direction, message_type, template_id, message_content, created_at')
        .eq('lead_id', lead.id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (!conversations || conversations.length === 0) {
        console.log(`  No conversations found for lead ${lead.id}`);
        continue;
      }
      
      console.log(`  Found ${conversations.length} conversations for lead ${lead.id}:`);
      conversations.forEach((convo, index) => {
        console.log(`    [${index + 1}] ${convo.created_at} - ${convo.direction}/${convo.message_type} - ID: ${convo.message_id}`);
        console.log(`        Content: ${convo.message_content}`);
      });
    }
    
    console.log(`----- END DEBUG for ${phoneNumber} -----`);
  } catch (error) {
    console.error('Error in debugExistingConversations:', error);
  }
}

// Handle individual message
export async function handleMessage(message) {
  console.log('Processing message:', JSON.stringify(message, null, 2));
  const phoneNumber = normalizePhoneNumber(message.from);
  const userMessage = message.text.body;
  
  // DEBUG: Always check existing conversations for this phone number
  await debugExistingConversations(phoneNumber);
  
  // Extract originating message ID if this is a reply to a template
  let originatingMessageId = null;
  if (message.context && message.context.id) {
    originatingMessageId = message.context.id;
    console.log(`This is a reply to message: ${originatingMessageId}`);
  }

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

    // Find existing lead ID for this phone number
    let leadId = null;
    let existingLead = null;
    let foundByContext = false;
    
    // If this is a reply to a message, try to find the original conversation
    if (originatingMessageId) {
      try {
        // First try exact match
        console.log(`Searching for exact message_id match: ${originatingMessageId}`);
        let { data: originalMessage } = await supabase
          .from('lead_conversations')
          .select('lead_id, user_id, message_id')
          .eq('message_id', originatingMessageId)
          .single();
        
        if (!originalMessage) {
          // WhatsApp tends to format IDs differently in replies - try with wamid: prefix
          const possibleFormats = [
            originatingMessageId,
            originatingMessageId.replace('wamid:', ''),
            originatingMessageId.startsWith('wamid:') ? originatingMessageId : `wamid:${originatingMessageId}`,
            // Sometimes IDs get truncated, try partial match
            originatingMessageId.slice(0, 20) + '%'
          ];
          
          console.log('Checking additional ID formats:', possibleFormats);
          
          // Try each format
          for (const format of possibleFormats) {
            if (format === originatingMessageId) continue; // Skip the one we already tried
            
            const { data: formatMatch } = await supabase
              .from('lead_conversations')
              .select('lead_id, user_id, message_id')
              .eq('message_id', format)
              .single();
              
            if (formatMatch) {
              console.log(`Found message with alternate format: ${format}`);
              originalMessage = formatMatch;
              break;
            }
          }
          
          // If still not found, try using LIKE query for partial matches
          if (!originalMessage) {
            console.log('Trying partial message ID match with LIKE query');
            const { data: partialMatches } = await supabase
              .from('lead_conversations')
              .select('lead_id, user_id, message_id')
              .filter('message_id', 'ilike', `%${originatingMessageId.slice(-20)}%`) // Using last part of ID
              .order('created_at', { ascending: false })
              .limit(1);
              
            if (partialMatches && partialMatches.length > 0) {
              console.log(`Found message with partial match: ${partialMatches[0].message_id}`);
              originalMessage = partialMatches[0];
            }
          }
          
          // If still not found, try to find by phone number
          if (!originalMessage) {
            console.log('Still no match found, falling back to phone lookup');
            // Get all recent message IDs for debugging
            const { data: recentMessages } = await supabase
              .from('lead_conversations')
              .select('message_id')
              .order('created_at', { ascending: false })
              .limit(10);
              
            console.log('Recent message IDs in database:', recentMessages?.map(m => m.message_id));
            
            // Try using phone number to find the latest conversation instead
            console.log(`Falling back to looking up by phone number: ${phoneNumber}`);
            const { data: leadsByPhone } = await supabase
              .from('leads')
              .select('id, user_id')
              .eq('phone', phoneNumber);
              
            if (leadsByPhone && leadsByPhone.length > 0) {
              console.log(`Found ${leadsByPhone.length} leads with phone ${phoneNumber}`);
              // Use the most recently contacted lead
              const leadIds = leadsByPhone.map(l => l.id);
              
              const { data: latestConversation } = await supabase
                .from('lead_conversations')
                .select('lead_id, user_id')
                .in('lead_id', leadIds)
                .order('created_at', { ascending: false })
                .limit(1);
                
              if (latestConversation && latestConversation.length > 0) {
                originalMessage = latestConversation[0];
                console.log(`Found latest conversation with lead_id: ${originalMessage.lead_id}`);
              }
            }
          }
        }
        
        if (originalMessage) {
          leadId = originalMessage.lead_id;
          userId = originalMessage.user_id; // Ensure we use the same user_id as the original message
          foundByContext = true;
          console.log(`Found original conversation with lead_id: ${leadId} and user_id: ${userId}`);
        }
      } catch (error) {
        console.log(`Couldn't find original message with ID ${originatingMessageId}:`, error);
        // Continue with normal flow if we can't find the original message
      }
    }
    
    // If we couldn't find a lead via message context, look it up by phone number
    if (!leadId) {
      try {
        console.log(`Looking up lead by phone: ${phoneNumber}`);
        
        // First, log all leads for debugging
        console.log(`DEBUG: Fetching all leads to check phone numbers`);
        const { data: allLeads } = await supabase
          .from('leads')
          .select('id, name, phone, status, user_id');
          
        if (allLeads && allLeads.length > 0) {
          console.log(`DEBUG: Found ${allLeads.length} total leads in system`);
          
          // Find any leads with matching phone (ignoring spaces/formatting)
          const strippedPhone = phoneNumber.replace(/\D/g, '');
          const matchingLeads = allLeads.filter(lead => {
            const leadPhone = (lead.phone || '').replace(/\D/g, '');
            return leadPhone === strippedPhone || 
                   leadPhone === strippedPhone.replace(/^49/, '') ||
                   '49' + leadPhone === strippedPhone;
          });
          
          if (matchingLeads.length > 0) {
            console.log(`DEBUG: Found ${matchingLeads.length} leads with matching phone numbers (ignoring spaces/formatting):`);
            matchingLeads.forEach(lead => 
              console.log(`  - ID: ${lead.id}, Name: ${lead.name}, Phone: ${lead.phone}, Status: ${lead.status}, User: ${lead.user_id}`)
            );
            
            // Use the first matching lead
            const matchedLead = matchingLeads[0];
            existingLead = matchedLead;
            leadId = matchedLead.id;
            
            // If we found the lead but userId is different, use the lead's user_id for consistency
            if (matchedLead.user_id && matchedLead.user_id !== userId) {
              console.log(`Updating userId from ${userId} to ${matchedLead.user_id} based on lead association`);
              userId = matchedLead.user_id;
            }
            
            console.log(`Using matched lead with ID: ${leadId} (${matchedLead.name})`);
          } else {
            console.log(`DEBUG: No leads found with matching phone number (ignoring spaces/formatting)`);
            
            // If exact matching failed, try to match on last 8 digits
            const last8Digits = strippedPhone.slice(-8);
            const similarLeads = allLeads.filter(lead => {
              const leadPhone = (lead.phone || '').replace(/\D/g, '');
              return leadPhone.endsWith(last8Digits);
            });
            
            if (similarLeads.length > 0) {
              console.log(`DEBUG: Found ${similarLeads.length} leads with similar phone numbers (matching last 8 digits):`);
              similarLeads.forEach(lead => 
                console.log(`  - ID: ${lead.id}, Name: ${lead.name}, Phone: ${lead.phone}, Status: ${lead.status}, User: ${lead.user_id}`)
              );
              
              // Use the first similar lead by default
              const selectedLead = similarLeads[0];
              existingLead = selectedLead;
              leadId = selectedLead.id;
              
              // If we found the lead but userId is different, use the lead's user_id for consistency
              if (selectedLead.user_id && selectedLead.user_id !== userId) {
                console.log(`Updating userId from ${userId} to ${selectedLead.user_id} based on lead association`);
                userId = selectedLead.user_id;
              }
              
              console.log(`Using similar lead with ID: ${leadId} (${selectedLead.name})`);
            } else {
              console.log(`DEBUG: No leads found with similar phone numbers (matching last 8 digits)`);
            }
          }
        } else {
          console.log(`DEBUG: No leads found in system`);
        }
      } catch (error) {
        console.error('Error finding/creating lead:', error);
        throw error;
      }
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
        template_id: '',
        created_at: new Date().toISOString(),
        status: 'delivered'
      })
      .select('id')
      .single();

    // Update lead status to "Replied" if a lead ID was found
    if (leadId) {
      try {
        // Update lead status in database
        const { data, error } = await supabase
          .from('leads')
          .update({ 
            status: 'Replied'
          })
          .eq('id', leadId);
          
        if (error) {
          console.error('Error updating lead status to Replied:', error);
        } else {
          console.log(`Updated lead ${leadId} status to Replied`);
        }
        
        // Also update local status file
        await markLeadAsContacted(phoneNumber, 'Replied');
      } catch (updateError) {
        console.error('Error updating lead status to Replied:', updateError);
      }
    }
    
    // Get conversation history from database (last 10 messages)
    const { data: conversationHistory } = await supabase
      .from('lead_conversations')
      .select('message_content, direction, created_at')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(10);
    
    // Format as OpenAI messages
    let userHistory = [];
    if (conversationHistory && conversationHistory.length > 0) {
      // We need to reverse to get chronological order
      const chronologicalHistory = [...conversationHistory].reverse();
      
      userHistory = chronologicalHistory.map(msg => ({
        role: msg.direction === 'inbound' ? 'user' : 'assistant',
        content: msg.message_content
      }));
      
      console.log(`Retrieved ${userHistory.length} messages from conversation history`);
    } else {
      // If no history, just use this message
      userHistory = [{ role: 'user', content: userMessage }];
      console.log('No conversation history found, using current message only');
    }

    // Get user-specific system prompt
    const systemPrompt = await userSettings.getSystemPromptForUser(userId);
    console.log(`Retrieved system prompt for message handling:`, {
      userId,
      hasSystemPrompt: !!systemPrompt,
      systemPromptLength: systemPrompt ? systemPrompt.length : 0,
      preview: systemPrompt ? systemPrompt.substring(0, 50) + '...' : 'null or empty'
    });

    // Get user-specific OpenAI instance and model
    const openai = await userSettings.getOpenAIForUser(userId);
    const model = await userSettings.getOpenAIModel(userId);
    console.log(`Using OpenAI model for user ${userId}: ${model}`);
    
    // Generate AI response
    try {
      console.log(`Generating AI response for lead ID ${leadId}, user ${userId}, phone ${phoneNumber}`);
      // Get last 10 messages from the lead_conversations table
      const { data: conversationHistory, error: historyError } = await supabase
        .from('lead_conversations')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (historyError) {
        console.error('Error fetching conversation history:', historyError);
      }

      // Format messages for OpenAI
      let messages = [];

      if (conversationHistory && conversationHistory.length > 0) {
        // Sort by created_at ascending
        conversationHistory.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        
        console.log(`Found ${conversationHistory.length} previous messages in conversation history`);
        
        messages = conversationHistory.map(message => ({
          role: message.direction === 'inbound' ? 'user' : 'assistant',
          content: message.message_content
        }));
      } else {
        console.log('No previous conversation history found');
      }

      // Add the current message (we don't need to add it again if it's already in the history)
      // Check if the current message is already in the messages array
      const currentMessageExists = messages.some(
        msg => msg.role === 'user' && msg.content === userMessage
      );
      
      if (!currentMessageExists) {
        console.log('Adding current message to conversation history');
        messages.push({
          role: 'user',
          content: userMessage
        });
      } else {
        console.log('Current message already exists in conversation history');
      }

      console.log('Preparing to generate AI response with these messages:', 
        messages.map(m => ({ role: m.role, content_preview: m.content.substring(0, 30) + '...' })));

      // Generate AI response - passing userId to get user-specific prompt and model
      const aiResponse = await generateAIResponseForUser(messages, userId);
      console.log(`Generated AI response (${aiResponse.length} chars): "${aiResponse.substring(0, 100)}${aiResponse.length > 100 ? '...' : ''}"`);

      // Send the AI response back to the user
      console.log(`Sending AI response to WhatsApp for lead ID: ${leadId}`);
      await sendWhatsAppMessageForUser(userId, phoneNumber, aiResponse, leadId);
      console.log('AI response sent successfully');
    } catch (error) {
      console.error('Error generating or sending AI response:', error);
    }
    
    // If we found a lead, update its status (but only if not already contacted)
    if (leadId) {
      await markLeadAsContacted(phoneNumber);
    }

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
async function generateAIResponseForUser(messages, userId) {
  try {
    // Get user-specific OpenAI instance and model
    const openai = await userSettings.getOpenAIForUser(userId);
    const model = await userSettings.getOpenAIModel(userId);
    // Get user-specific system prompt
    const systemPrompt = await userSettings.getSystemPromptForUser(userId);
    
    console.log(`Generating AI response with model: ${model}`);
    console.log(`Using system prompt: ${systemPrompt ? systemPrompt.substring(0, 50) + '...' : 'Default system prompt'}`);
    
    // Create the full messages array with system prompt
    const fullMessages = [
      { role: 'system', content: systemPrompt || "You are a helpful assistant representing a business. Be friendly and professional." }
    ].concat(messages);
    
    const response = await openai.chat.completions.create({
      model: model,
      messages: fullMessages,
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
      statusCode: error.status || error.statusCode
    });
    
    // Fallback to a safe response if there's an error
    return "Thank you for your message. I'm having trouble processing that right now. Please try again in a moment.";
  }
}

// Send WhatsApp message for user
async function sendWhatsAppMessageForUser(userId, to, message, leadId = null) {
  const phoneNumberId = await userSettings.getWhatsAppPhoneNumberId(userId);
  const token = await userSettings.getWhatsAppToken(userId);
  
  console.log(`Preparing to send WhatsApp message for user ${userId}:`, {
    hasPhoneId: !!phoneNumberId,
    phoneIdValue: phoneNumberId,
    hasToken: !!token,
    tokenLength: token ? token.length : 0,
    recipient: to,
    messageLength: message ? message.length : 0,
    hasLeadId: !!leadId
  });
  
  if (!phoneNumberId) {
    throw new Error(`WhatsApp Phone Number ID not found for user ${userId}`);
  }
  
  if (!token) {
    throw new Error(`WhatsApp Token not found for user ${userId}`);
  }
  
  // If no leadId was provided, try to find one based on the phone number
  if (!leadId) {
    try {
      console.log(`No lead ID provided, attempting to find one for phone ${to}`);
      const strippedPhone = to.replace(/\D/g, '');
      const { data: matchingLeads } = await supabase
        .from('leads')
        .select('id')
        .or(`phone.ilike.%${strippedPhone.slice(-8)}%,phone.eq.${to}`);
      
      if (matchingLeads && matchingLeads.length > 0) {
        leadId = matchingLeads[0].id;
        console.log(`Found lead ID for outbound message: ${leadId}`);
      } else {
        console.log(`No lead found for phone ${to} when sending AI response`);
      }
    } catch (error) {
      console.error('Error finding lead ID:', error);
      // Continue without lead ID - the message will still be sent but not recorded
    }
  }
  
  const url = `https://graph.facebook.com/v16.0/${phoneNumberId}/messages`;

  try {
    // Send the message to WhatsApp
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
    
    // Extract the message ID from the response
    const messageId = response.data?.messages?.[0]?.id;
    
    // Save the outbound AI message to the lead_conversations table
    if (leadId && messageId) {
      const { data: messageRecord, error: messageError } = await supabase
        .from('lead_conversations')
        .insert({
          user_id: userId,
          lead_id: leadId,
          message_id: messageId,
          message_content: message,
          direction: 'outbound',
          message_type: 'text',
          template_id: '',
          created_at: new Date().toISOString(),
          status: 'sent'
        });
      
      if (messageError) {
        console.error('Error storing AI message in database:', messageError);
      } else {
        console.log(`Successfully stored AI message in database with ID: ${messageId}`);
      }
    } else if (!leadId) {
      console.log('Could not store AI message in database: missing lead ID');
    } else if (!messageId) {
      console.log('Could not store AI message in database: missing message ID from WhatsApp response');
      console.log('WhatsApp response:', response.data);
    }
    
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
    
    console.log('Template message sent successfully:', JSON.stringify(response.data));
    
    // Ensure we have a valid message ID
    if (!response.data || !response.data.messages || !response.data.messages[0] || !response.data.messages[0].id) {
      console.error('Error: WhatsApp API did not return a valid message ID', response.data);
      throw new Error('WhatsApp API did not return a valid message ID');
    }
    
    // Ensure consistent message ID format - normalize to remove any potential prefix
    const rawMessageId = response.data.messages[0].id;
    // Store with and without wamid: prefix for reliable matching
    const messageId = rawMessageId.startsWith('wamid:') ? rawMessageId : `wamid:${rawMessageId}`;
    
    console.log(`Normalized message ID: ${messageId} (original: ${rawMessageId})`);
    console.log(`Message ID format/type: ${typeof messageId}, length: ${messageId.length}`);
    
    // Check if this lead already exists by phone number
    console.log(`Checking for existing lead with phone: ${to}`);
    
    // First, log all leads for debugging
    console.log(`DEBUG: Fetching all leads to check phone numbers`);
    const { data: allLeads, error: leadsError } = await supabase
      .from('leads')
      .select('id, name, phone, status, user_id');
    
    if (leadsError) {
      console.error(`Error fetching leads:`, leadsError);
    }
    
    let leadId;
    let existingLead = null;
    
    if (allLeads && allLeads.length > 0) {
      console.log(`DEBUG: Found ${allLeads.length} total leads in system`);
      
      // Find any leads with matching phone (ignoring spaces/formatting)
      const strippedPhone = to.replace(/\D/g, '');
      const matchingLeads = allLeads.filter(lead => {
        const leadPhone = (lead.phone || '').replace(/\D/g, '');
        return leadPhone === strippedPhone || 
               leadPhone === strippedPhone.replace(/^49/, '') ||
               '49' + leadPhone === strippedPhone;
      });
      
      if (matchingLeads.length > 0) {
        console.log(`DEBUG: Found ${matchingLeads.length} leads with matching phone numbers (ignoring spaces/formatting):`);
        matchingLeads.forEach(lead => 
          console.log(`  - ID: ${lead.id}, Name: ${lead.name}, Phone: ${lead.phone}, Status: ${lead.status}, User: ${lead.user_id}`)
        );
        
        // Use the first matching lead
        existingLead = matchingLeads[0];
        leadId = existingLead.id;
        console.log(`Using matched lead with ID: ${leadId} (${existingLead.name})`);
      } else {
        console.log(`DEBUG: No leads found with matching phone number (ignoring spaces/formatting)`);
        
        // If exact matching failed, try to match on last 8 digits
        const last8Digits = strippedPhone.slice(-8);
        const similarLeads = allLeads.filter(lead => {
          const leadPhone = (lead.phone || '').replace(/\D/g, '');
          return leadPhone.endsWith(last8Digits);
        });
        
        if (similarLeads.length > 0) {
          console.log(`DEBUG: Found ${similarLeads.length} leads with similar phone numbers (matching last 8 digits):`);
          similarLeads.forEach(lead => 
            console.log(`  - ID: ${lead.id}, Name: ${lead.name}, Phone: ${lead.phone}, Status: ${lead.status}, User: ${lead.user_id}`)
          );
          
          // Use the first similar lead by default
          const selectedLead = similarLeads[0];
          existingLead = selectedLead;
          leadId = selectedLead.id;
          
          // If we found the lead but userId is different, use the lead's user_id for consistency
          if (selectedLead.user_id && selectedLead.user_id !== userId) {
            console.log(`Updating userId from ${userId} to ${selectedLead.user_id} based on lead association`);
            userId = selectedLead.user_id;
          }
          
          console.log(`Using similar lead with ID: ${leadId} (${selectedLead.name})`);
        } else {
          console.log(`DEBUG: No leads found with similar phone numbers (matching last 8 digits)`);
        }
      }
    } else {
      console.log(`DEBUG: No leads found in system`);
    }
    
    // If no existing lead found, create a new one
    if (!existingLead) {
      console.log(`Creating new lead for phone ${to}`);
      const { data: newLead, error: createError } = await supabase
        .from('leads')
        .insert({
          name: templateValues?.recipientName || 'WhatsApp User',
          phone: to,
          status: 'New',
          user_id: userId
        })
        .select('id')
        .single();
      
      if (createError) {
        console.error(`Error creating lead:`, createError);
        throw createError;
      }
      
      leadId = newLead.id;
      console.log(`Created new lead: ${leadId}`);
    }
    
    // Store this message in the database with its ID so we can track replies
    const { data: messageRecord, error: messageError } = await supabase
      .from('lead_conversations')
      .insert({
        user_id: userId,
        lead_id: leadId,
        message_id: messageId, // Store the WhatsApp message ID for tracking replies
        message_content: `Template message: ${templateId}`,
        direction: 'outbound',
        message_type: 'template',
        template_id: templateId,
        created_at: new Date().toISOString(),
        status: 'sent'
      })
      .select('id');
    
    if (messageError) {
      console.error('Error storing template message in database:', messageError);
      throw messageError;
    }
    
    console.log(`Successfully stored template message in database with ID: ${messageId} and record ID: ${messageRecord[0].id}`);
    
    // For debugging: retrieve the message we just stored to verify it
    const { data: storedMessage } = await supabase
      .from('lead_conversations')
      .select('message_id')
      .eq('id', messageRecord[0].id)
      .single();
      
    console.log(`Verification - stored message ID in database: ${storedMessage?.message_id}`);
    
    return messageId; // Return the message ID
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
export async function handleMessageStatus(status) {
  try {
    const { id, status: messageStatus, recipient_id } = status;
    console.log(`Message ${id} to ${recipient_id} status update: ${messageStatus}`);
    
    // Only process delivered, read, and failed statuses
    if (!['delivered', 'read', 'failed'].includes(messageStatus)) {
      return;
    }
    
    // Try to update the message status in the database
    const { data, error } = await supabase
      .from('lead_conversations')
      .update({ status: messageStatus })
      .eq('message_id', id)
      .select('id, lead_id, user_id, message_type, direction, status');
      
    if (error) {
      console.error(`Error updating message status for message ${id}:`, error);
      return;
    }
    
    if (data && data.length > 0) {
      // Log when we have a message status change, especially to "read"
      if (messageStatus === 'read') {
        console.log(`==== MESSAGE READ CONFIRMATION ====`);
        console.log(`Message ${id} (lead: ${data[0].lead_id}) status updated to READ`);
        console.log(`Message details:`, {
          messageId: id,
          leadId: data[0].lead_id,
          type: data[0].message_type,
          direction: data[0].direction,
          previousStatus: data[0].status
        });
        console.log(`====================================`);
      } else {
        console.log(`Updated status for message ${id} to ${messageStatus} (lead: ${data[0].lead_id})`);
      }
      
      // If the message was read, also update the lead's message_read flag
      // ONLY update for 'read' status, not for 'delivered'
      if (messageStatus === 'read' && data[0].lead_id) {
        try {
          // First, verify that this message is for a template (not a reply)
          if (data[0].direction === 'outbound' && data[0].message_type === 'template') {
            console.log(`Updating message_read flag for lead ${data[0].lead_id} (outbound template message)`);
            
            const { error: leadUpdateError } = await supabase
              .from('leads')
              .update({ message_read: true })
              .eq('id', data[0].lead_id);
              
            if (leadUpdateError) {
              console.error(`Error updating lead message_read flag for lead ${data[0].lead_id}:`, leadUpdateError);
            } else {
              console.log(`Updated message_read flag for lead ${data[0].lead_id}`);
            }
          } else {
            console.log(`Not updating message_read flag - not an outbound template message`);
          }
        } catch (leadError) {
          console.error(`Exception updating lead message_read flag:`, leadError);
        }
      }
    } else {
      console.log(`No message found with ID ${id} for status update`);
    }
  } catch (error) {
    console.error('Error in handleMessageStatus:', error);
  }
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