import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// Create Supabase client
function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Supabase URL or service key is missing');
    throw new Error('Supabase configuration error');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  });
}

// Path to the user settings file
const USER_SETTINGS_PATH = path.join(process.cwd(), 'user_settings.json');

// Default settings
const DEFAULT_SETTINGS = {
  openaiApiKey: process.env.OPENAI_API_KEY,
  openaiModel: 'gpt-4o',
  whatsappToken: process.env.WHATSAPP_TOKEN,
  whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
  whatsappVerifyToken: process.env.WHATSAPP_VERIFY_TOKEN,
  templateId: 'opener2',
  systemPrompt: '',
};

// In-memory cache of user settings
const userSettingsCache = new Map();

// Initialize user settings file if it doesn't exist
async function initUserSettings() {
  try {
    await fs.access(USER_SETTINGS_PATH);
    console.log('User settings file exists');
  } catch (error) {
    // File doesn't exist, create it with default settings for admin user
    const defaultUserSettings = {
      admin: {
        ...DEFAULT_SETTINGS,
        userId: 'admin',
      },
    };
    
    await fs.writeFile(USER_SETTINGS_PATH, JSON.stringify(defaultUserSettings, null, 2));
    console.log('Created default user settings file');
  }

  // Load settings into memory
  await loadAllUserSettings();
}

// Load all user settings into memory
async function loadAllUserSettings() {
  try {
    const data = await fs.readFile(USER_SETTINGS_PATH, 'utf8');
    const settings = JSON.parse(data);
    
    for (const [userId, userSettings] of Object.entries(settings)) {
      userSettingsCache.set(userId, userSettings);
    }
    
    console.log(`Loaded settings for ${userSettingsCache.size} users`);
  } catch (error) {
    console.error('Error loading user settings:', error);
  }
}

// Get settings for a specific user
async function getUserSettings(userId) {
  try {
    const supabase = createSupabaseClient();
    
    console.log(`Getting Supabase settings for user: ${userId}`);
    
    // Get settings from user_settings table
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      console.error(`Error getting Supabase settings for user ${userId}:`, error);
    }
    
    if (data) {
      console.log(`Found Supabase settings for user ${userId}`, JSON.stringify(data, null, 2));
      
      // Map Supabase column names to our expected property names
      const mappedSettings = {
        userId: userId,
        openaiApiKey: data.openai_api_key,
        openaiModel: data.ai_model,
        whatsappPhoneNumberId: data.whatsapp_phone_id,
        templateId: data.whatsapp_template_id,
        systemPrompt: data.system_prompt,
        whatsappToken: data.whatsapp_token || process.env.WHATSAPP_TOKEN,
        whatsappVerifyToken: data.whatsapp_verify_token || process.env.WHATSAPP_VERIFY_TOKEN
      };
      
      console.log(`Mapped Supabase settings for ${userId}:`, {
        hasApiKey: !!mappedSettings.openaiApiKey,
        apiKeyLength: mappedSettings.openaiApiKey ? mappedSettings.openaiApiKey.length : 0,
        model: mappedSettings.openaiModel,
        hasPhoneId: !!mappedSettings.whatsappPhoneNumberId,
        phoneId: mappedSettings.whatsappPhoneNumberId,
        hasToken: !!mappedSettings.whatsappToken,
        templateId: mappedSettings.templateId
      });
      
      return mappedSettings;
    }
    
    // If we didn't find settings in Supabase, fall back to defaults with environment variables
    console.log(`No Supabase settings found for user ${userId}, using environment variables`);
    return { 
      userId,
      openaiApiKey: process.env.OPENAI_API_KEY,
      openaiModel: process.env.OPENAI_MODEL || 'gpt-4o',
      whatsappToken: process.env.WHATSAPP_TOKEN,
      whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
      whatsappVerifyToken: process.env.WHATSAPP_VERIFY_TOKEN,
      templateId: process.env.WHATSAPP_TEMPLATE_ID || 'opener2',
      systemPrompt: '',
    };
  } catch (dbError) {
    console.error(`Error accessing Supabase for user ${userId}:`, dbError);
    return { 
      userId,
      openaiApiKey: process.env.OPENAI_API_KEY,
      openaiModel: process.env.OPENAI_MODEL || 'gpt-4o',
      whatsappToken: process.env.WHATSAPP_TOKEN,
      whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
      whatsappVerifyToken: process.env.WHATSAPP_VERIFY_TOKEN,
      templateId: process.env.WHATSAPP_TEMPLATE_ID || 'opener2',
      systemPrompt: '',
    };
  }
}

