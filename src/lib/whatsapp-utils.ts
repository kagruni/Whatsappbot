import { createServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

// Types for settings
export interface WhatsAppSettings {
  whatsapp_phone_id: string;
  whatsapp_template_id: string;
  whatsapp_language: string;
  whatsapp_template_image_url?: string;
  message_limit_24h?: number;
  whatsapp_token?: string; // Optional as it might come from env vars
}

// In-memory cache with expiration
const settingsCache = new Map<string, { data: WhatsAppSettings; expires: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Get WhatsApp settings for a user with caching
 */
export async function getWhatsAppSettings(userId: string): Promise<WhatsAppSettings> {
  if (!userId) {
    throw new Error('User ID is required to retrieve WhatsApp settings');
  }

  // Check cache first
  const cachedSettings = settingsCache.get(userId);
  const now = Date.now();
  
  // If cache is valid, return it
  if (cachedSettings && cachedSettings.expires > now) {
    return cachedSettings.data;
  }

  // Initialize Supabase client
  const cookieStore = cookies();
  const supabase = createServerClient(cookieStore);
  
  // Fetch settings from database
  const { data, error } = await supabase
    .from('user_settings')
    .select('whatsapp_phone_id, whatsapp_template_id, whatsapp_language, whatsapp_template_image_url, message_limit_24h, whatsapp_token')
    .eq('user_id', userId)
    .single();
  
  if (error) {
    console.error(`Error fetching WhatsApp settings for user ${userId}:`, error);
    
    if (error.code === 'PGRST116') { // No rows returned
      throw new Error(`No WhatsApp settings found for user ID: ${userId}. Please configure your settings first.`);
    }
    
    throw new Error(`Database error while retrieving WhatsApp settings: ${error.message}`);
  }
  
  if (!data) {
    throw new Error(`No WhatsApp settings found for user ID: ${userId}`);
  }
  
  const settings = data as WhatsAppSettings;
  
  // Cache the result
  settingsCache.set(userId, {
    data: settings,
    expires: now + CACHE_TTL
  });
  
  return settings;
}

/**
 * Normalize a German phone number to WhatsApp API format
 */
export function normalizeGermanPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  let normalized = phone.replace(/\D/g, '');
  
  // Remove leading zero(s) which are used in domestic German format
  normalized = normalized.replace(/^0+/, '');
  
  // If number doesn't already have the German country code, add it
  if (!normalized.startsWith('49')) {
    normalized = `49${normalized}`;
  }
  
  return normalized;
}

/**
 * Check if a user has exceeded their daily message limit
 */
export async function checkDailyMessageLimit(userId: string, limit: number): Promise<boolean> {
  if (!userId) {
    console.error('Missing userId in checkDailyMessageLimit');
    throw new Error('User ID is required to check message limit');
  }

  try {
    // Initialize Supabase client
    const cookieStore = cookies();
    const supabase = createServerClient(cookieStore);
    
    // Get the start of the current day (midnight)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Count messages sent today, excluding failed messages
    const { count, error } = await supabase
      .from('lead_conversations')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .neq('status', 'failed') // Exclude messages with failed status
      .gte('created_at', today.toISOString());
    
    if (error) {
      throw new Error(`Failed to check message limit: ${error.message}`);
    }
    
    return count !== null && count >= limit;
  } catch (error: any) {
    console.error('Exception in checkDailyMessageLimit:', error);
    throw error;
  }
}

/**
 * Record a WhatsApp conversation in the database
 */
export async function recordConversation(
  userId: string, 
  leadId: string, 
  templateId: string | null,
  language: string,
  messageId: string,
  status: 'sent' | 'failed' = 'sent',
  messageContent: string = '',
  direction: 'inbound' | 'outbound' = 'outbound',
  messageType: 'template' | 'text' = 'template'
): Promise<void> {
  if (!userId || !leadId || !messageId) {
    console.error('Missing required parameters for recordConversation', {
      hasUserId: !!userId,
      hasLeadId: !!leadId,
      hasTemplateId: !!templateId,
      hasLanguage: !!language,
      hasMessageId: !!messageId,
      hasMessageContent: !!messageContent
    });
    throw new Error('Missing required parameters for recording conversation');
  }

  try {
    const cookieStore = cookies();
    const supabase = createServerClient(cookieStore);
    
    const { error } = await supabase
      .from('lead_conversations')
      .insert({
        user_id: userId,
        lead_id: leadId,
        template_id: templateId,
        language,
        message_id: messageId,
        status,
        created_at: new Date().toISOString(),
        message_content: messageContent,
        direction,
        message_type: messageType
      });
    
    if (error) {
      console.error('Error inserting conversation record:', error);
      throw new Error(`Failed to record conversation: ${error.message}`);
    }
  } catch (error: any) {
    console.error('Exception in recordConversation:', error);
    throw error;
  }
}

/**
 * Update a lead's status
 */
export async function updateLeadStatus(
  leadId: string, 
  status: 'Contacted' | 'Failed'
): Promise<void> {
  if (!leadId) {
    console.error('Missing leadId in updateLeadStatus');
    throw new Error('Lead ID is required to update status');
  }

  try {
    const cookieStore = cookies();
    const supabase = createServerClient(cookieStore);
    
    const { error } = await supabase
      .from('leads')
      .update({ status })
      .eq('id', leadId);
    
    if (error) {
      console.error('Error updating lead status:', error);
      throw new Error(`Failed to update lead status: ${error.message}`);
    }
  } catch (error: any) {
    console.error('Exception in updateLeadStatus:', error);
    throw error;
  }
} 