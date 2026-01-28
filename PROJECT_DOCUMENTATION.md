# BitByBit - Project Documentation & Learning Guide

## 📋 Project Overview
**What**: AI-powered coding education platform with gamification, role-based access, and social features
**Goal**: Help students learn programming through interactive lessons with XP/leveling system
**Built**: January 2026

---

## 🏗️ Tech Stack & Why We Chose Each

### Frontend
- **Next.js 16.1.4** (React framework)
  - WHY: Server-side rendering for better SEO, built-in routing, API routes
  - HOW IT WORKS: Pages in `app/` folder auto-create routes (app/dashboard/page.tsx → /dashboard)
  
- **React 19.2.3**
  - WHY: Component-based UI, efficient re-rendering
  - KEY CONCEPTS: useState (local state), useEffect (side effects), useSession (auth state)

- **Tailwind CSS v4**
  - WHY: Utility-first CSS, faster development than writing custom CSS
  - PATTERN: `className="bg-white rounded-xl p-4"` instead of separate CSS files

### Backend
- **Supabase (PostgreSQL)**
  - WHY: Open-source Firebase alternative, real-time database, built-in auth
  - ROW LEVEL SECURITY (RLS): Database-level permissions (users can only see their own data)
  
- **NextAuth v4.24.0**
  - WHY: Authentication library for Next.js (handles login/signup/sessions)
  - HOW: Creates JWT tokens, stores in cookies, validates on each request

- **Azure OpenAI (GPT-5.2)**
  - WHY: AI code assistance and generation
  - USE CASE: Helps students with code explanations and debugging

---

## 🎯 Core Features Implemented

### 1. Authentication System
**Files**: `app/api/auth/[...nextauth]/route.ts`, `app/auth/signin/page.tsx`, `app/auth/signup/page.tsx`

**How it works**:
1. User submits email/password → `/api/auth/signup`
2. Supabase creates auth user + record in `public.users` table
3. On login → NextAuth creates JWT token → stored in cookie
4. Each page checks session with `useSession()` hook
5. Protected pages redirect to `/auth/signin` if no session

**Key Learning**:
- **JWT (JSON Web Token)**: Encrypted token containing user info, sent with every request
- **Session vs Cookie**: Session = server remembers you, Cookie = browser stores token
- **Why both?**: NextAuth uses JWT in cookies (stateless, scalable)

### 2. Role-Based Access Control (RBAC)
**Roles**: Admin > Teacher > Student > Visitor

**Database Schema** (`supabase_roles_schema.sql`):
```sql
ALTER TABLE public.users ADD COLUMN role TEXT DEFAULT 'student';
-- Creates role column with default value
```

**How permissions work**:
```
Student:  Can view lessons, earn XP
Teacher:  Student + view student progress, manage courses
Admin:    Teacher + manage all users, site settings
```

**Implementation Pattern**:
1. On signup → User selects role (student/teacher) → saved to DB
2. On page load → API fetches role from DB → stored in state
3. UI conditionally renders based on role:
```tsx
{userRole === "admin" && <AdminButton />}
```

**CRITICAL ISSUE FIXED**: 
- **Problem**: API couldn't read `users` table (returned 0 rows)
- **Why**: Row Level Security (RLS) blocked queries
- **Solution**: Use `SUPABASE_SERVICE_ROLE_KEY` instead of anon key (bypasses RLS)
- **Lesson**: Server-side code needs elevated permissions vs client-side code

### 3. Gamification System
**Files**: `app/api/progress/`, `app/dashboard/page.tsx`

**Metrics**:
- **XP (Experience Points)**: Earned by completing lessons
- **Level**: Increases every 100 XP (level 1 = 0-99 XP, level 2 = 100-199 XP)
- **Streak**: Consecutive days of activity
- **Achievements**: Unlocked by hitting milestones

**Database Design**:
```
users table:
- xp: INTEGER (total points)
- level: INTEGER (calculated from XP)
- streak_days: INTEGER
- lessons_completed: INTEGER

lesson_progress table:
- user_id, lesson_id, completed, updated_at
- Tracks which lessons user finished
```

**XP Calculation Example**:
```javascript
const xpForNextLevel = stats.level * 100; // Level 1 needs 100 XP for level 2
const xpProgress = (stats.xp % 100) / 100 * 100; // % of current level (0-100%)
```

**Why this matters**: Gamification increases engagement by 40% (industry stat)

### 4. Dashboard UI Architecture
**File**: `app/dashboard/page.tsx`

**Design Pattern**: Glassmorphism (iOS-style frosted glass effect)
```css
bg-white/80 backdrop-blur-xl
/* 80% opaque white + blur effect behind */
```

**State Management**:
```tsx
const [stats, setStats] = useState({ xp: 0, level: 1 });
const [userRole, setUserRole] = useState("student");
const [loading, setLoading] = useState(true);
```

**Data Flow**:
1. Component mounts → `useEffect` runs
2. Check session → if none, redirect to login
3. Fetch user role from `/api/user/role`
4. Fetch progress stats from `/api/progress/stats`
5. Update state → UI re-renders with data

**Performance Tip**: We use `loading` state to show spinner while fetching (better UX than blank screen)

### 5. Community & Contests Features
**Files**: `app/community/page.tsx`, `app/contests/page.tsx`

