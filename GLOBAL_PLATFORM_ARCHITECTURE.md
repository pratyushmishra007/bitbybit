# 🚀 BitByBit - Global Platform Architecture

## Placement-Ready Pipeline & Career Development System

**Version:** 1.0 | **Updated:** February 13, 2026 | **Status:** Design Phase

---

## Quick Context (For New Chat Sessions)

This document covers the **Global Platform System** - placement preparation, company-tagged problems, mock tests, and career features. See `ACADEMIC_SYSTEM_ARCHITECTURE.md` for the academic/university management system.

**Goal:** Transform BitByBit from just a learning platform into a **Placement-Ready Pipeline** for Indian engineering students.

---

## 1. What Already Exists ✅

### Existing Contest System

| Table | Purpose | Status |
|-------|---------|--------|
| `contests` | Contest definitions (upcoming/active/ended) | ✅ EXISTS |
| `contest_problems` | Problems within contests | ✅ EXISTS |
| `contest_participants` | User participation tracking | ✅ EXISTS |
| `contest_submissions` | Code submissions with status | ✅ EXISTS |

### Existing Course/Lesson System

| Table | Purpose |
|-------|---------|
| `courses` | Course catalog (category, difficulty) |
| `lessons` | Interactive coding lessons |
| `course_progress` | User progress tracking |
| `lesson_submissions` | Code submissions per lesson |

### Existing User Features

| Table | Purpose |
|-------|---------|
| `achievements` | Badges earned |
| `daily_activity` | Daily activity metrics |
| `student_analytics` | Learning analytics |

---

## 2. Global Platform Features (NEW)

### 2.1 Company-Tagged Problem System

```
┌─────────────────────────────────────────────────────────────────┐
│                  COMPANY-TAGGED PROBLEMS                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Problems Pool                Company Tags                      │
│   ├── Two Sum                  [Amazon, Google, Microsoft]       │
│   ├── LRU Cache               [Meta, Apple, Netflix]             │
│   ├── Binary Tree Level Order [TCS, Infosys, Wipro]             │
│   └── Merge Intervals         [Goldman, JP Morgan, Stripe]       │
│                                                                  │
│   Topic Tags                   Difficulty                        │
│   ├── Arrays                   ├── Easy                         │
│   ├── Linked Lists             ├── Medium                       │
│   ├── Trees                    └── Hard                         │
│   ├── Dynamic Programming                                        │
│   ├── Graphs                                                     │
│   └── System Design                                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Practice Tracks

Pre-curated problem sets for specific company preparations:

| Track | Target | Problems |
|-------|--------|----------|
| TCS Ninja/Digital | Service-Based | 50 Easy-Medium DSA |
| Infosys Power Programmer | Service-Based | 60 Medium DSA |
| Amazon SDE | Product-Based | 100 Medium-Hard DSA |
| Google L3/L4 | FAANG | 150 Hard DSA + System Design |
| Goldman Sachs | Finance | DSA + Puzzles + SQL |
| Startup Ready | Quick Prep | 30 Must-Know Problems |

### 2.3 Mock Placement Tests

Full-fledged simulated interviews:

```
┌─────────────────────────────────────────────────────────────────┐
│                  MOCK PLACEMENT TEST                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Test Structure (TCS Style - 90 mins)                          │
│   ├── Section 1: Verbal (15 mins)                               │
│   ├── Section 2: Quantitative (20 mins)                         │
│   ├── Section 3: Logical Reasoning (20 mins)                    │
│   └── Section 4: Coding (35 mins - 2 problems)                  │
│                                                                  │
│   Test Structure (Amazon OA Style - 90 mins)                    │
│   ├── Section 1: Coding (70 mins - 2 problems)                  │
│   └── Section 2: Work Simulation (20 mins)                      │
│                                                                  │
│   Features:                                                      │
│   ├── Full-screen proctoring mode                               │
│   ├── Tab-switch detection                                      │
│   ├── Webcam monitoring (optional)                              │
│   ├── Detailed performance report                               │
│   └── Comparison with other test takers                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.4 Public Student Profiles

