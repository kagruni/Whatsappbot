-- Fix phone column name mismatch between tables and views
-- The issue is that the leads table has a column named 'phone' but it's referenced as 'phone_number' in views

-- Update the conversation_view to use the correct column name
CREATE OR REPLACE VIEW public.conversation_view AS 
SELECT 
  lc.id,
  lc.user_id,
  lc.lead_id,
  l.name as lead_name,
  l.phone as phone_number, -- Fixed column name reference
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

COMMENT ON VIEW public.conversation_view IS 'Provides a comprehensive view of conversations for UI display and AI context';

-- Add a more specific index on leads table for phone lookups
CREATE INDEX IF NOT EXISTS leads_phone_idx ON public.leads(phone); 