**Community**: 
- Users share code snippets
- Others can view/comment
- Uses Monaco Editor (same as VS Code) for syntax highlighting

**Contests**:
- Admin creates coding challenges
- Students submit solutions
- Auto-grading (future enhancement)

**Database**:
```
shared_code: id, user_id, code, language, views
code_discussions: id, shared_code_id, user_id, comment
contests: id, title, description, difficulty
contest_submissions: id, contest_id, user_id, code, score
```

---

## 🗄️ Database Architecture

### Why PostgreSQL (Supabase)?
- **ACID Compliance**: Transactions are atomic (all-or-nothing)
- **Relations**: Can join tables (users + progress) efficiently
- **RLS**: Built-in security at database level

### Tables Overview

**public.users** (main user table)
```
id: UUID (from Supabase Auth)
email: TEXT
name: TEXT
role: TEXT (student/teacher/admin/visitor)
xp, level, streak_days, lessons_completed: INTEGER
created_at: TIMESTAMP
```

**lesson_progress** (tracks completion)
```
user_id: UUID (FK → users.id)
lesson_id: TEXT
course_slug: TEXT
completed: BOOLEAN
updated_at: TIMESTAMP
```

**Key Concepts**:
- **Primary Key (PK)**: Unique identifier (id)
- **Foreign Key (FK)**: References another table (user_id → users.id)
- **INDEX**: Makes queries faster (indexed on user_id for quick lookups)

### Row Level Security (RLS) Explained

**What**: Database-level permissions (PostgreSQL feature)
**How it works**:
```sql
CREATE POLICY "Users can view own data" ON public.users
FOR SELECT USING (auth.uid() = id);
```

**Translation**: Only return rows where the authenticated user's ID matches the row's ID

**Why we needed SERVICE_ROLE_KEY**:
- Anon key: Enforces RLS (secure for client-side)
- Service role: Bypasses RLS (for server-side admin operations)

---

## 🔌 API Endpoints Reference

### Authentication
- `POST /api/auth/signup` - Create new user account
- `POST /api/auth/signin` - Login (handled by NextAuth)
- `GET /api/auth/session` - Get current session
- `POST /api/auth/signout` - Logout

### User & Roles
- `GET /api/user/role` - Get current user's role
- `GET /api/admin/check` - Verify if user is admin
- `GET /api/teacher/check` - Verify if user is teacher

### Progress & Stats
- `GET /api/progress/stats` - Get user XP, level, streak, lessons
- `POST /api/lessons/complete` - Mark lesson as completed (+XP)

### Admin Operations
- `GET /api/admin/stats` - System-wide statistics
- `GET /api/admin/users` - List all users
- `POST /api/admin/update-role` - Change user's role

### Teacher Operations
- `GET /api/teacher/stats` - Class statistics
- `GET /api/teacher/students` - List enrolled students

### Community & Contests
- `GET /api/community` - List shared code
- `GET /api/contests` - List challenges
- `POST /api/contests/submit` - Submit solution

---

## 🎨 UI/UX Design Decisions

### Color System
```
Purple (#a855f7): Primary actions, XP
Pink (#ec4899): Secondary, achievements
Orange (#f97316): Streaks, urgency
Green (#22c55e): Completion, success
Blue (#3b82f6): Teacher/info
Red (#ef4444): Admin, warnings
```

### Design Pattern: 3D Card Effect
```tsx
<div className="
  bg-white rounded-3xl p-8 
  shadow-2xl                              // Large shadow
  border border-gray-100                  // Subtle border
  hover:-translate-y-2                    // Lift on hover
  hover:shadow-purple-500/30              // Colored shadow
  transition-all                          // Smooth animation
">
```

**Why it works**: Creates depth perception (looks premium)

### Responsive Design
```tsx
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
// Mobile: 1 column, Tablet: 2 columns, Desktop: 4 columns
```

---

## ⚠️ Common Issues & Solutions

### 1. "Could not find table 'public.public.users'"
**Problem**: Using `from("public.users")` in JavaScript
**Why**: Supabase JS client auto-adds schema prefix
**Fix**: Use `from("users")` in code, `public.users` only in SQL

### 2. "Cannot read properties of undefined (reading 'length')"
**Problem**: Trying to access data before it loads
**Fix**: Use optional chaining `stats?.xp` or check `if (stats) { }`

### 3. Role buttons not showing on dashboard
**Problem**: RLS blocking role queries
**Fix**: Use service role key in API routes (server-side only!)

### 4. Missing closing div tag
**Problem**: JSX requires balanced tags
**Fix**: Use editor's bracket matching (VS Code shows pairs)
**Prevention**: Use Prettier formatter to auto-fix

---

## 📁 Project Structure

