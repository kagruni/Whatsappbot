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
    
    // Fetch all unique leads that have conversations with this user
    console.log('Fetching conversations for user:', userId);
    const { data: leads, error: leadsError } = await supabase
      .from('conversation_view')
      .select('lead_id, lead_name, phone_number')
      .eq('user_id', userId)
      .ilike('lead_name', `%${searchQuery}%`)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (leadsError) {
      console.error('Error fetching leads:', leadsError);
      return NextResponse.json(
        { error: `Error fetching leads: ${leadsError.message}` },
        { status: 500 }
      );
    }
    
    console.log(`Found ${leads?.length || 0} leads with conversations`);
    
    // If no leads found, return empty array instead of error
    if (!leads || leads.length === 0) {
      return NextResponse.json({ conversations: [] });
    }
    
    // For each lead, get their last message
    const uniqueLeads = leads.filter((lead, index, self) => 
      self.findIndex(l => l.lead_id === lead.lead_id) === index
    );
    
    // Get the last message and unread count for each lead
    const conversations = await Promise.all(uniqueLeads.map(async (lead) => {
      // Get the last message
      const { data: lastMessage, error: messageError } = await supabase
        .from('conversation_view')
        .select('message_content, created_at, direction, message_type, template_id')
        .eq('lead_id', lead.lead_id)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (messageError) {
        console.error(`Error fetching last message for lead ${lead.lead_id}:`, messageError);
        return null;
      }
      
      // Get unread count (messages from contact not yet marked as read)
      const { count: unreadCount, error: unreadError } = await supabase
        .from('lead_conversations')
        .select('id', { count: 'exact', head: true })
        .eq('lead_id', lead.lead_id)
        .eq('user_id', userId)
        .eq('direction', 'inbound')
        .eq('status', 'delivered') // Assuming 'read' status is added later
        .is('read_at', null);
      
      if (unreadError) {
        console.error(`Error getting unread count for lead ${lead.lead_id}:`, unreadError);
        return null;
      }
      
      // Format the timestamp for UI display
      const timestamp = new Date(lastMessage.created_at);
      let formattedTimestamp = '';
      const now = new Date();
      const diffInHours = (now.getTime() - timestamp.getTime()) / (1000 * 60 * 60);
      
      if (diffInHours < 24) {
        formattedTimestamp = `${Math.round(diffInHours)}h ago`;
      } else if (diffInHours < 48) {
        formattedTimestamp = 'Yesterday';
      } else {
        formattedTimestamp = `${Math.round(diffInHours / 24)}d ago`;
      }
      
      return {
        id: lead.lead_id,
        name: lead.lead_name || 'Unknown Contact',
        phone: lead.phone_number,
        lastMessage: lastMessage.message_content || (lastMessage.template_id ? `Template: ${lastMessage.template_id}` : 'Message sent'),
        timestamp: formattedTimestamp,
        status: 'active', // This could be determined by other factors
        unread: unreadCount || 0,
        avatar: '👤' // Could be customized based on contact data
      };
    }));
    
    // Filter out any null values from errors
    const validConversations = conversations.filter(Boolean);
    
    return NextResponse.json({
      conversations: validConversations
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