# 🛤️ BitByBit - Implementation Path

## Development Roadmap & Strategy

**Version:** 1.0 | **Updated:** February 13, 2026 | **Status:** Planning Complete

---

## Quick Context (For New Chat Sessions)

BitByBit has two major systems to implement:
1. **Academic System** - University/college management with Indian semester model
2. **Global Platform** - Placement preparation with company-tagged problems

This document provides the **implementation strategy and order**.

**Related Docs:**
- `ACADEMIC_SYSTEM_ARCHITECTURE.md` - Academic system details
- `GLOBAL_PLATFORM_ARCHITECTURE.md` - Global platform details

---

## 1. Recommended Strategy: Parallel with Staggered Start

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    IMPLEMENTATION STRATEGY                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ✅ RECOMMENDED: Parallel UI + Sequential Backend                      │
│                                                                          │
│   Why this works:                                                        │
│   • UI can be built with mock/static data first                         │
│   • Two developers can work in parallel                                 │
│   • Backend requires sequential DB migrations                           │
│   • Can demo UI progress while backend develops                         │
│                                                                          │
│   Timeline:                                                              │
│   ┌─────────┬─────────┬─────────┬─────────┬─────────┬─────────┐        │
│   │  Week 1 │  Week 2 │  Week 3 │  Week 4 │  Week 5 │  Week 6 │        │
│   ├─────────┴─────────┴─────────┴─────────┴─────────┴─────────┤        │
│   │ BACKEND: Academic DB → Academic APIs → Global DB → Global │        │
│   ├─────────┬─────────┬─────────┬─────────┬─────────┬─────────┤        │
│   │ UI:     │Academic │Academic │ Global  │ Global  │ Polish  │        │
│   │ -----   │ Pages   │+ Global │ Pages   │+ Tests  │+ Deploy │        │
│   └─────────┴─────────┴─────────┴─────────┴─────────┴─────────┘        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Execution Order

### Phase 1: Database Foundation (Week 1)

**Priority: CRITICAL - Must complete first**

**✅ COMPLETED (Feb 13, 2026):**
- [x] Created `lib/migrations/001_academic_system.sql` with all 12 academic tables
- [x] Updated `lib/supabase.ts` with TypeScript types for all new tables
- [x] Created API routes: `/api/admin/programs`, `/api/admin/subjects`, `/api/admin/batches`
- [x] Created API routes: `/api/admin/curriculum`, `/api/admin/mentors`, `/api/admin/student-registrations`

**⏳ PENDING:**
- [ ] Run migration in Supabase SQL Editor
- [ ] Create admin UI pages

```
Day 1-2: Academic Schema ✅
├── Created migration file: lib/migrations/001_academic_system.sql
├── Tables defined:
│   ├── programs ✅
│   ├── subjects ✅
│   ├── curriculum ✅
│   ├── student_batches ✅
│   ├── student_registrations ✅
│   ├── class_mentors ✅
│   ├── teacher_subject_assignments ✅
│   ├── student_subject_enrollments ✅
│   ├── student_grades ✅
│   ├── semester_results ✅
│   ├── grade_mappings ✅
│   └── backlog_records ✅
├── Updated users.role enum ✅
├── Added RLS policies ✅
├── Added helper functions ✅ (generate_enrollment_number, calculate_grade, calculate_sgpa)
└── Run migration in Supabase ⏳

Day 3-4: APIs ✅
├── /api/admin/programs ✅
├── /api/admin/subjects ✅
├── /api/admin/batches ✅
├── /api/admin/curriculum ✅
├── /api/admin/mentors ✅
└── /api/admin/student-registrations ✅

Day 5: Global Platform Schema ✅
├── Created migration file: lib/migrations/002_global_platform.sql
├── Tables defined:
│   ├── companies ✅ (25 pre-seeded companies)
│   ├── topics ✅ (25 DSA topics pre-seeded)
│   ├── problems ✅
│   ├── problem_company_tags ✅
│   ├── problem_topic_tags ✅
│   ├── problem_submissions ✅
│   ├── user_solved_problems ✅
│   ├── user_problem_stats ✅
│   ├── daily_challenges ✅
│   └── daily_challenge_completions ✅
├── Added RLS policies ✅
├── Added helper functions ✅ (submission stats, solved tracking, tag counts)
├── Added views ✅ (problems_with_tags, global_leaderboard)
└── Updated lib/supabase.ts with TypeScript types ✅
```

**Migration Files:**
```
lib/migrations/001_academic_system.sql   # Academic System
lib/migrations/002_global_platform.sql   # Global Platform
```

**Auth Flow Review:** (See AUTH_FLOW_CHANGES.md)
- Documented current signup flow
- Identified gaps for academic system
- Created action plan for updates

---

### Phase 2: Academic System Backend (Week 2)

**Create APIs in order:**

