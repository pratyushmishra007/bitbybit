# 🚀 BitByBit Platform - Production Setup Guide

## Overview
Complete guide to set up, configure, and test the BitByBit education platform in a production-ready state.

---

## ⚡ Quick Start (30 minutes)

### Step 1: Database Setup (10 minutes)

1. **Open Supabase SQL Editor**
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor

2. **Run Database Scripts in Order**
   ```sql
   -- 1. First, run the base schema (if not already done)
   -- File: supabase_courses_schema.sql
   
   -- 2. Then run the roles and classes schema
   -- File: supabase_roles_schema.sql
   
   -- 3. Add semester-based course system
   -- File: add-semester-course-system.sql
   
   -- 4. Fix all production issues and add sample data
   -- File: fix-production-issues.sql (NEW - RUN THIS!)
   ```

3. **Verify Database**
   ```sql
   -- Check that you have data
   SELECT COUNT(*) as course_count FROM courses;
   SELECT COUNT(*) as lesson_count FROM lessons;
   SELECT name FROM semesters WHERE is_active = true;
   ```

### Step 2: Environment Variables (2 minutes)

Ensure your `.env.local` has:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXTAUTH_SECRET=your_secret_key
NEXTAUTH_URL=http://localhost:3000
```

### Step 3: Start Development Server (1 minute)

```bash
npm run dev
```

---

## 🔧 What Was Fixed

### 1. **Collaboration Sessions**
- ✅ Teachers can now join collaboration sessions
- ✅ Fixed access control for all roles (admin, teacher, student)
- ✅ Teachers must be assigned to class to access sessions
- ✅ Students can only access their class sessions

### 2. **Course Assignment**
- ✅ Fixed empty course dropdown
- ✅ Added sample courses to database
- ✅ Improved error messages when no courses available
- ✅ Added logging for better debugging

### 3. **API Authorization**
- ✅ All admin APIs now check database for role if not in session
- ✅ All teacher APIs support both teacher and admin roles
- ✅ Consistent error handling across all endpoints
- ✅ Fixed `/api/admin/assignments` authorization

### 4. **Database Improvements**
- ✅ 8 sample courses added (beginner to advanced)
- ✅ Sample lessons for JavaScript, Python, HTML
- ✅ Added performance indexes
- ✅ Row Level Security (RLS) policies configured
- ✅ Helper function for access control

---

## 📋 Complete Testing Flow

### Phase 1: Admin Workflow

#### 1.1 Create Admin Account
```
1. Sign up at /auth/signup → Individual
2. Manually set role to 'admin' in Supabase users table
```

#### 1.2 Create Organization
```
1. Login as admin
2. Go to Admin Dashboard → Organizations
3. Create organization (e.g., "Test University")
4. Note the organization code
```

#### 1.3 Create Class
```
1. Admin Dashboard → Classes
2. Click "Add Class"
3. Fill in:
   - Name: "CS101 - Programming Fundamentals"
   - Code: "CS101"
   - Organization: Select from dropdown
   - Year Level: 1
   - Capacity: 30
4. Submit
```

#### 1.4 Verify Courses
```
1. Go to /api/courses in browser
2. Should see JSON with 8 courses
3. If empty, run fix-production-issues.sql
```

### Phase 2: Teacher Workflow

#### 2.1 Create Teacher Account
```
1. Sign up at /auth/signup → Teacher/Educator
2. Enter: name, email, password
3. Enter organization code
4. Account created (pending approval)
```

#### 2.2 Approve Teacher
```
1. Login as admin
2. Admin Dashboard → Pending Approvals
3. Find teacher, click Approve
4. Teacher can now login
```

#### 2.3 Assign Teacher to Class
```
1. Admin Dashboard → Teacher Assignments
2. Click "+ Assign Teacher"
3. Select:
   - Teacher: Select approved teacher
   - Class: CS101
   - Subject: Programming
4. Submit
```

#### 2.4 Assign Course to Class
```
1. Login as teacher
2. Teacher Dashboard → Manage Courses
3. Click "Assign Course"
4. Select:
   - Class: CS101
   - Course: Basic JavaScript
   - Semester: Spring 2026 (active)
   - Optional: Start/End dates
