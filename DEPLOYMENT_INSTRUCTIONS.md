# Deployment Instructions for Profiles Table Fix

## Overview
This document provides instructions for deploying the fix for the "relation public.ta_profiles does not exist" error.

## What Was Changed
- Added migration file: `supabase/migrations/000_create_profiles_table.sql`
- Added documentation: `PROFILES_TABLE_FIX.md`

## Deployment Steps

### Option 1: Automatic Deployment (Recommended)
If your Supabase project is connected to this GitHub repository:

1. Merge this PR to the main branch
2. Supabase will automatically detect and apply the new migration
3. Verify the migration was applied in the Supabase Dashboard:
   - Go to Database → Migrations
   - Look for `000_create_profiles_table` in the migration list
   - Status should show "Applied"

### Option 2: Manual Deployment via Supabase Dashboard
If automatic deployment is not set up:

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the contents of `supabase/migrations/000_create_profiles_table.sql`
4. Paste and run the SQL in the editor
5. Verify the table was created:
   ```sql
   SELECT * FROM public.profiles LIMIT 1;
   ```

### Option 3: Supabase CLI
If you have Supabase CLI installed locally:

1. Ensure you're linked to the correct project:
   ```bash
   supabase link --project-ref qauglrdqssnesfdacxfk
   ```

2. Push the migration to the remote database:
   ```bash
   supabase db push
   ```

3. Verify the migration was applied:
   ```bash
   supabase db migrations list
   ```

## Post-Deployment Verification

### 1. Check Table Exists
Run this query in Supabase SQL Editor:
```sql
SELECT 
    table_name,
    column_name,
    data_type
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public' 
    AND table_name = 'profiles'
ORDER BY 
    ordinal_position;
```

Expected output should show 5 columns: id, display_name, role, created_at, updated_at

### 2. Check RLS Policies
Run this query:
```sql
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM 
    pg_policies
WHERE 
    tablename = 'profiles';
```

Expected: 3 policies (SELECT, UPDATE, INSERT)

### 3. Check Trigger Exists
Run this query:
```sql
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table
FROM 
    information_schema.triggers
WHERE 
    trigger_name = 'on_auth_user_created';
```

Expected: Trigger should exist on auth.users table

### 4. Test TA Signup
1. Navigate to the TA signup page
2. Create a new TA account
3. Verify no errors occur during signup
4. Check that a row was created in the `profiles` table:
   ```sql
   SELECT * FROM public.profiles ORDER BY created_at DESC LIMIT 5;
   ```

### 5. Test TA Login
1. Navigate to the TA login page (`/ta/login`)
2. Login with valid TA credentials
3. Verify:
   - No "relation does not exist" error
   - Successfully redirects to TA dashboard (`/ta/dashboard`)
   - Dashboard loads TA information correctly

## Rollback (If Needed)

If the migration causes issues, you can rollback by running:

```sql
-- Drop the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop the functions
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.update_profiles_updated_at();

-- Drop the table
DROP TABLE IF EXISTS public.profiles;
```

**Note**: Rollback will remove all profile data. Only do this if absolutely necessary.

## Common Issues

### Issue: Migration fails with "relation already exists"
**Solution**: The table may already exist. Check:
```sql
SELECT * FROM public.profiles LIMIT 1;
```
If it exists, the migration is likely already applied.

### Issue: "permission denied for schema auth"
**Solution**: Ensure you're running as a superuser or service role. The migration references `auth.users` table which requires elevated permissions.

### Issue: Trigger not firing on new user signup
**Solution**: 
1. Check if trigger exists:
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
   ```
2. If it doesn't exist, manually create it using the SQL from the migration file

## Support

For issues or questions, please:
1. Check the `PROFILES_TABLE_FIX.md` for detailed technical explanation
2. Review the migration file: `supabase/migrations/000_create_profiles_table.sql`
3. Check Supabase logs for any error messages
4. Open an issue in the GitHub repository
