-- Create semesters table to represent each semester within a year
CREATE TABLE IF NOT EXISTS semesters (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    year_id UUID NOT NULL REFERENCES years(id) ON DELETE CASCADE,
    semester_number INTEGER NOT NULL CHECK (semester_number IN (1, 2)),
    semester_name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(year_id, semester_number)
);

-- Create department_course_map table to link semesters to courses
CREATE TABLE IF NOT EXISTS department_course_map (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    year_id UUID NOT NULL REFERENCES years(id) ON DELETE CASCADE,
    semester_id UUID NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(semester_id, course_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_semesters_year_id ON semesters(year_id);
CREATE INDEX IF NOT EXISTS idx_department_course_map_department_id ON department_course_map(department_id);
CREATE INDEX IF NOT EXISTS idx_department_course_map_year_id ON department_course_map(year_id);
CREATE INDEX IF NOT EXISTS idx_department_course_map_semester_id ON department_course_map(semester_id);
CREATE INDEX IF NOT EXISTS idx_department_course_map_course_id ON department_course_map(course_id);

-- Add updated_at triggers
CREATE TRIGGER update_semesters_updated_at BEFORE UPDATE ON semesters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_department_course_map_updated_at BEFORE UPDATE ON department_course_map
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-create 4 years when a department is created
CREATE OR REPLACE FUNCTION auto_create_years_for_department()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert 4 years for the new department
    INSERT INTO years (department_id, year_number, year_name)
    VALUES 
        (NEW.id, 1, '1st Year'),
        (NEW.id, 2, '2nd Year'),
        (NEW.id, 3, '3rd Year'),
        (NEW.id, 4, '4th Year')
    ON CONFLICT (department_id, year_number) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-create 2 semesters when a year is created
CREATE OR REPLACE FUNCTION auto_create_semesters_for_year()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert 2 semesters for the new year
    INSERT INTO semesters (year_id, semester_number, semester_name)
    VALUES 
        (NEW.id, 1, 'Semester 1'),
        (NEW.id, 2, 'Semester 2')
    ON CONFLICT (year_id, semester_number) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to auto-generate years and semesters
CREATE TRIGGER trigger_auto_create_years
    AFTER INSERT ON departments
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_years_for_department();

CREATE TRIGGER trigger_auto_create_semesters
    AFTER INSERT ON years
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_semesters_for_year();

-- Generate semesters for existing years
INSERT INTO semesters (year_id, semester_number, semester_name)
SELECT y.id, s.semester_number, s.semester_name
FROM years y
CROSS JOIN (
    VALUES 
        (1, 'Semester 1'),
        (2, 'Semester 2')
) AS s(semester_number, semester_name)
ON CONFLICT (year_id, semester_number) DO NOTHING;

-- Add Row Level Security
ALTER TABLE semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_course_map ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read semesters
CREATE POLICY "Anyone can view semesters" ON semesters FOR SELECT USING (true);

-- Allow all authenticated users to read department_course_map
CREATE POLICY "Anyone can view department course mappings" ON department_course_map FOR SELECT USING (true);

-- Allow admins to manage semesters (assuming is_admin() function exists)
CREATE POLICY "Admins can manage semesters" ON semesters FOR ALL USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
);

-- Allow admins to manage department_course_map
CREATE POLICY "Admins can manage department course mappings" ON department_course_map FOR ALL USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
);
