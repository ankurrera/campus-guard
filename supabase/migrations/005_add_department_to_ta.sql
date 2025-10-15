-- Add department column to teaching_assistants table
ALTER TABLE public.teaching_assistants 
ADD COLUMN IF NOT EXISTS department VARCHAR(100);

-- Create index for better performance when filtering by department
CREATE INDEX IF NOT EXISTS idx_teaching_assistants_department ON teaching_assistants(department);
