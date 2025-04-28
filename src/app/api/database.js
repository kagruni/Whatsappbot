import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

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
  // Check if settings are in cache
  if (userSettingsCache.has(userId)) {
    return userSettingsCache.get(userId);
  }
  
  // If not in cache, get from file
  try {
    const data = await fs.readFile(USER_SETTINGS_PATH, 'utf8');
    const settings = JSON.parse(data);
    
    if (settings[userId]) {
      userSettingsCache.set(userId, settings[userId]);
      return settings[userId];
    }
    
    // If user not found, return default settings
    return { ...DEFAULT_SETTINGS, userId };
  } catch (error) {
    console.error(`Error getting settings for user ${userId}:`, error);
    return { ...DEFAULT_SETTINGS, userId };
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
  // Normalize phone number
  phoneNumber = phoneNumber.replace(/\D/g, '');
  
  try {
    const data = await fs.readFile(USER_SETTINGS_PATH, 'utf8');
    const settings = JSON.parse(data);
    
    // Find user with matching phone number ID
    for (const [userId, userSettings] of Object.entries(settings)) {
      if (userSettings.whatsappPhoneNumberId === phoneNumber) {
        return userId;
      }
    }
    
    // Default to admin if no match found
    return 'admin';
  } catch (error) {
    console.error('Error finding user by phone:', error);
    return 'admin';
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