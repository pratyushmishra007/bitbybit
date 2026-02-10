# BitByBit - University Coding Education Platform

## 🎯 Product Vision

A **multi-tenant coding education platform** for universities, colleges, and schools where:
- **Organizations** (universities) manage their own departments, classes, and semesters
- **Admins** have platform-wide or organization-level control
- **Teachers** create courses, track student analytics, and help students in real-time
- **Students** learn to code with interactive lessons, assessments, and collaboration

---

## 📊 Entity Relationship Hierarchy

```
Platform Admin (superuser)
│
└── Organizations (University/College/School)
    │
    ├── Org Admins (manage their org only)
    │
    ├── Departments
    │   └── Head of Department (teacher)
    │
    ├── Academic Years
    │   └── Semesters
    │
    ├── Classes (Batches)
    │   ├── Students (enrolled via class_enrollments)
    │   ├── Teacher Assignments (which teacher teaches what)
    │   └── Class Courses (courses assigned per semester)
    │       └── Student Course Enrollments (progress tracking)
    │
    ├── Courses (created by teachers/admins)
    │   ├── Lessons (with test cases)
    │   ├── Assessments (quizzes, tests)
    │   └── Learning Objectives
    │
    └── Contests (competitive coding)
```

---

## ✅ Currently Working Features

### Authentication & Onboarding
| Feature | Status | Description |
|---------|--------|-------------|
| Email/Password Signup | ✅ Working | With role selection (student/teacher) |
| Google/GitHub OAuth | ✅ Working | Social login with auto-approval |
| Organization Selection | ✅ Working | Students select org by code during signup |
| Class Selection | ✅ Working | Students pick their class/batch |
| Teacher Approval Queue | ✅ Working | Teachers require admin approval |
| Pending Approval Page | ✅ Working | Shows status while waiting |

### Admin Dashboard (`/admin`)
| Feature | Status | Description |
|---------|--------|-------------|
| Statistics Overview | ✅ Working | User counts, course counts |
| Organization CRUD | ✅ Working | Create/edit/delete universities |
| Class Management | ✅ Working | Create classes linked to org/dept |
| User Management | ✅ Working | List, filter, delete users |
| Bulk CSV Import | ✅ Working | Import students via CSV |
| Teacher-Class Assignment | ✅ Working | Assign teachers to classes |
| Approval Management | ✅ Working | Approve/reject pending accounts |
| Course Creation | ✅ Working | Create new courses with lessons |

### Teacher Dashboard (`/teacher`)
| Feature | Status | Description |
|---------|--------|-------------|
| Assigned Classes View | ✅ Working | See classes they teach |
| Student List | ✅ Working | View students in assigned classes |
| Course Assignment | ✅ Working | Assign courses to classes for semester |
| Basic Statistics | ✅ Working | Count of students, classes |

### Student Experience
| Feature | Status | Description |
|---------|--------|-------------|
| Dashboard | ✅ Working | XP, level, role-based navigation |
| My Courses | ✅ Working | View enrolled courses with progress |
| Course Browser | ✅ Working | Browse available courses |
| Lesson Viewer | ✅ Working | Interactive code lessons |
| Code Execution | ✅ Working | Run code with test cases |
| Progress Tracking | ✅ Working | Track lesson completion |
| XP & Leveling | ✅ Working | Gamification elements |

### Collaboration & Help
| Feature | Status | Description |
|---------|--------|-------------|
| Raise Hand | ✅ Working | Students request help |
| Help Request Queue | ✅ Working | Teachers see pending requests |
| Live Collaboration | ✅ Working | Real-time code sharing sessions |
| Code Sharing | ✅ Working | Share code snippets |

### Contests
| Feature | Status | Description |
|---------|--------|-------------|
| Contest Listing | ✅ Working | View available contests |
| Contest Problems | ✅ Working | Solve problems in contests |
| Submissions | ✅ Working | Submit and grade solutions |
| Leaderboard | ✅ Working | Contest rankings |

---

## ❌ Missing/Broken Features (TO BUILD)

### Priority 1: Organization Administration (CRITICAL)

#### 1.1 Org Admin Role
- **Current**: `org_admin` role defined in DB but NOT implemented
- **Required**: 
  - [ ] Org admin dashboard at `/org-admin`
  - [ ] Can only see/manage their organization
  - [ ] Manage departments, classes, teachers within org
  - [ ] Cannot see other organizations

