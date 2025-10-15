-- Create teaching_assistants table for TA profiles
CREATE TABLE IF NOT EXISTS public.teaching_assistants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  employee_id TEXT,
  face_data TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.teaching_assistants ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert their own TA profile during signup
CREATE POLICY "Allow authenticated users to insert their TA profile" 
ON public.teaching_assistants 
FOR INSERT 
TO authenticated 
WITH CHECK (user_id = auth.uid());

-- Allow TAs to view their own profile
CREATE POLICY "Allow TAs to view their own profile" 
ON public.teaching_assistants 
FOR SELECT 
TO authenticated 
USING (user_id = auth.uid());

-- Allow TAs to update their own profile
CREATE POLICY "Allow TAs to update their own profile" 
ON public.teaching_assistants 
FOR UPDATE 
TO authenticated 
USING (user_id = auth.uid());

-- Allow admins full access to all TA data
CREATE POLICY "Allow admins full access to TA data" 
ON public.teaching_assistants 
FOR ALL 
TO authenticated 
USING (is_admin());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_teaching_assistants_updated_at
BEFORE UPDATE ON public.teaching_assistants
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();