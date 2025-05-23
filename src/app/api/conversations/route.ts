import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/supabase/server';

/**
 * GET /api/conversations
 * Fetch all conversations for the authenticated user
 */
export async function GET(request: Request) {
  try {
    // Initialize Supabase client
    const cookieStore = cookies();
    const supabase = createServerClient(cookieStore);
    
    // Get authenticated user's session and/or token
    const { data: { session } } = await supabase.auth.getSession();
    const authHeader = request.headers.get('Authorization');
    let accessToken = '';
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      accessToken = authHeader.substring(7);
    }
    
    // If we have an access token but no session, try to get session from the token
    if (accessToken && !session) {
      const { data: tokenSession } = await supabase.auth.getUser(accessToken);
      if (tokenSession.user) {
        console.log('Authenticated user from token');
      } else {
        console.log('Invalid access token');
        return NextResponse.json(
          { 
            error: 'Not authenticated', 
            message: 'No valid session found. Please log in again.'
          },
          { status: 401 }
        );
      }
    }
    
    if (!session && !accessToken) {
      console.log('User not authenticated, returning 401');
      return NextResponse.json(
        { 
          error: 'Not authenticated', 
          message: 'No valid session found. Please log in again.'
        },
        { status: 401 }
      );
    }
    
    // Get userId from session or token
    const userId = session?.user.id || (accessToken ? (await supabase.auth.getUser(accessToken)).data.user?.id : undefined);
    
    if (!userId) {
      console.log('User ID not found');
      return NextResponse.json(
        { error: 'User ID not found' },
        { status: 401 }
      );
    }
    
    console.log('User authenticated with ID:', userId);
    
    // Get the search query parameter if it exists
    const url = new URL(request.url);
    const searchQuery = url.searchParams.get('search') || '';
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '100');
    const offset = (page - 1) * limit;
    
    // Fetch all unique leads that have conversations with this user
    console.log(`Fetching conversations for user: ${userId}, page: ${page}, limit: ${limit}`);
    
    // Build the query dynamically based on whether we have a search term
    let query = supabase
      .from('conversation_view')
      .select('lead_id, lead_name, phone_number, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    // Only apply search filter if there's actually a search term
    if (searchQuery.trim()) {
      // Search in lead name, phone number, and handle null values properly
      query = query.or(`lead_name.ilike.%${searchQuery}%,phone_number.ilike.%${searchQuery}%,message_content.ilike.%${searchQuery}%`);
    }
    
    // Apply pagination
    const { data: allConversations, error: leadsError } = await query
      .range(offset, offset + limit - 1);
    
    if (leadsError) {
      console.error('Error fetching leads:', leadsError);
      return NextResponse.json(
        { error: `Error fetching leads: ${leadsError.message}` },
        { status: 500 }
      );
    }
    
    console.log(`Found ${allConversations?.length || 0} conversation records`);
    
    // If no conversations found, return empty array instead of error
    if (!allConversations || allConversations.length === 0) {
      return NextResponse.json({ conversations: [] });
    }
    
    // Get unique leads and keep the most recent conversation for each
    // Since we're already ordered by created_at desc, we can use a simpler approach
    const seenLeads = new Set();
    const uniqueLeads = allConversations.filter(conversation => {
      if (seenLeads.has(conversation.lead_id)) {
        return false;
      }
      seenLeads.add(conversation.lead_id);
      return true;
    });
    
    console.log(`Processing ${uniqueLeads.length} unique leads for conversations`);
    
    // First, get all unread counts in a single query to reduce database load
    let unreadCounts: Record<string, number> = {};
    try {
      const leadIds = uniqueLeads.map(lead => lead.lead_id);
      const { data: unreadData, error: unreadBatchError } = await supabase
        .from('lead_conversations')
        .select('lead_id')
        .eq('user_id', userId)
        .eq('direction', 'inbound')
        .eq('status', 'delivered')
        .is('read_at', null)
        .in('lead_id', leadIds);
      
      if (!unreadBatchError && unreadData) {
        // Count unread messages per lead
        unreadCounts = unreadData.reduce((acc: Record<string, number>, row: any) => {
          acc[row.lead_id] = (acc[row.lead_id] || 0) + 1;
          return acc;
        }, {});
      }
    } catch (batchError) {
      console.error('Error fetching unread counts in batch:', batchError);
      // Continue with empty unread counts if batch fails
    }
    
    // For each lead, get their last message
    const conversations = await Promise.all(uniqueLeads.map(async (lead) => {
      try {
        // Get the last message with a timeout
        const { data: lastMessage, error: messageError } = await supabase
          .from('conversation_view')
          .select('message_content, created_at, direction, message_type, template_id, status')
          .eq('lead_id', lead.lead_id)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (messageError) {
          console.error(`Error fetching last message for lead ${lead.lead_id}:`, messageError);
          // Instead of returning null, create a basic conversation entry
          return {
            id: lead.lead_id,
            name: lead.lead_name || 'Unknown Contact',
            phone: lead.phone_number || '',
            lastMessage: 'No messages available',
            timestamp: 'Unknown',
            status: 'active',
            unread: unreadCounts[lead.lead_id] || 0,
            avatar: '👤'
          };
        }
        
        // Use the pre-fetched unread count
        const unreadCount = unreadCounts[lead.lead_id] || 0;
        
        // Format the timestamp for UI display
        let formattedTimestamp = '';
        if (lastMessage && lastMessage.created_at) {
          const timestamp = new Date(lastMessage.created_at);
          const now = new Date();
          const diffInHours = (now.getTime() - timestamp.getTime()) / (1000 * 60 * 60);
          
          if (diffInHours < 24) {
            formattedTimestamp = `${Math.round(diffInHours)}h ago`;
          } else if (diffInHours < 48) {
            formattedTimestamp = 'Yesterday';
          } else {
            formattedTimestamp = `${Math.round(diffInHours / 24)}d ago`;
          }
        } else {
          formattedTimestamp = 'Unknown';
        }
        
        return {
          id: lead.lead_id,
          name: lead.lead_name || 'Unknown Contact',
          phone: lead.phone_number || '',
          lastMessage: lastMessage?.message_content || (lastMessage?.template_id ? `Template: ${lastMessage.template_id}` : 'Message sent'),
          timestamp: formattedTimestamp,
          status: lastMessage?.status || 'active',
          unread: unreadCount,
          avatar: '👤'
        };
      } catch (leadError) {
        console.error(`Error processing lead ${lead.lead_id}:`, leadError);
        // Return a safe default conversation entry for any error
        return {
          id: lead.lead_id,
          name: lead.lead_name || 'Unknown Contact',
          phone: lead.phone_number || '',
          lastMessage: 'Error loading messages',
          timestamp: 'Unknown',
          status: 'failed',
          unread: unreadCounts[lead.lead_id] || 0,
          avatar: '👤'
        };
      }
    }));
    
    // Filter out any null values from errors and failed conversations
    const validConversations = conversations.filter(conversation => conversation && conversation.status !== 'failed');
    
    console.log(`Returning ${validConversations.length} valid conversations to the client`);
    
    return NextResponse.json({
      conversations: validConversations,
      pagination: {
        page,
        limit,
        hasMore: allConversations.length === limit // Check if we got the full limit, suggesting more data
      }
    });
    
  } catch (error: any) {
    console.error('Error in GET /api/conversations:', error);
    return NextResponse.json(
      { error: error.message || 'An unknown error occurred' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/conversations
 * Fetch conversation history with a specific lead
 */
export async function POST(request: Request) {
  try {
    const { leadId, limit = 50 } = await request.json();
    
    if (!leadId) {
      return NextResponse.json(
        { error: 'Lead ID is required' },
        { status: 400 }
      );
    }
    
    // Initialize Supabase client
    const cookieStore = cookies();
    const supabase = createServerClient(cookieStore);
    
    // Get authenticated user's session and/or token
    const { data: { session } } = await supabase.auth.getSession();
    const authHeader = request.headers.get('Authorization');
    let accessToken = '';
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      accessToken = authHeader.substring(7);
    }
    
    // If we have an access token but no session, try to get session from the token
    if (accessToken && !session) {
      const { data: tokenSession } = await supabase.auth.getUser(accessToken);
      if (!tokenSession.user) {
        return NextResponse.json(
          { error: 'Not authenticated' },
          { status: 401 }
        );
      }
    }
    
    if (!session && !accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    // Get userId from session or token
    const userId = session?.user.id || (accessToken ? (await supabase.auth.getUser(accessToken)).data.user?.id : undefined);
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID not found' },
        { status: 401 }
      );
    }
    
    // Fetch conversation messages
    const { data: messages, error: messagesError } = await supabase
      .from('conversation_view')
      .select('*')
      .eq('lead_id', leadId)
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(limit);
    
    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
      return NextResponse.json(
        { error: `Error fetching messages: ${messagesError.message}` },
        { status: 500 }
      );
    }
    
    // Mark all messages as read
    const { error: updateError } = await supabase
      .from('lead_conversations')
      .update({ read_at: new Date().toISOString() })
      .eq('lead_id', leadId)
      .eq('user_id', userId)
      .eq('direction', 'inbound')
      .is('read_at', null);
    
    if (updateError) {
      console.error('Error marking messages as read:', updateError);
      // Continue anyway - this is not critical
    }
    
    // Format the messages for the UI
    const formattedMessages = messages.map((message, index) => {
      const timestamp = new Date(message.created_at);
      const formattedTime = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      return {
        id: message.id,
        text: message.message_content || (message.template_id ? `Template: ${message.template_id}` : 'Message sent'),
        sender: message.direction === 'inbound' ? 'contact' : 'user',
        timestamp: formattedTime,
        type: message.message_type
      };
    });
    
    return NextResponse.json({
      messages: formattedMessages,
      lead: {
        id: leadId,
        name: messages[0]?.lead_name || 'Unknown Contact',
        phone: messages[0]?.phone_number || ''
      }
    });
    
  } catch (error: any) {
    console.error('Error in POST /api/conversations:', error);
    return NextResponse.json(
      { error: error.message || 'An unknown error occurred' },
      { status: 500 }
    );
  }
} 