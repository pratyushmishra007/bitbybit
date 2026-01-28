-- ============================================
-- BitByBit Course System Database Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- DROP EXISTING TABLES (to avoid conflicts)
-- This ensures we start fresh
DROP TABLE IF EXISTS public.lesson_progress CASCADE;
DROP TABLE IF EXISTS public.course_enrollments CASCADE;
DROP TABLE IF EXISTS public.lessons CASCADE;
DROP TABLE IF EXISTS public.courses CASCADE;

-- 1. COURSES TABLE
-- Stores all available courses
CREATE TABLE IF NOT EXISTS public.courses (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  lessons_count INTEGER DEFAULT 0,
  xp_total INTEGER DEFAULT 0,
  thumbnail_url TEXT,
  category TEXT, -- e.g., 'javascript', 'python', 'web-dev'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. LESSONS TABLE
-- Stores individual lessons within courses
CREATE TABLE IF NOT EXISTS public.lessons (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT, -- Lesson content (markdown or HTML)
  xp_reward INTEGER DEFAULT 50,
  order_index INTEGER NOT NULL, -- Order within the course (1, 2, 3...)
  duration_minutes INTEGER DEFAULT 15,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(course_id, order_index) -- Ensure no duplicate order within a course
);

-- 3. LESSON_PROGRESS TABLE (already exists, but let's ensure it has right structure)
CREATE TABLE IF NOT EXISTS public.lesson_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, lesson_id) -- User can only complete a lesson once
);

-- 4. COURSE_ENROLLMENTS TABLE (optional - track which courses users are taking)
CREATE TABLE IF NOT EXISTS public.course_enrollments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, course_id)
);

-- ============================================
-- INDEXES (for faster queries)
-- ============================================

CREATE INDEX IF NOT EXISTS idx_lessons_course_id ON public.lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_order ON public.lessons(course_id, order_index);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user ON public.lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson ON public.lesson_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_user ON public.course_enrollments(user_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;

-- COURSES: Everyone can read (courses are public)
CREATE POLICY "Anyone can view courses" ON public.courses
  FOR SELECT USING (true);

-- COURSES: Only admins/teachers can insert/update/delete
CREATE POLICY "Admins and teachers can manage courses" ON public.courses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'teacher')
    )
  );

-- LESSONS: Everyone can read
CREATE POLICY "Anyone can view lessons" ON public.lessons
  FOR SELECT USING (true);

-- LESSONS: Only admins/teachers can manage
CREATE POLICY "Admins and teachers can manage lessons" ON public.lessons
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'teacher')
    )
  );

-- LESSON_PROGRESS: Users can only view/modify their own progress
CREATE POLICY "Users can view own progress" ON public.lesson_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress" ON public.lesson_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress" ON public.lesson_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- COURSE_ENROLLMENTS: Users can only see their own enrollments
CREATE POLICY "Users can view own enrollments" ON public.course_enrollments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can enroll themselves" ON public.course_enrollments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- SEED DATA - Starter Courses
-- ============================================

-- Insert JavaScript Basics Course
INSERT INTO public.courses (id, title, description, difficulty, lessons_count, xp_total, category) VALUES
('javascript-basics', 'JavaScript Basics', 'Learn the fundamentals of JavaScript programming. Perfect for beginners starting their coding journey.', 'beginner', 5, 250, 'javascript')
ON CONFLICT (id) DO NOTHING;

-- Insert Python Fundamentals Course
INSERT INTO public.courses (id, title, description, difficulty, lessons_count, xp_total, category) VALUES
('python-fundamentals', 'Python Fundamentals', 'Master Python basics including variables, loops, functions, and data structures.', 'beginner', 5, 250, 'python')
ON CONFLICT (id) DO NOTHING;

-- Insert React Course
INSERT INTO public.courses (id, title, description, difficulty, lessons_count, xp_total, category) VALUES
('react-intro', 'Introduction to React', 'Build modern user interfaces with React. Learn components, hooks, and state management.', 'intermediate', 6, 300, 'web-dev')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SEED DATA - JavaScript Basics Lessons
-- ============================================

