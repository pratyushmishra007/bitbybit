# 🎓 BitByBit - Academic System Architecture

## Indian College ERP-Inspired Management System

**Version:** 2.0 | **Updated:** February 13, 2026 | **Status:** Ready for Implementation

---

## Quick Context (For New Chat Sessions)

**BitByBit** is a multi-tenant coding education platform. This document covers the **Academic System** - university curriculum management with Indian semester model. A separate document covers the **Global Platform System** (placement prep, company-tagged problems).

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS v4, Supabase (PostgreSQL), NextAuth.js, Monaco Editor, Piston API

---

## 1. What Already Exists (Database) ✅

### Core Tables (Already in Production)

| Table | Purpose | Status |
|-------|---------|--------|
| `organizations` | Multi-tenant orgs (universities/colleges) | ✅ EXISTS |
| `departments` | Branches/Departments within org | ✅ EXISTS |
| `academic_years` | Academic year periods (2025-26) | ✅ EXISTS |
| `semesters` | Semester definitions with dates | ✅ EXISTS |
| `classes` | Class entities (linked to dept, semester) | ✅ EXISTS |
| `class_enrollments` | Student enrollment in classes | ✅ EXISTS |
| `class_courses` | Courses assigned to classes | ✅ EXISTS |
| `courses` | Course catalog with content | ✅ EXISTS |
| `lessons` | Lessons within courses | ✅ EXISTS |
| `users` | User profiles with roles, org linkage | ✅ EXISTS |
| `teacher_assignments` | Teacher-class-subject mapping | ✅ EXISTS |

### Assessment System (Already Implemented) ✅

| Table | Purpose |
|-------|---------|
| `assessments` | Quiz/test definitions |
| `assessment_questions` | Questions with types (MCQ, coding, etc.) |
| `assessment_submissions` | Student submissions |
| `assessment_answers` | Individual question answers |

**Assessment Features Working:**
- Create assessments (quiz, test, assignment, coding_challenge)
- Question types: multiple_choice, true_false, short_answer, coding, fill_blank
- Timed assessments with auto-submit
- Retake management with attempt tracking
- Auto-grading + manual grading
- Results publishing workflow

### Existing API Routes

```
/api/teacher/assessments          - CRUD for assessments
/api/teacher/assessments/[id]/questions  - Question management
/api/teacher/assessments/[id]/submissions - View submissions
/api/assessments/[id]/start       - Start assessment
/api/assessments/[id]/submit      - Submit answers
/api/admin/classes                - Class management
/api/admin/departments            - Department management
/api/admin/semesters              - Semester management
```

---

## 2. What Needs to Be Added (New Tables)

### 2.1 Programs Table (NEW)

```sql
CREATE TABLE programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL,              -- "Bachelor of Technology"
  code varchar(20) NOT NULL,               -- "BTECH"
  short_name varchar(50),                  -- "B.Tech"
  duration_years integer DEFAULT 4,
  total_semesters integer DEFAULT 8,
  degree_type varchar(50),                 -- undergraduate/postgraduate
  is_active boolean DEFAULT true,
  created_at timestamp DEFAULT now(),
  UNIQUE(organization_id, code)
);
```

### 2.2 Subjects/Curriculum Table (NEW)

```sql
-- Subjects Master
CREATE TABLE subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  department_id uuid REFERENCES departments(id) ON DELETE CASCADE,
  semester_number integer NOT NULL CHECK (semester_number BETWEEN 1 AND 8),
  name varchar(255) NOT NULL,              -- "Data Structures & Algorithms"
  code varchar(20) NOT NULL,               -- "CS301"
  credits integer DEFAULT 3,
  subject_type varchar(20) DEFAULT 'theory', -- theory/practical/elective
  max_internal_marks integer DEFAULT 40,
  max_external_marks integer DEFAULT 60,
  passing_marks integer DEFAULT 40,
  is_active boolean DEFAULT true,
  created_at timestamp DEFAULT now(),
  UNIQUE(organization_id, code)
);

-- Curriculum (which subjects in which class)
CREATE TABLE curriculum (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES subjects(id) ON DELETE CASCADE,
  is_mandatory boolean DEFAULT true,
  academic_year_id uuid REFERENCES academic_years(id),
  created_at timestamp DEFAULT now(),
  UNIQUE(class_id, subject_id)
);
```

### 2.3 Student Batches & Registration (NEW)

