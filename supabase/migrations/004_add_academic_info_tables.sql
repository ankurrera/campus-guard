-- Create departments table
CREATE TABLE IF NOT EXISTS departments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    code VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create years table
CREATE TABLE IF NOT EXISTS years (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    year_number INTEGER NOT NULL,
    year_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(department_id, year_number)
);

-- Create sections table
CREATE TABLE IF NOT EXISTS sections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    year_id UUID NOT NULL REFERENCES years(id) ON DELETE CASCADE,
    section_name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(department_id, year_id, section_name)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_years_department_id ON years(department_id);
CREATE INDEX IF NOT EXISTS idx_sections_department_id ON sections(department_id);
CREATE INDEX IF NOT EXISTS idx_sections_year_id ON sections(year_id);

-- Add updated_at triggers
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_years_updated_at BEFORE UPDATE ON years
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sections_updated_at BEFORE UPDATE ON sections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample departments
INSERT INTO departments (name, code) VALUES
('Computer Science and Engineering', 'CSE'),
('Electronics and Communication Engineering', 'ECE'),
('Mechanical Engineering', 'ME'),
('Civil Engineering', 'CE')
ON CONFLICT (code) DO NOTHING;

-- Insert sample years for each department
INSERT INTO years (department_id, year_number, year_name)
SELECT d.id, y.year_number, y.year_name
FROM departments d
CROSS JOIN (
    VALUES 
        (1, '1st Year'),
        (2, '2nd Year'),
        (3, '3rd Year'),
        (4, '4th Year')
) AS y(year_number, year_name)
ON CONFLICT (department_id, year_number) DO NOTHING;

-- Insert sample sections for each department-year combination
INSERT INTO sections (department_id, year_id, section_name)
SELECT d.id, y.id, s.section_name
FROM departments d
JOIN years y ON y.department_id = d.id
CROSS JOIN (
    VALUES ('A'), ('B'), ('C'), ('D')
) AS s(section_name)
ON CONFLICT (department_id, year_id, section_name) DO NOTHING;

-- Add Row Level Security
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE years ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read departments, years, and sections
CREATE POLICY "Anyone can view departments" ON departments FOR SELECT USING (true);
CREATE POLICY "Anyone can view years" ON years FOR SELECT USING (true);
CREATE POLICY "Anyone can view sections" ON sections FOR SELECT USING (true);
