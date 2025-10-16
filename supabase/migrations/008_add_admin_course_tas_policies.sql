-- Add admin policies for course_tas table
-- This allows admins to view, create, update, and delete course assignments

-- First, check if we need to use course_tas or course_assignments
-- Based on the types.ts, the table is named course_tas

-- Allow admins to view all course assignments
CREATE POLICY IF NOT EXISTS "Allow admins to view all course assignments" 
ON public.course_tas 
FOR SELECT 
TO authenticated 
USING (is_admin());

-- Allow admins to create course assignments
CREATE POLICY IF NOT EXISTS "Allow admins to create course assignments" 
ON public.course_tas 
FOR INSERT 
TO authenticated 
WITH CHECK (is_admin());

-- Allow admins to update course assignments
CREATE POLICY IF NOT EXISTS "Allow admins to update course assignments" 
ON public.course_tas 
FOR UPDATE 
TO authenticated 
USING (is_admin());

-- Allow admins to delete course assignments
CREATE POLICY IF NOT EXISTS "Allow admins to delete course assignments" 
ON public.course_tas 
FOR DELETE 
TO authenticated 
USING (is_admin());