```
Day 1: Admin APIs
├── /api/admin/programs          - CRUD
├── /api/admin/subjects          - CRUD
└── /api/admin/batches           - CRUD

Day 2: Admin APIs (continued)
├── /api/admin/curriculum        - Link subjects to classes
├── /api/admin/mentors           - Assign mentors
└── /api/admin/results/process   - Trigger processing

Day 3: Mentor APIs
├── /api/mentor/approvals        - List pending
├── /api/mentor/approvals/students/[id]  - Approve/reject student
├── /api/mentor/approvals/teachers/[id]  - Approve/reject teacher
└── /api/mentor/approvals/enrollments/[id] - Approve subject enrollment

Day 4: Teacher APIs
├── /api/teacher/request-assignment  - Request to teach
├── /api/teacher/my-subjects         - Get assigned subjects
└── /api/teacher/grades              - Submit grades

Day 5: Student APIs
├── /api/student/enroll-subject      - Request enrollment
├── /api/student/grades              - View grades
└── /api/student/academic-profile    - Get full academic info
```

---

### Phase 3: UI Development - Academic (Week 2-3)

**Can start in parallel with backend using mock data**

```
Week 2, Day 1-2: Admin Pages
├── /admin/programs/page.tsx
├── /admin/programs/create/page.tsx
├── /admin/subjects/page.tsx
├── /admin/subjects/create/page.tsx
└── /admin/curriculum/page.tsx

Week 2, Day 3-4: Mentor Pages
├── /mentor/page.tsx (dashboard)
├── /mentor/approvals/page.tsx
├── /mentor/students/page.tsx
└── Components: ApprovalCard, StudentList

Week 2, Day 5: Teacher Enhancement
├── /teacher/request-assignment/page.tsx
├── /teacher/my-subjects/page.tsx
└── /teacher/grades/page.tsx

Week 3, Day 1-2: Student Enhancement
├── Enhance /dashboard
├── /enroll-subjects/page.tsx
├── /my-grades/page.tsx
└── Components: GradeCard, SGPAWidget, CGPAWidget
```

---

### Phase 4: Global Platform Backend (Week 3-4)

```
Week 3, Day 3-4: Problem System
├── /api/problems                - List with filters
├── /api/problems/[slug]         - Get problem detail
├── /api/problems/[slug]/submit  - Submit solution
└── /api/problems/[slug]/submissions - User's submissions

Week 3, Day 5: Stats & Progress
├── /api/user/stats              - Get coding stats
├── /api/user/solved             - Get solved problems
└── Update stats on submission

Week 4, Day 1-2: Tracks
├── /api/tracks                  - List tracks
├── /api/tracks/[slug]           - Track detail
└── /api/tracks/[slug]/progress  - User progress in track

Week 4, Day 3-4: Profile
├── /api/profile/public          - Get/update public profile
├── /api/u/[username]            - Public profile view
└── /api/leaderboard             - Rankings

Week 4, Day 5: Mock Tests (Basic)
├── /api/mock-tests              - List tests
├── /api/mock-tests/[id]/start   - Start test
└── /api/mock-tests/[id]/submit  - Submit test
```

---

### Phase 5: UI Development - Global (Week 4-5)

```
Week 4, Day 1-2: Problem Pages
├── /problems/page.tsx           - Problem list with filters
├── /problems/[slug]/page.tsx    - Problem solving page
├── Components: ProblemCard, DifficultyBadge, CompanyTag
└── Integrate Monaco Editor for code input

Week 4, Day 3-4: Track Pages
├── /tracks/page.tsx             - Track list
├── /tracks/[slug]/page.tsx      - Track detail
└── Components: TrackCard, ProgressBar

Week 5, Day 1-2: Profile & Leaderboard
├── /profile/settings/page.tsx   - Profile settings
├── /u/[username]/page.tsx       - Public profile
├── /leaderboard/page.tsx
└── Components: ProfileCard, StatsWidget

Week 5, Day 3-4: Dashboard Enhancement
├── Update /dashboard with:
│   ├── CodingStatsWidget
│   ├── TrackProgressWidget
│   └── StreakWidget
└── Navigation updates
```

---

### Phase 6: Integration & Testing (Week 6)

```
Day 1-2: Integration Testing
├── Test academic flows end-to-end
├── Test problem submission flow
├── Test grade calculation
└── Test auto-promotion logic

Day 3-4: Bug Fixes & Polish
├── Fix cross-system issues
├── Performance optimization
├── Mobile responsiveness
└── Error handling

Day 5: Deployment Prep
├── Environment variables
├── Database backup
├── Staging deployment
└── Documentation update
```

---

## 3. File Structure for New Pages

