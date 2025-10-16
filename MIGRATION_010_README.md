# Migration 010: Semester-Year Mapping Fix

## Overview

This directory contains all files related to fixing the semester-year mapping in the Supabase database. The fix changes semester numbering from having each year contain semesters 1-2 to having globally numbered semesters 1-8 mapped across 4 years.

## 📋 Problem

**Before Fix:**
- Each year had Semester 1 & Semester 2
- Semester numbers repeated across years
- Confusing and incorrect mapping

**After Fix:**
- 1st Year → Semester 1 & Semester 2
- 2nd Year → Semester 3 & Semester 4
- 3rd Year → Semester 5 & Semester 6
- 4th Year → Semester 7 & Semester 8

## 📁 Files

### Core Migration
- **`supabase/migrations/010_fix_semester_year_mapping.sql`** - Main migration SQL file (RUN THIS)

### Documentation
- **`QUICK_START_MIGRATION_010.md`** - ⭐ Start here! Quick 3-step guide
- **`MANUAL_TESTING_GUIDE_010.md`** - Detailed step-by-step testing guide
- **`SEMESTER_MAPPING_FIX_SUMMARY.md`** - Complete implementation summary
- **`supabase/migrations/010_MIGRATION_NOTES.md`** - Technical details & rollback

### Testing
- **`supabase/migrations/010_VERIFICATION_SCRIPT.sql`** - Automated verification tests

## 🚀 Quick Start

1. **Apply Migration**
   ```
   Open Supabase Dashboard → SQL Editor
   Copy & paste: supabase/migrations/010_fix_semester_year_mapping.sql
   Click Run
   ```

2. **Verify**
   ```sql
   SELECT y.year_name, s.semester_number, s.semester_name
   FROM semesters s
   JOIN years y ON s.year_id = y.id
   ORDER BY s.semester_number;
   ```

3. **Expected Result**
   ```
   1st Year | 1 | Semester 1
   1st Year | 2 | Semester 2
   2nd Year | 3 | Semester 3
   2nd Year | 4 | Semester 4
   3rd Year | 5 | Semester 5
   3rd Year | 6 | Semester 6
   4th Year | 7 | Semester 7
   4th Year | 8 | Semester 8
   ```

## 📖 Documentation Guide

### For Quick Application
→ Read: `QUICK_START_MIGRATION_010.md`

### For Detailed Testing
→ Read: `MANUAL_TESTING_GUIDE_010.md`

### For Technical Understanding
→ Read: `SEMESTER_MAPPING_FIX_SUMMARY.md` or `010_MIGRATION_NOTES.md`

### For Automated Verification
→ Run: `010_VERIFICATION_SCRIPT.sql` in SQL Editor

## ⚠️ Important Notes

1. **Data Loss**: This migration clears all semester-to-course mappings
2. **Prerequisites**: Migrations 000-009 must be applied first
3. **Backup**: Consider backing up data before applying
4. **Re-assignment**: Course-to-semester mappings need to be recreated

## ✅ Success Criteria

- [x] 4 years per department
- [x] 8 semesters per department
- [x] Semester numbers are 1-8 globally
- [x] Correct year-semester mapping
- [x] Auto-creation works for new departments

## 🔄 Changes Made

1. Updated CHECK constraint: `semester_number` now allows 1-8 (not 1-2)
2. Cleared and repopulated semester data with new numbering
3. Updated auto-creation trigger to use formula: `(year_number - 1) * 2 + [1|2]`
4. Updated documentation in `supabase/README.md`

## 🧪 Validation

Formula tested and validated:
- Year 1: (1-1)*2+1=1, (1-1)*2+2=2 ✓
- Year 2: (2-1)*2+1=3, (2-1)*2+2=4 ✓
- Year 3: (3-1)*2+1=5, (3-1)*2+2=6 ✓
- Year 4: (4-1)*2+1=7, (4-1)*2+2=8 ✓

## 📊 Build Status

✅ Build: Successful
✅ Lint: No new errors
✅ Formula: Validated
✅ Documentation: Complete

## 🔙 Rollback

If needed, rollback instructions are in `010_MIGRATION_NOTES.md`

## 📞 Support

Having issues? Check:
1. Troubleshooting section in `MANUAL_TESTING_GUIDE_010.md`
2. Known issues in `010_MIGRATION_NOTES.md`
3. Verification tests in `010_VERIFICATION_SCRIPT.sql`

---

**Last Updated**: October 16, 2025
**Migration Version**: 010
**Status**: Ready for Production