// Update settings for a specific user
async function updateUserSettings(userId, newSettings) {
  try {
    const data = await fs.readFile(USER_SETTINGS_PATH, 'utf8');
    const settings = JSON.parse(data);
    
    // Merge with existing settings
    settings[userId] = {
      ...(settings[userId] || {}),
      ...newSettings,
      userId,
    };
    
    // Update cache
    userSettingsCache.set(userId, settings[userId]);
    
    // Write back to file
    await fs.writeFile(USER_SETTINGS_PATH, JSON.stringify(settings, null, 2));
    console.log(`Updated settings for user ${userId}`);
    
    return settings[userId];
  } catch (error) {
    console.error(`Error updating settings for user ${userId}:`, error);
    throw error;
  }
}

// Create a new user with default settings
async function createUser(userId, customSettings = {}) {
  if (!userId) {
    throw new Error('User ID is required');
  }
  
  try {
    const data = await fs.readFile(USER_SETTINGS_PATH, 'utf8');
    const settings = JSON.parse(data);
    
    if (settings[userId]) {
      throw new Error(`User ${userId} already exists`);
    }
    
    // Create new user with default settings and any custom settings
    settings[userId] = {
      ...DEFAULT_SETTINGS,
      ...customSettings,
      userId,
    };
    
    // Update cache
    userSettingsCache.set(userId, settings[userId]);
    
    // Write back to file
    await fs.writeFile(USER_SETTINGS_PATH, JSON.stringify(settings, null, 2));
    console.log(`Created new user ${userId}`);
    
    return settings[userId];
  } catch (error) {
    console.error(`Error creating user ${userId}:`, error);
    throw error;
  }
}

// Delete a user
async function deleteUser(userId) {
  if (userId === 'admin') {
    throw new Error('Cannot delete admin user');
  }
  
  try {
    const data = await fs.readFile(USER_SETTINGS_PATH, 'utf8');
    const settings = JSON.parse(data);
    
    if (!settings[userId]) {
      throw new Error(`User ${userId} not found`);
    }
    
    // Delete user
    delete settings[userId];
    
    // Remove from cache
    userSettingsCache.delete(userId);
    
    // Write back to file
    await fs.writeFile(USER_SETTINGS_PATH, JSON.stringify(settings, null, 2));
    console.log(`Deleted user ${userId}`);
    
    return true;
  } catch (error) {
    console.error(`Error deleting user ${userId}:`, error);
    throw error;
  }
}

// Map phone numbers to user IDs
async function getUserIdByPhone(phoneNumber) {
  try {
    // Normalize phone number (remove non-digits)
    const normalizedPhone = phoneNumber.replace(/\D/g, '');
    console.log(`Looking for user with whatsapp_phone_id: ${normalizedPhone}`);
    
    const supabase = createSupabaseClient();
    
    // Find user with matching phone number
    const { data, error } = await supabase
      .from('user_settings')
      .select('user_id, whatsapp_phone_id')
      .eq('whatsapp_phone_id', normalizedPhone);
    
    if (error) {
      console.error('Error querying Supabase for user by phone ID:', error);
      throw error;
    }
    
    // If we found a user with this phone number, return their ID
    if (data && data.length > 0) {
      console.log(`Found user ${data[0].user_id} for phone ID ${normalizedPhone} in Supabase`);
      return data[0].user_id;
    }
    
    // If no user found with this phone number, try to find any user
    // to handle the message with (first user in the table)
    const { data: anyUser, error: anyUserError } = await supabase
      .from('user_settings')
      .select('user_id')
      .limit(1);
      
    if (anyUserError) {
      console.error('Error querying Supabase for any user:', anyUserError);
    } else if (anyUser && anyUser.length > 0) {
      console.log(`No user found for phone ${normalizedPhone}, using first available user: ${anyUser[0].user_id}`);
      return anyUser[0].user_id;
    }
    
    console.error(`No users found in database. Unable to handle message from ${normalizedPhone}`);
    throw new Error(`No users found in database to handle message from ${normalizedPhone}`);
  } catch (error) {
    console.error('Error finding user by phone:', error);
    throw error;
  }
}

export default {
  initUserSettings,
  getUserSettings,
  updateUserSettings,
  createUser,
  deleteUser,
  getUserIdByPhone,
}; 