INSERT INTO public.lessons (id, course_id, title, description, content, xp_reward, order_index, duration_minutes) VALUES
('js-basics-01', 'javascript-basics', 'Introduction to JavaScript', 'Learn what JavaScript is and why it''s important for web development.', 
'# Introduction to JavaScript

JavaScript is a **programming language** that makes websites interactive. Without JavaScript, websites would be static and boring!

## What can JavaScript do?

- Make buttons clickable
- Show/hide elements
- Fetch data from servers
- Create animations
- Build entire web applications

## Your First JavaScript Code

```javascript
console.log("Hello, World!");
```

This simple line prints "Hello, World!" to the browser console.

## Key Concepts
- JavaScript runs in the browser
- It''s the language of the web
- Every website uses it

**Ready to dive in?** Let''s start coding!', 
50, 1, 10)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lessons (id, course_id, title, description, content, xp_reward, order_index, duration_minutes) VALUES
('js-basics-02', 'javascript-basics', 'Variables and Data Types', 'Understand how to store and use data in JavaScript.', 
'# Variables and Data Types

Variables are like **containers** that store information.

## Creating Variables

```javascript
let name = "Alice";
let age = 25;
let isStudent = true;
```

## Three Ways to Declare Variables

1. `let` - Can be changed later
2. `const` - Cannot be changed (constant)
3. `var` - Old way (avoid using)

## Data Types

JavaScript has several types of data:

- **String**: Text → `"Hello"`
- **Number**: Numbers → `42`, `3.14`
- **Boolean**: True/False → `true`, `false`
- **Null**: Intentionally empty → `null`
- **Undefined**: Not assigned → `undefined`

## Example

```javascript
const firstName = "John";
let score = 100;
score = score + 10; // Now score is 110
```

**Practice**: Try creating your own variables!', 
50, 2, 15)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lessons (id, course_id, title, description, content, xp_reward, order_index, duration_minutes) VALUES
('js-basics-03', 'javascript-basics', 'Functions', 'Learn how to create reusable blocks of code.', 
'# Functions

Functions are **reusable blocks of code** that perform specific tasks.

## Creating a Function

```javascript
function greet(name) {
  return "Hello, " + name + "!";
}

// Using the function
greet("Alice"); // Returns: "Hello, Alice!"
```

## Why Functions?

- **Reusability**: Write once, use many times
- **Organization**: Keep code clean and structured
- **Debugging**: Easier to find and fix errors

## Modern Syntax (Arrow Functions)

```javascript
const add = (a, b) => a + b;

add(5, 3); // Returns: 8
```

## Example: Calculator Function

```javascript
function multiply(x, y) {
  return x * y;
}

multiply(4, 5); // Returns: 20
```

**Challenge**: Create a function that calculates the area of a rectangle!', 
50, 3, 20)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lessons (id, course_id, title, description, content, xp_reward, order_index, duration_minutes) VALUES
('js-basics-04', 'javascript-basics', 'Conditional Statements', 'Control the flow of your code with if/else statements.', 
'# Conditional Statements

Make decisions in your code using **if/else** statements.

## Basic If Statement

```javascript
let age = 18;

if (age >= 18) {
  console.log("You can vote!");
}
```

## If/Else

```javascript
let temperature = 25;

if (temperature > 30) {
  console.log("It''s hot!");
} else {
  console.log("It''s nice!");
}
```

## If/Else If/Else

```javascript
let score = 85;

if (score >= 90) {
  console.log("A grade");
} else if (score >= 80) {
  console.log("B grade");
} else {
  console.log("Keep studying!");
}
```

## Comparison Operators

- `===` - Equal to
- `!==` - Not equal to
- `>` - Greater than
- `<` - Less than
- `>=` - Greater than or equal
- `<=` - Less than or equal

**Try it**: Write code to check if a number is even or odd!', 
50, 4, 18)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lessons (id, course_id, title, description, content, xp_reward, order_index, duration_minutes) VALUES
('js-basics-05', 'javascript-basics', 'Loops', 'Repeat actions efficiently with loops.', 
'# Loops

Loops let you **repeat code** multiple times without writing it over and over.

## For Loop

```javascript
for (let i = 0; i < 5; i++) {
  console.log("Count: " + i);
}
// Prints: 0, 1, 2, 3, 4
```

## While Loop

```javascript
let count = 0;

while (count < 3) {
  console.log("Hello!");
  count++;
}
// Prints "Hello!" 3 times
```

## Looping Through Arrays

```javascript
const fruits = ["apple", "banana", "orange"];

for (let i = 0; i < fruits.length; i++) {
  console.log(fruits[i]);
}
```

## Modern Way: forEach

```javascript
fruits.forEach(fruit => {
  console.log(fruit);
});
```

## Use Cases

- Process lists of items
- Repeat animations
- Search through data
- Generate HTML elements

**Exercise**: Use a loop to sum numbers from 1 to 10!', 
50, 5, 22)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SEED DATA - Python Fundamentals Lessons
-- ============================================

