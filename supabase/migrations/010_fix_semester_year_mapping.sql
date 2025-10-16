-- Fix semester-year mapping to support 8 semesters across 4 years
-- 1st Year → Semester 1 & 2
-- 2nd Year → Semester 3 & 4
-- 3rd Year → Semester 5 & 6
-- 4th Year → Semester 7 & 8

-- Step 1: Drop the existing check constraint on semester_number
ALTER TABLE semesters DROP CONSTRAINT IF EXISTS semesters_semester_number_check;

-- Step 2: Add new check constraint to allow semester_number 1-8
ALTER TABLE semesters ADD CONSTRAINT semesters_semester_number_check 
    CHECK (semester_number >= 1 AND semester_number <= 8);

-- Step 3: Truncate existing semesters data (this will cascade to department_course_map)
TRUNCATE TABLE semesters CASCADE;

-- Step 4: Insert 8 semesters with proper year mapping
-- For each department, we need to insert semesters linked to their corresponding years
INSERT INTO semesters (year_id, semester_number, semester_name, created_at)
SELECT 
    y.id,
    CASE 
        WHEN y.year_number = 1 AND s.sem_in_year = 1 THEN 1
        WHEN y.year_number = 1 AND s.sem_in_year = 2 THEN 2
        WHEN y.year_number = 2 AND s.sem_in_year = 1 THEN 3
        WHEN y.year_number = 2 AND s.sem_in_year = 2 THEN 4
        WHEN y.year_number = 3 AND s.sem_in_year = 1 THEN 5
        WHEN y.year_number = 3 AND s.sem_in_year = 2 THEN 6
        WHEN y.year_number = 4 AND s.sem_in_year = 1 THEN 7
        WHEN y.year_number = 4 AND s.sem_in_year = 2 THEN 8
    END as semester_number,
    'Semester ' || CASE 
        WHEN y.year_number = 1 AND s.sem_in_year = 1 THEN '1'
        WHEN y.year_number = 1 AND s.sem_in_year = 2 THEN '2'
        WHEN y.year_number = 2 AND s.sem_in_year = 1 THEN '3'
        WHEN y.year_number = 2 AND s.sem_in_year = 2 THEN '4'
        WHEN y.year_number = 3 AND s.sem_in_year = 1 THEN '5'
        WHEN y.year_number = 3 AND s.sem_in_year = 2 THEN '6'
        WHEN y.year_number = 4 AND s.sem_in_year = 1 THEN '7'
        WHEN y.year_number = 4 AND s.sem_in_year = 2 THEN '8'
    END as semester_name,
    now() as created_at
FROM years y
CROSS JOIN (VALUES (1), (2)) AS s(sem_in_year)
ORDER BY y.department_id, y.year_number, s.sem_in_year;

-- Step 5: Update the auto-create trigger function to use the new mapping
CREATE OR REPLACE FUNCTION auto_create_semesters_for_year()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate semester numbers based on year_number
    -- 1st Year (year_number=1) → Semesters 1, 2
    -- 2nd Year (year_number=2) → Semesters 3, 4
    -- 3rd Year (year_number=3) → Semesters 5, 6
    -- 4th Year (year_number=4) → Semesters 7, 8
    INSERT INTO semesters (year_id, semester_number, semester_name)
    VALUES 
        (NEW.id, (NEW.year_number - 1) * 2 + 1, 'Semester ' || ((NEW.year_number - 1) * 2 + 1)),
        (NEW.id, (NEW.year_number - 1) * 2 + 2, 'Semester ' || ((NEW.year_number - 1) * 2 + 2))
    ON CONFLICT (year_id, semester_number) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
