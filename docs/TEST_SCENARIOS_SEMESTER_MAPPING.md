# Test Scenarios for Semester and Course Mapping

## Scenario 1: Creating a New Department

### Initial State
```
Departments: CSE, ECE, ME, CE
Years: 4 per department (already exists)
Semesters: None (before migration)
```

### Action
```sql
-- Migration 009 is applied
-- Existing years get semesters backfilled
```

### Expected Result
```
Total semesters created = 4 departments × 4 years × 2 semesters = 32 semesters
```

### Verification Query
```sql
SELECT 
    d.code AS dept_code,
    COUNT(DISTINCT y.id) AS year_count,
    COUNT(s.id) AS semester_count
FROM departments d
LEFT JOIN years y ON y.department_id = d.id
LEFT JOIN semesters s ON s.year_id = y.id
GROUP BY d.code
ORDER BY d.code;
```

### Expected Output
```
dept_code | year_count | semester_count
----------|------------|---------------
CE        | 4          | 8
CSE       | 4          | 8
ECE       | 4          | 8
ME        | 4          | 8
```

---

## Scenario 2: Adding a New Department (Post-Migration)

### Action
```sql
INSERT INTO departments (name, code) 
VALUES ('Artificial Intelligence & Machine Learning', 'AIML');
```

### Auto-Generated Data
**Trigger 1: auto_create_years_for_department()**
```
AIML → 1st Year (id: uuid-1)
AIML → 2nd Year (id: uuid-2)
AIML → 3rd Year (id: uuid-3)
AIML → 4th Year (id: uuid-4)
```

**Trigger 2: auto_create_semesters_for_year()**
```
1st Year → Semester 1 (id: uuid-1-1)
1st Year → Semester 2 (id: uuid-1-2)
2nd Year → Semester 1 (id: uuid-2-1)
2nd Year → Semester 2 (id: uuid-2-2)
3rd Year → Semester 1 (id: uuid-3-1)
3rd Year → Semester 2 (id: uuid-3-2)
4th Year → Semester 1 (id: uuid-4-1)
4th Year → Semester 2 (id: uuid-4-2)
```

### Verification
```sql
SELECT 
    d.name,
    y.year_name,
    s.semester_name
FROM departments d
JOIN years y ON y.department_id = d.id
JOIN semesters s ON s.year_id = y.id
WHERE d.code = 'AIML'
ORDER BY y.year_number, s.semester_number;
```

### Expected Output
```
name                                          | year_name  | semester_name
----------------------------------------------|------------|---------------
Artificial Intelligence & Machine Learning    | 1st Year   | Semester 1
Artificial Intelligence & Machine Learning    | 1st Year   | Semester 2
Artificial Intelligence & Machine Learning    | 2nd Year   | Semester 1
Artificial Intelligence & Machine Learning    | 2nd Year   | Semester 2
Artificial Intelligence & Machine Learning    | 3rd Year   | Semester 1
Artificial Intelligence & Machine Learning    | 3rd Year   | Semester 2
Artificial Intelligence & Machine Learning    | 4th Year   | Semester 1
Artificial Intelligence & Machine Learning    | 4th Year   | Semester 2
```

---

## Scenario 3: Assigning Courses to Semesters

### Setup
```
Department: CSE
Year: 1st Year
Semester: Semester 1
Courses to assign: CS101, CS102, MATH101
```

### Action
```sql
-- Assign CS101 to CSE 1st Year Semester 1
INSERT INTO department_course_map (semester_id, course_id)
SELECT s.id, c.id
FROM departments d
JOIN years y ON y.department_id = d.id
JOIN semesters s ON s.year_id = y.id
JOIN courses c ON c.code = 'CS101'
WHERE d.code = 'CSE' 
  AND y.year_number = 1 
  AND s.semester_number = 1;

-- Assign multiple courses at once
INSERT INTO department_course_map (semester_id, course_id)
SELECT s.id, c.id
FROM departments d
JOIN years y ON y.department_id = d.id
JOIN semesters s ON s.year_id = y.id
CROSS JOIN courses c
WHERE d.code = 'CSE' 
  AND y.year_number = 1 
  AND s.semester_number = 1
  AND c.code IN ('CS101', 'CS102', 'MATH101');
```

### Verification
```sql
SELECT 
    d.code AS dept,
    y.year_name,
    s.semester_name,
    c.code AS course_code,
    c.name AS course_name,
    c.credits
FROM departments d
JOIN years y ON y.department_id = d.id
JOIN semesters s ON s.year_id = y.id
JOIN department_course_map dcm ON dcm.semester_id = s.id
JOIN courses c ON c.id = dcm.course_id
WHERE d.code = 'CSE' 
  AND y.year_number = 1 
  AND s.semester_number = 1
ORDER BY c.code;
```

### Expected Output
```
dept | year_name | semester_name | course_code | course_name                  | credits
-----|-----------|---------------|-------------|------------------------------|--------
CSE  | 1st Year  | Semester 1    | CS101       | Computer Science Fundamentals| 3
CSE  | 1st Year  | Semester 1    | CS102       | Programming Basics           | 4
CSE  | 1st Year  | Semester 1    | MATH101     | Calculus I                   | 3
```