INSERT INTO public.lessons (id, course_id, title, description, content, xp_reward, order_index, duration_minutes) VALUES
('python-01', 'python-fundamentals', 'Getting Started with Python', 'Learn the basics of Python syntax and structure.', 
'# Getting Started with Python

Python is a **beginner-friendly** programming language known for its simple syntax.

## Why Python?

- Easy to learn and read
- Powerful for data science, AI, web development
- Huge community and libraries

## Your First Python Program

```python
print("Hello, World!")
```

## Python Syntax Rules

- No semicolons needed
- Indentation matters (use 4 spaces)
- Comments start with `#`

## Example

```python
# This is a comment
name = "Alice"
print(f"Hello, {name}!")
```

**Let''s start coding in Python!**', 
50, 1, 12)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lessons (id, course_id, title, description, content, xp_reward, order_index, duration_minutes) VALUES
('python-02', 'python-fundamentals', 'Variables and Types in Python', 'Master Python data types and variables.', 
'# Variables and Types in Python

Python makes it easy to work with different types of data.

## Creating Variables

```python
name = "Bob"
age = 30
height = 5.9
is_student = False
```

## Data Types

- `str` - Strings (text)
- `int` - Integers (whole numbers)
- `float` - Decimals
- `bool` - True/False

## Type Checking

```python
type(42)        # <class ''int''>
type("hello")   # <class ''str''>
```

## Type Conversion

```python
age = "25"
age_number = int(age)  # Convert to integer
```

**Practice**: Create variables of each type!', 
50, 2, 15)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lessons (id, course_id, title, description, content, xp_reward, order_index, duration_minutes) VALUES
('python-03', 'python-fundamentals', 'Lists and Dictionaries', 'Work with Python collections.', 
'# Lists and Dictionaries

Store multiple values in a single variable.

## Lists

```python
fruits = ["apple", "banana", "cherry"]
print(fruits[0])  # apple
fruits.append("orange")
```

## Dictionaries

```python
person = {
  "name": "Alice",
  "age": 25,
  "city": "NYC"
}
print(person["name"])  # Alice
```

## List Operations

```python
numbers = [1, 2, 3, 4, 5]
numbers.pop()      # Remove last item
numbers.reverse()  # Reverse order
len(numbers)       # Get length
```

**Challenge**: Create a dictionary for a book with title, author, and year!', 
50, 3, 20)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lessons (id, course_id, title, description, content, xp_reward, order_index, duration_minutes) VALUES
('python-04', 'python-fundamentals', 'Python Functions', 'Create reusable code with functions.', 
'# Python Functions

Functions help organize and reuse code.

## Defining Functions

```python
def greet(name):
    return f"Hello, {name}!"

result = greet("Alice")
print(result)  # Hello, Alice!
```

## Parameters and Arguments

```python
def add(a, b):
    return a + b

total = add(5, 3)  # 8
```

## Default Parameters

```python
def power(base, exponent=2):
    return base ** exponent

power(5)     # 25 (5^2)
power(5, 3)  # 125 (5^3)
```

**Exercise**: Write a function to calculate circle area!', 
50, 4, 18)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lessons (id, course_id, title, description, content, xp_reward, order_index, duration_minutes) VALUES
('python-05', 'python-fundamentals', 'Control Flow in Python', 'Master if statements and loops.', 
'# Control Flow in Python

Control the flow of your program with conditionals and loops.

## If Statements

```python
age = 18
if age >= 18:
    print("Adult")
else:
    print("Minor")
```

## For Loops

```python
for i in range(5):
    print(i)  # 0, 1, 2, 3, 4
```

## While Loops

```python
count = 0
while count < 3:
    print("Hello")
    count += 1
```

## Looping Through Lists

```python
fruits = ["apple", "banana"]
for fruit in fruits:
    print(fruit)
```

**Practice**: Use a loop to find the sum of a list of numbers!', 
50, 5, 20)
ON CONFLICT (id) DO NOTHING;

-- Success message
SELECT 'Database schema created successfully! ✅' as status;
