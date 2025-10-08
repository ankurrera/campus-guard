# Fixing "relation 'teaching_assistants' does not exist" Error

## Problem

You're encountering this error:
```
ERROR: 42P01: relation "teaching_assistants" does not exist
```

## Root Cause

The database migrations that create the `teaching_assistants`, `courses`, and `course_assignments` tables have not been applied to your Supabase database yet.

## Solution

You have three options to fix this error:

### Option 1: Use the Automated Setup Script (Easiest) ✨

Run the provided setup script from the root of the repository:

```bash
chmod +x setup-migrations.sh
./setup-migrations.sh
```

This script will:
- Check if Supabase CLI is installed (and guide you if not)
- Link to your Supabase project
- Apply all necessary migrations automatically
- Provide confirmation when complete

### Option 2: Use Supabase CLI Manually

1. **Install Supabase CLI** (if not already installed):

   **macOS/Linux (Homebrew):**
   ```bash
   brew install supabase/tap/supabase
   ```

   **Linux (Manual):**
   ```bash
   curl -fsSL https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz | tar -xz
   sudo mv supabase /usr/local/bin/
   ```

   **Windows (Scoop):**
   ```bash
   scoop install supabase
   ```

2. **Login to Supabase:**
   ```bash
   supabase login
   ```

3. **Link your project:**
   ```bash
   cd /path/to/campus-guard
   supabase link --project-ref qauglrdqssnesfdacxfk
   ```

4. **Apply migrations:**
   ```bash
   supabase db push
   ```

### Option 3: Apply Migrations via Supabase Dashboard

1. Go to your Supabase project dashboard: https://supabase.com/dashboard/project/qauglrdqssnesfdacxfk

2. Navigate to **SQL Editor**

3. Copy the contents of `supabase/migrations/001_add_ta_tables.sql` and paste it into the SQL Editor

4. Click **Run** to execute

5. Copy the contents of `supabase/migrations/002_add_ta_insert_policy.sql` and paste it into the SQL Editor

6. Click **Run** to execute

## Verification

After applying the migrations, you can verify the tables were created by running this query in the SQL Editor:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('courses', 'teaching_assistants', 'course_assignments');
```

You should see all three tables listed.

## What Gets Created

After running the migrations, the following will be set up:

### Tables:
1. **courses** - Stores course information
2. **teaching_assistants** - Stores TA profiles
3. **course_assignments** - Links TAs to courses

### Sample Data:
- 4 sample courses (CS101, CS201, CS301, CS250)

### Security:
- Row Level Security (RLS) policies for all tables
- Proper access controls for TAs, students, and admins

### Enums:
- Updated `user_role` enum to include 'ta'

## Next Steps

Once the migrations are applied:

1. ✅ TAs can register at `/ta/signup`
2. ✅ TAs can login at `/ta/login`
3. ✅ TAs can access their dashboard at `/ta/dashboard`
4. ✅ Admins can assign TAs to courses

## Still Having Issues?

If you continue to experience problems:

1. Check that you're connected to the correct Supabase project
2. Verify you have the necessary permissions to create tables
3. Check the Supabase logs for more detailed error messages
4. Ensure your database connection is stable

For more information, see [supabase/README.md](supabase/README.md)
