# 🚀 IMMEDIATE ACTION REQUIRED

## Step 1: Run Database Script (2 minutes)

1. Open Supabase SQL Editor
2. Copy and paste entire contents of `fix-production-issues.sql`
3. Click "Run"
4. Wait for success message

**Expected output:**
```
==============================================
Production Fix Applied Successfully!
==============================================
Total Courses: 8
Total Lessons: 5
Active Semester: Spring 2026
==============================================
```

---

## Step 2: Verify Courses (30 seconds)

Visit in your browser:
```
http://localhost:3000/api/courses
```

**Expected response:**
```json
{
  "success": true,
  "courses": [
    { "id": "basic-javascript", "title": "Basic JavaScript", ... },
    { "id": "basic-python", "title": "Basic Python", ... },
    ...
  ],
  "count": 8
}
```

❌ If you see `"courses": []`, the script didn't run correctly. Re-run it.

---

## Step 3: Test Course Assignment (1 minute)

1. Login as teacher
2. Go to Teacher Dashboard → **Manage Courses**
3. Click **"Assign Course"**
4. Check the **"Select Course"** dropdown

✅ **Should see 8 courses**  
❌ If empty, courses didn't load - check console logs

---

## Step 4: Test Collaboration Access (2 minutes)

### As Teacher:
1. Teacher Dashboard → Classes → View Students
2. Click a student name
3. Start collaboration session
4. Try to join the session

✅ **Should join successfully** (previously failed with 401)

### As Student:
1. Go to Collaborate page
2. Find active session
3. Click "Join Session"

✅ **Should join successfully**

---

## 🐛 Troubleshooting

### Course Dropdown Still Empty?

**Check 1: API Response**
```
Visit: http://localhost:3000/api/courses
Expected: { "success": true, "count": 8 }
```

**Check 2: Database**
```sql
-- In Supabase SQL Editor:
SELECT COUNT(*) FROM courses;
-- Should return 8
```

**Fix:**
- Re-run `fix-production-issues.sql`
- Clear browser cache
- Restart dev server

---

### Still Getting 401 Errors?

**Check user role in database:**
```sql
SELECT id, name, email, role FROM users WHERE email = 'your-email@example.com';
```

**If role is NULL:**
```sql
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```

---

### Teacher Can't Join Collaboration?

**Check teacher assignment:**
```sql
SELECT 
  t.name as teacher,
  c.name as class
FROM teacher_assignments ta
JOIN users t ON ta.teacher_id = t.id  
JOIN classes c ON ta.class_id = c.id;
```

**If empty:**
- Go to Admin Dashboard
- Click "Teacher Assignments"
- Assign teacher to a class

---

## ✅ Success Indicators

You're good to proceed when:

- [ ] 8 courses show in `/api/courses`
- [ ] Course dropdown populated in teacher dashboard
- [ ] Teacher can assign courses to classes
- [ ] Students auto-enrolled in assigned courses
- [ ] Teacher can join collaboration sessions
- [ ] No 401 errors when performing authorized actions
- [ ] Pending approvals badge shows correct count

---

## 📖 Full Documentation

For complete setup and testing guide, see:
- **[PRODUCTION-SETUP-GUIDE.md](PRODUCTION-SETUP-GUIDE.md)** - Complete walkthrough
- **[PRODUCTION-FIXES-SUMMARY.md](PRODUCTION-FIXES-SUMMARY.md)** - What was fixed

---

**Need Help?**
1. Check browser console for errors
2. Check terminal/server logs  
3. Check Supabase logs
4. Review troubleshooting section above

**Status:** 🔧 Ready to test after running SQL script
