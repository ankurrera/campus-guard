# Database Schema: Department-Year-Semester-Subject Hierarchy

## Entity Relationship Diagram

```
┌─────────────────────┐
│   departments       │
│                     │
│ - id (PK)          │◄───┐
│ - name             │    │
│ - code (unique)    │    │
└─────────────────────┘    │
          │                │
          │ 1              │
          │                │
          │ *              │
          ▼                │
┌─────────────────────┐    │
│      years          │    │
│                     │    │
│ - id (PK)          │    │
│ - department_id(FK)├────┘
│ - year_number      │
│ - year_name        │
└─────────────────────┘
          │
          │ 1
          │
          │ *
          ▼
┌─────────────────────┐
│    semesters        │◄───┐
│                     │    │
│ - id (PK)          │    │
│ - year_id (FK)     │    │
│ - semester_number  │    │
│ - semester_name    │    │
└─────────────────────┘    │
          │                │
          │                │
          │                │
          │                │
┌─────────────────────┐    │
│  department_course_ │    │
│       map           │    │
│                     │    │
│ - id (PK)          │    │
│ - semester_id (FK) ├────┘
│ - course_id (FK)   ├───┐
└─────────────────────┘   │
                          │
                          ▼
                    ┌─────────────────────┐
                    │     courses         │
                    │  (centralized pool) │
                    │                     │
                    │ - id (PK)          │
                    │ - name             │
                    │ - code (unique)    │
                    │ - description      │
                    │ - credits          │
                    └─────────────────────┘
```

## Data Flow and Relationships

### 1. One-to-Many Relationships
- **Department → Years**: One department has 4 years (1st, 2nd, 3rd, 4th)
- **Year → Semesters**: One year has 2 semesters (Semester 1, Semester 2)

### 2. Many-to-Many Relationship
- **Semesters ↔ Courses**: Multiple semesters can have multiple courses
  - Linked through `department_course_map` junction table
  - Courses remain in a centralized pool (no duplication)

### 3. Constraints
- **semesters**: UNIQUE(year_id, semester_number)
  - Ensures only 2 semesters per year
- **department_course_map**: UNIQUE(semester_id, course_id)
  - Prevents duplicate course assignments to the same semester

## Automatic Cascade

### When a Department is Created:
```
INSERT INTO departments (name, code) VALUES ('AI & ML', 'AIML');
                    ↓
    [Trigger: auto_create_years_for_department]
                    ↓
    4 Years Created Automatically:
    - 1st Year
    - 2nd Year
    - 3rd Year
    - 4th Year
                    ↓
    [Trigger: auto_create_semesters_for_year]
                    ↓
    8 Semesters Created Automatically:
    - Year 1: Semester 1, Semester 2
    - Year 2: Semester 1, Semester 2
    - Year 3: Semester 1, Semester 2
    - Year 4: Semester 1, Semester 2
```

## Example Queries

### Get all semesters for a department:
```sql
SELECT 
    d.name AS department,
    y.year_name,
    s.semester_name
FROM departments d
JOIN years y ON y.department_id = d.id
JOIN semesters s ON s.year_id = y.id
WHERE d.code = 'CSE'
ORDER BY y.year_number, s.semester_number;
```

### Get courses for a specific semester:
```sql
SELECT 
    d.name AS department,
    y.year_name,
    s.semester_name,
    c.code AS course_code,
    c.name AS course_name,
    c.credits
FROM departments d
JOIN years y ON y.department_id = d.id
JOIN semesters s ON s.year_id = y.id
JOIN department_course_map dcm ON dcm.semester_id = s.id
JOIN courses c ON c.id = dcm.course_id
WHERE d.code = 'CSE' 
  AND y.year_number = 1 
  AND s.semester_number = 1
ORDER BY c.code;
```

### Assign a course to a semester:
```sql
INSERT INTO department_course_map (semester_id, course_id)
SELECT 
    s.id,
    c.id
FROM departments d
JOIN years y ON y.department_id = d.id AND y.year_number = 1
JOIN semesters s ON s.year_id = y.id AND s.semester_number = 1
CROSS JOIN courses c
WHERE d.code = 'CSE' AND c.code = 'CS101';
```

## Benefits of This Design

1. **No Data Duplication**: Courses stored once in central table
2. **Flexibility**: Same course can be assigned to multiple semesters/departments
3. **Maintainability**: Update course details in one place
4. **Scalability**: Easy to add new departments, years, or courses
5. **Automatic Setup**: New departments get years and semesters automatically
6. **Data Integrity**: Foreign key constraints ensure referential integrity
