# Course Assignments Feature

This document describes the Course Assignments feature in the Admin Dashboard, which allows administrators to manage teaching assistant (TA) course assignments.

## Overview

The Course Assignments feature provides a complete interface for administrators to:
- View all course assignments by department
- Assign TAs to courses within their department
- Edit existing assignments
- Remove course assignments
- Search and filter assignments

## User Interface

### Location
The feature is accessible from the Admin Dashboard at `/admin/dashboard` under the "Course Assignments" tab.

### Components

1. **Department Filter**
   - Dropdown to select a department
   - Only shows relevant courses, TAs, and assignments for the selected department

2. **Assignments Table**
   - Displays: Department, Course Name, Course Code, TA Name, TA Email
   - Actions: Edit, Delete buttons for each assignment
   - Search box to filter by TA name, course name, or course code

3. **Assignment Modal**
   - Form to create or edit course assignments
   - Fields:
     - Department (auto-filled, read-only)
     - Teaching Assistant (dropdown, filtered by department)
     - Course (dropdown, filtered by department)

## Business Rules

1. **Department-Based Assignments**
   - TAs can only be assigned to courses in their department
   - The system automatically filters TAs and courses based on the selected department

2. **Unique Assignments**
   - Each TA-course combination must be unique
   - Attempting to create a duplicate assignment will show an error

3. **Cascade Deletion**
   - When a TA is deleted, all their course assignments are automatically removed
   - When a course is deleted, all assignments to that course are automatically removed

## Technical Implementation

### Database Schema

#### teaching_assistants Table
```sql
- id: UUID (Primary Key)
- user_id: UUID (References auth.users)
- name: TEXT
- email: TEXT
- department: VARCHAR(100) -- Used for filtering
- employee_id: TEXT
- phone: TEXT
- qualification: TEXT
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### course_assignments Table
```sql
- id: UUID (Primary Key)
- ta_id: UUID (References teaching_assistants.id)
- course_id: UUID (References courses.id)
- assigned_at: TIMESTAMP
- UNIQUE constraint on (ta_id, course_id)
```

### API Endpoints

The feature uses Supabase client directly with the following operations:

1. **Fetch Departments**: `SELECT * FROM departments`
2. **Fetch Courses**: `SELECT * FROM courses WHERE department = ?`
3. **Fetch TAs**: `SELECT * FROM teaching_assistants WHERE department = ?`
4. **Fetch Assignments**: 
   ```sql
   SELECT 
     course_assignments.*,
     teaching_assistants.*,
     courses.*
   FROM course_assignments
   JOIN teaching_assistants ON course_assignments.ta_id = teaching_assistants.id
   JOIN courses ON course_assignments.course_id = courses.id
   ```
5. **Create Assignment**: `INSERT INTO course_assignments (ta_id, course_id)`
6. **Update Assignment**: `UPDATE course_assignments SET ta_id = ?, course_id = ? WHERE id = ?`
7. **Delete Assignment**: `DELETE FROM course_assignments WHERE id = ?`

### Security

- Row Level Security (RLS) is enabled on all tables
- Admins can view, create, update, and delete course assignments
- TAs can only view their own assignments (not through this interface)
- Policies ensure proper access control

## Usage Examples

### Creating a New Assignment

1. Navigate to Admin Dashboard → Course Assignments tab
2. Select "Computer Science and Engineering" from the department dropdown
3. Click "Assign Course" button
4. Select TA "John Doe" from the dropdown
5. Select Course "CS101 - Computer Science Fundamentals"
6. Click "Create Assignment"
7. Success message appears and the table updates with the new assignment

### Editing an Assignment

1. Find the assignment in the table
2. Click the Edit button (pencil icon)
3. Modify the TA or course selection
4. Click "Update Assignment"
5. Success message appears and the table updates

### Deleting an Assignment

1. Find the assignment in the table
2. Click the Delete button (trash icon)
3. Confirm the deletion in the dialog
4. Success message appears and the assignment is removed from the table

### Searching Assignments

1. Type in the search box (e.g., "John" or "CS101")
2. The table automatically filters to show matching assignments
3. Clear the search box to see all assignments again

## Error Handling

The feature handles the following errors:

1. **Duplicate Assignment**: "This TA is already assigned to this course"
2. **Network Errors**: "Failed to load department data" / "Failed to save assignment"
3. **Missing Data**: Appropriate messages when no TAs or courses exist in a department
4. **Validation Errors**: "Please select both a TA and a course"

## Future Enhancements

Potential improvements for future versions:

1. **Bulk Assignment**: Assign multiple TAs to the same course or one TA to multiple courses
2. **Assignment History**: Track changes to assignments over time
3. **Assignment Notifications**: Email TAs when they are assigned to a course
4. **Assignment Analytics**: Reports on TA workload and course coverage
5. **Import/Export**: Bulk import assignments from CSV or export to Excel
6. **Semester-Based Filtering**: Filter assignments by academic semester
7. **Course Load Management**: Prevent over-assignment of TAs based on max course limits

## Troubleshooting

### No TAs appear in the dropdown
- Verify that TAs have been registered in the system
- Ensure TAs have their department field set correctly
- Check that the department name matches exactly between TAs and courses

### No courses appear in the dropdown
- Verify that courses exist for the selected department
- Check that the department name in the courses table matches the department name

### Assignment creation fails
- Check for duplicate assignments (TA already assigned to that course)
- Verify database connectivity
- Check browser console for detailed error messages
- Ensure proper permissions are set in Supabase RLS policies

## Migration Notes

To add this feature to an existing system:

1. Run migration `005_add_department_to_ta.sql` to add the department field to teaching_assistants
2. Update existing TA records to set their department
3. Ensure courses have their department field populated
4. Deploy the updated frontend code with the CourseAssignments component
5. Test the feature with sample data before rolling out to production
