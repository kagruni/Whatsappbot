-- Enhance lead_conversations table to store message content for AI memory
-- This will allow us to use the database for context memory and UI display

-- Add new columns to store message content and direction
ALTER TABLE IF EXISTS public.lead_conversations
ADD COLUMN IF NOT EXISTS message_content TEXT,
ADD COLUMN IF NOT EXISTS direction VARCHAR(10) NOT NULL DEFAULT 'outbound' CHECK (direction IN ('inbound', 'outbound')),
ADD COLUMN IF NOT EXISTS message_type VARCHAR(15) NOT NULL DEFAULT 'template' CHECK (message_type IN ('template', 'text'));

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS lead_conversations_lead_id_created_at_idx ON public.lead_conversations(lead_id, created_at);
CREATE INDEX IF NOT EXISTS lead_conversations_user_id_created_at_idx ON public.lead_conversations(user_id, created_at);

-- Create a view for easier conversation retrieval
CREATE OR REPLACE VIEW public.conversation_view AS 
SELECT 
  lc.id,
  lc.user_id,
  lc.lead_id,
  l.name as lead_name,
  l.phone_number,
  lc.message_content,
  lc.template_id,
  lc.direction,
  lc.message_type,
  lc.created_at,
  lc.status
FROM 
  public.lead_conversations lc
JOIN 
  public.leads l ON lc.lead_id = l.id
ORDER BY 
  lc.created_at DESC;

COMMENT ON VIEW public.conversation_view IS 'Provides a comprehensive view of conversations for UI display and AI context'; 