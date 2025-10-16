-- Complete Verification Script for Migration 010
-- Run this script after applying migration 010 to verify the semester-year mapping fix

-- ============================================================================
-- PART 1: Pre-Migration State Check (Optional - run BEFORE applying migration)
-- ============================================================================
-- Uncomment these to check the state before migration:

-- SELECT 'Current semester numbers before migration:' as info;
-- SELECT DISTINCT semester_number FROM semesters ORDER BY semester_number;

-- SELECT 'Current semester count per department before migration:' as info;
-- SELECT d.name, COUNT(s.id) as semester_count
-- FROM departments d
-- JOIN years y ON y.department_id = d.id
-- JOIN semesters s ON s.year_id = y.id
-- GROUP BY d.name;

-- ============================================================================
-- PART 2: Post-Migration Verification
-- ============================================================================

-- Test 1: Verify years table has 4 rows per department
SELECT '=== Test 1: Year Count Per Department ===' as test_name;
SELECT 
    d.name as department, 
    COUNT(*) as year_count,
    CASE 
        WHEN COUNT(*) = 4 THEN '✓ PASS'
        ELSE '✗ FAIL - Expected 4 years'
    END as status
FROM departments d
JOIN years y ON y.department_id = d.id
GROUP BY d.name
ORDER BY d.name;

-- Test 2: Verify semester count per department (should be 8)
SELECT '=== Test 2: Semester Count Per Department ===' as test_name;
SELECT 
    d.name as department, 
    COUNT(*) as semester_count,
    CASE 
        WHEN COUNT(*) = 8 THEN '✓ PASS'
        ELSE '✗ FAIL - Expected 8 semesters'
    END as status
FROM departments d
JOIN years y ON y.department_id = d.id
JOIN semesters s ON s.year_id = y.id
GROUP BY d.name
ORDER BY d.name;

-- Test 3: Verify semester numbers range (should be 1-8)
SELECT '=== Test 3: Semester Number Range ===' as test_name;
SELECT 
    MIN(semester_number) as min_semester,
    MAX(semester_number) as max_semester,
    COUNT(DISTINCT semester_number) as unique_semester_numbers,
    CASE 
        WHEN MIN(semester_number) = 1 
         AND MAX(semester_number) = 8 
         AND COUNT(DISTINCT semester_number) = 8 
        THEN '✓ PASS'
        ELSE '✗ FAIL - Expected 1-8'
    END as status
FROM semesters;

-- Test 4: Verify the complete mapping with join query (PRIMARY VERIFICATION)
SELECT '=== Test 4: Complete Semester-Year Mapping ===' as test_name;
SELECT 
    y.year_name, 
    s.semester_number, 
    s.semester_name,
    CASE 
        WHEN y.year_name = '1st Year' AND s.semester_number IN (1, 2) THEN '✓'
        WHEN y.year_name = '2nd Year' AND s.semester_number IN (3, 4) THEN '✓'
        WHEN y.year_name = '3rd Year' AND s.semester_number IN (5, 6) THEN '✓'
        WHEN y.year_name = '4th Year' AND s.semester_number IN (7, 8) THEN '✓'
        ELSE '✗ WRONG MAPPING'
    END as validation
FROM semesters s
JOIN years y ON s.year_id = y.id
WHERE y.department_id = (SELECT id FROM departments LIMIT 1)
ORDER BY s.semester_number;

-- Test 5: Verify each year has exactly 2 semesters
SELECT '=== Test 5: Semesters Per Year ===' as test_name;
SELECT 
    d.name as department,
    y.year_name,
    COUNT(s.id) as semester_count,
    CASE 
        WHEN COUNT(s.id) = 2 THEN '✓ PASS'
        ELSE '✗ FAIL - Expected 2 semesters'
    END as status
FROM departments d
JOIN years y ON y.department_id = d.id
LEFT JOIN semesters s ON s.year_id = y.id
GROUP BY d.name, y.year_name, y.year_number
ORDER BY d.name, y.year_number;

