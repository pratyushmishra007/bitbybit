# BitByBit Multi-Tenant Education Platform
## Complete Implementation Guide

---

## 🎯 System Overview

BitByBit is now designed as a comprehensive multi-tenant education platform supporting:
- **Multiple Organizations**: Colleges, schools, universities
- **Class-based Learning**: Semester and year-specific courses
- **Role-based Access**: Admin, Teacher, Student hierarchies
- **Real-time Collaboration**: Teachers can view/edit student code live
- **Contest System**: Class-specific and open contests

---

## 📊 Database Architecture

### Already Implemented ✅
1. **users** table with roles (admin, teacher, student)
2. **courses** table for learning content
3. **lessons** table for course modules  
4. **contests** system (contests, problems, participants, submissions)
5. **community** features (discussions, upvotes)

### New Multi-Tenant Schema (`multi-tenant-schema.sql`) ✅

#### Core Tables:
1. **organizations**
   - Colleges/schools/universities
   - Unique code for each organization
   - Contact details, logo, status

2. **departments**
   - Within organizations
   - E.g., Computer Science, Mathematics
   - Unique codes per organization

3. **academic_years**
   - E.g., "2025-2026"
   - Start/end dates
   - Current year flag

4. **semesters**
   - Linked to academic years
   - E.g., "Fall 2025", "Semester 1"
   - Numbered (1, 2, 3, etc.)

5. **classes**
   - Student batches/sections
   - E.g., "CS-A", "10th Grade", "BTech CSE 2024"
   - Linked to organization, department, semester
   - Capacity limits

6. **class_enrollments**
   - Students enrolled in classes
   - Status tracking (active, inactive, completed, dropped)

7. **teacher_assignments**
   - Teachers assigned to classes
   - Subject specification

#### Real-time Collaboration Tables:
8. **collaboration_sessions**
   - Active teacher-student code sessions
   - WebSocket connection tracking
   - Status (active, ended)

9. **code_collaboration_state**
   - Current code state per session
   - Cursor positions
   - Real-time sync data

10. **help_requests**
    - Students requesting teacher help
    - Status tracking (pending, accepted, resolved)
    - Lesson/course context

11. **admin_activity_logs**
    - Audit trail for admin actions
    - Entity tracking
    - IP logging

#### Updated Tables:
- **users**: Added organization_id, class_id, semester_id, student_id, bio, avatar_url, phone
- **courses**: Added organization_id, class_id, semester_id, is_public

---

## 🔐 Security (RLS Policies)

All tables have Row Level Security enabled with appropriate policies:
- Students see only their org/class data
- Teachers see their assigned classes
- Admins see everything
- Collaboration restricted to teacher-student pairs
- Public courses visible to all

---

## 🚀 Implementation Phases

### Phase 1: Database Setup ✅ COMPLETE
**File**: `multi-tenant-schema.sql`
**Action**: Run this in Supabase SQL Editor
```sql
-- This creates all multi-tenant tables
-- Run after contests-schema-clean.sql
```

### Phase 2: Authentication Flow (NEXT STEP)
**Files to Create**:
1. `app/auth/signup/page.tsx` - Enhanced signup with organization/class selection
2. `app/auth/organization-select/page.tsx` - Organization picker
3. `app/api/auth/organizations/route.ts` - Fetch available organizations
4. `app/api/auth/classes/route.ts` - Fetch classes for selected organization

**Features**:
- Organization code entry or selection
- Class/semester selection
- Student ID entry
- Role selection (student/teacher)
- Profile completion

### Phase 3: Admin Dashboard
**Files to Create**:
1. `app/admin/page.tsx` - Admin dashboard overview
2. `app/admin/organizations/page.tsx` - Manage organizations
3. `app/admin/classes/page.tsx` - Manage classes
4. `app/admin/users/page.tsx` - Manage users
5. `app/admin/courses/page.tsx` - Assign courses to classes
6. `app/api/admin/[entity]/route.ts` - CRUD operations for all entities

**Admin Powers**:
- ✅ Create/edit/delete organizations
- ✅ Create/edit/delete departments
- ✅ Create/edit/delete classes
- ✅ Assign students to classes
- ✅ Assign teachers to classes
- ✅ Create/assign courses to specific classes
- ✅ View all user activity
- ✅ Manage contest creation/deletion
- ✅ Access all student code sessions
- ✅ Generate reports

### Phase 4: Teacher Dashboard
**Files to Create**:
1. `app/teacher/page.tsx` - Teacher dashboard
2. `app/teacher/classes/page.tsx` - View assigned classes
3. `app/teacher/students/page.tsx` - View students
4. `app/teacher/live-sessions/page.tsx` - Active student sessions
5. `app/api/teacher/sessions/route.ts` - Get active student sessions

