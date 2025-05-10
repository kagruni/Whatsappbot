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
    // Fetch all template messages using pagination
    let allMessages: Message[] = [];
    let messagesHasMore = true;
    let messagesPage = 0;
    const pageSize = 1000;
    
    while (messagesHasMore) {
      console.log(`Fetching messages page ${messagesPage + 1}`);
      const { data: pageMessages, error: messagesError } = await supabase
        .from('lead_conversations')
        .select('id, lead_id, status, direction, message_type, created_at')
        .eq('user_id', userId)
        .eq('direction', 'outbound')
        .eq('message_type', 'template')
        .range(messagesPage * pageSize, (messagesPage + 1) * pageSize - 1);
        
      if (messagesError) {
        console.error('Error fetching message status data:', messagesError);
        return {};
      }
      
      if (pageMessages && pageMessages.length > 0) {
        allMessages = [...allMessages, ...pageMessages];
        messagesPage++;
        messagesHasMore = pageMessages.length === pageSize;
      } else {
        messagesHasMore = false;
      }
    }
    
    console.log(`Total messages fetched: ${allMessages.length}`);
    
    // Fetch all leads using pagination
    let allLeads: Lead[] = [];
    let leadsHasMore = true;
    let leadsPage = 0;
    
    while (leadsHasMore) {
      console.log(`Fetching leads page ${leadsPage + 1}`);
      const { data: pageLeads, error: leadsError } = await supabase
        .from('leads')
        .select('id, source, status')
        .eq('user_id', userId)
        .range(leadsPage * pageSize, (leadsPage + 1) * pageSize - 1);
        
      if (leadsError) {
        console.error('Error fetching leads data:', leadsError);
        return {};
      }
      
      if (pageLeads && pageLeads.length > 0) {
        allLeads = [...allLeads, ...pageLeads];
        leadsPage++;
        leadsHasMore = pageLeads.length === pageSize;
      } else {
        leadsHasMore = false;
      }
    }
    
    console.log(`Total leads fetched: ${allLeads.length}`);
    
    // Create a map of lead IDs to their sources
    const leadSourceMap = new Map<string, string>();
    allLeads.forEach((lead: Lead) => {
      leadSourceMap.set(lead.id, lead.source);
    });
    
    // Create a map of lead IDs to their message status
    const leadMessageStatusMap = new Map<string, string>();
    allMessages.forEach((message: Message) => {
      // Track read status by lead ID - only overwrite if status is 'read' or no status exists yet
      const currentStatus = leadMessageStatusMap.get(message.lead_id);
      if (!currentStatus || message.status === 'read') {
        leadMessageStatusMap.set(message.lead_id, message.status);
      }
    });
    
    // Aggregate counts by source
    const result: LeadStatusData = {};
    
    // Initialize with all sources from leads
    allLeads.forEach((lead: Lead) => {
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