5. Submit
6. Students are auto-enrolled via trigger
```

### Phase 3: Student Workflow

#### 3.1 Create Student Account
```
1. Sign up at /auth/signup → Student
2. Enter: name, email, password
3. Enter organization code
4. Select class: CS101
5. Enter student ID
6. Account created (pending approval)
```

#### 3.2 Approve Student
```
1. Login as admin
2. Admin Dashboard → Pending Approvals
3. Find student, click Approve
4. Student can now login
```

#### 3.3 View Courses
```
1. Login as student
2. Click "My Courses" in navbar
3. Should see Basic JavaScript course
4. Filter tabs work:
   - Current Semester: Shows active semester courses
   - All Courses: Shows all enrolled courses
   - Completed: Shows 100% progress courses
```

#### 3.4 Access Lessons
```
1. Click on a course card
2. Navigate to lessons
3. Complete lessons
4. Progress auto-updates
```

### Phase 4: Collaboration Testing

#### 4.1 Teacher Starts Session
```
1. Login as teacher
2. Teacher Dashboard → Classes → View Students
3. Click student name
4. Start collaboration session
5. Session created
```

#### 4.2 Teacher Joins Session
```
1. Go to Collaborate page
2. Find active session
3. Click "Join Session"
4. ✅ Teacher can now join (previously failed)
```

#### 4.3 Student Joins Session
```
1. Login as student
2. Go to Collaborate page
3. Find session for their class
4. Click "Join Session"
5. Both can collaborate in real-time
```

---

## 🐛 Common Issues & Solutions

### Issue 1: "Course dropdown is empty"
**Cause:** No courses in database  
**Solution:**
```sql
-- Run fix-production-issues.sql in Supabase SQL Editor
-- This adds 8 sample courses
```

### Issue 2: "401 Unauthorized" on admin actions
**Cause:** Role not in session JWT  
**Solution:** Fixed! All APIs now check database as fallback

### Issue 3: "Teacher can't see classes"
**Cause:** Teacher not assigned to class  
**Solution:**
1. Admin Dashboard → Teacher Assignments
2. Assign teacher to class
3. Refresh teacher dashboard

### Issue 4: "Teacher can't join collaboration session"
**Cause:** Access check didn't include teachers  
**Solution:** Fixed! Teachers with class assignment can join

### Issue 5: "Students not auto-enrolled in courses"
**Cause:** Missing trigger  
**Solution:** Trigger included in add-semester-course-system.sql

---

## 🎯 Production Checklist

### Before Deployment
- [ ] All SQL scripts executed in order
- [ ] Sample data loaded (or real courses added)
- [ ] Environment variables configured
- [ ] At least one admin account created
- [ ] At least one organization created
- [ ] RLS policies enabled and tested
- [ ] All API endpoints tested
- [ ] Error handling verified

### Security
- [ ] Row Level Security enabled on all tables
- [ ] Service role key kept secret
- [ ] NEXTAUTH_SECRET is strong random string
- [ ] NEXTAUTH_URL points to production domain
- [ ] Database backups configured
- [ ] Rate limiting configured (if needed)

### Performance
- [ ] Database indexes created (in fix-production-issues.sql)
- [ ] Query performance tested with realistic data
- [ ] Image optimization enabled
- [ ] Caching strategy implemented

### User Experience
- [ ] All error messages are user-friendly
- [ ] Loading states on all forms
- [ ] Empty states guide users
- [ ] Success messages confirm actions
- [ ] Validation prevents invalid data

---

## 📊 Database Schema Overview

### Core Tables
- `users` - All users (students, teachers, admins)
- `organizations` - Schools, universities, institutions
- `classes` - Class groups within organizations
- `courses` - Course catalog (e.g., "Basic JavaScript")
- `lessons` - Individual lessons within courses
- `semesters` - Academic terms (Spring 2026, Fall 2026, etc.)

### Enrollment & Assignment
- `class_enrollments` - Students enrolled in classes
- `teacher_assignments` - Teachers assigned to classes
- `class_courses` - Courses assigned to classes for specific semesters
- `student_course_enrollments` - Student progress in courses

### Collaboration
- `collaboration_sessions` - Active/past collaboration sessions
- `session_participants` - Users in each session
- `code_snapshots` - Saved code states

### Progress Tracking
- `lesson_progress` - Student progress through lessons
- `user_submissions` - Code submissions and results

---

## 🔍 API Endpoints Reference

### Authentication
- `POST /api/auth/signup` - Create new account
- `POST /api/auth/signin` - Login
- `POST /api/auth/signout` - Logout

### Courses
- `GET /api/courses` - List all courses
- `GET /api/courses/[id]` - Get course details
- `GET /api/courses/assign` - List course assignments
- `POST /api/courses/assign` - Assign course to class
- `DELETE /api/courses/assign` - Remove assignment

### Admin
- `GET /api/admin/users` - List users (filter by role)
- `GET /api/admin/classes` - List classes
- `POST /api/admin/classes` - Create class
- `GET /api/admin/assignments` - List teacher assignments
- `POST /api/admin/assignments` - Create teacher assignment
- `PATCH /api/admin/approvals/[id]` - Approve/reject user

### Teacher
- `GET /api/teacher/classes` - List assigned classes
- `GET /api/teacher/students` - List students in class
- `GET /api/teacher/stats` - Dashboard statistics
- `POST /api/teacher/collaboration/start` - Start session

### Student
- `GET /api/courses/progress` - My course progress
- `PATCH /api/courses/progress` - Update progress

### Collaboration
- `GET /api/collaboration/sessions` - List sessions
- `POST /api/collaboration/sessions` - Create session
- `GET /api/collaboration/sessions/[id]` - Get session details
- `POST /api/collaboration/sessions/[id]` - Join session
- `DELETE /api/collaboration/sessions/[id]` - Leave session

---

## 🚀 Deployment Guide

### Vercel Deployment

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Production ready"
   git push origin main
   ```

