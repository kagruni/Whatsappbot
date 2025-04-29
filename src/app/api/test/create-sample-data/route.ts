import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/supabase/server';
import crypto from 'crypto';

/**
 * This is a utility endpoint for creating sample conversation data for testing.
 * It should be disabled or protected in production.
 */
export async function GET(request: Request) {
  try {
    // Initialize Supabase client
    const cookieStore = cookies();
    const supabase = createServerClient(cookieStore);
    
    // Get authenticated user's session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({
        error: 'Not authenticated',
      }, { status: 401 });
    }
    
    const userId = session.user.id;
    
    // 1. Create a sample lead if doesn't exist
    const leadName = "Test Contact";
    const phoneNumber = "491234567890"; // Example German number format
    
    let leadId;
    const { data: existingLead } = await supabase
      .from('leads')
      .select('id')
      .eq('phone_number', phoneNumber)
      .single();
    
    if (existingLead) {
      leadId = existingLead.id;
    } else {
      const { data: newLead, error } = await supabase
        .from('leads')
        .insert({
          name: leadName,
          phone_number: phoneNumber,
          status: 'New',
          user_id: userId
        })
        .select('id')
        .single();
      
      if (error) {
        return NextResponse.json({
          error: 'Failed to create sample lead',
          details: error.message
        }, { status: 500 });
      }
      
      leadId = newLead.id;
    }
    
    // 2. Create sample conversation messages
    const sampleConversation = [
      {
        direction: 'inbound',
        message_type: 'text',
        message_content: 'Hello, I received your message about services.',
        created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
      },
      {
        direction: 'outbound',
        message_type: 'template',
        message_content: 'Template: hello_world - Introduction',
        template_id: 'hello_world',
        created_at: new Date(Date.now() - 3.5 * 60 * 60 * 1000).toISOString(),
      },
      {
        direction: 'inbound',
        message_type: 'text',
        message_content: 'Can you tell me more about your services?',
        created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      },
      {
        direction: 'outbound',
        message_type: 'text',
        message_content: 'We offer a range of services including home renovations, interior design, and construction projects. Would you like to discuss a specific area?',
        created_at: new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString(),
      },
      {
        direction: 'inbound',
        message_type: 'text',
        message_content: 'Yes, I\'m interested in kitchen renovation. Do you have any examples of your work?',
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        direction: 'outbound',
        message_type: 'text',
        message_content: "Absolutely! We've completed several kitchen renovations recently. You can see examples on our website at www.example.com/portfolio or I can schedule a consultation to discuss your specific needs.",
        created_at: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(),
      }
    ];
    
    for (const message of sampleConversation) {
      const { error } = await supabase
        .from('lead_conversations')
        .insert({
          user_id: userId,
          lead_id: leadId,
          message_id: crypto.randomUUID(),
          message_content: message.message_content,
          direction: message.direction,
          message_type: message.message_type,
          template_id: message.template_id || null,
          language: 'en',
          created_at: message.created_at,
          status: 'delivered'
        });
      
      if (error) {
        return NextResponse.json({
          error: 'Failed to create sample conversation',
          details: error.message
        }, { status: 500 });
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Sample conversation data created successfully',
      leadId,
      messageCount: sampleConversation.length
    });
    
  } catch (error: any) {
    console.error('Error creating sample data:', error);
    return NextResponse.json({
      error: 'Error creating sample data',
      message: error.message
    }, { status: 500 });
  }
} 