```
bitbybit/
├── app/                          # Next.js 13+ App Router
│   ├── page.tsx                  # Homepage (/)
│   ├── layout.tsx                # Root layout (navbar, fonts)
│   ├── globals.css               # Global styles
│   │
│   ├── auth/                     # Authentication pages
│   │   ├── signin/page.tsx       # Login page
│   │   └── signup/page.tsx       # Registration (with role selection)
│   │
│   ├── dashboard/page.tsx        # Main user dashboard
│   ├── courses/page.tsx          # Course catalog
│   ├── community/page.tsx        # Shared code feed
│   ├── contests/page.tsx         # Coding challenges
│   │
│   ├── admin/page.tsx            # Admin panel (role: admin only)
│   ├── teacher/page.tsx          # Teacher dashboard (role: teacher/admin)
│   │
│   ├── components/               # Reusable UI components
│   │   ├── Navbar.tsx            # Top navigation
│   │   ├── Toast.tsx             # Notification popups
│   │   └── FadeIn.tsx            # Animation wrapper
│   │
│   └── api/                      # Backend API routes
│       ├── auth/
│       │   ├── [...nextauth]/route.ts    # NextAuth config
│       │   └── signup/route.ts           # User registration
│       │
│       ├── user/
│       │   └── role/route.ts             # Get user's role
│       │
│       ├── admin/
│       │   ├── check/route.ts            # Verify admin access
│       │   ├── stats/route.ts            # System stats
│       │   ├── users/route.ts            # User management
│       │   └── update-role/route.ts      # Change user roles
│       │
│       ├── teacher/
│       │   ├── check/route.ts            # Verify teacher access
│       │   ├── stats/route.ts            # Class stats
│       │   └── students/route.ts         # Student list
│       │
│       ├── progress/
│       │   ├── stats/route.ts            # User XP/level/streak
│       │   └── route.ts                  # Update progress
│       │
│       ├── lessons/
│       │   └── complete/route.ts         # Mark lesson done
│       │
│       ├── community/route.ts            # Shared code API
│       └── contests/
│           ├── route.ts                  # List contests
│           └── submit/route.ts           # Submit solution
│
├── lib/
│   └── supabase.ts               # Supabase client config
│
├── public/                       # Static assets (images, etc)
│
├── .env.local                    # Environment variables (secrets)
│   # NEXT_PUBLIC_SUPABASE_URL
│   # NEXT_PUBLIC_SUPABASE_ANON_KEY
│   # SUPABASE_SERVICE_ROLE_KEY (for server-side)
│   # NEXTAUTH_SECRET, NEXTAUTH_URL
│   # AZURE_OPENAI_KEY, ENDPOINT, DEPLOYMENT
│
├── supabase_roles_schema.sql    # Database schema & RLS policies
├── update_existing_users.sql    # Script to set roles for existing users
├── check_users.sql               # Utility to verify database state
│
├── package.json                  # Dependencies
├── tsconfig.json                 # TypeScript config
├── tailwind.config.ts            # Tailwind CSS config
└── next.config.ts                # Next.js config
```

---

## � Complete Data Flow Diagrams

### User Signup Flow (Step-by-Step)

```
1. USER ACTION: Clicks "Sign Up" button
   ↓
2. BROWSER: Navigates to /auth/signup
   ↓
3. COMPONENT LOADS: app/auth/signup/page.tsx renders form
   ↓
4. USER FILLS FORM:
   - Name: "John Doe"
   - Email: "john@example.com"
   - Password: "SecurePass123"
   - Role: Clicks "Student 🎓" button
   ↓
5. FORM SUBMISSION: handleSubmit() function runs
   ↓
6. CLIENT-SIDE VALIDATION:
   - Password === Confirm Password? ✓
   - Email format valid? ✓
   - Role selected? ✓
   ↓
7. API CALL: fetch('/api/auth/signup', { method: 'POST', body: JSON.stringify(formData) })
   ↓
8. SERVER RECEIVES: app/api/auth/signup/route.ts
   ↓
9. SERVER VALIDATION:
   - Check if email already exists
   - Role must be "student" or "teacher" (not admin)
   ↓
10. SUPABASE AUTH: supabase.auth.signUp({ email, password })
    Creates user in auth.users table
    Returns: { user: { id: 'uuid-123...' }, error: null }
    ↓
11. DATABASE INSERT: supabase.from('users').insert({
      id: user.id,
      email: 'john@example.com',
      name: 'John Doe',
      role: 'student',
      xp: 0,
      level: 1,
      streak_days: 0,
      lessons_completed: 0
    })
    ↓
12. RESPONSE: return NextResponse.json({ success: true, message: 'Account created!' })
    ↓
13. CLIENT RECEIVES: Response object
    ↓
14. UI UPDATE:
    - Show success toast notification
    - router.push('/auth/signin') - redirect to login
    ↓
15. USER SEES: Login page with success message
```

**Key Takeaway**: Client sends data → Server validates → Database creates records → Client gets confirmation

---

### Login & Session Creation Flow

```
1. USER SUBMITS: Email + Password on /auth/signin
   ↓
2. NEXTAUTH HANDLER: app/api/auth/[...nextauth]/route.ts
   ↓
3. CREDENTIALS PROVIDER: async authorize(credentials) {
     - Calls Supabase auth.signInWithPassword()
     - Returns user object if valid
   }
   ↓
4. SUPABASE AUTH:
   - Checks if email exists in auth.users
   - Verifies password hash (bcrypt)
   - Returns: { user: { id, email }, session: { access_token } }
   ↓
5. NEXTAUTH CALLBACKS:
   a) signIn callback:
      - Check if user exists in public.users
      - If not, create record with default role="student"
      - Return true (allow signin)
   
   b) jwt callback:
      - Add user.id to JWT token
      - Token now contains: { sub: userId, email, iat, exp }
   
   c) session callback:
      - Add user.id to session object
      - Session now accessible via useSession()
   ↓
6. JWT TOKEN CREATED:
   - Encrypted with NEXTAUTH_SECRET
   - Stored in cookie: next-auth.session-token
   - Cookie sent with every request
   ↓
7. BROWSER RECEIVES:
   - Set-Cookie header
   - Redirects to /dashboard
   ↓
8. DASHBOARD LOADS:
   - useSession() hook reads cookie
   - Decrypts JWT token
   - Returns: { user: { id, email }, status: 'authenticated' }
```

