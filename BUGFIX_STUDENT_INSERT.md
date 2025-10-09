# Fix for Database Error Saving New User

## Problem
When students attempt to sign up and register their profile, they encounter a database error during the insert operation. This prevents new student accounts from being created.

## Root Cause
The `students` table has Row Level Security (RLS) enabled but was missing an INSERT policy that allows authenticated users to create their student profile during signup. While the `teaching_assistants` table had a similar policy added in migration `002_add_ta_insert_policy.sql`, no equivalent policy existed for the `students` table.

## Solution
Added a new migration file `003_add_student_insert_policy.sql` that creates an INSERT policy for the `students` table.

## How to Apply This Fix

### Option 1: Using Supabase CLI (Recommended)
```bash
cd supabase
supabase db push
```

### Option 2: Manual SQL Execution
1. Go to your Supabase dashboard → SQL Editor
2. Copy and paste the following SQL command:

```sql
-- Add INSERT policy for students table
-- This allows authenticated users to create their student profile during signup

CREATE POLICY "Allow authenticated users to insert their student profile" 
ON students 
FOR INSERT 
TO authenticated 
WITH CHECK (user_id = auth.uid());
```

3. Click "Run" to execute the SQL

## What This Does
The policy allows authenticated users to insert records into the `students` table, but only if the `user_id` field matches their own authenticated user ID (`auth.uid()`). This ensures:
- Users can create their own student profile during signup
- Users cannot create profiles for other users
- The security model remains intact

## Testing
After applying this migration, student signup should work properly:
1. Navigate to `/student/signup`
2. Fill in the registration form
3. Complete the password and face registration steps
4. The student profile should be successfully created in the database

## Related Files
- `supabase/migrations/003_add_student_insert_policy.sql` - The new migration file
- `supabase/migrations/002_add_ta_insert_policy.sql` - Similar policy for TAs
- `src/pages/StudentSignup.tsx` - The signup page that uses this policy
- `src/lib/dataService.ts` - The data service that handles the insert operation
