import supabase from '@/lib/supabase';

export interface MessageStatusData {
  source: string;
  read: number;
  replied: number;
  contacted: number;
  failed: number;
}

export interface LeadStatusCounts {
  [source: string]: MessageStatusData;
}

// Define types for leads and messages
interface Lead {
  id: string;
  source: string;
  status: string;
}

interface Message {
  id: string;
  lead_id: string;
  status: string;
  direction: string;
  message_type: string;
  created_at: string;
}

/**
 * Fetches the current status of all template messages, specifically tracking 
 * which ones have been read by recipients
 */
export async function fetchMessageStatusData(userId: string): Promise<LeadStatusData> {
  try {
    // 1. Get all outbound template messages
    const { data: messages, error: messagesError } = await supabase
      .from('lead_conversations')
      .select('id, lead_id, status, direction, message_type, created_at')
      .eq('user_id', userId)
      .eq('direction', 'outbound')
      .eq('message_type', 'template');
      
    if (messagesError) {
      console.error('Error fetching message status data:', messagesError);
      return {};
    }
    
    // 2. Get all leads to map them to their sources
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('id, source, status')
      .eq('user_id', userId);
      
    if (leadsError) {
      console.error('Error fetching leads data:', leadsError);
      return {};
    }
    
    // Create a map of lead IDs to their sources
    const leadSourceMap = new Map<string, string>();
    leads?.forEach((lead: Lead) => {
      leadSourceMap.set(lead.id, lead.source);
    });
    
    // Create a map of lead IDs to their message status
    const leadMessageStatusMap = new Map<string, string>();
    messages?.forEach((message: Message) => {
      // Track read status by lead ID - only overwrite if status is 'read' or no status exists yet
      const currentStatus = leadMessageStatusMap.get(message.lead_id);
      if (!currentStatus || message.status === 'read') {
        leadMessageStatusMap.set(message.lead_id, message.status);
      }
    });
    
    // Aggregate counts by source
    const result: LeadStatusData = {};
    
    // Initialize with all sources from leads
    leads?.forEach((lead: Lead) => {
      const source = lead.source;
      if (!result[source]) {
        result[source] = {
          source,
          read: 0,
          replied: 0,
          contacted: 0,
          failed: 0
        };
      }
      
      // Count status based on lead status
      if (lead.status === 'Contacted') {
        result[source].contacted++;
        
        // Check if message was read from lead_conversations status
        const messageStatus = leadMessageStatusMap.get(lead.id);
        if (messageStatus === 'read') {
          result[source].read++;
        }
      } else if (lead.status === 'Replied') {
        result[source].contacted++;
        result[source].replied++;
        result[source].read++; // Replied implies read
      } else if (lead.status === 'Failed') {
        result[source].failed++;
      }
    });
    
    console.log('MessageStatusService - Current status data:', result);
    return result;
    
  } catch (error) {
    console.error('Error in fetchMessageStatusData:', error);
    return {};
  }
}

/**
 * Sets up a real-time subscription to message status changes
 * @param userId User ID to track messages for
 * @param callback Function to call when statuses change
 * @returns A function to unsubscribe from the real-time updates
 */
export function subscribeToStatusChanges(
  userId: string, 
  callback: (data: LeadStatusData) => void
): () => void {
  // Initial fetch
  fetchMessageStatusData(userId).then(callback);
  
  // Set up real-time subscription for lead_conversations table
  const subscription = supabase
    .channel('lead_conversations_status_changes')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'lead_conversations',
        filter: `user_id=eq.${userId}`
      },
      (payload: any) => {
        console.log('Real-time status update received:', payload);
        // When any status changes, refetch all statuses
        fetchMessageStatusData(userId).then(callback);
      }
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    subscription.unsubscribe();
  };
}

// Type aliases for backward compatibility
export type LeadStatusData = LeadStatusCounts; 