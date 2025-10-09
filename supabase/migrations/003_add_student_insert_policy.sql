-- Add INSERT policy for students table
-- This allows authenticated users to create their student profile during signup

CREATE POLICY "Allow authenticated users to insert their student profile" 
ON students 
FOR INSERT 
TO authenticated 
WITH CHECK (user_id = auth.uid());
