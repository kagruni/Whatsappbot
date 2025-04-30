import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

interface Conversation {
  lead_id: string;
  message_id: string;
  status: string;
  direction: string;
  message_type: string;
  created_at?: string;
}

interface Lead {
  id: string;
  source: string;
  status: string;
  message_read?: boolean;
}

interface SourceStats {
  count: number;
  contacted: number;
  replied: number;
  read: number;
  failed: number;
}

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    // Initialize Supabase client with cookie handling for browser requests
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Get the current user's session - no error returned if session is missing
    const { data: { session } } = await supabase.auth.getSession();
    let userId: string;
    
    // Check for session or try to get userId from query params for testing
    if (session && session.user) {
      userId = session.user.id;
      console.log('Using authenticated user ID:', userId);
    } else {
      // For debugging - allows using URL query param for testing
      // Only use this in development
      const url = new URL(req.url);
      const testUserId = url.searchParams.get('userId');
      
      if (process.env.NODE_ENV === 'development' && testUserId) {
        console.log('Using test userId from query params:', testUserId);
        userId = testUserId;
      } else {
        console.log('No session found and not in development mode - returning empty stats');
        // Return empty stats object rather than error
        return NextResponse.json({ 
          success: true, 
          sourceStats: {},
          auth: false
        }, {
          headers: {
            'Cache-Control': 'no-store, max-age=0',
          }
        });
      }
    }
    
    // Fetch all leads grouped by source
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('id, source, status, message_read')
      .eq('user_id', userId);
      
    if (leadsError) {
      console.error('Error fetching leads:', leadsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch leads', details: leadsError },
        { 
          status: 500,
          headers: {
            'Cache-Control': 'no-store, max-age=0',
          }
        }
      );
    }
    
    // Fetch all lead conversations to get read status from status field
    const { data: conversations, error: conversationsError } = await supabase
      .from('lead_conversations')
      .select('lead_id, message_id, status, direction, message_type, created_at')
      .eq('user_id', userId)
      .eq('direction', 'outbound')
      .eq('message_type', 'template');
      
    if (conversationsError) {
      console.error('Error fetching conversations:', conversationsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch conversation data', details: conversationsError },
        { 
          status: 500,
          headers: {
            'Cache-Control': 'no-store, max-age=0',
          }
        }
      );
    }
    
    // Log the conversation count for debugging
    console.log(`Found ${conversations?.length || 0} template conversations for user ${userId}`);
    
    // Log status distribution for debugging
    if (conversations && conversations.length > 0) {
      const statusCounts: Record<string, number> = {};
      conversations.forEach(conv => {
        const status = conv.status || 'unknown';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      console.log('Message status distribution:', statusCounts);
    }
    
    // Create a map of lead IDs to their most recent conversation status
    const leadStatusMap = new Map<string, { status: string; messageId: string }>();
    
    if (conversations) {
      // Group conversations by lead_id
      const leadConversations: Record<string, Conversation[]> = {};
      
      (conversations as Conversation[]).forEach(conv => {
        if (!leadConversations[conv.lead_id]) {
          leadConversations[conv.lead_id] = [];
        }
        leadConversations[conv.lead_id].push(conv);
      });
      
      // For each lead, find the most recent conversation and its status
      Object.entries(leadConversations).forEach(([leadId, convs]) => {
        const sortedConvs = [...convs].sort((a, b) => {
          const aDate = new Date(a.created_at || 0);
          const bDate = new Date(b.created_at || 0);
          return bDate.getTime() - aDate.getTime(); // Sort by most recent
        });
        
        const mostRecent = sortedConvs[0];
        if (mostRecent) {
          leadStatusMap.set(leadId, {
            status: mostRecent.status,
            messageId: mostRecent.message_id
          });
          console.log(`Lead ${leadId} most recent message status: ${mostRecent.status}`);
        }
      });
    }
    
    // Group leads by source and count status
    const sourceStats: Record<string, SourceStats> = {};
    
    (leads as Lead[]).forEach(lead => {
      const source = lead.source;
      if (!sourceStats[source]) {
        sourceStats[source] = {
          count: 0,
          contacted: 0,
          replied: 0,
          read: 0,
          failed: 0
        };
      }
      
      sourceStats[source].count++;
      
      // Count contacted and other statuses
      if (lead.status === 'Contacted') {
        sourceStats[source].contacted++;
        
        // Check if message was read from lead_conversations table
        const conversationStatus = leadStatusMap.get(lead.id);
        if (conversationStatus && conversationStatus.status === 'read') {
          sourceStats[source].read++;
        } 
        // Remove the fallback to message_read flag - we only want to count as read
        // when we have an actual read status in the lead_conversations table
      } else if (lead.status === 'Replied') {
        sourceStats[source].contacted++;
        sourceStats[source].replied++;
        sourceStats[source].read++; // A replied lead must have read the message
      } else if (lead.status === 'Failed') {
        sourceStats[source].failed++;
      }
    });
    
    return NextResponse.json({ 
      success: true, 
      sourceStats,
      auth: true
    }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      }
    });
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        }
      }
    );
  }
} 