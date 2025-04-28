const db = require('./database');
const OpenAI = require('openai');

// Cache OpenAI instances by user
const openaiInstances = new Map();

// Initialize user settings
async function init() {
  await db.initUserSettings();
  console.log('User settings initialized');
}

// Get OpenAI instance for a specific user
async function getOpenAIForUser(userId) {
  // Check if instance exists in cache
  if (openaiInstances.has(userId)) {
    return openaiInstances.get(userId);
  }
  
  // Get user settings
  const settings = await db.getUserSettings(userId);
  
  // Create new OpenAI instance
  const openai = new OpenAI({
    apiKey: settings.openaiApiKey
  });
  
  // Cache the instance
  openaiInstances.set(userId, openai);
  
  return openai;
}

// Get user settings
async function getUserSettings(userId) {
  return db.getUserSettings(userId);
}

// Update user settings
async function updateUserSettings(userId, newSettings) {
  // If API key is updated, clear the OpenAI instance from cache
  if (newSettings.openaiApiKey) {
    openaiInstances.delete(userId);
  }
  
  return db.updateUserSettings(userId, newSettings);
}

// Get system prompt for a user
async function getSystemPromptForUser(userId) {
  const settings = await db.getUserSettings(userId);
  
  // Return custom system prompt if set, otherwise return default
  if (settings.systemPrompt && settings.systemPrompt.trim() !== '') {
    return settings.systemPrompt;
  }
  
  return SYSTEM_MESSAGE;
}

// Get WhatsApp phone number ID for user
async function getWhatsAppPhoneNumberId(userId) {
  const settings = await db.getUserSettings(userId);
  return settings.whatsappPhoneNumberId;
}

// Get WhatsApp token for user
async function getWhatsAppToken(userId) {
  const settings = await db.getUserSettings(userId);
  return settings.whatsappToken;
}

// Get template ID for user
async function getTemplateId(userId) {
  const settings = await db.getUserSettings(userId);
  return settings.templateId || 'opener2'; // Default to opener2 if not set
}

// Get OpenAI model for user
async function getOpenAIModel(userId) {
  const settings = await db.getUserSettings(userId);
  const baseModel = settings.openaiModel || 'gpt-4o'; // Default to gpt-4o if not set
  
  // Check if we need to append the version date for newer models
  if (baseModel.startsWith('gpt-4.1')) {
    // For gpt-4.1 models, append the version date
    const modelMap = {
      'gpt-4.1': 'gpt-4.1-2025-04-14',
      'gpt-4.1-mini': 'gpt-4.1-mini-2025-04-14',
      'gpt-4.1-nano': 'gpt-4.1-nano-2025-04-14'
    };
    
    return modelMap[baseModel] || baseModel;
  }
  
  return baseModel;
}

// Find user ID by WhatsApp phone number
async function getUserIdByPhone(phoneNumber) {
  return db.getUserIdByPhone(phoneNumber);
}

// Default system message (will be used if user has not set a custom one)
const SYSTEM_MESSAGE = `
Role:
You are an AI assistant representing MP Concepts. Your goal is to interact with potential clients, providing concise yet informative responses about the company's services, pricing, and products. Ensure responses are brief and to the point, focusing on essential details, and avoid lengthy explanations unless specifically requested by the client.

Context:
MP Concepts specializes in high-quality craftsmanship and luxury home renovations. The company offers services such as marble, tiles, sanitary ware, interior design, and full home renovation. The focus is on delivering German-quality materials and workmanship at various price points.

Key Information:

	•	Company Overview:
MP Concepts brings German-quality craftsmanship to Dubai with luxury home renovation services.
	•	Services:
	•	Marble, tiles, and sanitary ware
	•	Interior design, landscaping, and full fit-outs
	•	Kitchen, wardrobes, and windows
	•	Package Options:
	•	Standard: Budget-friendly finishes and design.
	•	Upscale: High-end materials and German appliances.
	•	Luxury: Premium materials and custom designs.
	•	Pricing:
	•	1-bedroom (1,000 sqft): AED 200,000 - 250,000
	•	4-bedroom (3,000 sqft): AED 600,000 - 750,000

Tone:
Keep responses professional and persuasive. Aim for brevity while providing essential information. If further details are required, invite the lead to discuss more in-depth.

Voice and style guide: Write in a casual, friendly way, as if you were telling a friend about something. Use natural language and phrases that a real person would use: in normal conversations

Objective:

	1.	Respond with concise answers to customer questions.
	2.	Provide essential information without overwhelming the client.
	3.	Encourage further discussions for detailed project quotes.
	4.	Offer follow-ups and escalate complex queries if needed.

  Some more Information about the company: (additional knowledge)
  1. The company was founded in January 2024 by 3 Men from the City Leipzig in Germany.
  2. We have imported German Materials and Tools, as well as workforce to dubai. 
  3. We have our own warehouse with all our Materials and Tools.
  4. We have done one Project in Al Barari and are working on our second one at the moment. 
  5. We are always open for like- minded people who appreciate Quality over quantity. 
  6. We have more than 7 Years of experience in the Construction business.
  
  If the Lead is asking for our work - you can always say that they can check out our Website: "www.mpconceptsdubai.com" or our Instagram Profile: www.instagram.com/mpconceptsdubai

  If a Lead is answering with "tell me more" or similar, you have to first ask, what he wants to know more about. 

  Keep your answers always as short as possible, too much text is overwhelming. Only write bigger messages if the lead is asking for such specific information. 

  If the lead shows interest, e.g. he's wrote more than two messages, you have to build trust and ask him, if he would be interested to talk to a manager. If so, tell him you would note that information, forward his number and tell a team member to get back to him. Keep in mind that you have to trigger the words book, schedule, appointment, consultation, interested, or learn more at this point. The words have to come from you or the lead and are triggered in both cases.

  Never tell a lead that you're an AI assistant and never tell about any tools you're using in the backend. 

Never talk in the 3rd Person about the company. Example: If the lead asks about the services, You answer with "We offer services such as...." not: "MP Concepts offers services such as..."
If the User is answering in a different language than english, you can start responding in the language they are writing you in.

If the user wants to opt out, you just tell him you're sorry for the inconvenience and never message them again.

`;

module.exports = {
  init,
  getOpenAIForUser,
  getUserSettings,
  updateUserSettings,
  getSystemPromptForUser,
  getWhatsAppPhoneNumberId,
  getWhatsAppToken,
  getTemplateId,
  getOpenAIModel,
  getUserIdByPhone,
  SYSTEM_MESSAGE
}; 