```
┌─────────────────────────────────────────────────────────────────┐
│  STUDENT PUBLIC PROFILE - /u/rahul-sharma                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   [Avatar]  Rahul Sharma                                        │
│             B.Tech CSE 2025 | AKTU University                   │
│             🏆 350 Problems Solved | ⭐ Level 42                 │
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │  CODING STATS                                           │   │
│   │  ├── Easy: 150 ✅  Medium: 150 ✅  Hard: 50 ✅          │   │
│   │  ├── Contest Rating: 1847 (Expert)                      │   │
│   │  └── Best Rank: #24 in Weekly Contest 45                │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │  COMPANY PREPARATION                                    │   │
│   │  ├── Amazon Track: 45/100 (45%)                        │   │
│   │  ├── Google Track: 30/150 (20%)                        │   │
│   │  └── TCS Track: 50/50 (100%) ✅                        │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │  ACADEMIC (visible if enabled)                          │   │
│   │  ├── CGPA: 8.5/10                                       │   │
│   │  ├── Current Semester: 6                                │   │
│   │  └── Skills: Python, JavaScript, SQL, React             │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │  BADGES                                                 │   │
│   │  🏅 100 Day Streak  🎯 DSA Master  🔥 Contest Winner    │   │
│   │  📚 Course Completer  ⚡ Speed Coder                    │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.5 TPO Dashboard (Training & Placement Officer)

```
For university placement cells:
├── View all students' placement readiness scores
├── Track company-wise preparation status
├── Generate reports for recruiters
├── Manage campus drive registrations
├── View mock test statistics
└── Export placement-ready student lists
```

### 2.6 Recruiter Dashboard

```
For companies hiring from platform:
├── Search students by skills, CGPA, problems solved
├── Filter by university, branch, graduation year
├── View detailed profiles with verified stats
├── Schedule coding assessments
├── Track application pipeline
└── Compare candidates side-by-side
```

---

## 3. Database Schema (New Tables)

### 3.1 Problems & Tags

```sql
-- Global Problems Pool
CREATE TABLE problems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title varchar(255) NOT NULL,
  slug varchar(100) UNIQUE NOT NULL,
  description text NOT NULL,
  difficulty varchar(20) CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  category varchar(50),                    -- DSA, SQL, System Design
  starter_code jsonb,                      -- {python: "", javascript: "", java: ""}
  solution_code jsonb,
  test_cases jsonb NOT NULL,
  hidden_test_cases jsonb,
  constraints text,
  hints jsonb DEFAULT '[]',
  time_limit_ms integer DEFAULT 2000,
  memory_limit_mb integer DEFAULT 256,
  acceptance_rate decimal(5,2) DEFAULT 0,
  total_submissions integer DEFAULT 0,
  total_accepted integer DEFAULT 0,
  is_premium boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Companies
CREATE TABLE companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(100) NOT NULL,
  slug varchar(50) UNIQUE NOT NULL,
  logo_url text,
  company_type varchar(50),                -- product/service/finance/startup
  difficulty_level varchar(20),            -- Easy/Medium/Hard
  avg_ctc varchar(50),                     -- "12-25 LPA"
  popular_roles text[],                    -- ["SDE", "Data Engineer"]
  hiring_process text,
  is_active boolean DEFAULT true,
  created_at timestamp DEFAULT now()
);

-- Topics
CREATE TABLE topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(100) NOT NULL,
  slug varchar(50) UNIQUE NOT NULL,
  category varchar(50),                    -- DSA, SQL, Web, System Design
  description text,
  icon varchar(50),
  order_index integer DEFAULT 0,
  is_active boolean DEFAULT true
);

-- Problem-Company Tags (Many-to-Many)
CREATE TABLE problem_company_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id uuid REFERENCES problems(id) ON DELETE CASCADE,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  frequency varchar(20) DEFAULT 'medium', -- low/medium/high/very_high
  last_asked date,
  created_at timestamp DEFAULT now(),
  UNIQUE(problem_id, company_id)
);