```sql
-- Student Batches (admission year grouping)
CREATE TABLE student_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  department_id uuid REFERENCES departments(id) ON DELETE CASCADE,
  admission_year integer NOT NULL,         -- 2025
  name varchar(100) NOT NULL,              -- "B.Tech CSE 2025"
  expected_graduation integer NOT NULL,    -- 2029
  is_active boolean DEFAULT true,
  created_at timestamp DEFAULT now(),
  UNIQUE(department_id, admission_year)
);

-- Student Registration (extends users table)
CREATE TABLE student_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  batch_id uuid REFERENCES student_batches(id) ON DELETE CASCADE,
  division varchar(1) NOT NULL,            -- "A", "B", "C"
  enrollment_number varchar(50) UNIQUE,    -- "2025BTECHCSEA001"
  roll_number varchar(20),                 -- "001"
  current_semester integer DEFAULT 1 CHECK (current_semester BETWEEN 1 AND 8),
  admission_date date DEFAULT CURRENT_DATE,
  admission_type varchar(20) DEFAULT 'regular',
  status varchar(20) DEFAULT 'active',     -- active/detained/graduated/dropped
  graduation_date date,
  total_backlogs integer DEFAULT 0,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);
```

### 2.4 Class Mentors (NEW)

```sql
CREATE TABLE class_mentors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  mentor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  academic_year_id uuid REFERENCES academic_years(id) ON DELETE CASCADE,
  is_active boolean DEFAULT true,
  assigned_at timestamp DEFAULT now(),
  UNIQUE(class_id, academic_year_id)
);
```

### 2.5 Teacher-Subject Assignments (Enhanced)

```sql
-- Enhanced teacher assignments with approval workflow
CREATE TABLE teacher_subject_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid REFERENCES users(id) ON DELETE CASCADE,
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES subjects(id) ON DELETE CASCADE,
  academic_year_id uuid REFERENCES academic_years(id) ON DELETE CASCADE,
  status varchar(20) DEFAULT 'pending',    -- pending/approved/rejected
  request_message text,
  requested_at timestamp DEFAULT now(),
  approved_by uuid REFERENCES users(id),   -- Class mentor
  approved_at timestamp,
  rejection_reason text,
  is_active boolean DEFAULT true,
  UNIQUE(class_id, subject_id, academic_year_id)
);
```

### 2.6 Student Subject Enrollment (NEW)

```sql
CREATE TABLE student_subject_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES users(id) ON DELETE CASCADE,
  teacher_assignment_id uuid REFERENCES teacher_subject_assignments(id) ON DELETE CASCADE,
  status varchar(20) DEFAULT 'pending',    -- pending/approved/enrolled/completed/failed
  request_message text,
  requested_at timestamp DEFAULT now(),
  approved_by uuid REFERENCES users(id),
  approved_at timestamp,
  rejection_reason text,
  created_at timestamp DEFAULT now(),
  UNIQUE(student_id, teacher_assignment_id)
);
```

### 2.7 Grading System (NEW)

```sql
-- Student Grades
CREATE TABLE student_grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid REFERENCES student_subject_enrollments(id) ON DELETE CASCADE UNIQUE,
  internal_marks decimal(5,2),
  external_marks decimal(5,2),
  practical_marks decimal(5,2),
  total_marks decimal(5,2),
  grade varchar(2),                        -- A+, A, B+, B, C, D, F
  grade_points decimal(3,1),               -- 10, 9, 8, 7, 6, 5, 0
  credits_earned integer,
  status varchar(20) DEFAULT 'pending',    -- pending/graded/published
  is_pass boolean,
  attempt_number integer DEFAULT 1,
  graded_by uuid REFERENCES users(id),
  graded_at timestamp,
  created_at timestamp DEFAULT now()
);

-- Semester Results (aggregated)
CREATE TABLE semester_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES users(id) ON DELETE CASCADE,
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  academic_year_id uuid REFERENCES academic_years(id) ON DELETE CASCADE,
  semester_number integer NOT NULL,
  total_credits integer DEFAULT 0,
  earned_credits integer DEFAULT 0,
  sgpa decimal(4,2),                       -- Semester GPA (0-10)
  cgpa decimal(4,2),                       -- Cumulative GPA (0-10)
  subjects_passed integer DEFAULT 0,
  subjects_failed integer DEFAULT 0,
  result_status varchar(20) DEFAULT 'pending',
  is_promoted boolean DEFAULT false,
  promoted_to_semester integer,
  declared_at timestamp,
  UNIQUE(student_id, class_id, academic_year_id)
);

-- Grade Mapping
CREATE TABLE grade_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id),
  min_marks integer NOT NULL,
  max_marks integer NOT NULL,
  grade varchar(2) NOT NULL,
  grade_points decimal(3,1) NOT NULL,
  description varchar(50)
);

-- Backlog Records
CREATE TABLE backlog_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES users(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES subjects(id) ON DELETE CASCADE,
  original_enrollment_id uuid REFERENCES student_subject_enrollments(id),
  failed_in_year uuid REFERENCES academic_years(id),
  cleared_in_year uuid REFERENCES academic_years(id),
  attempt_count integer DEFAULT 1,
  status varchar(20) DEFAULT 'active',     -- active/cleared
  cleared_at timestamp
);
```

