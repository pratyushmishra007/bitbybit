# Auth Flow Analysis & Required Changes

## Current Auth Flow

### Signup Types
1. **Individual Learner** → Auto-approved, role: `student`, no organization
2. **Institutional Student** → Pending approval, role: `student`, org + class + studentId
3. **Teacher** → Pending approval, role: `teacher`, org only

### Flow
```
Signup Page → Basic Info → [Org Code] → [Class Selection] → Create Account
                                ↓
                     API: /api/auth/signup
                                ↓
                     Supabase Auth + users table + class_enrollments
```

---

## Issues for Academic System

### 1. Role Confusion
| Signup Type | Current Role | Should Be |
|-------------|--------------|-----------|
| Individual Learner | `student` | `learner` (new) or `visitor` |
| Institutional Student | `student` | `student` ✓ |
| Teacher | `teacher` | `teacher` ✓ |
| Mentor/HOD/Admin | N/A (no signup) | Created by org_admin |

**Problem:** Individual learners and institutional students both get "student" role, but:
- Individual learners use Global Platform (problem-solving, contests)
- Institutional students use Academic System (classes, grades, semesters)

### 2. Class vs Batch Gap
| Current System | Academic System |
|----------------|-----------------|
| `classes` table | `student_batches` table |
| `class_enrollments` | `student_registrations` |
| Class code | Batch = Program + Year + Department |

**Problem:** Signup uses `classes` table, but academic students need `student_batches` + `student_registrations`.

### 3. Missing Data in Signup
Academic students need:
- `program_id` (B.Tech, MCA, etc.)
- `department_id` (CSE, ECE, etc.)
- `batch_id` (auto-selected based on program + admission year)
- `enrollment_number` (auto-generated)
- `division` (A, B, C, etc.)

Current signup only collects:
- `organization_id` ✓
- `class_id` (wrong table)
- `student_id` (manual entry, not enrollment_number)

---

## Required Changes

### A. Update Signup Page (`app/auth/signup/page.tsx`)

```tsx
// Change Step 1 options
type SignupType = "global_learner" | "academic_student" | "teacher" | null;

// For academic_student, after org verification:
// 1. Fetch programs for organization
// 2. Fetch departments for organization
// 3. Show available batches based on program + department
// 4. Collect division (A, B, C, etc.)
```

### B. Update Signup API (`app/api/auth/signup/route.ts`)

```typescript
// For academic students:
if (signupType === "academic_student") {
  // 1. Create user with role "student"
  // 2. Find or create batch for program + department + admission year
  // 3. Generate enrollment number using generate_enrollment_number()
  // 4. Create student_registration entry
}

// For global learners:
if (signupType === "global_learner") {
  // 1. Create user with role "learner" or "visitor"
  // 2. No organization, no batch, no registration
  // 3. Auto-approve
}
```

### C. Add New API Endpoints

```
/api/auth/programs?organizationId=xxx     → List programs
/api/auth/departments?organizationId=xxx  → List departments
/api/auth/batches?programId=xxx&deptId=xxx → List available batches
```

### D. Update NextAuth Session (`types/next-auth.d.ts`)

```typescript
interface Session {
  user: {
    // ... existing fields
    batchId?: string;        // NEW
    programId?: string;      // NEW
    departmentId?: string;   // NEW
    enrollmentNumber?: string; // NEW
    currentSemester?: number;  // NEW
    registrationId?: string;   // NEW
  };
}
```

### E. Update NextAuth Callbacks

In `[...nextauth]/route.ts` session callback:
```typescript
// Fetch student_registration data for academic students
if (userData?.role === 'student' && userData?.organization_id) {
  const { data: registration } = await supabase
    .from("student_registrations")
    .select("*, batch:student_batches(*)")
    .eq("user_id", session.user.id)
    .single();
  
  if (registration) {
    session.user.registrationId = registration.id;
    session.user.batchId = registration.batch_id;
    session.user.programId = registration.program_id;
    session.user.departmentId = registration.department_id;
    session.user.enrollmentNumber = registration.enrollment_number;
    session.user.currentSemester = registration.current_semester;
  }
}
```

---

## Implementation Priority

1. **Phase 1 (Now):** Document changes, keep current flow working
2. **Phase 2:** Update signup for academic students (add program/batch selection)
3. **Phase 3:** Update NextAuth session to include registration data
4. **Phase 4:** Differentiate "learner" role for global platform users

---

## Migration Strategy

For existing users:
- Institutional students without `student_registration` → need admin to create registration
- Individual learners → could be migrated to "learner" role via script
- Teachers → no change needed

---

## Files to Modify

| File | Changes |
|------|---------|
| `app/auth/signup/page.tsx` | Add program/batch selection steps |
| `app/api/auth/signup/route.ts` | Handle academic student registration |
| `app/api/auth/[...nextauth]/route.ts` | Fetch registration data in session |
| `types/next-auth.d.ts` | Add new session fields |
| `app/api/auth/programs/route.ts` | NEW - List programs |
| `app/api/auth/batches/route.ts` | NEW - List batches |

