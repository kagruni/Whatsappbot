-- Add read_at column to lead_conversations table
-- This allows tracking when a message was read for unread count in UI

ALTER TABLE IF EXISTS public.lead_conversations
ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;

-- Update the conversation view to include read status
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
  lc.read_at,
  lc.status
FROM 
  public.lead_conversations lc
JOIN 
  public.leads l ON lc.lead_id = l.id
ORDER BY 
  lc.created_at DESC; 