# BitByBit Testing Guide

## 🚀 Getting Started

### Prerequisites
1. **Database Setup**
   - Run `supabase_enhanced_schema.sql` in Supabase SQL Editor (adds new tables & columns)
   - Run `course_content.sql` in Supabase SQL Editor (adds 3 courses with lessons & snippets)

2. **Start Development Server**
   ```bash
   cd bitbybit
   npm run dev
   ```
   Open http://localhost:3000

---

## ✅ Testing Checklist

### 1. **Code Editor Sync with Lesson Content**

**Test Scenario:** Verify starter code loads from database

**Steps:**
1. Navigate to any lesson (e.g., JavaScript Fundamentals → Lesson 1)
2. **Expected:** Code editor should load with lesson-specific starter code (NOT generic placeholder)
3. **Verify:** Check if the code matches the lesson's starter_code from database

**Example for JS Lesson 1:**
```javascript
// Should see this starter code:
// Create your variables here
let userName = "";
let userAge = 0;
let isStudent = false;

// Print the variables
```

✅ **PASS:** Starter code loads correctly  
❌ **FAIL:** Shows generic "Hello World" code

---

### 2. **Output Validation System**

**Test Scenario:** Only allow completion when output matches expected output

**Steps for JS Lesson 1:**

1. **Run code WITHOUT completing the task:**
   ```javascript
   let userName = "";
   let userAge = 0;
   let isStudent = false;
   // Don't print anything
   ```
   - Click "Run Code" (Ctrl+Enter)
   - **Expected:** 
     - ⚠️ Console shows: "No output detected"
     - ❌ "Complete Lesson" button is LOCKED (grayed out)
     - Console shows validation warning

2. **Run code with WRONG output:**
   ```javascript
   let userName = "Bob";
   let userAge = 30;
   let isStudent = true;
   
   console.log("Name:", userName);
   console.log("Age:", userAge);
   console.log("Is Student:", isStudent);
   ```
   - Click "Run Code"
   - **Expected:**
     - ❌ Console shows: "Output doesn't match expected result"
     - Shows "Expected:" vs "Got:" comparison
     - 💡 Shows hint to fix code
     - Button remains LOCKED

3. **Run code with CORRECT output:**
   ```javascript
   let userName = "Alice";
   let userAge = 25;
   let isStudent = true;
   
   console.log("Name:", userName);
   console.log("Age:", userAge);
   console.log("Is Student:", isStudent);
   ```
   - Click "Run Code"
   - **Expected:**
     - ✅ Console shows: "Perfect! Output matches expected result!"
     - 🎯 Shows: "You can now complete this lesson!"
     - ✅ "Complete Lesson" button turns GREEN and becomes clickable
     - Green checkmark appears in console header

4. **Try to complete WITHOUT validation:**
   - Clear console
   - Click "Complete Lesson" button (without running code)
   - **Expected:**
     - ❌ Shows error: "Cannot complete lesson yet!"
     - Shows expected output requirement

✅ **PASS:** Validation works perfectly  
❌ **FAIL:** Can complete without correct output

---

### 3. **Multi-Language Support**

**Test Scenario:** Python lessons load Python starter code and syntax highlighting

**Steps:**
1. Navigate to Python course → Python Lesson 1
2. **Expected:**
   - Code editor shows Python starter code (with `#` comments, not `//`)
   - Syntax highlighting uses Python colors
   - Language badge shows "Python" in status bar

**Example Python starter code:**
```python
# Create your variables here
user_name = ""
user_age = 0
is_coder = False

# Print the variables using f-strings
```

**Test Python validation:**
1. Complete the code correctly:
   ```python
   user_name = "Alice"
   user_age = 25
   is_coder = True
   
   print(f"Name: {user_name}")
   print(f"Age: {user_age}")
   print(f"Is Coder: {is_coder}")
   ```
2. Run code
3. **Expected:** ✅ Validation passes, button turns green

✅ **PASS:** Python works with correct highlighting  
❌ **FAIL:** Shows JavaScript syntax or wrong highlighting

---

### 4. **Code Snippets Library**

**Test Scenario:** Browse and insert code snippets

**Steps:**
1. In any JavaScript lesson, click "Snippets" button in status bar
2. **Expected:** Panel opens with JavaScript snippets (For Loop, Array Map, etc.)
3. Click "Add to Editor" on any snippet
4. **Expected:** Snippet code appends to editor
5. Switch to Python lesson, click "Snippets"
6. **Expected:** Shows Python-specific snippets

✅ **PASS:** Snippets load and insert correctly  
❌ **FAIL:** No snippets or wrong language

---

### 5. **Lesson Notes**

**Test Scenario:** Take and save notes

**Steps:**
1. Click "Notes" button in status bar
2. Type some notes
3. **Expected:** "Auto-saved" appears
4. Refresh page
5. Open notes again
6. **Expected:** Notes are preserved

✅ **PASS:** Notes save and load  
❌ **FAIL:** Notes disappear after refresh

---

