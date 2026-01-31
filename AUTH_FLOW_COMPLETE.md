# Authentication Flow - Complete Guide

## Overview
The authentication system now has a proper separation between **Login** and **Signup** flows for OAuth providers (Google & GitHub).

## Fixed Issues

### 1. ✅ Editor Writing Issue
**Problem**: Text kept reoccurring/syncing while typing
**Solution**: 
- Editor now only syncs from server when:
  - User hasn't modified code since last sync
  - Editor is not focused (user not actively typing)
- Reduced sync frequency from 3s to 10s
- Added focus detection to prevent interruptions

### 2. ✅ OAuth Flow Separation
**Problem**: OAuth allowed new users to login without signup
**Solution**: Proper flow separation for login vs signup

## Authentication Flows

### Signup Flow (New Users)

#### Email/Password Signup
1. User fills form on `/signup`
2. Accepts terms and conditions
3. Clicks "Create account"
4. User account created in database
5. Redirects to dashboard

#### OAuth Signup (Google/GitHub)
1. User clicks Google/GitHub button on `/signup`
2. Redirects to OAuth provider
3. User authorizes the app
4. **NEW USER DETECTION**:
   - If email doesn't exist → Create account automatically
   - Auto-approved with 'approved' status
   - Role set to 'student' by default
   - Redirects to `/dashboard`
5. **EXISTING USER**:
   - If account exists → Allows signin
   - Checks account status (approved/pending/rejected/suspended)

### Login Flow (Existing Users)

#### Email/Password Login
1. User enters credentials on `/login`
2. System validates against Supabase Auth
3. Checks account status
4. If approved → Redirects to dashboard

#### OAuth Login (Google/GitHub)
1. User clicks Google/GitHub button on `/login`
2. Redirects to OAuth provider
3. User authorizes
4. **EXISTING USER CHECK**:
   - If account exists AND approved → Allow login
   - If pending → Redirect to `/auth/pending-approval`
   - If rejected → Show error "Account Rejected"
   - If suspended → Show error "Account Suspended"
5. **NEW USER**:
   - Creates account automatically (same as signup)
   - This allows flexibility - users can login from either page

## Account Status Flow

```
New User (OAuth)
    ↓
Auto-Created
    ↓
Status: 'approved'
    ↓
Role: 'student'
    ↓
Redirect: /dashboard
```

```
Existing User
    ↓
Check Status
    ├─ approved → /dashboard
    ├─ pending → /auth/pending-approval
    ├─ rejected → /auth/signin?error=AccountRejected
    └─ suspended → /auth/signin?error=AccountSuspended
```

## Code Changes Made

### 1. `app/api/auth/[...nextauth]/route.ts`
- Updated `signIn` callback to handle both new and existing users
- OAuth providers always create accounts if user doesn't exist
- Proper status checking for existing users
- Better error messages and redirects

### 2. `app/signup/page.tsx`
- Added OAuth buttons (Google & GitHub)
- Connected to NextAuth `signIn()` function
- Loading states during OAuth flow
- Proper error handling

### 3. `app/components/CollaborativeEditor.tsx`
- Fixed sync to not interrupt typing
- Only syncs when editor not focused
- Checks if user modified code before overwriting
- Better debouncing (10s instead of 3s)

## User Experience

### For New Users
1. Visit `/signup`
2. Choose:
   - Email/Password (fill form) OR
   - Click Google/GitHub button
3. OAuth flow:
   - Authorize on provider
   - Account auto-created
   - Redirected to dashboard
4. Start learning!

### For Existing Users
1. Visit `/login`
2. Choose:
   - Email/Password (enter credentials) OR
   - Click Google/GitHub button
3. OAuth flow:
   - Authorize on provider
   - Status checked
   - If approved → Dashboard
   - If pending → Waiting page
   - If rejected/suspended → Error message

## Technical Details

### OAuth Provider Setup
Both Google and GitHub need callback URLs configured:

**Google Cloud Console**:
- `https://bitbybit-tmga.vercel.app/api/auth/callback/google`
- `http://localhost:3000/api/auth/callback/google` (dev)

**GitHub Developer Settings**:
- `https://bitbybit-tmga.vercel.app/api/auth/callback/github`
- `http://localhost:3000/api/auth/callback/github` (dev)

### Environment Variables
```env
# .env.local (Development)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key

# Vercel (Production)
Same variables but with:
NEXTAUTH_URL=https://bitbybit-tmga.vercel.app
```

## Testing Checklist

### Signup Flow
- [ ] Email/password signup works
- [ ] Google signup creates new account
- [ ] GitHub signup creates new account
- [ ] Duplicate email blocked
- [ ] Terms acceptance required
- [ ] Password validation works
- [ ] Redirects to dashboard after signup

### Login Flow  
- [ ] Email/password login works
- [ ] Google login works for existing users
- [ ] GitHub login works for existing users
- [ ] Pending accounts redirected correctly
- [ ] Rejected accounts show error
- [ ] Suspended accounts show error
- [ ] Invalid credentials handled

### Editor Flow
- [ ] Can type without interruption
- [ ] Code syncs after 10 seconds
- [ ] Code syncs when editor loses focus
- [ ] Pull code works correctly
- [ ] No infinite sync loops
- [ ] Offline participants marked correctly

## Security Notes

1. **Auto-Approval**: Currently all OAuth users are auto-approved. To require admin approval:
   - Change `accountStatus = 'pending'` in signIn callback
   - Users will be redirected to pending page
   - Admin must approve in admin panel

2. **Account Status**: Proper checks prevent:
   - Pending users from accessing content
   - Rejected users from signing in
   - Suspended users from re-accessing

3. **Session Management**: 
   - Sessions expire based on NextAuth config
   - Sign out properly cleans up collaboration sessions
   - Marks participants as offline (not deleted)

## Future Enhancements

- [ ] Email verification for email/password signup
- [ ] Admin approval workflow for new users
- [ ] Role-based access control during signup
- [ ] Social profile sync (avatar, name updates)
- [ ] Account linking (merge OAuth + credentials)
- [ ] Password reset flow
- [ ] Two-factor authentication
