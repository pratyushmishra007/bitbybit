# Collaboration Feature & Fixes - Complete Guide

## Issues Fixed ✅

### 1. Database Error: `estimated_time` Column
**Error:** `column courses_2.estimated_time does not exist`

**Fix:** Removed non-existent column from [app/api/courses/progress/route.ts](app/api/courses/progress/route.ts#L40-L66)

**Result:** Students can now load "My Courses" page without 500 errors

---

### 2. Collaboration Sessions Not Showing
**Problem:** 
- Login page opens when clicking "Collaborate"
- After going back, shows "No Active Sessions"
- Sessions exist but aren't displaying

**Fix:** Added extensive logging to debug the issue in [app/collaborate/page.tsx](app/collaborate/page.tsx#L78-L97)

**Debug Steps:**
1. Open browser console (F12)
2. Click "Collaborate"
3. Check for these logs:
   ```
   🔍 Fetching collaboration sessions...
   📡 Sessions response status: [200/401/403]
   📚 Sessions data: {...}
   ✅ Found sessions: [number]
   ```

**Likely causes:**
- Sessions filtered out by role-based access
- Sessions expired
- Wrong class_id filter

---

## How Collaboration Works 🤝

### **For Teachers:**

#### Step 1: Start a Collaboration Session
```
Teacher Dashboard → Select Class → Click on Student
  ↓
Start Collaboration (from student card)
  ↓
Creates session in database
  ↓
Redirects to /teacher/live/[sessionId]
```

**What Happens:**
1. Teacher selects a class from dropdown
2. Sees list of students in that class
3. Clicks "Start Collaboration" on a student
4. API creates `collaboration_sessions` record:
   ```sql
   INSERT INTO collaboration_sessions (
     teacher_id,
     student_id,
     lesson_id,  -- Optional
     status: 'active',
     class_id,
     created_at
   )
   ```

#### Step 2: Teacher Joins Session
```
/teacher/live/[sessionId]
  ↓
Real-time collaborative code editor
  ↓
Can see student typing in real-time
Can request control to edit
Can observe without interfering
```

---

### **For Students:**

#### Step 1: View Available Sessions
```
Student Dashboard → Click "Collaborate" in navbar
  ↓
/collaborate page
  ↓
Shows active sessions for student's class
```

**What Student Sees:**
- Sessions created by teachers for their class
- Session name, language, status
- Who created it (teacher name)
- How many participants

#### Step 2: Join a Session
```
Click "Join Session" on any active session
  ↓
Redirects to /collaborate/[sessionId]
  ↓
Real-time collaborative code editor
```

**What Happens:**
1. Student sees list of active collaboration sessions
2. Sessions are filtered by:
   - Student's class (only see sessions for their class)
   - Active status (`is_active = true`)
   - Not expired (`expires_at > NOW()`)
3. Clicks "Join Session"
4. Enters collaborative editor with teacher

#### Step 3: Collaborate in Real-Time
```
/collaborate/[sessionId]
  ↓
Uses Yjs for real-time sync
  ↓
Both student and teacher see:
  - Same code
  - Cursor positions
  - Live edits
  - Participant list
```

---

## Database Schema for Collaboration

### `collaboration_sessions` Table
```sql
CREATE TABLE collaboration_sessions (
  id UUID PRIMARY KEY,
  session_name TEXT,
  description TEXT,
  class_id UUID REFERENCES classes(id),
  assignment_id UUID,
  created_by UUID REFERENCES users(id),
  student_id UUID REFERENCES users(id),
  teacher_id UUID REFERENCES users(id),
  lesson_id UUID REFERENCES lessons(id),  -- Optional
  language TEXT DEFAULT 'javascript',
  max_participants INT DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  is_locked BOOLEAN DEFAULT false,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### `session_participants` Table
```sql
CREATE TABLE session_participants (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES collaboration_sessions(id),
  user_id UUID REFERENCES users(id),
  role TEXT, -- 'host', 'participant', 'observer'
  joined_at TIMESTAMP DEFAULT NOW(),
  left_at TIMESTAMP,
  is_online BOOLEAN DEFAULT false,
  last_active TIMESTAMP
);
```

---

## API Endpoints Used

### Teacher Endpoints

#### Start Session
```http
POST /api/teacher/collaboration/start
Body: {
  "studentId": "uuid",
  "lessonId": "uuid" // Optional
}
Response: {
  "sessionId": "uuid",
  "message": "Session started successfully"
}
```

#### Get Active Sessions
```http
GET /api/teacher/collaboration/start
Response: {
  "sessions": [
    {
      "id": "uuid",
      "student": { "name": "John Doe", "email": "..." },
      "lesson": { "title": "Variables" },
      "status": "active",
      "started_at": "2026-01-27T..."
    }
  ]
}
```

---

### Student/General Endpoints

#### List Sessions (Role-Based)
```http
GET /api/collaboration/sessions?activeOnly=true
Response: {
  "sessions": [
    {
      "id": "uuid",
      "session_name": "Debugging Help",
      "creator": { "name": "Mr. Smith" },
      "class": { "name": "CS101" },
      "language": "javascript",
      "is_active": true,
      "online_participants": 1,
      "total_participants": 2
    }
  ]
}
```

**Filtering Logic:**
- **Admin:** Sees all sessions
- **Teacher:** Sees sessions for classes they teach
- **Student:** Sees sessions for their class only

#### Get Session Details
```http
GET /api/collaboration/sessions/[id]
Response: {
  "session": {
    "id": "uuid",
    "session_name": "...",
    "language": "javascript",
    "is_active": true,
    "is_locked": false,
    "creator": { "name": "..." },
    "class": { "name": "..." }
  },
  "participants": [
    {
      "user_id": "uuid",
      "name": "John Doe",
      "role": "host",
      "is_online": true
    }
  ]
}
```

#### Join Session
```http
POST /api/collaboration/sessions/[id]
Response: {
  "success": true,
  "participant": {
    "session_id": "uuid",
    "user_id": "uuid",
    "role": "participant",
    "is_online": true
  }
}
```

---

## Complete Flow Example

### Scenario: Teacher Helps Student with Bug

#### Teacher's Perspective:
```
1. Login as teacher
2. Go to Teacher Dashboard
3. Select "CS101" from class dropdown
4. See list of students:
   - John Doe (online) 🟢
   - Jane Smith (offline) ⚪
5. Click "Start Collaboration" on John Doe
6. System creates session
7. Redirected to /teacher/live/[sessionId]
8. See collaborative editor
9. Student joins automatically or manually
10. Teacher can see student's code
11. Teacher helps debug in real-time
```

#### Student's Perspective:
```
1. Student (John Doe) is working on a lesson
2. Gets stuck on a bug
3. Clicks "Collaborate" in navbar
4. Sees active session:
   "Debugging Session with Mr. Smith"
   Class: CS101
   Language: JavaScript
   Status: Active 🟢
5. Clicks "Join Session"
6. Redirected to /collaborate/[sessionId]
7. Sees collaborative editor
8. Teacher can see student's code
9. Teacher helps explain and fix bug
10. Student learns in real-time
```

---

## Debugging Session Issues

### Issue: "No Active Sessions" Shown

**Check 1: Verify Sessions Exist**
```sql
SELECT 
  cs.id,
  cs.session_name,
  cs.is_active,
  cs.expires_at,
  cs.expires_at > NOW() as not_expired,
  cl.name as class_name,
  u.name as creator_name
FROM collaboration_sessions cs
JOIN classes cl ON cs.class_id = cl.id
JOIN users u ON cs.created_by = u.id
WHERE cs.is_active = true
ORDER BY cs.created_at DESC;
```

**Check 2: Verify Student Class**
```sql
SELECT 
  u.name as student_name,
  u.class_id,
  cl.name as class_name
FROM users u
LEFT JOIN classes cl ON u.class_id = cl.id
WHERE u.email = 'student@example.com';
```

**Check 3: Verify Sessions for Class**
```sql
SELECT 
  cs.*,
  u_creator.name as creator,
  u_student.name as student
FROM collaboration_sessions cs
JOIN users u_creator ON cs.created_by = u_creator.id
LEFT JOIN users u_student ON cs.student_id = u_student.id
WHERE cs.class_id = '[student-class-id]'
  AND cs.is_active = true
  AND cs.expires_at > NOW();
```

**Expected Result:**
If sessions exist but not showing, the API filter is wrong.

---

### Issue: Login Page Opens on Collaborate Click

**Cause:** Session expired or not authenticated

**Fix:**
1. Check if logged in: `await getServerSession(authOptions)`
2. Verify session has user ID
3. Check browser cookies aren't blocked

**Debug:**
```javascript
// In browser console on /collaborate page
console.log('Session:', await fetch('/api/auth/session').then(r => r.json()));
console.log('Role:', await fetch('/api/auth/role').then(r => r.json()));
```

---

### Issue: Sessions Exist but Filter Excludes Them

**Common Causes:**

1. **Role Mismatch:**
   - Teacher sees sessions for assigned classes only
   - Student sees sessions for their class only
   - Check: `SELECT role, class_id FROM users WHERE id = '[user-id]'`

2. **Expired Sessions:**
   - Check: `expires_at > NOW()`
   - Default expiration: 24 hours from creation
   - Update: `UPDATE collaboration_sessions SET expires_at = NOW() + INTERVAL '24 hours' WHERE id = '[session-id]'`

3. **Inactive Sessions:**
   - Check: `is_active = true`
   - Update: `UPDATE collaboration_sessions SET is_active = true WHERE id = '[session-id]'`

4. **Class ID Mismatch:**
   - Student class_id doesn't match session class_id
   - Teacher not assigned to that class

---

## Testing the Full Flow

### Test 1: Teacher Creates Session
```
1. Login as teacher (teacher@test.com)
2. Go to /teacher
3. Select a class
4. Verify students show up
5. Click a student
6. Click "Start Collaboration"
7. Should redirect to /teacher/live/[sessionId]
8. Verify: Check database for new session
```

**Verify:**
```sql
SELECT * FROM collaboration_sessions 
WHERE teacher_id = '[teacher-id]' 
ORDER BY created_at DESC LIMIT 1;
```

### Test 2: Student Sees Session
```
1. Login as student (student@test.com)
2. Go to /collaborate
3. Should see session created by teacher
4. Verify session details show correctly
```

**Expected:**
```
Session Name: "Collaboration Session"
Created by: Mr. Teacher
Class: CS101
Language: JavaScript
Status: Active 🟢
Participants: 1/10
```

### Test 3: Student Joins Session
```
1. From /collaborate page
2. Click "Join Session"
3. Should redirect to /collaborate/[sessionId]
4. Should see collaborative editor
5. Both teacher and student see same code
```

**Verify:**
```sql
SELECT * FROM session_participants 
WHERE session_id = '[session-id]' 
ORDER BY joined_at;
```

Should show both teacher and student.

---

## Current Status & Next Steps

### ✅ Fixed:
- Removed `estimated_time` column error
- Added logging for session debugging
- Made `lessonId` optional for collaboration start

### 🔍 To Debug:
1. Check browser console logs when loading /collaborate
2. Verify sessions exist in database
3. Check if student class matches session class_id
4. Verify sessions haven't expired

### 🚀 Next Actions:
1. Refresh the page
2. Open browser console (F12)
3. Click "Collaborate"
4. Share the console logs showing:
   - Session response status
   - Sessions data
   - Any error messages

The logs will tell us exactly why sessions aren't showing! 📊