### 6. **Bookmarks**

**Test Scenario:** Bookmark lessons

**Steps:**
1. Click bookmark icon (star) in status bar
2. **Expected:** Star turns yellow/gold
3. Refresh page
4. **Expected:** Star remains yellow (bookmarked)
5. Click star again
6. **Expected:** Star becomes gray (unbookmarked)

✅ **PASS:** Bookmarks persist  
❌ **FAIL:** Bookmark state lost on refresh

---

### 7. **Hints & Solutions**

**Test Scenario:** View hints and copy solution

**Steps:**
1. Click "Hints" button
2. **Expected:** Panel shows lesson-specific hints from database
3. Scroll to "Solution" section
4. **Expected:** Shows complete solution code with syntax highlighting
5. Click "Copy Solution to Editor"
6. **Expected:** Editor code replaced with solution
7. Run code
8. **Expected:** ✅ Validation passes immediately

✅ **PASS:** Hints and solution work  
❌ **FAIL:** Generic hints or solution doesn't work

---

### 8. **Keyboard Shortcuts**

**Test Scenario:** Test all shortcuts

**Shortcuts to test:**
- `Ctrl+Enter` (or `Cmd+Enter` on Mac) → Runs code
- `Ctrl+S` → Marks lesson complete (if validated)
- `?` → Opens keyboard shortcuts modal
- `Esc` → Closes all panels/modals

**Steps:**
1. Type some code
2. Press `Ctrl+Enter`
3. **Expected:** Code runs, console shows output
4. Press `?`
5. **Expected:** Shortcuts modal appears
6. Press `Esc`
7. **Expected:** Modal closes

✅ **PASS:** All shortcuts work  
❌ **FAIL:** Shortcuts don't respond

---

### 9. **AI Assistant**

**Test Scenario:** Ask AI questions

**Steps:**
1. Click "Ask AI" button
2. Type: "How do I create a variable?"
3. **Expected:** AI provides detailed response with code examples
4. Try other questions:
   - "What is a function?"
   - "I'm stuck"
   - "Error in my code"
5. **Expected:** Contextual, helpful responses

✅ **PASS:** AI responds intelligently  
❌ **FAIL:** Generic or unhelpful responses

---

### 10. **Lesson Completion Flow**

**Complete End-to-End Test:**

1. **Start fresh lesson** (not completed)
   - ✅ Code editor loads starter code
   - ✅ Console shows expected output
   - 🔒 Complete button is locked/disabled

2. **Write wrong code and run**
   - ❌ Console shows validation error
   - ❌ Shows expected vs actual output
   - 🔒 Button still locked

3. **Fix code and run again**
   - ✅ Console shows success
   - ✅ Button turns green and unlocks
   - ✅ Green checkmark in console header

4. **Click Complete Lesson**
   - ✅ Shows loading state
   - ✅ Lesson marked as complete
   - ✅ XP awarded
   - ✅ "Next Lesson" button appears
   - ✅ Success animation/message

5. **Navigate to course page**
   - ✅ Completed lesson has green highlight
   - ✅ Progress bar updated

✅ **PASS:** Complete flow works perfectly  
❌ **FAIL:** Any step fails

---

## 🐛 Common Issues & Fixes

### Issue: Starter code not loading
**Fix:** Check database - run `course_content.sql` again

### Issue: Validation not working
**Fix:** Check `expected_output` column in database has correct value

### Issue: Button always locked
**Fix:** Ensure `expectedOutput` is set and `runCode()` is called

### Issue: Snippets panel empty
**Fix:** Run `course_content.sql` to populate code_snippets table

### Issue: Notes not saving
**Fix:** Check `/api/lessons/[id]/note` endpoint is working

---

## 📊 Test Results Template

```
✅ Code editor syncs with lesson content
✅ Output validation works correctly
✅ Completion only allowed when validated
✅ Multi-language support (JS & Python)
✅ Code snippets library functional
✅ Lesson notes save and load
✅ Bookmarks persist across sessions
✅ Hints & solutions display correctly
✅ Keyboard shortcuts all work
✅ AI assistant responds intelligently
✅ Complete lesson flow works end-to-end

Total: 11/11 tests passed ✅
```

---

## 🎯 Success Criteria

The system is **production-ready** when:

1. ✅ All lessons load correct starter code
2. ✅ Validation prevents completion without correct output
3. ✅ Error messages are clear and helpful
4. ✅ Multi-language support works (JS, Python)
5. ✅ All UX features work (snippets, notes, bookmarks)
6. ✅ Keyboard shortcuts respond correctly
7. ✅ Lesson completion persists in database
8. ✅ Progress tracking updates properly

---

## 🚀 Quick Test Commands

```bash
# Start dev server
npm run dev

# Check database connection
# Go to Supabase Dashboard → SQL Editor → Run: SELECT * FROM courses;

# Test API endpoints
curl http://localhost:3000/api/lessons/js-fundamentals-1
curl http://localhost:3000/api/snippets?language=javascript
```

Happy Testing! 🎉
