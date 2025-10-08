-- Add INSERT policy for teaching_assistants table
-- This allows authenticated users to create their TA profile during signup

CREATE POLICY "Allow authenticated users to insert their TA profile" 
ON teaching_assistants 
FOR INSERT 
TO authenticated 
WITH CHECK (user_id = auth.uid());
