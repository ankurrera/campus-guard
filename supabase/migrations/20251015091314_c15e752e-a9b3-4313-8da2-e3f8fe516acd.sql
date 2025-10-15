-- Add qualification column to teaching_assistants table
ALTER TABLE public.teaching_assistants 
ADD COLUMN IF NOT EXISTS qualification TEXT;