#### 1.2 Department Management
- **Current**: `departments` table exists but NO UI
- **Required**:
  - [ ] Admin page at `/admin/departments`
  - [ ] CRUD API at `/api/admin/departments`
  - [ ] Assign department head (teacher)
  - [ ] Link classes to departments

#### 1.3 Academic Year & Semester Management
- **Current**: Tables exist but semester is free-text input
- **Required**:
  - [ ] Admin page at `/admin/semesters`
  - [ ] CRUD for academic years
  - [ ] CRUD for semesters within years
  - [ ] Dropdown selection when assigning courses

### Priority 2: Teacher Analytics (HIGH VALUE)

#### 2.1 Class Analytics Dashboard
- **Required**:
  - [ ] `/teacher/analytics/[classId]`
  - [ ] Student progress heatmap
  - [ ] At-risk student detection (<25% progress)
  - [ ] Lesson-by-lesson completion rates
  - [ ] Time spent analysis

#### 2.2 Student Performance Reports
- **Required**:
  - [ ] Individual student drill-down
  - [ ] Export as PDF
  - [ ] Weekly/monthly reports
  - [ ] Comparison across class

#### 2.3 Course Effectiveness Metrics
- **Required**:
  - [ ] Pass/fail rates per lesson
  - [ ] Average attempts to pass
  - [ ] Common errors analysis

### Priority 3: Assessment System (HIGH VALUE)

#### 3.1 Assessment Builder
- **Required**:
  - [ ] `/teacher/assessments/new`
  - [ ] Question types: MCQ, coding, true/false
  - [ ] Question bank management
  - [ ] Randomized question order
  - [ ] Time limits

#### 3.2 Assessment Taking
- **Required**:
  - [ ] `/assessments/[id]`
  - [ ] Timed assessment UI
  - [ ] Auto-save answers
  - [ ] Code submission with test cases
  - [ ] Immediate feedback option

#### 3.3 Grading & Results
- **Required**:
  - [ ] Auto-grading for coding/MCQ
  - [ ] Manual grading interface for teachers
  - [ ] Grade export
  - [ ] Analytics on assessment performance

### Priority 4: Notification System

#### 4.1 In-App Notifications
- **Required**:
  - [ ] Notification center dropdown
  - [ ] Real-time updates via Supabase Realtime
  - [ ] Mark as read/unread
  - [ ] Notification preferences

#### 4.2 Notification Triggers
- [ ] Course assigned to class
- [ ] Assessment published
- [ ] Help request response
- [ ] Approval status change
- [ ] Contest starting soon

### Priority 5: Enhanced Course Builder

#### 5.1 Visual Lesson Editor
- **Required**:
  - [ ] Monaco editor with live preview
  - [ ] Markdown content support
  - [ ] Code snippet insertion
  - [ ] Resource attachments

#### 5.2 Test Case Builder
- **Required**:
  - [ ] Visual test case creator
  - [ ] Input/output pairs
  - [ ] Hidden test cases
  - [ ] Expected complexity

#### 5.3 Course Templates
- **Required**:
  - [ ] Pre-built course templates
  - [ ] Clone course functionality
  - [ ] Import/export course

### Priority 6: Student Self-Service

#### 6.1 Course Enrollment
- **Required**:
  - [ ] Browse public courses
  - [ ] Self-enroll in public courses
  - [ ] Course wishlist

#### 6.2 Learning Path
- **Required**:
  - [ ] Recommended courses based on progress
  - [ ] Prerequisites visualization
  - [ ] Skill tree view

---

## 🔧 Immediate Fixes Required

### Database-Frontend Sync Issues

| Issue | Location | Fix |
|-------|----------|-----|
| `users.class_id` redundant | Signup + DB | Use only `class_enrollments` table |
| Semester free-text | `/teacher/manage-courses` | Use dropdown from `semesters` table |
| No org scoping for admin | All admin pages | Add org filter or org_admin role |
| Department dropdown empty | `/admin/classes` | Fetch from `departments` API |

### API Endpoints to Add