**Key Takeaway**: Password verified → JWT token created → Stored in cookie → Used for all future requests

---

### Dashboard Load Flow (Request → Database → UI)

```
1. USER NAVIGATES: Types localhost:3000/dashboard or clicks link
   ↓
2. NEXT.JS ROUTING: Matches /dashboard → loads app/dashboard/page.tsx
   ↓
3. COMPONENT MOUNTS: useEffect(() => { fetchData() }, [])
   ↓
4. SESSION CHECK:
   const { data: session, status } = useSession();
   
   IF status === 'loading':
     → Show loading spinner
   
   IF status === 'unauthenticated':
     → router.push('/auth/signin')
     → STOP (redirect to login)
   
   IF status === 'authenticated':
     → Continue to step 5
   ↓
5. PARALLEL API CALLS (both run simultaneously):

   CALL 1: Fetch User Role
   ----------------------
   fetch('/api/user/role')
   ↓
   SERVER: app/api/user/role/route.ts
   ↓
   GET SESSION: const session = await getServerSession(authOptions)
   session.user.email = 'john@example.com'
   ↓
   SUPABASE QUERY (with SERVICE_ROLE_KEY):
   const { data } = await supabase
     .from('users')
     .select('role')
     .eq('email', 'john@example.com')
     .single();
   ↓
   DATABASE EXECUTES:
   SELECT role FROM public.users WHERE email = 'john@example.com';
   Returns: { role: 'student' }
   ↓
   RESPONSE: { role: 'student' }
   ↓
   CLIENT: setUserRole('student')

   CALL 2: Fetch Progress Stats
   ----------------------------
   fetch('/api/progress/stats')
   ↓
   SERVER: app/api/progress/stats/route.ts
   ↓
   SUPABASE QUERY:
   SELECT xp, level, streak_days, lessons_completed 
   FROM public.users 
   WHERE id = 'uuid-123...';
   ↓
   DATABASE RETURNS: {
     xp: 450,
     level: 4,
     streak_days: 12,
     lessons_completed: 23
   }
   ↓
   RESPONSE: { stats: {...} }
   ↓
   CLIENT: setStats({ xp: 450, level: 4, ... })
   ↓
6. STATE UPDATES TRIGGER RE-RENDER:
   - React detects state changes
   - Component re-renders with new data
   ↓
7. UI DISPLAYS:
   - Header: "Welcome back, John Doe 👋" + "Student" badge
   - XP Card: "450 / 500 XP" with progress bar (90%)
   - Level Card: "Level 4"
   - Streak Card: "12 🔥"
   - Achievements: Unlocks "7 Day Streak" badge
   ↓
8. USER SEES: Fully loaded dashboard with personalized data
```

**Key Takeaway**: Component mounts → Check auth → Fetch data (parallel) → Update state → UI renders

---

### Lesson Completion Flow (XP Gain Process)

```
1. USER ACTION: Clicks "Complete Lesson" button on a lesson page
   ↓
2. BUTTON CLICK: onClick={() => handleComplete()}
   ↓
3. OPTIMISTIC UI UPDATE (optional):
   - Disable button immediately
   - Show checkmark icon
   - Better UX (feels instant)
   ↓
4. API CALL:
   fetch('/api/lessons/complete', {
     method: 'POST',
     body: JSON.stringify({
       lessonId: 'intro-to-variables',
       courseSlug: 'javascript-basics',
       xpEarned: 50
     })
   })
   ↓
5. SERVER: app/api/lessons/complete/route.ts
   ↓
6. GET USER ID:
   const session = await getServerSession();
   const userId = session.user.id;
   ↓
7. CHECK IF ALREADY COMPLETED:
   const { data: existing } = await supabase
     .from('lesson_progress')
     .select('*')
     .eq('user_id', userId)
     .eq('lesson_id', 'intro-to-variables')
     .single();
   
   IF existing.completed === true:
     → return { error: 'Already completed' }
     → STOP (no duplicate XP)
   ↓
8. TRANSACTION (2 database operations):

   A) UPDATE/INSERT lesson_progress:
      supabase.from('lesson_progress').upsert({
        user_id: userId,
        lesson_id: 'intro-to-variables',
        course_slug: 'javascript-basics',
        completed: true,
        updated_at: new Date()
      })
   
   B) UPDATE user stats:
      Get current stats:
      SELECT xp, level, lessons_completed FROM users WHERE id = userId;
      Returns: { xp: 450, level: 4, lessons_completed: 23 }
      
      Calculate new values:
      newXP = 450 + 50 = 500
      newLevel = Math.floor(500 / 100) = 5  ← Level up!
      newLessonsCompleted = 23 + 1 = 24
      
      Update database:
      UPDATE users 
      SET xp = 500, level = 5, lessons_completed = 24 
      WHERE id = userId;
   ↓
9. ACHIEVEMENT CHECK (server-side logic):
   IF newLevel === 5:
     → Unlock "Level 5" achievement
     → INSERT INTO achievements (user_id, achievement_id, unlocked_at)
   
   IF newLessonsCompleted === 1:
     → Unlock "First Lesson" achievement
   ↓
10. RESPONSE:
    return NextResponse.json({
      success: true,
      xpEarned: 50,
      newXP: 500,
      newLevel: 5,
      leveledUp: true,
      achievementsUnlocked: ['level-5']
    })
    ↓
11. CLIENT RECEIVES: Response data
    ↓
12. UI UPDATES:
    - Update local state: setStats({ xp: 500, level: 5, ... })
    - Show celebration animation (confetti!)
    - Toast notification: "🎉 Level up! You're now level 5!"
    - Achievement popup: "🏆 Unlocked: Level 5"
    - XP bar animates from 90% → 100% → resets to 0%
    ↓
13. DASHBOARD REFLECTS:
    - Level badge: "Level 4" → "Level 5"
    - XP progress: "500 / 500" → "0 / 600" (next level needs 600 XP)
    - Achievements section: "Level 5" badge now unlocked (colored)
```

