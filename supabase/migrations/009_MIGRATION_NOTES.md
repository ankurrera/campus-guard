# Migration 009: Semesters and Department-Course Mapping

## Overview
This migration extends the existing university database schema to properly map departments, years, semesters, and courses (subjects).

## Schema Changes

### New Tables

#### 1. semesters
- Links to `years` table
- Each year has 2 semesters (Semester 1 and Semester 2)
- Unique constraint on (year_id, semester_number)

#### 2. department_course_map
- Links courses from the centralized `courses` table to specific department-year-semester combinations
- References: department_id, year_id, semester_id, course_id
- Unique constraint on (semester_id, course_id) - prevents duplicate course assignment to same semester

## Auto-Generation Features

### Trigger Functions

#### auto_create_years_for_department()
- Triggered AFTER INSERT on `departments`
- Automatically creates 4 years (1st-4th) for each new department
- Uses ON CONFLICT DO NOTHING to handle existing years

#### auto_create_semesters_for_year()
- Triggered AFTER INSERT on `years`
- Automatically creates 2 semesters for each new year
- Uses ON CONFLICT DO NOTHING to handle existing semesters

### Data Flow
```
Department Created
    ↓ (trigger: auto_create_years_for_department)
4 Years Created (1st, 2nd, 3rd, 4th)
    ↓ (trigger: auto_create_semesters_for_year)
8 Semesters Created (2 per year)
```

## Backfill
The migration includes a statement to generate semesters for all existing years in the database.

## Row Level Security

### semesters table
- SELECT: Anyone can view
- ALL: Admins only (role = 'admin')

### department_course_map table
- SELECT: Anyone can view
- ALL: Admins only (role = 'admin')

## Database Hierarchy
```
departments (CSE, ECE, ME, etc.)
    └── years (1st, 2nd, 3rd, 4th)
        └── semesters (Semester 1, Semester 2)
            └── courses (via department_course_map)
                - Uses existing courses table
                - No duplication of course data
```

## Testing Checklist

After applying this migration, verify:
1. ✓ `semesters` table exists
2. ✓ `department_course_map` table exists
3. ✓ All existing years have 2 semesters created
4. ✓ Total semesters = number of years × 2
5. ✓ Creating a new department auto-generates 4 years and 8 semesters
6. ✓ RLS policies allow read access to all authenticated users
7. ✓ RLS policies restrict write access to admins only

## SQL Verification Queries

```sql
-- Count semesters per department
SELECT 
    d.name AS department_name,
    d.code AS department_code,
    COUNT(s.id) AS semester_count
FROM departments d
JOIN years y ON y.department_id = d.id
JOIN semesters s ON s.year_id = y.id
GROUP BY d.id, d.name, d.code
ORDER BY d.name;
-- Expected: 8 semesters per department

-- View complete hierarchy
SELECT 
    d.name AS department,
    y.year_name,
    s.semester_name,
    c.code AS course_code,
    c.name AS course_name
FROM departments d
JOIN years y ON y.department_id = d.id
JOIN semesters s ON s.year_id = y.id
LEFT JOIN department_course_map dcm ON dcm.semester_id = s.id
LEFT JOIN courses c ON c.id = dcm.course_id
ORDER BY d.name, y.year_number, s.semester_number;

-- Test auto-creation by inserting a new department
INSERT INTO departments (name, code) VALUES ('Test Department', 'TEST');
-- Should auto-create 4 years and 8 semesters

-- Verify auto-creation worked
SELECT 
    d.name,
    COUNT(DISTINCT y.id) AS year_count,
    COUNT(s.id) AS semester_count
FROM departments d
LEFT JOIN years y ON y.department_id = d.id
LEFT JOIN semesters s ON s.year_id = y.id
WHERE d.code = 'TEST'
GROUP BY d.name;
-- Expected: year_count=4, semester_count=8

-- Cleanup test
DELETE FROM departments WHERE code = 'TEST';
```

## Compatibility
- Compatible with existing tables: departments, years, courses
- Does not modify existing tables
- Uses established patterns from existing migrations
- Follows same naming conventions and RLS policy patterns
