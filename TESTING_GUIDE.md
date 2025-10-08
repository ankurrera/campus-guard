# Testing Guide: Teaching Assistants Database Migration

This guide helps you verify that the database migrations have been applied successfully and the "teaching_assistants" table exists.

## Prerequisites

Before testing, ensure you have applied the database migrations using one of these methods:
- Running `./setup-migrations.sh`
- Using `supabase db push`
- Manually executing SQL via Supabase Dashboard

## Step 1: Verify Tables Exist

### Using Supabase Dashboard

1. Go to https://supabase.com/dashboard/project/qauglrdqssnesfdacxfk
2. Navigate to **SQL Editor**
3. Run this query:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('courses', 'teaching_assistants', 'course_assignments')
ORDER BY table_name;
```

**Expected Result:**
```
table_name
------------------
course_assignments
courses
teaching_assistants
```

If you see all three tables, the migration was successful! ✅

### Using Supabase CLI

```bash
supabase db diff
```

If migrations are applied, you should see: `No schema changes detected`

## Step 2: Verify Sample Data

Check if sample courses were inserted:

```sql
SELECT code, name, department 
FROM courses 
ORDER BY code;
```

**Expected Result:**
```
code   | name                              | department
-------|-----------------------------------|-------------------
CS101  | Computer Science Fundamentals     | Computer Science
CS201  | Data Structures and Algorithms    | Computer Science
CS250  | Web Development                   | Computer Science
CS301  | Database Systems                  | Computer Science
```

## Step 3: Verify Row Level Security (RLS)

Check that RLS is enabled:

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('courses', 'teaching_assistants', 'course_assignments');
```

**Expected Result:**
```
tablename            | rowsecurity
---------------------|-------------
courses              | t
teaching_assistants  | t
course_assignments   | t
```

(`t` means true - RLS is enabled)

## Step 4: Verify Security Policies

Check that policies are created:

```sql
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd
FROM pg_policies 
WHERE tablename IN ('courses', 'teaching_assistants', 'course_assignments')
ORDER BY tablename, policyname;
```

**Expected Policies:**
- `Anyone can view courses` on `courses` (SELECT)
- `Allow authenticated users to insert their TA profile` on `teaching_assistants` (INSERT)
- `TAs can update their own profile` on `teaching_assistants` (UPDATE)
- `TAs can view their own profile` on `teaching_assistants` (SELECT)
- `TAs can view their assignments` on `course_assignments` (SELECT)

## Step 5: Test the Application

### Test TA Signup

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Navigate to http://localhost:8080/ta/signup

3. Fill in the form with test data:
   - Name: Test TA
   - Email: test.ta@university.edu
   - Employee ID: TA001
   - Phone: 123-456-7890
   - Qualification: Masters in Computer Science
   - Password: test123

4. Submit the form

**Expected Result:**
- ✅ Account created successfully
- ✅ Redirected to TA Dashboard
- ✅ No "relation 'teaching_assistants' does not exist" error

### Test TA Login

1. Navigate to http://localhost:8080/ta/login

2. Login with:
   - Email: test.ta@university.edu
   - Password: test123

**Expected Result:**
- ✅ Login successful
- ✅ Redirected to TA Dashboard
- ✅ Dashboard shows TA profile information

### Test TA Dashboard

1. After logging in, you should see:
   - ✅ TA name and profile information
   - ✅ Empty list of assigned courses (since no assignments yet)
   - ✅ Statistics cards
   - ✅ No database errors

## Step 6: Verify User Role Enum

Check that the 'ta' role was added to the user_role enum:

```sql
SELECT enumlabel 
FROM pg_enum 
JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
WHERE pg_type.typname = 'user_role'
ORDER BY enumlabel;
```

**Expected Result:**
```
enumlabel
----------
admin
faculty
student
ta
```

## Troubleshooting

### Tables Still Don't Exist

If tables are still missing:

1. Check migration history:
   ```sql
   SELECT * FROM supabase_migrations.schema_migrations 
   ORDER BY version DESC;
   ```

2. Manually run the complete migration:
   - Copy contents of `supabase/migrations/000_complete_migration.sql`
   - Paste into Supabase SQL Editor
   - Execute

### Permission Errors

If you get permission errors:
1. Ensure you're logged into Supabase CLI: `supabase login`
2. Verify you have admin access to the project
3. Check if database is accessible

### RLS Blocking Queries

If RLS blocks your queries:
1. Queries in SQL Editor run as `service_role` (bypasses RLS)
2. Application queries run as authenticated users (respects RLS)
3. This is expected behavior for security

## Success Checklist

After completing all tests, verify:

- [x] Tables exist (courses, teaching_assistants, course_assignments)
- [x] Sample courses are present
- [x] RLS is enabled on all tables
- [x] Security policies are created
- [x] User role enum includes 'ta'
- [x] TA signup works without errors
- [x] TA login works without errors
- [x] TA dashboard displays correctly
- [x] No "relation 'teaching_assistants' does not exist" errors

If all items are checked, the migration is successfully applied! 🎉

## Cleanup Test Data (Optional)

To remove test TA account:

```sql
-- Find the TA ID
SELECT id, user_id, name, email FROM teaching_assistants 
WHERE email = 'test.ta@university.edu';

-- Delete the TA record (this will cascade delete assignments)
DELETE FROM teaching_assistants 
WHERE email = 'test.ta@university.edu';

-- Also delete the auth user if needed
-- (Go to Authentication > Users in Supabase Dashboard and delete manually)
```

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL RLS Guide](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) - Detailed migration instructions
- [supabase/README.md](supabase/README.md) - Database setup overview