-- Problem-Topic Tags (Many-to-Many)
CREATE TABLE problem_topic_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id uuid REFERENCES problems(id) ON DELETE CASCADE,
  topic_id uuid REFERENCES topics(id) ON DELETE CASCADE,
  is_primary boolean DEFAULT false,
  created_at timestamp DEFAULT now(),
  UNIQUE(problem_id, topic_id)
);
```

### 3.2 Practice Tracks

```sql
-- Practice Tracks
CREATE TABLE practice_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(100) NOT NULL,
  slug varchar(50) UNIQUE NOT NULL,
  description text,
  target_company_id uuid REFERENCES companies(id),
  difficulty varchar(20),
  estimated_hours integer,
  problem_count integer DEFAULT 0,
  order_index integer DEFAULT 0,
  thumbnail_url text,
  is_premium boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamp DEFAULT now()
);

-- Track Problems (ordered)
CREATE TABLE track_problems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid REFERENCES practice_tracks(id) ON DELETE CASCADE,
  problem_id uuid REFERENCES problems(id) ON DELETE CASCADE,
  order_index integer NOT NULL,
  is_mandatory boolean DEFAULT true,
  created_at timestamp DEFAULT now(),
  UNIQUE(track_id, problem_id)
);

-- User Track Progress
CREATE TABLE user_track_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  track_id uuid REFERENCES practice_tracks(id) ON DELETE CASCADE,
  problems_completed integer DEFAULT 0,
  current_problem_index integer DEFAULT 0,
  started_at timestamp DEFAULT now(),
  completed_at timestamp,
  last_accessed timestamp DEFAULT now(),
  UNIQUE(user_id, track_id)
);
```

### 3.3 Problem Submissions & Stats

```sql
-- Problem Submissions
CREATE TABLE problem_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  problem_id uuid REFERENCES problems(id) ON DELETE CASCADE,
  code text NOT NULL,
  language varchar(20) NOT NULL,
  status varchar(20) NOT NULL,             -- accepted/wrong_answer/TLE/MLE/runtime_error
  runtime_ms integer,
  memory_kb integer,
  test_cases_passed integer DEFAULT 0,
  total_test_cases integer DEFAULT 0,
  error_message text,
  submitted_at timestamp DEFAULT now()
);

-- User Problem Stats (denormalized for quick access)
CREATE TABLE user_problem_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  easy_solved integer DEFAULT 0,
  medium_solved integer DEFAULT 0,
  hard_solved integer DEFAULT 0,
  total_solved integer DEFAULT 0,
  total_submissions integer DEFAULT 0,
  acceptance_rate decimal(5,2) DEFAULT 0,
  current_streak integer DEFAULT 0,
  max_streak integer DEFAULT 0,
  last_solved_at timestamp,
  updated_at timestamp DEFAULT now()
);

-- User Solved Problems (for tracking which problems solved)
CREATE TABLE user_solved_problems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  problem_id uuid REFERENCES problems(id) ON DELETE CASCADE,
  first_solved_at timestamp DEFAULT now(),
  best_runtime_ms integer,
  best_memory_kb integer,
  attempt_count integer DEFAULT 1,
  UNIQUE(user_id, problem_id)
);
```

### 3.4 Mock Tests

```sql
-- Mock Test Templates
CREATE TABLE mock_test_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(100) NOT NULL,
  slug varchar(50) UNIQUE NOT NULL,
  description text,
  company_style varchar(50),               -- TCS, Amazon, Google, Generic
  total_duration_minutes integer NOT NULL,
  sections jsonb NOT NULL,                 -- [{name, duration, question_count, type}]
  passing_score integer DEFAULT 60,
  is_premium boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamp DEFAULT now()
);

-- Mock Test Instances (user-specific)
CREATE TABLE mock_test_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  template_id uuid REFERENCES mock_test_templates(id) ON DELETE CASCADE,
  started_at timestamp DEFAULT now(),
  submitted_at timestamp,
  total_score decimal(5,2),
  section_scores jsonb,                    -- [{section, score, time_taken}]
  percentile decimal(5,2),
  proctoring_flags jsonb,                  -- {tab_switches, full_screen_exits}
  status varchar(20) DEFAULT 'in_progress',
  created_at timestamp DEFAULT now()
);

