# Manual Testing Guide for Migration 010

## Prerequisites
- Access to Supabase Dashboard
- SQL Editor access
- Existing database with migrations 000-009 already applied

## Step 1: Backup Current State (Optional but Recommended)

Before applying the migration, you can backup the current semester data:

```sql
-- Create a backup table
CREATE TABLE semesters_backup AS SELECT * FROM semesters;
CREATE TABLE department_course_map_backup AS SELECT * FROM department_course_map;
```

## Step 2: Check Current State

Run this query to see the current semester mapping:

```sql
SELECT y.year_name, s.semester_number, s.semester_name
FROM semesters s
JOIN years y ON s.year_id = y.id
ORDER BY s.semester_number
LIMIT 10;
```

**Expected Current Output** (before migration):
```
 year_name  | semester_number | semester_name
------------+-----------------+---------------
 1st Year   |               1 | Semester 1
 1st Year   |               2 | Semester 2
 2nd Year   |               1 | Semester 1  ← WRONG! Should be 3
 2nd Year   |               2 | Semester 2  ← WRONG! Should be 4
 ...
```

## Step 3: Apply the Migration

1. Open Supabase Dashboard → SQL Editor
2. Copy the entire contents of `supabase/migrations/010_fix_semester_year_mapping.sql`
3. Paste into SQL Editor
4. Click **Run** or press `Ctrl+Enter`

**Expected Success Message:**
```
Success. No rows returned
```

## Step 4: Verify the Fix

### Quick Verification

Run the verification query from the problem statement:

```sql
SELECT y.year_name, s.semester_number, s.semester_name
FROM semesters s
JOIN years y ON s.year_id = y.id
ORDER BY s.semester_number;
```

**Expected Output** (after migration):
```
 year_name  | semester_number | semester_name
------------+-----------------+---------------
 1st Year   |               1 | Semester 1    ✓
 1st Year   |               2 | Semester 2    ✓
 2nd Year   |               3 | Semester 3    ✓
 2nd Year   |               4 | Semester 4    ✓
 3rd Year   |               5 | Semester 5    ✓
 3rd Year   |               6 | Semester 6    ✓
 4th Year   |               7 | Semester 7    ✓
 4th Year   |               8 | Semester 8    ✓
```

### Comprehensive Verification

Run the complete verification script:

1. Copy the entire contents of `supabase/migrations/010_VERIFICATION_SCRIPT.sql`
2. Paste into SQL Editor
3. Click **Run**

This will run all 9 verification tests and show PASS/FAIL status for each.

## Step 5: Test Auto-Creation Trigger

Verify that new departments will get correct semester mapping:

```sql
-- Insert a test department
INSERT INTO departments (name, code) 
VALUES ('Test Department', 'TEST');

-- Verify it got 8 semesters with correct mapping
SELECT y.year_name, s.semester_number, s.semester_name
FROM semesters s
JOIN years y ON s.year_id = y.id
JOIN departments d ON y.department_id = d.id
WHERE d.code = 'TEST'
ORDER BY s.semester_number;

-- Clean up test department (optional)
DELETE FROM departments WHERE code = 'TEST';
```

**Expected Output:**
```
 year_name  | semester_number | semester_name
------------+-----------------+---------------
 1st Year   |               1 | Semester 1
 1st Year   |               2 | Semester 2
 2nd Year   |               3 | Semester 3
 2nd Year   |               4 | Semester 4
 3rd Year   |               5 | Semester 5
 3rd Year   |               6 | Semester 6
 4th Year   |               7 | Semester 7
 4th Year   |               8 | Semester 8
```

## Step 6: Check Counts

Verify the total counts:

```sql
-- Should show 4 years per department
SELECT d.name, COUNT(y.id) as year_count
FROM departments d
JOIN years y ON y.department_id = d.id
GROUP BY d.name
ORDER BY d.name;

-- Should show 8 semesters per department
SELECT d.name, COUNT(s.id) as semester_count
FROM departments d
JOIN years y ON y.department_id = d.id
JOIN semesters s ON s.year_id = y.id
GROUP BY d.name
ORDER BY d.name;
```

**Expected Output:**
- Each department should have exactly **4 years**
- Each department should have exactly **8 semesters**

## Troubleshooting

### Issue: "constraint already exists"
**Solution:** The constraint might already be updated. Continue with the migration.

### Issue: "relation semesters does not exist"
**Solution:** Migration 009 needs to be applied first. Apply migrations in order: 000 → 009 → 010.

### Issue: Semesters still show wrong numbers
**Solution:** 
1. Verify the migration was applied completely (all steps)
2. Re-run the TRUNCATE and INSERT steps from the migration
3. Check the verification queries

### Issue: department_course_map data lost
**Expected behavior:** This migration truncates semesters which cascades to department_course_map. Course assignments will need to be recreated with the new semester numbers.

## Rollback (If Needed)

If you need to rollback:

1. Restore from backup:
```sql
TRUNCATE TABLE semesters CASCADE;
INSERT INTO semesters SELECT * FROM semesters_backup;
INSERT INTO department_course_map SELECT * FROM department_course_map_backup;
DROP TABLE semesters_backup;
DROP TABLE department_course_map_backup;
```

2. Or apply the rollback SQL from `010_MIGRATION_NOTES.md`

## Success Criteria

✅ All verification tests pass
✅ Each department has 4 years
✅ Each department has 8 semesters
✅ Semester numbers are 1-8 (not 1-2 repeated)
✅ 1st Year has semesters 1 & 2
✅ 2nd Year has semesters 3 & 4
✅ 3rd Year has semesters 5 & 6
✅ 4th Year has semesters 7 & 8
✅ New departments get correct mapping automatically

## Next Steps

After successful verification:
1. Re-assign courses to semesters if needed (using new semester numbers 1-8)
2. Update any application code that references semester numbers
3. Test the student/admin dashboards to ensure they work with new mapping
4. Remove backup tables if created
