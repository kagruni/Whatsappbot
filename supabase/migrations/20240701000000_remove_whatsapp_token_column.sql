-- Remove the whatsapp_token column from user_settings table
-- This is because we're moving to using only environment variables for the token

ALTER TABLE IF EXISTS public.user_settings
DROP COLUMN IF EXISTS whatsapp_token;

-- Note: This migration will not affect existing functionality as the code
-- will now only use the WHATSAPP_TOKEN environment variable 