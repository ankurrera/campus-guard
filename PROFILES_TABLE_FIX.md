# Fix for "relation public.ta_profiles does not exist" Error

## Problem
When TAs attempt to login, they encounter an error: "relation public.ta_profiles does not exist."

The actual issue is that the `public.profiles` table was being referenced by multiple migration files and functions but was never created.

## Root Cause Analysis

The following components relied on the `profiles` table existing:

1. **Migration 20251015090359** - `handle_new_user()` function tries to INSERT into `public.profiles`
2. **Migration 20251015091909** - Updated `handle_new_user()` function references `public.profiles`
3. **Migration 20251015092004** - Another update to `handle_new_user()` function
4. **Migration 007** - `is_admin()` function queries `public.profiles` to check admin role
5. **TypeScript types** - The `src/integrations/supabase/types.ts` file includes type definitions for the `profiles` table

However, none of the migrations actually created the table.

## Solution

Created a new migration file `000_create_profiles_table.sql` that:

1. **Creates the profiles table** with the following schema:
   - `id` (UUID, primary key, references auth.users)
   - `display_name` (TEXT)
   - `role` (TEXT, defaults to 'student')
   - `created_at` (TIMESTAMP)
   - `updated_at` (TIMESTAMP)

2. **Implements Row Level Security (RLS)** with policies:
   - Users can view their own profile
   - Users can update their own profile
   - Users can insert their own profile (during signup)

3. **Creates supporting functions**:
   - `update_profiles_updated_at()` - Automatically updates the `updated_at` timestamp
   - `handle_new_user()` - Creates a profile entry when a new user signs up

4. **Sets up the trigger**:
   - `on_auth_user_created` - Automatically calls `handle_new_user()` when a new user is created in auth.users

## Migration Order

The migration is named `000_create_profiles_table.sql` to ensure it runs **before** all other migrations (which are numbered 001 and higher). This guarantees the `profiles` table exists before any other migration tries to reference it.

## Testing

After this migration is applied to the Supabase database:

1. The `profiles` table will exist
2. New user signups will automatically create a profile entry
3. The `get_user_role()` function will work correctly
4. TA login will succeed (assuming valid credentials)
5. Role-based access control will function properly

## How to Apply

The migration will be automatically applied when:
- The Supabase project syncs migrations from the repository
- Or manually using: `supabase db push` (if using Supabase CLI)
- Or by running the SQL directly in the Supabase SQL editor

## Verification

To verify the fix works:
1. Ensure the migration has been applied to the database
2. Attempt to sign up as a new TA
3. Attempt to login with TA credentials
4. Check that the login succeeds and redirects to the TA dashboard

You can also verify the table exists by running:
```sql
SELECT * FROM public.profiles LIMIT 10;
```
