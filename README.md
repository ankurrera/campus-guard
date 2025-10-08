# Campus Guard

A comprehensive attendance management system with support for administrators, faculty, students, and teaching assistants.

## 🚨 Important: Database Setup Required

**Before running the application, you must apply database migrations to avoid the error:**
```
ERROR: 42P01: relation "teaching_assistants" does not exist
```

### 🚀 Quick Fix

**See [QUICKSTART.md](QUICKSTART.md) for the fastest way to fix this error (2-3 minutes).**

Or run the automated setup script:

```bash
chmod +x setup-migrations.sh
./setup-migrations.sh
```

This script will:
1. Check if Supabase CLI is installed
2. Link to your Supabase project
3. Apply all necessary migrations
4. Create the required tables (courses, teaching_assistants, course_assignments)

### 📚 Documentation

- **[QUICKSTART.md](QUICKSTART.md)** - Fastest way to fix the error (START HERE!)
- **[MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)** - Detailed migration instructions
- **[TESTING_GUIDE.md](TESTING_GUIDE.md)** - How to verify everything works
- **[supabase/README.md](supabase/README.md)** - Database schema details

## Project info

**URL**: https://lovable.dev/projects/1f469da0-bd08-4b4c-baa3-9680dd609aed

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/1f469da0-bd08-4b4c-baa3-9680dd609aed) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/1f469da0-bd08-4b4c-baa3-9680dd609aed) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
