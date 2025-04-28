const axios = require('axios');
const OpenAI = require('openai');
const userSettings = require('../userSettings');

// Keep the important maps and variables
const conversationHistory = new Map();
const leadInfo = new Map();

// Verify WhatsApp webhook
function verifyWhatsAppWebhook(mode, token, challenge, verifyToken) {
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
async function processWhatsAppWebhook(body) {
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
async function handleMessage(message) {
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
    
    let userHistory = conversationHistory.get(phoneNumber) || [];

    userHistory.push({ role: "user", content: userMessage });
    userHistory = userHistory.slice(-10); // Keep last 10 messages

    // Get user-specific system prompt
    const systemPrompt = await userSettings.getSystemPromptForUser(userId);
    
    // Get user-specific OpenAI instance and model
    const openai = await userSettings.getOpenAIForUser(userId);
    const model = await userSettings.getOpenAIModel(userId);
    
    // Generate AI response using user-specific settings
    const aiResponse = await generateAIResponseForUser(userHistory, systemPrompt, openai, model);
    
    userHistory.push({ role: "assistant", content: aiResponse });
    conversationHistory.set(phoneNumber, userHistory);

    // Send WhatsApp message using user-specific settings
    await sendWhatsAppMessageForUser(userId, phoneNumber, aiResponse);
    await markLeadAsContacted(phoneNumber);

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
    const response = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: "system", content: systemPrompt },
        ...userHistory
      ],
      max_tokens: 150
    });
    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error generating AI response:', error);
    // Fallback to a safe response if there's an error
    return "Thank you for your message. I'm having trouble processing that right now. Please try again in a moment.";
  }
}

// Send WhatsApp message for user
async function sendWhatsAppMessageForUser(userId, to, message) {
  const phoneNumberId = await userSettings.getWhatsAppPhoneNumberId(userId);
  const token = await userSettings.getWhatsAppToken(userId);
  
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
    throw error;
  }
}

// Mark lead as contacted
async function markLeadAsContacted(phone, status = 'contacted') {
  // Implement this function if needed, or import from another file
  console.log(`Marking ${phone} as ${status}`);
  return true;
}

// Handle message status updates
function handleMessageStatus(status) {
  const { id, status: messageStatus, recipient_id } = status;
  console.log(`Message ${id} to ${recipient_id} status: ${messageStatus}`);
  
  // Implement additional handling if needed
}

module.exports = {
  verifyWhatsAppWebhook,
  processWhatsAppWebhook,
  handleMessage,
  normalizePhoneNumber,
  generateAIResponseForUser,
  sendWhatsAppMessageForUser,
  markLeadAsContacted
}; 