**Teacher Powers**:
- ✅ View assigned classes
- ✅ View enrolled students
- ✅ See active coding sessions (who's online)
- ✅ Request to join student's code editor
- ✅ Real-time code viewing
- ✅ Real-time code editing (with student permission)
- ✅ Help request management
- ✅ Grade submissions
- ✅ Create class-specific contests

### Phase 5: Real-Time Collaboration System
**Technology**: Socket.io or Supabase Realtime

**Files to Create**:
1. `lib/socket.ts` - WebSocket connection setup
2. `app/api/socket/route.ts` - Socket.io handler
3. `app/components/CollaborationProvider.tsx` - Real-time context
4. `app/components/TeacherViewOverlay.tsx` - Teacher viewing indicator
5. `app/components/LiveCursor.tsx` - Show remote cursors

**Implementation**:
```typescript
// When student is coding
socket.emit('code-change', {
  userId, lessonId, code, cursorPosition
});

// Teacher subscribes to student
socket.emit('watch-student', {
  teacherId, studentId, lessonId
});

// Teacher receives real-time updates
socket.on('student-code-update', (data) => {
  updateEditorCode(data.code);
  updateCursor(data.cursorPosition);
});

// Teacher can edit
socket.emit('teacher-edit', {
  teacherId, studentId, lessonId, code
});
```

**Features**:
- 🔴 Live presence indicators
- 👁️ Teacher viewing overlay ("Your teacher is watching")
- ✏️ Collaborative editing (like Google Docs)
- 💬 In-editor chat
- 🎯 Highlight code sections
- 📸 Session recording for review

### Phase 6: Course Management Updates
**Files to Modify**:
1. `app/courses/page.tsx` - Filter by class/semester
2. `app/api/courses/route.ts` - Filter logic
3. `app/admin/courses/assign/page.tsx` - Assign to classes

**Features**:
- Public vs Class-specific courses
- Semester-based content release
- Prerequisites by class level

---

## 🎨 UI Updates Completed ✅

1. **Contest Creation Page**: Premium light theme with gradients
2. **Create Contest Button**: Moved to filter bar with gradient styling
3. **Contests Page**: Smart button states (Enter Arena, Registered, Join)
4. **Success Modals**: Beautiful registration confirmation

---

## 📝 API Routes Structure

### Authentication & User Management
```
/api/auth/organizations - GET (list), POST (create)
/api/auth/classes - GET (list for org)
/api/auth/signup - POST (with org/class data)
```

### Admin APIs
```
/api/admin/organizations - CRUD
/api/admin/departments - CRUD
/api/admin/classes - CRUD
/api/admin/users - CRUD
/api/admin/enrollments - CRUD
/api/admin/teacher-assignments - CRUD
/api/admin/activity-logs - GET
```

### Teacher APIs
```
/api/teacher/classes - GET (assigned classes)
/api/teacher/students - GET (students in classes)
/api/teacher/sessions/active - GET (live coding sessions)
/api/teacher/sessions/[id]/join - POST (request to join)
/api/teacher/sessions/[id]/edit - POST (edit code)
/api/teacher/help-requests - GET, PUT
```

### Student APIs
```
/api/student/classes - GET (enrolled classes)
/api/student/help-request - POST (request help)
/api/student/sessions/current - GET (my active session)
```

### Collaboration APIs
```
/api/collaboration/sessions - POST (create session)
/api/collaboration/sessions/[id] - GET, PUT, DELETE
/api/collaboration/sessions/[id]/state - GET, PUT (code state)
```

---

## 🔄 Real-Time Collaboration Flow

### Scenario: Teacher Helps Student

1. **Student Side**:
   ```
   - Student opens lesson
   - System creates collaboration_session (student_id, lesson_id)
   - WebSocket connection established
   - Student writes code
   - Code state saved to code_collaboration_state
   - Real-time emit to any connected teachers
   ```

2. **Teacher Side**:
   ```
   - Teacher opens "Live Sessions" dashboard
   - Sees list of active students from assigned classes
   - Sees what lesson each student is on
   - Clicks "View Session"
   - WebSocket subscribes to student's session
   - Teacher sees code in real-time
   - Teacher can request edit permission
   - Student approves/denies
   - If approved, teacher can edit
   - Changes sync back to student in real-time
   ```

3. **Student Requests Help**:
   ```
   - Student clicks "Request Teacher Help" button
   - Creates help_request entry
   - Notification sent to assigned teacher(s)
   - Teacher accepts request
   - help_request.teacher_id = teacher.id
   - help_request.status = 'accepted'
   - Teacher automatically joins session
   - Collaboration begins
   ```

---

## 🎯 Next Steps (Priority Order)

### Immediate (Week 1):
1. ✅ Run `multi-tenant-schema.sql` in Supabase
2. ⏳ Create enhanced signup flow with org/class selection
3. ⏳ Update navbar to show role-based links
4. ⏳ Create basic admin dashboard layout

### Short-term (Week 2-3):
5. ⏳ Implement admin organization management
6. ⏳ Implement admin class management
7. ⏳ Implement admin user management
8. ⏳ Create teacher dashboard with class listings

### Mid-term (Week 4-6):
9. ⏳ Set up WebSocket infrastructure (Socket.io or Supabase Realtime)
10. ⏳ Implement basic real-time code sync
11. ⏳ Add teacher session viewing
12. ⏳ Add help request system

### Long-term (Week 7-8):
13. ⏳ Full collaborative editing
14. ⏳ Session recording/playback
15. ⏳ Analytics dashboard for admins
16. ⏳ Mobile responsive adjustments

---

## 🛠️ Technical Requirements

### Dependencies to Add:
```json
{
  "socket.io": "^4.6.0",
  "socket.io-client": "^4.6.0",
  "@supabase/realtime-js": "^2.9.0",
  "y-websocket": "^1.5.0",  // For CRDT-based collaboration
  "yjs": "^13.6.0"           // Conflict-free editing
}
```

### Environment Variables:
```env
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
SOCKET_SERVER_PORT=3001
```

---

## 📋 Testing Checklist

### Multi-Tenant System:
- [ ] Create organization
- [ ] Create departments within org
- [ ] Create academic year
- [ ] Create semesters
- [ ] Create classes
- [ ] Enroll students in classes
- [ ] Assign teachers to classes
- [ ] Assign courses to specific classes
- [ ] Verify students only see their org's data
- [ ] Verify teachers only see assigned classes
- [ ] Verify admins see all data

### Real-Time Collaboration:
- [ ] Student opens lesson → session created
- [ ] Teacher sees student in live sessions list
- [ ] Teacher joins session → sees student code
- [ ] Student types → teacher sees changes <500ms
- [ ] Teacher requests edit permission
- [ ] Student approves → teacher can edit
- [ ] Teacher edits → student sees changes
- [ ] Either party disconnects → session marked ended
- [ ] Help request creates notification
- [ ] Teacher accepts → joins session automatically

---

## 🎓 User Journeys

### Student Journey:
1. Signup → Enter organization code → Select class → Choose semester
2. Login → See dashboard with enrolled courses
3. Browse courses → Only see public + class-specific courses
4. Open lesson → Start coding
5. Get stuck → Click "Request Help"
6. Teacher joins → See "Teacher is viewing your session"
7. Collaborate → Teacher helps debug
8. Complete lesson → Progress saved
9. Join contest → Compete with classmates

### Teacher Journey:
1. Login → See teacher dashboard
2. View assigned classes → See enrolled students
3. Click "Live Sessions" → See who's actively coding
4. Click student name → Join their session
5. View code in real-time
6. Request edit permission or just observe
7. Help debug → Make suggestions
8. Create class-specific contest
9. View leaderboard for class

### Admin Journey:
1. Login → See admin dashboard with stats
2. Create new organization
3. Set up departments
4. Create academic year and semesters
5. Create classes
6. Import student list (CSV)
7. Assign students to classes
8. Assign teachers to classes
9. Assign/create courses for specific classes
10. Monitor all activity
11. Generate reports
12. Manage contests platform-wide

---

## 🚀 Deployment Notes

### Database Migration:
```bash
# 1. Run contests schema
psql < contests-schema-clean.sql

# 2. Run multi-tenant schema
psql < multi-tenant-schema.sql

# 3. Verify tables
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
```

### Socket Server (Optional Separate Server):
```javascript
// server.js
const io = require('socket.io')(3001, {
  cors: { origin: process.env.NEXT_PUBLIC_APP_URL }
});

io.on('connection', (socket) => {
  // Handle collaboration events
});
```

---

## 📚 Documentation Links

- **Database Schema**: `multi-tenant-schema.sql`
- **Contest System**: `contests-schema-clean.sql`
- **API Documentation**: (To be created in Swagger/OpenAPI)
- **WebSocket Events**: (To be documented)

---

## ⚠️ Important Notes

1. **Privacy**: Students can only see their organization's data
2. **Permissions**: Teachers need explicit assignment to classes
3. **Consent**: Student must approve teacher edit permission
4. **Logging**: All admin actions are logged
5. **Scalability**: Use Redis for WebSocket pub/sub in production
6. **Security**: Validate all org/class access server-side

---

## 🎉 Current Status

**✅ Completed:**
- Multi-tenant database schema designed
- Contest system fully functional
- Smart contest registration flow
- Premium UI for contest creation
- Admin contest creation capability

**⏳ In Progress:**
- Enhanced authentication flow
- Admin dashboard
- Teacher dashboard
- Real-time collaboration system

**📋 Planned:**
- Mobile app (React Native)
- AI code suggestions
- Plagiarism detection
- Performance analytics

---

**Created**: January 28, 2026
**Platform**: BitByBit Education
**Version**: 2.0 (Multi-Tenant)