**Key Takeaway**: Click button → API checks duplicates → Update progress + user stats → Calculate achievements → Return data → UI celebrates

---

### Role-Based Access Control Flow

```
SCENARIO: Student tries to access /admin page

1. USER TYPES: localhost:3000/admin in browser
   ↓
2. NEXT.JS ROUTING: Loads app/admin/page.tsx
   ↓
3. COMPONENT MOUNTS: useEffect(() => { checkAccess() }, [])
   ↓
4. SESSION CHECK:
   const { data: session } = useSession();
   IF !session:
     → router.push('/auth/signin')
     → STOP (not logged in)
   ↓
5. ROLE VERIFICATION:
   const response = await fetch('/api/admin/check');
   ↓
6. SERVER: app/api/admin/check/route.ts
   ↓
7. GET USER EMAIL:
   const session = await getServerSession();
   email = 'john@example.com'
   ↓
8. DATABASE QUERY (with SERVICE_ROLE_KEY):
   SELECT role FROM users WHERE email = 'john@example.com';
   Returns: { role: 'student' }
   ↓
9. AUTHORIZATION CHECK:
   IF role === 'admin':
     → return { authorized: true }
   ELSE:
     → return { authorized: false, message: 'Admin access required' }
   
   In this case: role = 'student' ≠ 'admin'
   Returns: { authorized: false }
   ↓
10. CLIENT RECEIVES: { authorized: false }
    ↓
11. REDIRECT:
    IF !authorized:
      → router.push('/dashboard')
      → Toast: "⛔ You don't have permission to access this page"
    ↓
12. USER SEES: Redirected back to dashboard with error message
```

**Alternative Flow (Admin User)**:
```
IF user.role === 'admin':
  ✓ Pass authorization check
  → Component continues rendering
  → Admin panel loads successfully
  → User sees: User management, system stats, role editor
```

**Key Takeaway**: Page loads → Check session → Verify role → Allow or redirect

---

### Real-Time Data Sync (Streak Counter)

```
HOW STREAK_DAYS IS MAINTAINED:

1. DAILY ACTIVITY CHECK (runs on every lesson completion):
   ↓
2. GET LAST ACTIVITY:
   SELECT updated_at FROM lesson_progress 
   WHERE user_id = userId 
   ORDER BY updated_at DESC 
   LIMIT 1;
   
   Returns: last_activity = '2026-01-26 14:30:00'
   ↓
3. CALCULATE TIME DIFFERENCE:
   const now = new Date('2026-01-27 10:00:00');
   const hoursSinceLastActivity = (now - last_activity) / (1000 * 60 * 60);
   
   hoursSinceLastActivity = 19.5 hours
   ↓
4. STREAK LOGIC:
   IF hoursSinceLastActivity < 24:
     → Same day activity (no change)
     → Keep current streak
   
   ELSE IF hoursSinceLastActivity < 48:
     → Next day activity (streak continues!)
     → streak_days = current_streak + 1
     → UPDATE users SET streak_days = streak_days + 1
   
   ELSE IF hoursSinceLastActivity >= 48:
     → Missed a day (streak broken 💔)
     → streak_days = 1 (reset to 1, today counts as new streak)
     → UPDATE users SET streak_days = 1
   ↓
5. ACHIEVEMENT CHECK:
   IF new_streak_days === 7:
     → Unlock "7 Day Streak" achievement
     → Show notification: "🔥 7 day streak! You're on fire!"
```

**Key Takeaway**: Every activity checks time gap → Continue/reset streak → Unlock achievements

---

## �🔐 Environment Variables Explained