```
app/
├── admin/
│   ├── programs/
│   │   ├── page.tsx           # List programs
│   │   └── create/
│   │       └── page.tsx       # Create program
│   ├── subjects/
│   │   ├── page.tsx
│   │   └── create/
│   │       └── page.tsx
│   ├── curriculum/
│   │   └── page.tsx
│   ├── mentors/
│   │   └── page.tsx
│   └── batches/
│       └── page.tsx
├── mentor/
│   ├── page.tsx               # Mentor dashboard
│   ├── approvals/
│   │   └── page.tsx
│   └── students/
│       └── page.tsx
├── teacher/
│   ├── request-assignment/
│   │   └── page.tsx
│   ├── my-subjects/
│   │   └── page.tsx
│   └── grades/
│       └── page.tsx
├── problems/
│   ├── page.tsx               # Problem list
│   └── [slug]/
│       └── page.tsx           # Problem solving
├── tracks/
│   ├── page.tsx               # Track list
│   └── [slug]/
│       └── page.tsx           # Track detail
├── mock-tests/
│   ├── page.tsx               # Test list
│   ├── [id]/
│   │   ├── page.tsx           # Take test
│   │   └── results/
│   │       └── page.tsx       # Results
├── profile/
│   └── settings/
│       └── page.tsx           # Profile settings
├── u/
│   └── [username]/
│       └── page.tsx           # Public profile
├── leaderboard/
│   └── page.tsx
├── enroll-subjects/
│   └── page.tsx
└── my-grades/
    └── page.tsx
```

---

## 4. Component Checklist

### Shared Components (Create First)

```
components/
├── ui/                        # Already exists (shadcn)
├── academic/
│   ├── ProgramCard.tsx
│   ├── SubjectCard.tsx
│   ├── GradeDisplay.tsx
│   ├── SGPAWidget.tsx
│   ├── CGPAWidget.tsx
│   ├── SemesterTimeline.tsx
│   └── ApprovalCard.tsx
├── problems/
│   ├── ProblemCard.tsx
│   ├── DifficultyBadge.tsx
│   ├── CompanyTag.tsx
│   ├── TopicTag.tsx
│   ├── CodeEditor.tsx         # Wrapper around Monaco
│   ├── TestCasePanel.tsx
│   └── SubmissionResult.tsx
├── tracks/
│   ├── TrackCard.tsx
│   ├── TrackProgress.tsx
│   └── ProblemList.tsx
├── profile/
│   ├── StatsWidget.tsx
│   ├── StreakCalendar.tsx
│   ├── BadgeGrid.tsx
│   └── PublicProfileCard.tsx
└── dashboard/
    ├── AcademicWidget.tsx
    ├── CodingStatsWidget.tsx
    └── QuickActions.tsx
```

---

## 5. Quick Start Checklist

### Before Starting Any Code

- [ ] Read both architecture docs fully
- [ ] Set up local environment with Supabase
- [ ] Understand existing codebase structure
- [ ] Create feature branch: `feature/academic-system`
- [ ] Create feature branch: `feature/global-platform`

### Database First

- [ ] Create `lib/migrations/001_academic_system.sql`
- [ ] Create `lib/migrations/002_global_platform.sql`
- [ ] Test migrations in Supabase staging
- [ ] Update `lib/supabase.ts` with new types

### Then APIs

- [ ] Create API routes one by one
- [ ] Test each with Postman/curl
- [ ] Add proper error handling
- [ ] Add RLS policies for new tables

### Then UI

- [ ] Create page layouts
- [ ] Add navigation links
- [ ] Build reusable components
- [ ] Connect to APIs
- [ ] Add loading/error states

---

## 6. Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Database conflicts | Always backup before migration |
| Breaking existing features | Create feature branches |
| Complex RLS policies | Test thoroughly before deploying |
| Scope creep | Stick to phases, add features later |
| Timeline slip | MVP first, polish later |

---

## 7. Definition of Done

### Per Feature Checklist

- [ ] Database schema created
- [ ] RLS policies added
- [ ] API routes working
- [ ] UI page functional
- [ ] Loading states
- [ ] Error handling
- [ ] Mobile responsive
- [ ] Tested manually
- [ ] Code reviewed

---

## 8. Next Immediate Steps

**If you're starting right now:**

1. **Create migration file** - Copy SQL from ACADEMIC_SYSTEM_ARCHITECTURE.md
2. **Run in Supabase** - Test with staging/local
3. **Create first API** - `/api/admin/programs`
4. **Create first page** - `/admin/programs/page.tsx`
5. **Iterate** - One table → one API → one page

**Command to start:**
```bash
# Create migration file
touch lib/migrations/001_academic_system.sql

# Open in editor and paste SQL schema
```

---

## Summary

| What | Strategy |
|------|----------|
| **Database** | Sequential (Academic first, then Global) |
| **Backend APIs** | Sequential within each system |
| **Frontend UI** | Parallel (can mock data initially) |
| **Testing** | Integrated at end of each phase |

**Total Estimated Time:** 6 weeks for core features

---

*Last Updated: February 13, 2026*