-- Mock Test Questions (generated per attempt)
CREATE TABLE mock_test_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid REFERENCES mock_test_attempts(id) ON DELETE CASCADE,
  section_index integer NOT NULL,
  question_index integer NOT NULL,
  question_type varchar(30) NOT NULL,      -- mcq/coding/verbal/quant/logical
  question_data jsonb NOT NULL,
  user_answer jsonb,
  is_correct boolean,
  points_earned decimal(5,2) DEFAULT 0,
  time_spent_seconds integer DEFAULT 0
);
```

### 3.5 Public Profiles & Recruiter Access

```sql
-- Public Profile Settings
CREATE TABLE public_profile_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  username varchar(50) UNIQUE,             -- For /u/username URL
  is_public boolean DEFAULT false,
  show_email boolean DEFAULT false,
  show_phone boolean DEFAULT false,
  show_academic boolean DEFAULT true,
  show_coding_stats boolean DEFAULT true,
  show_company_prep boolean DEFAULT true,
  bio text,
  linkedin_url text,
  github_url text,
  portfolio_url text,
  resume_url text,
  looking_for_opportunities boolean DEFAULT false,
  preferred_roles text[],
  preferred_locations text[],
  expected_ctc varchar(50),
  available_from date,
  updated_at timestamp DEFAULT now()
);

-- Recruiter Profiles
CREATE TABLE recruiter_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  company_name varchar(100) NOT NULL,
  company_id uuid REFERENCES companies(id),
  designation varchar(100),
  verified boolean DEFAULT false,
  verified_at timestamp,
  can_access_profiles boolean DEFAULT false,
  created_at timestamp DEFAULT now()
);

-- Profile Views (Analytics)
CREATE TABLE profile_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  viewer_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  viewer_type varchar(20),                 -- student/recruiter/anonymous
  viewed_at timestamp DEFAULT now()
);
```

### 3.6 TPO & Campus Drives

```sql
-- TPO (Training & Placement Officer) Profiles
CREATE TABLE tpo_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  designation varchar(100),
  is_primary boolean DEFAULT false,
  can_manage_drives boolean DEFAULT true,
  created_at timestamp DEFAULT now()
);

-- Campus Drives
CREATE TABLE campus_drives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  company_id uuid REFERENCES companies(id),
  title varchar(255) NOT NULL,
  description text,
  roles_offered text[],
  ctc_range varchar(100),
  eligibility_criteria jsonb,              -- {min_cgpa, allowed_branches, max_backlogs}
  registration_deadline timestamp,
  drive_date date,
  status varchar(20) DEFAULT 'upcoming',   -- upcoming/registration_open/ongoing/completed
  created_by uuid REFERENCES users(id),
  created_at timestamp DEFAULT now()
);

-- Drive Registrations
CREATE TABLE drive_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drive_id uuid REFERENCES campus_drives(id) ON DELETE CASCADE,
  student_id uuid REFERENCES users(id) ON DELETE CASCADE,
  status varchar(20) DEFAULT 'registered', -- registered/shortlisted/selected/rejected
  registered_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  UNIQUE(drive_id, student_id)
);
```

---

## 4. Pages & API Needed

### Student Pages (Global)

| Page | Purpose |
|------|---------|
| `/problems` | Browse all problems with filters |
| `/problems/[slug]` | Solve specific problem |
| `/tracks` | View all practice tracks |
| `/tracks/[slug]` | Track detail & progress |
| `/mock-tests` | Available mock tests |
| `/mock-tests/[id]` | Take mock test |
| `/mock-tests/[id]/results` | View results |
| `/profile/settings` | Public profile settings |
| `/u/[username]` | Public profile view |
| `/leaderboard` | Global rankings |
| `/campus-drives` | Available drives (if student) |

### TPO Pages

| Page | Purpose |
|------|---------|
| `/tpo/dashboard` | Overview stats |
| `/tpo/students` | All students with placement readiness |
| `/tpo/drives` | Manage campus drives |
| `/tpo/drives/create` | Create new drive |
| `/tpo/reports` | Generate reports |

### Recruiter Pages

| Page | Purpose |
|------|---------|
| `/recruiter/dashboard` | Overview |
| `/recruiter/search` | Search candidates |
| `/recruiter/shortlists` | Saved candidates |
| `/recruiter/assessments` | Create/manage assessments |

### API Routes

```
-- Problems
/api/problems                     - List problems with filters
/api/problems/[slug]              - Get problem details
/api/problems/[slug]/submit       - Submit solution
/api/problems/[slug]/submissions  - User's submissions for problem

