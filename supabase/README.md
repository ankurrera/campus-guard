# Database Setup for TA Integration and Student Academic Information

This document explains how to set up the Teaching Assistant (TA) functionality and dynamic academic information (departments, years, sections) in your Supabase database.

> **Important:** If you're experiencing storage bucket errors ("new row violates row-level security policy" or "Bucket not found"), see [STORAGE_FIX.md](../STORAGE_FIX.md) for instructions on applying migration 007.

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
- `department`: Department name (optional, for filtering course assignments)
- `created_at`, `updated_at`: Timestamps

### 3. course_assignments
Links TAs to their assigned courses.
- `id`: Primary key (UUID)
- `ta_id`: References teaching_assistants.id
- `course_id`: References courses.id
- `assigned_at`: When the assignment was made

### 4. departments (NEW)
Stores academic department information.
- `id`: Primary key (UUID)
- `name`: Full department name (e.g., "Computer Science and Engineering")
- `code`: Short department code (e.g., "CSE")
- `created_at`, `updated_at`: Timestamps

### 5. years (NEW)
Stores academic year information linked to departments.
- `id`: Primary key (UUID)
- `department_id`: References departments.id
- `year_number`: Year number (1, 2, 3, 4)
- `year_name`: Display name (e.g., "1st Year", "2nd Year")
- `created_at`, `updated_at`: Timestamps

### 6. sections (NEW)
Stores section information linked to departments and years.
- `id`: Primary key (UUID)
- `department_id`: References departments.id
- `year_id`: References years.id
- `section_name`: Section identifier (e.g., "A", "B", "C", "D")
- `created_at`, `updated_at`: Timestamps

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
4. Copy the contents of `002_add_ta_insert_policy.sql`
5. Paste and execute the SQL commands in the SQL Editor
6. Copy the contents of `003_add_student_insert_policy.sql`
7. Paste and execute the SQL commands in the SQL Editor
8. Copy the contents of `004_add_academic_info_tables.sql`
9. Paste and execute the SQL commands in the SQL Editor
10. Copy the contents of `005_add_department_to_ta.sql`
11. Paste and execute the SQL commands in the SQL Editor
12. Copy the contents of `006_add_3d_face_fields.sql`
13. Paste and execute the SQL commands in the SQL Editor
14. **Copy the contents of `007_create_biometric_storage_bucket.sql` (REQUIRED for biometric uploads)**
15. **Paste and execute the SQL commands in the SQL Editor** - This creates the storage bucket and policies

## Sample Data

### Courses
The migration includes sample courses:
- CS101: Computer Science Fundamentals
- CS201: Data Structures and Algorithms
- CS301: Database Systems
- CS250: Web Development

### Academic Structure (NEW)
The migration includes sample academic structure:
- Departments: CSE, ECE, ME, CE
- Years: 1st Year, 2nd Year, 3rd Year, 4th Year (for each department)
- Sections: A, B, C, D (for each department-year combination)

## Security Policies

Row Level Security (RLS) is enabled with these policies:
- Anyone can view courses
- Anyone can view departments, years, and sections (NEW)
- Authenticated users can insert their own TA profile during signup
- Authenticated users can insert their own student profile during signup
- TAs can view/update their own profile
- TAs can view their course assignments
- Admin access needs to be configured based on your existing admin setup

## Student Registration Changes (NEW)

The student registration form now uses dynamic dropdowns:

### Form Flow
1. **Select Department** → Enabled by default, fetches from `departments` table
2. **Select Year** → Enabled after department selection, fetches years for selected department
3. **Select Section** → Enabled after year selection, fetches sections for selected department and year

### Benefits
- No hardcoded academic data in frontend code
- Easy to add/modify departments, years, and sections via database
- Consistent data across the application
- Better scalability for future changes

## Next Steps

After running the migration:
1. TAs can register using the `/ta/signup` page
2. Admins can assign TAs to courses through the admin dashboard (Course Assignments tab)
3. TAs can access their dashboard at `/ta/dashboard`
4. Students can register with dynamic department/year/section selection at `/student/signup`

## Admin Dashboard Course Assignments Feature (NEW)

Admins can now manage TA course assignments through a dedicated "Course Assignments" tab in the admin dashboard.

### Features
1. **Department-Based Filtering**: Select a department to view only relevant courses, TAs, and assignments
2. **View Assignments**: See all current course assignments in a table format with department, course details, and TA information
3. **Create Assignment**: Assign a TA to a course within the same department using a modal form
4. **Edit Assignment**: Modify existing assignments (change TA or course)
5. **Delete Assignment**: Remove course assignments
6. **Search**: Filter assignments by TA name, course name, or course code

### Workflow
1. Navigate to Admin Dashboard → Course Assignments tab
2. Select a department from the dropdown filter
3. View existing assignments or click "Assign Course" to create a new one
4. In the assignment modal:
   - Department is auto-filled based on your filter selection
   - Select a TA from the dropdown (filtered to show only TAs in that department)
   - Select a course from the dropdown (filtered to show only courses in that department)
   - Submit to create the assignment
5. Use Edit/Delete buttons to modify or remove assignments

## TA Workflow

1. **Registration**: TAs sign up with their employee ID and credentials
2. **Course Assignment**: Admins assign TAs to specific courses
3. **Dashboard Access**: TAs can view assigned courses and monitor attendance
4. **Attendance Monitoring**: TAs can track student attendance for their assigned courses

## Student Registration Workflow (UPDATED)

1. **Personal Information**: Enter name, roll number, email, phone
2. **Academic Information**: 
   - Select department from available options
   - Select year (enabled after department selection)
   - Select section (enabled after year selection)
   - Set password
3. **Face Registration**: Complete biometric authentication setup