# Quick Start: Apply Semester-Year Mapping Fix

This guide provides the fastest way to apply the semester-year mapping fix to your Supabase database.

## What This Fix Does

Changes semester numbering from:
- ❌ Each year has Semester 1 & 2 (duplicated across years)

To:
- ✅ 1st Year → Semester 1 & 2
- ✅ 2nd Year → Semester 3 & 4
- ✅ 3rd Year → Semester 5 & 6
- ✅ 4th Year → Semester 7 & 8

## Prerequisites

- ✅ Migrations 000-009 already applied
- ✅ Access to Supabase Dashboard SQL Editor
- ⚠️ **WARNING**: This will delete all semester-course mappings

## Apply in 3 Steps

### Step 1: Open SQL Editor
1. Go to https://supabase.com/dashboard
2. Select your project: `qauglrdqssnesfdacxfk`
3. Click **SQL Editor** in the left sidebar

### Step 2: Run the Migration
1. Copy the entire SQL from `supabase/migrations/010_fix_semester_year_mapping.sql`
2. Paste into SQL Editor
3. Click **Run** (or press Ctrl+Enter)

### Step 3: Verify the Fix
Run this query:

```sql
SELECT y.year_name, s.semester_number, s.semester_name
FROM semesters s
JOIN years y ON s.year_id = y.id
ORDER BY s.semester_number;
```

**Expected Output:**
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

## Done! ✅

If you see the output above, the fix is successfully applied.

## Need More Details?

- **Full Testing Guide**: See `MANUAL_TESTING_GUIDE_010.md`
- **Verification Script**: Run `010_VERIFICATION_SCRIPT.sql` for comprehensive tests
- **Technical Details**: See `010_MIGRATION_NOTES.md`
- **Complete Summary**: See `SEMESTER_MAPPING_FIX_SUMMARY.md`

## Troubleshooting

### Error: "relation semesters does not exist"
**Fix**: Apply migration 009 first

### Semesters still show wrong numbers
**Fix**: Re-run the migration SQL completely

### Need help?
See the troubleshooting section in `MANUAL_TESTING_GUIDE_010.md`
