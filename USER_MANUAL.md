# BitByBit Platform - Complete User Manual

> **Version 2.0** | Last Updated: February 2026

Welcome to BitByBit - the comprehensive coding education platform designed for universities, colleges, and educational institutions. This manual covers every feature and functionality of the platform.

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Student Guide](#2-student-guide)
3. [Teacher Guide](#3-teacher-guide)
4. [Organization Admin Guide](#4-organization-admin-guide)
5. [Platform Admin Guide](#5-platform-admin-guide)
6. [Features Reference](#6-features-reference)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. Getting Started

### 1.1 Creating an Account

**For Students:**
1. Navigate to the signup page
2. Select "Student" as your role
3. Enter your details:
   - Full Name
   - Email (preferably institutional email)
   - Password (min 8 characters)
   - Student ID (optional but recommended)
4. Select your Organization from the dropdown (use org code if provided)
5. Select your Class/Batch
6. Complete signup - you'll be automatically approved for OAuth or require approval for email signup

**For Teachers:**
1. Navigate to signup page
2. Select "Teacher" as your role
3. Enter your details
4. Select your Organization
5. Submit for approval - an admin will review your application
6. You'll receive an email when approved

### 1.2 Logging In

- **Email/Password**: Enter your registered email and password
- **Google OAuth**: Click "Continue with Google" 
- **GitHub OAuth**: Click "Continue with GitHub"

### 1.3 Dashboard Overview

After logging in, you'll see your role-specific dashboard:
- **Students**: Learning progress, enrolled courses, XP/level, quick actions
- **Teachers**: Assigned classes, student management, course creation
- **Org Admins**: Organization overview, user management, analytics
- **Platform Admins**: Multi-organization management

---

## 2. Student Guide

### 2.1 Dashboard

Your dashboard shows:
- **XP & Level**: Your gamification progress
- **Enrolled Courses**: Quick access to your courses
- **Progress Stats**: Lessons completed, time spent
- **Daily Streak**: Consecutive days of learning
- **Recent Activity**: Your latest actions

### 2.2 My Courses

**Accessing Courses:**
1. Click "My Courses" in the navigation
2. View all enrolled courses with progress bars
3. Click a course to continue learning

**Course Cards Display:**
- Course name and description
- Progress percentage
- Lessons completed / total
- Last accessed date

### 2.3 Learning Lessons

**Lesson Interface:**
1. **Content Panel**: Read the lesson material (markdown formatted)
2. **Code Editor**: Write your code solution
3. **Test Cases**: See expected inputs/outputs
4. **Run Button**: Execute your code against test cases
5. **Submit Button**: Submit when all tests pass

**Code Execution:**
- Supports Python, JavaScript, Java, C++, and more
- Real-time output display
- Error highlighting and messages
- Test case pass/fail indicators

**Earning XP:**
- +50 XP for completing a lesson (first time)
- +10 XP bonus for first-attempt pass
- +5 XP for each test case passed

### 2.4 Assessments

**Taking Assessments:**
1. Go to "Assessments" in your course or dashboard
2. Click "Start Assessment"
3. Answer questions within the time limit (if timed)
4. Submit when finished or time runs out

**Question Types:**
- **Multiple Choice (MCQ)**: Select one correct answer
- **True/False**: Select true or false
- **Coding Questions**: Write code that passes test cases
- **Short Answer**: Type your response

**Assessment Features:**
- Timer display (for timed assessments)
- Auto-save (answers saved as you type)
- Question navigation sidebar
- Submit confirmation

### 2.5 Contests

**Participating in Contests:**
1. Navigate to "Contests" page
2. View upcoming, active, and past contests
3. Register for upcoming contests
4. Join active contests during their time window

**During a Contest:**
- Solve coding problems against the clock
- View real-time leaderboard
- Submit solutions for immediate scoring
- Track your rank and points

**Scoring:**
- Points based on problem difficulty
- Time bonus for faster solutions
- Partial points for some test cases passed

### 2.6 Raise Hand (Get Help)

**Requesting Help:**
1. While in a lesson, click "Raise Hand" button
2. Describe your problem (optional)
3. Wait for a teacher to respond
4. Join the collaboration session when invited

**Collaboration Session:**
- Real-time code sharing with teacher
- Voice/video chat (if enabled)
- Teacher can see and edit your code
- Session ends when resolved

### 2.7 Explore & Self-Enrollment

**Browse Public Courses:**
1. Go to "Explore" page
2. Filter by:
   - Difficulty (Beginner, Intermediate, Advanced)
   - Category (Programming, Web Dev, Data Science, etc.)
   - Language (Python, JavaScript, etc.)
3. Search by keyword
4. Click "Enroll" on any public course

**Learning Path:**
1. Visit "Learning Path" page
2. See personalized recommendations
3. View courses to level up your skills
4. Continue in-progress courses

### 2.8 Profile & Settings

**Profile Page:**
- View your stats and achievements
- Edit profile picture
- Update personal information

**Settings:**
- Notification preferences
- Email digest settings
- Theme (light/dark mode)
- Language preferences

---

## 3. Teacher Guide

### 3.1 Teacher Dashboard

Your dashboard displays:
- **Assigned Classes**: Classes you teach
- **Student Count**: Total students across classes
- **Help Requests**: Pending student help requests
- **Recent Activity**: Latest student progress

### 3.2 Managing Classes

**Viewing Classes:**
1. Navigate to "My Classes"
2. See all assigned classes
3. Click a class for details

**Class Details:**
- Student roster
- Assigned courses
- Class progress analytics
- At-risk students (below 25% progress)

### 3.3 Creating Courses

**New Course:**
1. Go to "Courses" > "Create New"
2. Fill in course details:
   - Title
   - Description
   - Difficulty level
   - Category
   - Estimated duration
3. Save as draft or publish

**Adding Lessons:**
1. Open your course
2. Click "Add Lesson"
3. Enter lesson details:
   - Title
   - Content (Markdown supported)
   - Starter code
   - Solution code
   - Programming language
4. Add test cases (see below)
5. Save and order lessons

**Test Case Builder:**
- Add input/output pairs
- Mark tests as hidden (not shown to students)
- Set point values per test
- Reorder tests via drag-and-drop

### 3.4 Course Templates & Cloning

**Clone a Course:**
1. Open course settings
2. Click "Clone Course"
3. Enter new course title
4. Choose to include assessments or not
5. Clone creates a complete copy

**Course Templates:**
- Use pre-built templates for common topics
- Customize template content
- Save your courses as templates

### 3.5 Creating Assessments

**New Assessment:**
1. Go to "Assessments" > "Create"
2. Choose assessment type:
   - Quiz (short, formative)
   - Test (graded, summative)
   - Assignment (take-home)
   - Coding Challenge (pure coding)
3. Configure settings:
   - Time limit
   - Due date
   - Attempts allowed
   - Shuffle questions
   - Show correct answers

**Adding Questions:**
1. Click "Add Question"
2. Select question type:
   - **MCQ**: Add options, mark correct answer
   - **True/False**: Set correct answer
   - **Coding**: Add problem, test cases, points
   - **Short Answer**: Add expected answer/keywords
3. Set point value
4. Add explanation (shown after submission)

**Publishing Assessment:**
1. Click "Publish"
2. Select target classes
3. Set availability dates
4. Notify students (optional email)

### 3.6 Grading & Submissions

**Viewing Submissions:**
1. Open assessment
2. Click "Submissions" tab
3. See all student submissions with scores

**Grading Interface:**
- Auto-graded: MCQ, T/F, Coding (by test cases)
- Manual grading: Short answer, partial credit
- Add feedback comments
- Adjust scores if needed

**Grade Export:**
- Export to CSV
- Export individual reports as PDF

### 3.7 Student Analytics

**Class Analytics Dashboard:**
1. Go to "Analytics" > Select class
2. View:
   - Class progress heatmap
   - Average completion rates
   - At-risk student list
   - Time spent analysis

**Individual Student View:**
- Click student name for details
- See lesson-by-lesson progress
- Assessment scores
- Activity timeline
- Generate PDF report

**Downloadable Reports:**
- Student Progress Report (PDF)
- Class Summary Report (PDF)
- Export data to CSV

### 3.8 Help Requests

**Managing Help Queue:**
1. See "Help Requests" on dashboard or menu
2. View pending requests with:
   - Student name
   - Lesson/problem
   - Wait time
   - Problem description
3. Click "Accept" to start collaboration

**Collaboration Session:**
- Join student's code environment
- See their current code
- Make edits/suggestions
- Chat or voice communicate
- Mark as resolved when done

### 3.9 Notifications & Emails

**Send Notifications:**
- Course updates
- Assessment reminders
- Custom announcements

**Email Students:**
- Individual or bulk
- Pre-built templates
- Track delivery status

---

## 4. Organization Admin Guide

### 4.1 Org Admin Dashboard

Access at `/org-admin`:
- Organization overview
- User statistics
- Department breakdown
- Quick actions

### 4.2 Department Management

**Create Department:**
1. Go to "Departments"
2. Click "Add Department"
3. Enter:
   - Name
   - Code
   - Description
   - Head of Department (optional)
4. Save

**Department Features:**
- Assign head (teacher role)
- Link classes to departments
- View department analytics

### 4.3 Class Management

**Create Class:**
1. Go to "Classes"
2. Click "Add Class"
3. Enter:
   - Name (e.g., "CS101 - Fall 2026")
   - Code (e.g., "CS101-F26")
   - Department
   - Semester
   - Capacity
4. Save

**Manage Class:**
- View enrolled students
- Assign teachers
- Assign courses
- Set semester schedule

### 4.4 User Management

**Teachers:**
- View all teachers in organization
- Approve/reject pending teachers
- Assign to classes/departments
- Revoke access if needed

**Students:**
- View all students
- Filter by class, status, activity
- Bulk import via CSV
- Export student data
- Transfer between classes

### 4.5 Academic Structure

**Academic Years:**
- Create academic years (e.g., 2025-2026)
- Set current year
- Archive past years

**Semesters:**
- Create semesters within years
- Set start/end dates
- Mark active semester
- Link courses to semesters

### 4.6 Settings

**Organization Settings:**
- Name and branding
- Organization code (for signups)
- Default settings
- Feature toggles

**Approval Settings:**
- Auto-approve students: Yes/No
- Require student ID: Yes/No
- Teacher approval workflow

---

## 5. Platform Admin Guide

### 5.1 Admin Dashboard

Access at `/admin`:
- Platform-wide statistics
- Organization list
- User totals
- System health

### 5.2 Organization Management

**Create Organization:**
1. Go to "Organizations"
2. Click "Add Organization"
3. Enter:
   - Name
   - Code (unique)
   - Type (University, College, School)
   - Contact info
4. Save

**Organization Features:**
- View all organizations
- Edit organization details
- Manage org admins
- View org analytics

### 5.3 Global User Management

- View all platform users
- Search across organizations
- Admin role assignments
- Account deactivation

### 5.4 Course Management

- View all courses
- Feature courses publicly
- Quality control
- Template management

### 5.5 System Settings

- Platform branding
- Feature flags
- Security settings
- API configuration
- Email settings

---

## 6. Features Reference

### 6.1 Gamification

| Feature | Description |
|---------|-------------|
| XP Points | Earned from lessons, assessments, contests |
| Levels | Progress through levels as XP increases |
| Streaks | Daily login/activity streaks |
| Badges | Achievement-based rewards |
| Leaderboard | Compete with classmates |

### 6.2 Real-Time Collaboration

| Feature | Description |
|---------|-------------|
| Raise Hand | Request teacher help |
| Live Code Sharing | Teacher sees student's code |
| Session Chat | Text communication |
| Code Annotations | Highlight and comment |

### 6.3 Code Execution

| Language | Version | Features |
|----------|---------|----------|
| Python | 3.10+ | Full stdlib, pip packages |
| JavaScript | Node 18+ | ES6+, npm packages |
| Java | 17+ | Full JDK |
| C++ | GCC 11+ | C++17 standard |
| C | GCC 11+ | C11 standard |

### 6.4 Assessment Types

| Type | Auto-Grade | Time Limit | Features |
|------|------------|------------|----------|
| Quiz | Yes | Optional | Quick formative |
| Test | Partial | Yes | Summative grading |
| Assignment | No | Due date | Take-home work |
| Coding Challenge | Yes | Yes | Pure programming |

### 6.5 Report Types

| Report | Format | Contents |
|--------|--------|----------|
| Student Progress | PDF/HTML | XP, lessons, assessments |
| Class Summary | PDF/HTML | All students, averages |
| Assessment Results | CSV | Scores, answers |
| Activity Log | CSV | Login, time spent |

---

## 7. Troubleshooting

### 7.1 Login Issues

**Can't log in:**
- Verify email is correct
- Reset password via "Forgot Password"
- Check if account is approved (teachers)
- Contact organization admin

**OAuth not working:**
- Ensure popup blocker is disabled
- Try a different browser
- Clear cookies and try again

### 7.2 Code Execution Problems

**Code won't run:**
- Check for syntax errors
- Verify correct language is selected
- Ensure code doesn't exceed time limit (10s)
- Check for infinite loops

**Wrong output:**
- Compare with expected output exactly
- Check for trailing whitespace/newlines
- Verify input parsing

### 7.3 Assessment Issues

**Can't start assessment:**
- Check if within time window
- Verify you haven't exceeded attempts
- Ensure you're enrolled in the class

**Timer problems:**
- Don't refresh page during timed assessment
- Auto-submit happens at 0:00
- Contact teacher if technical issues occur

### 7.4 Getting Help

**Support Channels:**
- In-app "Raise Hand" for lesson help
- Contact your teacher directly
- Email support for technical issues
- Check FAQ section

---

## Keyboard Shortcuts

| Action | Windows/Linux | Mac |
|--------|---------------|-----|
| Run Code | Ctrl + Enter | Cmd + Enter |
| Save | Ctrl + S | Cmd + S |
| Submit | Ctrl + Shift + Enter | Cmd + Shift + Enter |
| Toggle Theme | Ctrl + Shift + T | Cmd + Shift + T |

---

## Glossary

| Term | Definition |
|------|------------|
| XP | Experience Points - virtual currency for progress |
| Lesson | Single learning unit with content and code |
| Assessment | Quiz, test, or assignment for evaluation |
| Class | Group of students (batch/section) |
| Course | Collection of lessons on a topic |
| Semester | Academic term period |
| Organization | University/college/school entity |

---

*For additional help, contact your organization administrator or visit our support portal.*

**© 2026 BitByBit. All rights reserved.**
