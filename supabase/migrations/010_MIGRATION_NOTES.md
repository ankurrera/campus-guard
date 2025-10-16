# Migration 010: Fix Semester-Year Mapping

## Problem
The current semester structure creates 2 semesters per year with `semester_number` limited to 1-2. However, the requirement is to have 8 semesters numbered 1-8 across 4 years:
- 1st Year → Semester 1 & Semester 2
- 2nd Year → Semester 3 & Semester 4
- 3rd Year → Semester 5 & Semester 6
- 4th Year → Semester 7 & Semester 8

## Solution
This migration:
1. Drops the existing CHECK constraint that limits semester_number to 1-2
2. Adds a new CHECK constraint allowing semester_number 1-8
3. Truncates existing semester data (cascades to department_course_map)
4. Reinserts 8 semesters per department with proper mapping
5. Updates the auto-create trigger to use the new mapping formula

## Changes Made

### 1. Updated Check Constraint
```sql
-- Old: semester_number IN (1, 2)
-- New: semester_number >= 1 AND semester_number <= 8
```

### 2. Semester Numbering Formula
For a given year_number (1, 2, 3, or 4):
- First semester: `(year_number - 1) * 2 + 1`
- Second semester: `(year_number - 1) * 2 + 2`

Examples:
- Year 1: (1-1)*2+1 = 1, (1-1)*2+2 = 2
- Year 2: (2-1)*2+1 = 3, (2-1)*2+2 = 4
- Year 3: (3-1)*2+1 = 5, (3-1)*2+2 = 6
- Year 4: (4-1)*2+1 = 7, (4-1)*2+2 = 8

### 3. Updated Trigger Function
The `auto_create_semesters_for_year()` function now automatically calculates the correct semester numbers based on the year_number.

## How to Apply

### Option 1: Supabase Dashboard (Recommended)
1. Go to your Supabase dashboard → SQL Editor
2. Copy the contents of `010_fix_semester_year_mapping.sql`
3. Paste and execute the SQL commands
4. Run the verification queries (see below) to confirm success

### Option 2: Supabase CLI
```bash
supabase db push
```

## Verification

After applying the migration, run these queries to verify:

### 1. Check semester count per department (should be 8)
```sql
SELECT d.name as department, COUNT(*) as semester_count
FROM departments d
JOIN years y ON y.department_id = d.id
JOIN semesters s ON s.year_id = y.id
GROUP BY d.name
ORDER BY d.name;
```

### 2. Verify the mapping
```sql
SELECT y.year_name, s.semester_number, s.semester_name
FROM semesters s
JOIN years y ON s.year_id = y.id
ORDER BY s.semester_number;
```

Expected output for each department:
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

### 3. Check for duplicates (should return 0 rows)
```sql
SELECT year_id, semester_number, COUNT(*) as count
FROM semesters
GROUP BY year_id, semester_number
HAVING COUNT(*) > 1;
```

## Impact

### Tables Affected
- `semesters`: All existing data will be cleared and regenerated
- `department_course_map`: All course-semester mappings will be cleared (cascaded delete)

### Data Loss Warning
⚠️ **This migration will delete all existing semester-to-course mappings in the `department_course_map` table.** If you have already assigned courses to semesters, you will need to reassign them after this migration.

### Backward Compatibility
- The `unique(year_id, semester_number)` constraint remains the same
- The table structure (columns, types) remains unchanged
- Only the allowed range of `semester_number` values changes
- The auto-creation trigger logic is updated but maintains the same behavior for new departments

## Testing Checklist

After applying the migration:
- [ ] Verify 4 years exist per department
- [ ] Verify 8 semesters exist per department
- [ ] Verify semester numbers are 1-8 (not 1-2 repeated)
- [ ] Verify 1st Year has semesters 1 & 2
- [ ] Verify 2nd Year has semesters 3 & 4
- [ ] Verify 3rd Year has semesters 5 & 6
- [ ] Verify 4th Year has semesters 7 & 8
- [ ] Test creating a new department to verify auto-generation works correctly
- [ ] Reassign courses to semesters if needed

## Rollback

To rollback this migration:
1. Restore the old check constraint:
```sql
ALTER TABLE semesters DROP CONSTRAINT IF EXISTS semesters_semester_number_check;
ALTER TABLE semesters ADD CONSTRAINT semesters_semester_number_check 
    CHECK (semester_number IN (1, 2));
```

2. Truncate and regenerate semesters with old mapping:
```sql
TRUNCATE TABLE semesters CASCADE;
INSERT INTO semesters (year_id, semester_number, semester_name)
SELECT y.id, s.semester_number, s.semester_name
FROM years y
CROSS JOIN (VALUES (1, 'Semester 1'), (2, 'Semester 2')) AS s(semester_number, semester_name);
```

3. Restore the old trigger function:
```sql
CREATE OR REPLACE FUNCTION auto_create_semesters_for_year()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO semesters (year_id, semester_number, semester_name)
    VALUES 
        (NEW.id, 1, 'Semester 1'),
        (NEW.id, 2, 'Semester 2')
    ON CONFLICT (year_id, semester_number) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## Files Modified
- Created: `supabase/migrations/010_fix_semester_year_mapping.sql`
- Created: `supabase/migrations/010_MIGRATION_NOTES.md` (this file)