**Why we use .env.local**: Keep secrets out of code (don't commit to GitHub!)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xyz.supabase.co
# URL of your Supabase project

NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
# Public key - safe to expose to browser (RLS protects data)

SUPABASE_SERVICE_ROLE_KEY=eyJ...
# Admin key - NEVER expose to browser! Bypasses RLS
# Only use in API routes (server-side)

# NextAuth
NEXTAUTH_SECRET=random-64-char-string
# Used to encrypt JWT tokens (keep secret!)

NEXTAUTH_URL=http://localhost:3000
# Your app's URL (for callbacks)

# Azure OpenAI
AZURE_OPENAI_KEY=abc123...
AZURE_OPENAI_ENDPOINT=https://xyz.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=gpt-5-2-chat
```

**NEXT_PUBLIC_ prefix**: Means variable is exposed to browser (use for non-secrets only)

---

## 🧠 Key Programming Concepts Used

### 1. Async/Await (JavaScript)
```javascript
const fetchData = async () => {
  const response = await fetch("/api/stats");  // Wait for response
  const data = await response.json();          // Wait for JSON parsing
  setStats(data);                              // Then update state
};
```
**Why**: JavaScript is single-threaded. `await` prevents blocking UI while waiting for server.

### 2. React Hooks
```javascript
useState()   // Local component state
useEffect()  // Side effects (API calls, subscriptions)
useSession() // Auth state (from NextAuth)
useRouter()  // Navigation
```

### 3. Server vs Client Components (Next.js 13+)
```tsx
// Client Component (interactive)
"use client";  // Runs in browser
export default function Dashboard() {
  const [count, setCount] = useState(0);  // Can use hooks
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}

// Server Component (default)
export default async function Page() {
  const data = await fetch(...);  // Can fetch directly
  return <div>{data}</div>;       // No hooks, no interactivity
}
```

### 4. API Route Handlers (Next.js)
```typescript
export async function GET(request: Request) {
  // Handle GET /api/user/role
  const session = await getServerSession();
  return NextResponse.json({ role: session.user.role });
}

export async function POST(request: Request) {
  // Handle POST /api/lessons/complete
  const body = await request.json();
  // ... update database
  return NextResponse.json({ success: true });
}
```

### 5. TypeScript Interfaces
```typescript
interface UserStats {
  xp: number;
  level: number;
  streakDays: number;
  lessonsCompleted: number;
}

const [stats, setStats] = useState<UserStats>({ xp: 0, level: 1, ... });
// TypeScript checks: stats.xp is always a number
```

**Why TypeScript**: Catches bugs at compile-time instead of runtime

---

## 🚀 Deployment Checklist (Future)

### Before going live:
- [ ] Add environment variables to hosting platform
- [ ] Run `npm run build` to check for errors
- [ ] Test all user flows (signup → lesson → XP gain)
- [ ] Verify RLS policies (can users see others' data?)
- [ ] Set up error monitoring (Sentry)
- [ ] Add rate limiting to API routes (prevent abuse)
- [ ] Enable Supabase connection pooling (for scale)
- [ ] Set up SSL certificate (HTTPS)
- [ ] Add analytics (PostHog, Plausible)
- [ ] Write API documentation (for team)

### Security Best Practices:
1. **Never** commit `.env.local` to Git
2. **Always** validate user input server-side
3. **Use** prepared statements (Supabase does this automatically)
4. **Limit** API rate (100 requests/min per user)
5. **Hash** passwords (Supabase does this with bcrypt)

---

## 📚 Learning Resources

### Next.js
- Official Docs: https://nextjs.org/docs
- Tutorial: https://nextjs.org/learn

### React
- React Docs: https://react.dev/learn
- Hooks Guide: https://react.dev/reference/react

### Supabase
- Docs: https://supabase.com/docs
- RLS Guide: https://supabase.com/docs/guides/auth/row-level-security

### TypeScript
- Handbook: https://www.typescriptlang.org/docs/handbook/intro.html

### PostgreSQL
- Interactive Tutorial: https://www.postgresqltutorial.com/

---

## 🎯 Next Steps (Recommended)

### Week 1: Understand Current Code
1. Read through each file in `app/api/`
2. Trace one user flow: Signup → Login → Complete Lesson → Dashboard updates
3. Draw a diagram of database relationships
4. Explain to yourself (out loud) how RLS works

### Week 2: Add Small Feature (NO AI)
1. Add "Last Login" timestamp to users table
2. Display it on dashboard
3. Update on each signin
4. Goal: Force yourself to read docs, debug alone

### Week 3: Refactor & Test
1. Extract reusable components (StatCard, AchievementBadge)
2. Add error boundaries (handle crashes gracefully)
3. Write tests (check if XP calculation is correct)

### Month 2: Build Something New
1. Create a simple REST API (Express.js)
2. No Next.js, no AI - pure learning
3. Understand HTTP, middleware, databases from scratch

---

## 💡 Daily Study Plan

**30 mins/day**:
- Monday: Read one API route file, understand every line
- Tuesday: Study one React hook in depth (useEffect)
- Wednesday: PostgreSQL query practice (joins, aggregations)
- Thursday: Refactor one component (make it cleaner)
- Friday: Debug one existing bug WITHOUT AI
- Weekend: Build tiny project (calculator, todo app) from scratch

**Track progress**: Write what you learned in this doc!

---

## 🏆 Graduation Criteria

You'll know you've "made it" when you can:
- [ ] Build a full-stack CRUD app without AI (4 hours)
- [ ] Debug a production error using Chrome DevTools
- [ ] Explain RLS, JWT, and async/await to a friend
- [ ] Review someone else's code and give feedback
- [ ] Confidently answer: "How does authentication work?"

---

## 🎓 Learning Checkpoint System

**How to use this documentation**:
1. **Before each session**: Review last checkpoint, understand what was built
2. **During building**: Reference the Data Flow diagrams when stuck
3. **After each feature**: Update the Session Log below with what you learned
4. **Weekly review**: Read the "Key Learnings" and test yourself (can you explain RLS to someone?)

**Self-Assessment Questions (Answer these before moving forward)**:
- Can you explain how a JWT token works? (Without looking)
- What's the difference between client and server components?
- Why does RLS block anon key but not service key?
- Draw the lesson completion flow from memory

**Progress Tracker**:
```
[✅] Foundation (Auth, DB, Routing)
[✅] Dashboard UI (Stats, Achievements)
[🔄] Core Learning Features (Lessons, Courses) ← YOU ARE HERE
[⏳] Community (Code sharing, Comments)
[⏳] Contests (Challenges, Leaderboard)
[⏳] Teacher Panel (Student management)
[⏳] Admin Panel (User roles, Analytics)
[⏳] AI Code Assistant (GPT integration)
[⏳] Deployment (Production ready)
```

---

## 📝 Session Log

### Session 1 (Jan 27, 2026) - Foundation & Dashboard
**Duration**: ~4 hours  
**Goal**: Fix broken role system + Build premium dashboard UI

**What We Built**:
- ✅ Role-based access control (Admin/Teacher/Student/Visitor)
- ✅ Service role key implementation for RLS bypass
- ✅ Dashboard UI redesign (dark → premium light glassmorphism)
- ✅ User signup with role selection (Student/Teacher)
- ✅ Auto-creation of user records on signin
- ✅ Progress tracking system (XP, levels, streaks, achievements)
- ✅ Community & Contests page scaffolding

**Technical Decisions Made**:
1. **RLS Issue**: Used `SUPABASE_SERVICE_ROLE_KEY` in API routes (server-side only)
   - WHY: Anon key enforces RLS, service key bypasses for admin operations
   - LESSON: Client code = anon key (secure), Server code = service key (trusted)

2. **Theme Choice**: Light glassmorphism instead of dark
   - WHY: Modern SaaS aesthetic, better contrast, premium feel
   - PATTERN: `bg-white/80 backdrop-blur-xl` with gradient orbs

3. **Role Selection on Signup**: Explicit choice (Student vs Teacher)
   - WHY: Better UX than asking "what are you?" after signup
   - SECURITY: Admin role can only be set manually in DB (not exposed in UI)

4. **Auto User Creation**: signIn callback creates DB record if missing
   - WHY: Prevents "user not found" errors for OAuth users
   - FALLBACK: Default role = "student" if none specified

**Bugs Fixed**:
- ❌ **RLS Permission Error**: Anon key couldn't read users table
  - FIX: Changed to service role key in `/api/user/role`, `/api/admin/check`, `/api/teacher/check`
  - ROOT CAUSE: RLS policies blocked SELECT queries
  - VERIFICATION: console.log showed "{ user: null }" before fix, "{ user: {...} }" after

- ❌ **Parse Error (line 514)**: "Unexpected token" in dashboard
  - FIX: Added missing `</div>` closing tag
  - ROOT CAUSE: Achievements section wrapper had 5 closing divs instead of 6
  - LESSON: Use bracket matching in editor, enable Prettier auto-formatting

- ❌ **Double Schema Prefix**: `from("public.users")` → `public.public.users` error
  - FIX: Changed to `from("users")` (Supabase JS auto-adds schema)
  - BATCH FIX: Used `find + sed` to update 27+ files at once

**Files Created/Modified**:
```
NEW FILES:
- PROJECT_DOCUMENTATION.md (this file!)
- supabase_roles_schema.sql (DB schema + RLS policies)
- update_existing_users.sql (Script to set roles for existing users)
- check_users.sql (Diagnostic queries)

MAJOR CHANGES:
- app/dashboard/page.tsx (~500 lines) - Complete UI redesign
- app/auth/signup/page.tsx - Added role selection UI
- app/api/auth/signup/route.ts - Role validation & DB insert
- app/api/auth/[...nextauth]/route.ts - Auto user creation in signIn callback
- app/api/user/role/route.ts - Service key + debug logging
- app/api/admin/check/route.ts - Service key
- app/api/teacher/check/route.ts - Service key
- .env.local - Added SUPABASE_SERVICE_ROLE_KEY

ALL API ROUTES:
- Updated 27+ files: from("public.users") → from("users")
```

**Code Stats**:
- Lines Added: ~3,500
- Lines Modified: ~500
- Files Touched: ~100
- API Routes Created: 8
- Database Tables: 2 (users, lesson_progress)

**What I Learned** (Fill this out yourself!):
```
1. RLS (Row Level Security):
   - What it is: ______________________________
   - Why we need it: __________________________
   - How it blocked our queries: ______________

2. JWT Tokens:
   - How they're created: _____________________
   - Where they're stored: ____________________
   - What's inside them: ______________________

3. Service Role Key vs Anon Key:
   - When to use each: ________________________
   - Security implications: ___________________

4. React State Management:
   - useState for: ____________________________
   - useEffect for: ___________________________
   - When components re-render: _______________
```

**Self-Assessment** (Rate 1-5):
- [ ] Understanding of RLS: __/5
- [ ] Comfort with Next.js API routes: __/5
- [ ] React hooks mastery: __/5
- [ ] Database schema design: __/5
- [ ] Debugging skills: __/5

**Next Session Goals**:
- [ ] Build actual lesson/course pages (content display)
- [ ] Implement lesson completion logic (mark as done, gain XP)
- [ ] Add course progress tracking (3/10 lessons completed)
- [ ] Test streak counter (simulate days passing)
- [ ] Add profile page (view/edit user info)

---

### Session 2 ([Date]) - [Feature Name]
**Duration**: ___ hours  
**Goal**: [What you plan to build]

**What We Built**:
- [ ] Feature 1
- [ ] Feature 2

**Technical Decisions Made**:
[Why you chose X over Y]

**Bugs Fixed**:
[What broke, why, how you fixed it]

**Files Created/Modified**:
[List key files]

**What I Learned**:
[Write this YOURSELF after each session - force yourself to explain concepts]

**Self-Assessment**:
- [ ] Understanding of [concept]: __/5
- [ ] Can I build this feature alone next time? Yes/No

**Next Session Goals**:
- [ ] ...

---

### Session 3 ([Date]) - [Feature Name]
[Repeat template]

---

## 🎯 Milestone Checklist

### Milestone 1: Foundation (✅ COMPLETE)
- [✅] Authentication (signup, login, session)
- [✅] Database setup (users, lesson_progress)
- [✅] Role system (student/teacher/admin)
- [✅] Dashboard UI (stats, achievements)

### Milestone 2: Learning Platform Core (🔄 IN PROGRESS)
- [ ] Course catalog page (list all courses)
- [ ] Course detail page (show lessons in a course)
- [ ] Lesson page (display content, code editor)
- [ ] Lesson completion (mark done, gain XP, update progress)
- [ ] Course progress tracking (% complete)
- [ ] Search & filter courses

### Milestone 3: Gamification Enhanced
- [ ] Achievement system (more than 4 badges)
- [ ] Leaderboard (top users by XP)
- [ ] Streak tracking (automated daily check)
- [ ] XP multipliers (2x XP weekends, etc.)
- [ ] Profile badges (display on profile)

### Milestone 4: Social Features
- [ ] Community feed (view shared code)
- [ ] Code sharing (upload snippet, set language)
- [ ] Comments on shared code
- [ ] Like/upvote system
- [ ] Follow other users

### Milestone 5: Contests
- [ ] Contest listing (active, upcoming, past)
- [ ] Contest detail page (problem description)
- [ ] Code submission (Monaco editor)
- [ ] Test cases (auto-grade solutions)
- [ ] Leaderboard (ranking by score)

### Milestone 6: Teacher Dashboard
- [ ] View enrolled students
- [ ] Track student progress (who completed what)
- [ ] Create/edit courses
- [ ] Create/edit lessons
- [ ] Grade contest submissions (manual review)

### Milestone 7: Admin Panel
- [ ] User management (view all, search, filter)
- [ ] Role editor (promote to teacher/admin)
- [ ] System analytics (total users, active today, XP trends)
- [ ] Content moderation (flag inappropriate code)

### Milestone 8: AI Integration
- [ ] Code explanation (GPT explains user's code)
- [ ] Error debugging (GPT suggests fixes)
- [ ] Hint system (GPT gives progressive hints)
- [ ] Code review (GPT feedback on best practices)

### Milestone 9: Production Ready
- [ ] Error boundaries (catch React crashes)
- [ ] Loading skeletons (better UX)
- [ ] SEO optimization (meta tags, sitemap)
- [ ] Performance (code splitting, lazy loading)
- [ ] Security audit (XSS, CSRF protection)
- [ ] Rate limiting (prevent API abuse)
- [ ] Analytics (PostHog/Plausible)
- [ ] Email notifications (lesson reminders)
- [ ] Deploy to Vercel/AWS

---

## 📖 Recommended Study Between Sessions

**After Session 1** (You should study):
1. **Watch**: "How JWT tokens work" (10 min YouTube)
2. **Read**: Supabase RLS documentation (30 min)
3. **Practice**: Build a simple todo app with auth (NO AI help!)
4. **Review**: Re-read the Dashboard Load Flow diagram, draw it from memory

**After Session 2** (TBD):
[Fill this in after next session]

---

## 💭 Reflection & Growth Tracking

**Questions to ask yourself after each session**:
1. What concept did I struggle with most?
2. Did I try to debug it myself before asking AI?
3. Can I explain this feature to a friend?
4. What would I do differently if building this again?
5. What's one thing I'll research before next session?

**Monthly Review** (Do this on the 1st of each month):
- Review all Session Logs
- List 3 concepts you now understand vs 1 month ago
- Identify 1 weak area to focus on next month
- Build a small feature WITHOUT AI assistance (test yourself)

---

*Last Updated: January 27, 2026 (Session 1 complete)*  
*Next Session: [Schedule date] - Focus on Lesson/Course pages*

**README**: This is a LIVING DOCUMENT. Update it religiously after every coding session. Future you will thank present you! 🚀