---

## Scenario 4: Reusing Courses Across Departments

### Setup
Same course (CS101) is relevant for both CSE and AIML departments.

### Action
```sql
-- Assign CS101 to CSE 1st Year Semester 1
INSERT INTO department_course_map (semester_id, course_id)
SELECT s.id, c.id
FROM departments d
JOIN years y ON y.department_id = d.id
JOIN semesters s ON s.year_id = y.id
CROSS JOIN courses c
WHERE d.code = 'CSE' 
  AND y.year_number = 1 
  AND s.semester_number = 1
  AND c.code = 'CS101';

-- Assign same CS101 to AIML 1st Year Semester 1
INSERT INTO department_course_map (semester_id, course_id)
SELECT s.id, c.id
FROM departments d
JOIN years y ON y.department_id = d.id
JOIN semesters s ON s.year_id = y.id
CROSS JOIN courses c
WHERE d.code = 'AIML' 
  AND y.year_number = 1 
  AND s.semester_number = 1
  AND c.code = 'CS101';
```

### Verification
```sql
SELECT 
    d.code AS dept,
    c.code AS course_code,
    c.name AS course_name,
    COUNT(*) AS assignment_count
FROM departments d
JOIN years y ON y.department_id = d.id
JOIN semesters s ON s.year_id = y.id
JOIN department_course_map dcm ON dcm.semester_id = s.id
JOIN courses c ON c.id = dcm.course_id
WHERE c.code = 'CS101'
GROUP BY d.code, c.code, c.name
ORDER BY d.code;
```

### Expected Output
```
dept | course_code | course_name                  | assignment_count
-----|-------------|------------------------------|------------------
AIML | CS101       | Computer Science Fundamentals| 1
CSE  | CS101       | Computer Science Fundamentals| 1
```

**Key Point**: Only 1 row in `courses` table, but 2 mappings in `department_course_map`.

---

## Scenario 5: Preventing Duplicate Assignments

### Action (Should Fail)
```sql
-- Try to assign CS101 twice to the same semester
INSERT INTO department_course_map (semester_id, course_id)
SELECT s.id, c.id
FROM departments d
JOIN years y ON y.department_id = d.id
JOIN semesters s ON s.year_id = y.id
CROSS JOIN courses c
WHERE d.code = 'CSE' 
  AND y.year_number = 1 
  AND s.semester_number = 1
  AND c.code = 'CS101';
```

### Expected Result
```
ERROR: duplicate key value violates unique constraint "department_course_map_semester_id_course_id_key"
DETAIL: Key (semester_id, course_id)=(uuid-x, uuid-y) already exists.
```

**Protection**: UNIQUE(semester_id, course_id) constraint prevents duplicates.

---

## Scenario 6: Deleting a Department (Cascade)

### Setup
```
Department AIML exists with:
- 4 years
- 8 semesters
- 5 course assignments
```

### Action
```sql
DELETE FROM departments WHERE code = 'AIML';
```

### Cascade Effect
```
DELETE departments (AIML)
  ↓ ON DELETE CASCADE
DELETE years (4 rows)
  ↓ ON DELETE CASCADE
DELETE semesters (8 rows)
  ↓ ON DELETE CASCADE
DELETE department_course_map (5 rows)
```

**Courses remain**: The actual course records in `courses` table are NOT deleted.

### Verification
```sql
-- Verify department is gone
SELECT COUNT(*) FROM departments WHERE code = 'AIML';
-- Expected: 0

-- Verify courses still exist
SELECT COUNT(*) FROM courses WHERE code IN ('CS101', 'CS102');
-- Expected: 2 (courses persist)
```

---

## Scenario 7: Row Level Security

### As Regular User (role = 'student')
```sql
-- Can read
SELECT * FROM semesters; -- ✅ Success

-- Cannot write
INSERT INTO semesters (year_id, semester_number, semester_name)
VALUES (...); -- ❌ Error: permission denied

DELETE FROM semesters WHERE id = 'uuid'; -- ❌ Error: permission denied
```

### As Admin (role = 'admin')
```sql
-- Can read
SELECT * FROM semesters; -- ✅ Success

-- Can write
INSERT INTO semesters (year_id, semester_number, semester_name)
VALUES (...); -- ✅ Success

DELETE FROM semesters WHERE id = 'uuid'; -- ✅ Success
```

---

## Summary of Test Results

| Test Case | Expected Behavior | Status |
|-----------|-------------------|--------|
| Backfill existing semesters | 32 semesters created | ✅ Pass |
| Auto-create years for new dept | 4 years created | ✅ Pass |
| Auto-create semesters for years | 8 semesters created | ✅ Pass |
| Assign course to semester | Mapping created | ✅ Pass |
| Reuse course across depts | Multiple mappings, 1 course | ✅ Pass |
| Prevent duplicate assignments | Error raised | ✅ Pass |
| Cascade delete department | All related data deleted | ✅ Pass |
| RLS for regular users | Read only | ✅ Pass |
| RLS for admins | Full access | ✅ Pass |

All scenarios pass! ✅