2. **Connect to Vercel**
   - Go to vercel.com
   - Import your repository
   - Add environment variables
   - Deploy

3. **Update Supabase**
   - Add production URL to allowed URLs
   - Update NEXTAUTH_URL to production domain

### Environment Variables in Vercel
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXTAUTH_SECRET
NEXTAUTH_URL (your-domain.vercel.app)
```

---

## 📞 Support & Troubleshooting

### Debugging Steps
1. Check browser console for errors
2. Check terminal/server logs
3. Check Supabase logs
4. Verify database data with SQL queries
5. Test API endpoints directly in browser

### Database Queries for Debugging
```sql
-- Check user roles
SELECT id, name, email, role, account_status FROM users;

-- Check teacher assignments
SELECT 
  t.name as teacher, 
  c.name as class,
  ta.subject 
FROM teacher_assignments ta
JOIN users t ON ta.teacher_id = t.id
JOIN classes c ON ta.class_id = c.id;

-- Check course assignments
SELECT 
  cr.title as course,
  cl.name as class,
  cc.semester,
  cc.is_active
FROM class_courses cc
JOIN courses cr ON cc.course_id = cr.id
JOIN classes cl ON cc.class_id = cl.id;

-- Check student enrollments
SELECT 
  u.name as student,
  c.title as course,
  sce.progress_percentage,
  sce.status
FROM student_course_enrollments sce
JOIN users u ON sce.user_id = u.id
JOIN class_courses cc ON sce.class_course_id = cc.id
JOIN courses c ON cc.course_id = c.id;
```

---

## ✅ Success Criteria

Your platform is production-ready when:

1. **Data Integrity**
   - [ ] At least 5 courses in database
   - [ ] Active semester configured
   - [ ] All tables have proper indexes
   - [ ] RLS policies working

2. **User Flows**
   - [ ] Admin can create organizations and classes
   - [ ] Teachers can be assigned to classes
   - [ ] Students can enroll and be approved
   - [ ] Course assignment works end-to-end
   - [ ] Collaboration sessions work for all roles

3. **Error Handling**
   - [ ] No 401 errors for authorized users
   - [ ] Empty states show helpful messages
   - [ ] Form validation prevents bad data
   - [ ] API errors are logged and handled

4. **Performance**
   - [ ] Pages load in < 2 seconds
   - [ ] No N+1 query issues
   - [ ] Database queries use indexes
   - [ ] Images optimized

---

## 🎓 Next Steps

After basic setup:
1. Add more courses and lessons
2. Customize branding and theme
3. Add email notifications
4. Implement gradebook features
5. Add analytics dashboard
6. Configure backups
7. Set up monitoring (Sentry, etc.)
8. Add user documentation
9. Create teacher training materials
10. Plan beta testing with real users

---

**Last Updated:** January 28, 2026  
**Version:** 1.0.0  
**Status:** Production Ready ✅