-- Tracks
/api/tracks                       - List all tracks
/api/tracks/[slug]                - Track details with problems
/api/tracks/[slug]/progress       - User's progress in track

-- Mock Tests
/api/mock-tests                   - List available tests
/api/mock-tests/[id]/start        - Start a test
/api/mock-tests/[id]/submit       - Submit test
/api/mock-tests/[id]/results      - Get results

-- Profile
/api/profile/public               - Get/update public profile
/api/u/[username]                 - Get public profile by username
/api/profile/stats                - Get user stats

-- TPO
/api/tpo/students                 - Get org students
/api/tpo/drives                   - CRUD drives
/api/tpo/reports                  - Generate reports

-- Recruiter
/api/recruiter/search             - Search candidates
/api/recruiter/shortlist          - Manage shortlist
```

---

## 5. Key Features Summary

| Feature | Priority | Complexity |
|---------|----------|------------|
| Problems Pool with Company Tags | HIGH | Medium |
| Problem Solving Interface | HIGH | Medium |
| User Solved Stats | HIGH | Low |
| Practice Tracks | HIGH | Medium |
| Public Profiles | HIGH | Medium |
| Leaderboard | MEDIUM | Low |
| Mock Tests | MEDIUM | High |
| TPO Dashboard | MEDIUM | Medium |
| Recruiter Dashboard | LOW | High |
| Campus Drives | LOW | Medium |

---

## 6. Implementation Priority

### Phase 1: Core Problems (Week 1-2)
1. `problems` table + seeding 100 problems
2. `companies`, `topics` tables
3. Problem-company, problem-topic tagging
4. Problem solving page with Monaco editor
5. Submission tracking

### Phase 2: Progress & Stats (Week 3)
1. User stats tracking
2. User solved problems
3. Practice tracks
4. Track progress

### Phase 3: Social Features (Week 4)
1. Public profiles
2. Leaderboard
3. Profile views analytics

### Phase 4: Advanced Features (Week 5-6)
1. Mock tests
2. TPO dashboard
3. Campus drives

### Phase 5: Recruiter Features (Week 7-8)
1. Recruiter registration
2. Candidate search
3. Shortlisting

---

## 7. UI Integration Strategy

### Homepage Changes

```
Current: Generic coding platform landing
New: 
├── Hero: "From Learning to Placement"
├── Stats: Problems, Companies, Students Placed
├── Tracks showcase
├── Success stories
└── University partnerships
```

### Student Dashboard Changes

```
Current: Basic course progress
New:
├── Academic Progress (from ACADEMIC_SYSTEM)
├── Coding Stats Widget
│   ├── Problems solved (Easy/Med/Hard)
│   ├── Current streak
│   └── Contest rating
├── Track Progress Widget
├── Upcoming mock tests
└── Campus drives (if registered org)
```

### Navigation Changes

```
Add to main nav:
├── Problems (browse/solve)
├── Tracks (company preparation)
├── Contests (existing, enhanced)
├── Mock Tests (new)
└── Leaderboard (new)
```

---

## Summary

| Category | Existing | New |
|----------|----------|-----|
| **Tables** | contests, courses, lessons | 15 new tables |
| **Pages** | contests, courses | 12 new pages |
| **APIs** | 50+ routes | 20 new routes |

**Estimated Effort:** 6-8 weeks for full implementation

---

*Last Updated: February 13, 2026*
