-- Add profile_pic column to conversations table
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS profile_pic text;

-- Add comment for clarity
COMMENT ON COLUMN public.conversations.profile_pic IS 'URL of the customer profile picture (Instagram only)';
