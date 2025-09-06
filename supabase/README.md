# Database Setup for TA Integration

This document explains how to set up the Teaching Assistant (TA) functionality in your Supabase database.

## Tables Added

### 1. courses
Stores course information that TAs can be assigned to.
- `id`: Primary key (UUID)
- `name`: Course name (e.g., "Computer Science Fundamentals")
- `code`: Unique course code (e.g., "CS101")
- `description`: Course description
- `department`: Department name
- `semester`: Current semester
- `credits`: Number of credits
- `created_at`, `updated_at`: Timestamps

### 2. teaching_assistants
Stores TA profile information.
- `id`: Primary key (UUID)
- `user_id`: References Supabase Auth user
- `name`: TA's full name
- `email`: TA's email address
- `employee_id`: Unique TA employee ID
- `phone`: Phone number (optional)
- `qualification`: Educational qualification (optional)
- `created_at`, `updated_at`: Timestamps

### 3. course_assignments
Links TAs to their assigned courses.
- `id`: Primary key (UUID)
- `ta_id`: References teaching_assistants.id
- `course_id`: References courses.id
- `assigned_at`: When the assignment was made

## User Role Updates

The `user_role` enum has been updated to include:
- `admin`
- `faculty`
- `student`
- `ta` (new)

## How to Apply These Changes

### Option 1: Using Supabase CLI (Recommended)
1. Install Supabase CLI if you haven't already
2. Link your project: `supabase link --project-ref YOUR_PROJECT_ID`
3. Apply the migration: `supabase db push`

### Option 2: Manual SQL Execution
1. Copy the contents of `001_add_ta_tables.sql`
2. Go to your Supabase dashboard → SQL Editor
3. Paste and execute the SQL commands

## Sample Data

The migration includes sample courses:
- CS101: Computer Science Fundamentals
- CS201: Data Structures and Algorithms
- CS301: Database Systems
- CS250: Web Development

## Security Policies

Row Level Security (RLS) is enabled with these policies:
- Anyone can view courses
- TAs can view/update their own profile
- TAs can view their course assignments
- Admin access needs to be configured based on your existing admin setup

## Next Steps

After running the migration:
1. TAs can register using the `/ta/signup` page
2. Admins can assign TAs to courses through the admin dashboard
3. TAs can access their dashboard at `/ta/dashboard`

## TA Workflow

1. **Registration**: TAs sign up with their employee ID and credentials
2. **Course Assignment**: Admins assign TAs to specific courses
3. **Dashboard Access**: TAs can view assigned courses and monitor attendance
4. **Attendance Monitoring**: TAs can track student attendance for their assigned courses