```typescript
// Department Management
POST   /api/admin/departments
PUT    /api/admin/departments/[id]
DELETE /api/admin/departments/[id]

// Academic Year & Semester
GET    /api/admin/academic-years
POST   /api/admin/academic-years
GET    /api/admin/semesters
POST   /api/admin/semesters

// Student Self-Enrollment
POST   /api/user/enrollments
GET    /api/courses/public

// Org Admin (new role)
GET    /api/org-admin/dashboard
GET    /api/org-admin/departments
GET    /api/org-admin/classes
GET    /api/org-admin/users
```

---

## 🏗️ Implementation Roadmap

### Week 1: Foundation Fixes
- [ ] Implement org_admin role in frontend
- [ ] Add department CRUD UI & API
- [ ] Add academic-year/semester CRUD
- [ ] Fix semester dropdown in course assignment

### Week 2: Teacher Analytics
- [ ] Build class analytics dashboard
- [ ] Add student progress heatmaps
- [ ] Implement at-risk detection
- [ ] Add export to PDF

### Week 3: Assessment System
- [ ] Build assessment question builder
- [ ] Create assessment taking UI
- [ ] Implement auto-grading
- [ ] Add teacher grading interface

### Week 4: Notifications
- [ ] Design notification system
- [ ] Implement Supabase Realtime
- [ ] Add notification triggers
- [ ] Build notification center UI

### Week 5: Enhanced Features
- [ ] Visual lesson editor improvements
- [ ] Course templates
- [ ] Student self-enrollment
- [ ] Learning path recommendations

### Week 6: Polish & Deploy
- [ ] Performance optimization
- [ ] Mobile responsiveness
- [ ] Error handling improvements
- [ ] Production deployment

---

## 📁 Project Structure

```
bitbybit/
├── app/
│   ├── admin/           # Platform admin pages
│   │   ├── organizations/
│   │   ├── classes/
│   │   ├── departments/ # TO ADD
│   │   ├── semesters/   # TO ADD
│   │   └── users/
│   ├── org-admin/       # TO ADD - Org-level admin
│   ├── teacher/
│   │   ├── manage-courses/
│   │   └── analytics/   # TO ADD
│   ├── dashboard/       # Student dashboard
│   ├── courses/
│   ├── lessons/
│   ├── contests/
│   └── api/
│       ├── admin/
│       ├── teacher/
│       ├── org-admin/   # TO ADD
│       └── user/
├── lib/
│   └── supabase.ts
├── types/
│   └── index.ts
└── COMPLETE_DATABASE_SETUP.sql
```

---

## 🔐 Role Permissions Matrix

| Action | Student | Teacher | Org Admin | Platform Admin |
|--------|---------|---------|-----------|----------------|
| View own courses | ✅ | ✅ | ✅ | ✅ |
| Complete lessons | ✅ | ❌ | ❌ | ❌ |
| Take assessments | ✅ | ❌ | ❌ | ❌ |
| View class students | ❌ | ✅ (assigned) | ✅ (org) | ✅ |
| Create courses | ❌ | ✅ | ✅ | ✅ |
| Assign courses | ❌ | ✅ (assigned) | ✅ (org) | ✅ |
| Create assessments | ❌ | ✅ | ✅ | ✅ |
| Manage departments | ❌ | ❌ | ✅ | ✅ |
| Manage classes | ❌ | ❌ | ✅ | ✅ |
| Approve teachers | ❌ | ❌ | ✅ | ✅ |
| Manage organizations | ❌ | ❌ | ❌ | ✅ |
| View all orgs | ❌ | ❌ | ❌ | ✅ |

---

## 📋 Database Tables Summary

| Category | Tables |
|----------|--------|
| **Core** | organizations, departments, academic_years, semesters, classes |
| **Users** | users, class_enrollments, teacher_assignments |
| **Courses** | courses, lessons, class_courses, student_course_enrollments |
| **Progress** | lesson_progress, course_progress, daily_activity |
| **Assessment** | assessments, assessment_questions, assessment_submissions, assessment_answers |
| **Collaboration** | collaboration_sessions, session_participants, help_requests |
| **Contests** | contests, contest_problems, contest_participants, contest_submissions |
| **Analytics** | student_analytics, class_analytics, learning_objectives |

---

## 🚀 Quick Start for Development

1. **Database**: Run `COMPLETE_DATABASE_SETUP.sql` phases 1-11 in Supabase
2. **Environment**: Copy `.env.example` to `.env.local` with Supabase credentials
3. **Install**: `npm install`
4. **Run**: `npm run dev`
5. **Test**: Create an organization, then sign up as teacher and student