---

## 3. Academic Structure Model

### 3.1 Indian Semester System

```
4-Year B.Tech = 8 Semesters
1 Academic Year = 2 Semesters (Odd: Jul-Dec, Even: Jan-Jun)

At any point in time (e.g., July 2026):
┌────────┬─────────────┬──────────────┬─────────────┐
│ Batch  │ Year        │ Semester     │ Classes     │
├────────┼─────────────┼──────────────┼─────────────┤
│ 2026   │ 1st Year    │ Semester 1   │ 1A, 1B, 1C  │
│ 2025   │ 2nd Year    │ Semester 3   │ 3A, 3B, 3C  │
│ 2024   │ 3rd Year    │ Semester 5   │ 5A, 5B, 5C  │
│ 2023   │ 4th Year    │ Semester 7   │ 7A, 7B, 7C  │
└────────┴─────────────┴──────────────┴─────────────┘
```

### 3.2 Key Concepts

| Term | Definition |
|------|------------|
| **Class** | Semester + Section (e.g., 1A, 3B) |
| **Batch** | Admission year group (e.g., 2025 batch) |
| **Division** | Section letter (A, B, C) - permanent for student |
| **Program** | Degree type (BTech, BCA, MCA) |
| **Mentor** | Faculty assigned per class per academic year |

### 3.3 Enrollment Number Format

```
Format: [YEAR][PROGRAM][BRANCH][DIVISION][SERIAL]
Example: 2025BTECHCSEA001

Components:
├── 2025       → Admission Year
├── BTECH      → Program Code
├── CSE        → Branch/Department Code
├── A          → Division/Section
└── 001        → Serial Number (3 digits)
```

---

## 4. User Roles & Permissions

| Role | Code | Key Permissions |
|------|------|-----------------|
| Platform Admin | `platform_admin` | All organizations, all features |
| Org Admin | `org_admin` | Single org management |
| HOD | `hod` | Department management |
| Mentor | `mentor` | Class management, approve enrollments |
| Teacher | `teacher` | Course content, grading assigned subjects |
| Student | `student` | Learning, assessments, view grades |

**Note:** Current `users.role` supports: `student`, `teacher`, `admin`, `visitor`  
**TODO:** Add `mentor`, `hod`, `org_admin`, `platform_admin` to role enum

---

## 5. Key User Flows

### 5.1 Student Registration Flow

```
Student → Signup → Select Org/Program/Branch/Batch/Division
       → Status: PENDING
       → Mentor Approves → Enrollment Number Generated
       → Auto-enrolled in Class (e.g., 1A)
       → Can request subject enrollment
```

### 5.2 Teacher Assignment Flow

```
Teacher → Request to teach Subject X in Class Y
       → Mentor of Class Y Reviews
       → Approves/Rejects
       → Approved: Teacher can create content, grade students
```

### 5.3 Subject Enrollment Flow

```
Student → See available subjects for their class
       → Request enrollment in Subject (with assigned teacher)
       → Mentor Approves
       → Student can access course content
```

### 5.4 Semester End Flow

```
Teachers → Submit grades for all students
HOD/Admin → Trigger "Process Results"
System → Calculate SGPA/CGPA for each student
      → Determine pass/fail
      → Auto-promote passing students to next semester
      → Mark failed subjects as backlogs
      → Update student's current_semester
```

---

## 6. Pages & API Needed (Academic)

### New Admin Pages

| Page | Purpose |
|------|---------|
| `/admin/programs` | Manage degree programs |
| `/admin/subjects` | Create/edit subjects |
| `/admin/curriculum` | Assign subjects to classes |
| `/admin/mentors` | Assign mentors to classes |
| `/admin/batches` | Manage student batches |
| `/admin/results` | Trigger semester result processing |