-- Test 6: Check for duplicate semester numbers within same year_id (should return 0 rows)
SELECT '=== Test 6: Duplicate Check ===' as test_name;
SELECT 
    year_id, 
    semester_number, 
    COUNT(*) as count,
    '✗ FAIL - Duplicates found' as status
FROM semesters
GROUP BY year_id, semester_number
HAVING COUNT(*) > 1;

-- If no rows returned, add success message:
SELECT 
    CASE 
        WHEN NOT EXISTS (
            SELECT 1 FROM semesters
            GROUP BY year_id, semester_number
            HAVING COUNT(*) > 1
        )
        THEN '✓ PASS - No duplicates found'
        ELSE '✗ FAIL - Duplicates exist'
    END as duplicate_check;

-- Test 7: Verify specific year-semester mappings
SELECT '=== Test 7: Specific Mapping Verification ===' as test_name;
WITH expected_mapping AS (
    SELECT 1 as year_num, 1 as sem_num UNION ALL
    SELECT 1, 2 UNION ALL
    SELECT 2, 3 UNION ALL
    SELECT 2, 4 UNION ALL
    SELECT 3, 5 UNION ALL
    SELECT 3, 6 UNION ALL
    SELECT 4, 7 UNION ALL
    SELECT 4, 8
)
SELECT 
    em.year_num as expected_year,
    em.sem_num as expected_semester,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM years y
            JOIN semesters s ON s.year_id = y.id
            WHERE y.year_number = em.year_num
            AND s.semester_number = em.sem_num
        )
        THEN '✓ PASS'
        ELSE '✗ FAIL - Mapping not found'
    END as status
FROM expected_mapping em
ORDER BY em.year_num, em.sem_num;

-- Test 8: Verify constraint allows 1-8
SELECT '=== Test 8: Check Constraint Verification ===' as test_name;
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conname = 'semesters_semester_number_check'
  AND conrelid = 'semesters'::regclass;

-- Test 9: Final summary report
SELECT '=== Test 9: Summary Report ===' as test_name;
SELECT 
    (SELECT COUNT(DISTINCT d.id) FROM departments d) as total_departments,
    (SELECT COUNT(*) FROM years) as total_years,
    (SELECT COUNT(*) FROM semesters) as total_semesters,
    (SELECT COUNT(*) FROM years) / (SELECT COUNT(DISTINCT d.id) FROM departments d) as years_per_dept,
    (SELECT COUNT(*) FROM semesters) / (SELECT COUNT(DISTINCT d.id) FROM departments d) as semesters_per_dept,
    CASE 
        WHEN (SELECT COUNT(*) FROM semesters) / (SELECT COUNT(DISTINCT d.id) FROM departments d) = 8
        THEN '✓ PASS - Correct structure'
        ELSE '✗ FAIL - Incorrect structure'
    END as overall_status;

-- ============================================================================
-- PART 3: Visual Verification (All Departments)
-- ============================================================================

SELECT '=== Complete Mapping for All Departments ===' as test_name;
SELECT 
    d.name as department,
    d.code as dept_code,
    y.year_name, 
    s.semester_number, 
    s.semester_name
FROM semesters s
JOIN years y ON s.year_id = y.id
JOIN departments d ON y.department_id = d.id
ORDER BY d.name, s.semester_number;

-- ============================================================================
-- Expected Output Summary:
-- ============================================================================
-- All departments should show:
--   1st Year   | 1 | Semester 1
--   1st Year   | 2 | Semester 2
--   2nd Year   | 3 | Semester 3
--   2nd Year   | 4 | Semester 4
--   3rd Year   | 5 | Semester 5
--   3rd Year   | 6 | Semester 6
--   4th Year   | 7 | Semester 7
--   4th Year   | 8 | Semester 8
-- ============================================================================
