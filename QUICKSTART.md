# Quick Start: Fixing the "teaching_assistants does not exist" Error

## The Problem

You're seeing this error:
```
ERROR: 42P01: relation "teaching_assistants" does not exist
```

## The Solution (3 Options)

### ⚡ Option 1: Automated Setup (Recommended)

**Fastest way - just run one script:**

```bash
chmod +x setup-migrations.sh
./setup-migrations.sh
```

The script will:
- Check prerequisites
- Link your Supabase project
- Apply migrations automatically
- Confirm success

**Time: ~2-3 minutes**

---

### 🔧 Option 2: Manual CLI Setup

**For those who prefer manual control:**

1. Install Supabase CLI:
   ```bash
   # macOS/Linux
   brew install supabase/tap/supabase
   ```

2. Login and link:
   ```bash
   supabase login
   supabase link --project-ref qauglrdqssnesfdacxfk
   ```

3. Apply migrations:
   ```bash
   supabase db push
   ```

**Time: ~3-5 minutes**

---

### 📋 Option 3: Dashboard Copy-Paste

**No CLI needed - use the web interface:**

1. Open: https://supabase.com/dashboard/project/qauglrdqssnesfdacxfk/sql/new

2. Copy entire contents of: `supabase/migrations/000_complete_migration.sql`

3. Paste into SQL Editor

4. Click "Run"

**Time: ~2 minutes**

---

## Verify It Worked

After applying migrations, verify with this SQL query:

```sql
SELECT COUNT(*) FROM teaching_assistants;
```

If it returns `0` (or any number) instead of an error, you're good! ✅

## Test the Application

1. Start the app:
   ```bash
   npm install
   npm run dev
   ```

2. Go to: http://localhost:8080/ta/signup

3. Create a test TA account

4. If signup succeeds without errors, migration is complete! 🎉

## Need More Help?

- **Detailed guide**: [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)
- **Testing steps**: [TESTING_GUIDE.md](TESTING_GUIDE.md)
- **Database info**: [supabase/README.md](supabase/README.md)

## What Gets Created

The migrations create:

✅ **Tables**:
- `courses` - Course information
- `teaching_assistants` - TA profiles
- `course_assignments` - TA-to-course links

✅ **Sample Data**: 4 sample courses (CS101, CS201, CS301, CS250)

✅ **Security**: Row Level Security policies for all tables

✅ **Enum**: Updated `user_role` to include 'ta'

## Common Issues

**"Supabase CLI not installed"**
→ See installation instructions in Option 2

**"Access token not provided"**
→ Run `supabase login` first

**"Table already exists"**
→ Migrations already applied! You're good to go.

**Still getting the error?**
→ Check you're connected to the right database: `qauglrdqssnesfdacxfk`

---

**That's it!** Pick an option, apply the migrations, and start using the TA features. 🚀
