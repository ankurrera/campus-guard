-- ============================================
-- Complete Migration for Teaching Assistants
-- ============================================
-- 
-- This file contains all SQL commands needed to fix the error:
-- "ERROR: 42P01: relation 'teaching_assistants' does not exist"
--
-- Copy and paste this entire file into Supabase SQL Editor and run it.
--
-- ============================================

-- Create courses table
CREATE TABLE IF NOT EXISTS courses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    department VARCHAR(100),
    semester VARCHAR(50),
    credits INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create teaching_assistants table
CREATE TABLE IF NOT EXISTS teaching_assistants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    employee_id VARCHAR(50) NOT NULL UNIQUE,
    phone VARCHAR(20),
    qualification TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create course_assignments table (linking TAs to courses)
CREATE TABLE IF NOT EXISTS course_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ta_id UUID NOT NULL REFERENCES teaching_assistants(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(ta_id, course_id)
);

-- Update the user_role enum to include 'ta'
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('admin', 'faculty', 'student', 'ta');
    ELSE
        ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'ta';
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_teaching_assistants_user_id ON teaching_assistants(user_id);
CREATE INDEX IF NOT EXISTS idx_teaching_assistants_employee_id ON teaching_assistants(employee_id);
CREATE INDEX IF NOT EXISTS idx_course_assignments_ta_id ON course_assignments(ta_id);
CREATE INDEX IF NOT EXISTS idx_course_assignments_course_id ON course_assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_courses_code ON courses(code);

-- Add updated_at trigger for courses
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers (drop first if they exist to avoid errors)
DROP TRIGGER IF EXISTS update_courses_updated_at ON courses;
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_teaching_assistants_updated_at ON teaching_assistants;
CREATE TRIGGER update_teaching_assistants_updated_at BEFORE UPDATE ON teaching_assistants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data (only if not already present)
INSERT INTO courses (name, code, description, department, semester, credits) 
SELECT * FROM (VALUES
    ('Computer Science Fundamentals', 'CS101', 'Introduction to programming and computer science concepts', 'Computer Science', 'Fall 2024', 3),
    ('Data Structures and Algorithms', 'CS201', 'Advanced programming concepts, data structures, and algorithms', 'Computer Science', 'Spring 2024', 4),
    ('Database Systems', 'CS301', 'Database design, SQL, and database management systems', 'Computer Science', 'Fall 2024', 3),
    ('Web Development', 'CS250', 'Modern web development with HTML, CSS, JavaScript, and frameworks', 'Computer Science', 'Spring 2024', 3)
) AS v(name, code, description, department, semester, credits)
WHERE NOT EXISTS (
    SELECT 1 FROM courses WHERE code = v.code
);

-- Add Row Level Security policies
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE teaching_assistants ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_assignments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Anyone can view courses" ON courses;
DROP POLICY IF EXISTS "TAs can view their own profile" ON teaching_assistants;
DROP POLICY IF EXISTS "TAs can update their own profile" ON teaching_assistants;
DROP POLICY IF EXISTS "Allow authenticated users to insert their TA profile" ON teaching_assistants;
DROP POLICY IF EXISTS "TAs can view their assignments" ON course_assignments;

-- Allow authenticated users to read courses
CREATE POLICY "Anyone can view courses" ON courses FOR SELECT USING (true);

-- TAs can view their own profile
CREATE POLICY "TAs can view their own profile" ON teaching_assistants FOR SELECT USING (user_id = auth.uid());

-- TAs can update their own profile
CREATE POLICY "TAs can update their own profile" ON teaching_assistants FOR UPDATE USING (user_id = auth.uid());

-- Allow authenticated users to insert their TA profile during signup
CREATE POLICY "Allow authenticated users to insert their TA profile" 
ON teaching_assistants 
FOR INSERT 
TO authenticated 
WITH CHECK (user_id = auth.uid());

-- TAs can view their course assignments
CREATE POLICY "TAs can view their assignments" ON course_assignments FOR SELECT USING (
    ta_id IN (SELECT id FROM teaching_assistants WHERE user_id = auth.uid())
);

-- ============================================
-- Migration Complete!
-- ============================================
-- 
-- The following have been created:
-- - courses table
-- - teaching_assistants table
-- - course_assignments table
-- - Indexes for performance
-- - RLS policies for security
-- - Sample course data
--
-- Next steps:
-- 1. TAs can now register at /ta/signup
-- 2. TAs can login at /ta/login
-- 3. Admins can assign TAs to courses
-- ============================================