### New Mentor Pages

| Page | Purpose |
|------|---------|
| `/mentor/dashboard` | Class overview, pending approvals count |
| `/mentor/approvals` | Approve students, teachers, enrollments |
| `/mentor/students` | View class roster, progress |
| `/mentor/grades` | View/verify grades before publishing |

### Enhanced Teacher Pages

| Page | Purpose |
|------|---------|
| `/teacher/request-assignment` | Request to teach subject |
| `/teacher/my-subjects` | View assigned subjects per class |
| `/teacher/grades` | Enter marks for students |

### Enhanced Student Pages

| Page | Purpose |
|------|---------|
| `/dashboard` (enhanced) | Show class, semester, academic info |
| `/enroll-subjects` | Request enrollment in subjects |
| `/my-grades` | View marks, SGPA, CGPA |
| `/academic-history` | Semester-wise history |

### New API Routes

```
/api/admin/programs              - CRUD Programs
/api/admin/subjects              - CRUD Subjects  
/api/admin/curriculum            - Manage curriculum
/api/admin/mentors               - Manage mentor assignments
/api/admin/batches               - Manage batches
/api/admin/results/process       - Trigger result processing

/api/mentor/approvals            - Get pending approvals
/api/mentor/approvals/[type]/[id] - Approve/reject
/api/mentor/students             - Get class roster
/api/mentor/grades               - View grades summary

/api/teacher/request-assignment  - Request subject assignment
/api/teacher/my-subjects         - Get assigned subjects
/api/teacher/grades              - Submit grades

/api/student/enroll-subject      - Request subject enrollment
/api/student/grades              - Get own grades
/api/student/academic-profile    - Get academic info
```

---

## 7. Assessment Integration

The existing assessment system integrates with the academic system:

```
assessments.class_id    → Links to classes table
assessments.course_id   → Links to courses table (can be subject-based)
assessments.created_by  → Teacher who created it
```

**Enhancement Needed:**
- Link assessments to `subjects` table
- Include assessment scores in grade calculation
- Weight assessments (quiz: 10%, test: 30%, assignment: 20%)

---

## 8. Database Migration Priority

### Phase 1: Foundation (Week 1)
1. `programs` table
2. `subjects` table  
3. `student_batches` table
4. Update `users.role` enum

### Phase 2: Registration (Week 2)
1. `student_registrations` table
2. `class_mentors` table
3. `teacher_subject_assignments` table

### Phase 3: Academic Flow (Week 3)
1. `curriculum` table
2. `student_subject_enrollments` table
3. `student_grades` table

### Phase 4: Results (Week 4)
1. `semester_results` table
2. `grade_mappings` table
3. `backlog_records` table
4. Auto-promotion function

---

## 9. Quick Reference Commands

### Generate Enrollment Number (SQL Function)

```sql
CREATE OR REPLACE FUNCTION generate_enrollment_number(
  p_year integer,
  p_program_code varchar,
  p_dept_code varchar,
  p_division varchar
) RETURNS varchar AS $$
DECLARE
  v_serial integer;
BEGIN
  SELECT COALESCE(MAX(CAST(RIGHT(enrollment_number, 3) AS integer)), 0) + 1
  INTO v_serial
  FROM student_registrations sr
  JOIN student_batches sb ON sr.batch_id = sb.id
  JOIN departments d ON sb.department_id = d.id
  WHERE sb.admission_year = p_year
    AND d.code = p_dept_code
    AND sr.division = p_division;
  
  RETURN p_year::text || p_program_code || p_dept_code || 
         p_division || LPAD(v_serial::text, 3, '0');
END;
$$ LANGUAGE plpgsql;
```

### SGPA Calculation

```sql
SGPA = Σ(grade_points × credits) / Σ(credits)
-- Example: (10×4 + 9×3 + 8×3 + 7×2) / (4+3+3+2) = 8.58
```

---

## Summary: What's Next

| Category | Existing | New |
|----------|----------|-----|
| **Tables** | 40+ tables | 10 new tables |
| **Admin Pages** | 10 pages | 6 new pages |
| **Mentor Pages** | 0 | 4 new pages |
| **Teacher Pages** | 5 pages | 3 enhanced |
| **Student Pages** | 8 pages | 4 new pages |
| **APIs** | 50+ routes | 15 new routes |

**Estimated Effort:** 4-6 weeks for full academic system implementation

---

*Last Updated: February 13, 2026*
