-- ============================================
-- BitByBit Course Content - UPSERT Version
-- Safe to run multiple times (no duplicate errors)
-- ============================================

-- Clear existing data
TRUNCATE TABLE public.code_snippets CASCADE;
TRUNCATE TABLE public.lessons CASCADE;
TRUNCATE TABLE public.courses CASCADE;

-- ============================================
-- COURSE 1: JavaScript Fundamentals
-- ============================================

INSERT INTO public.courses (id, title, description, difficulty, lessons_count, xp_total, category) VALUES
('js-fundamentals', 'JavaScript Fundamentals', 'Master the basics of JavaScript programming. Learn variables, functions, loops, and objects through hands-on coding exercises.', 'beginner', 10, 500, 'javascript');

INSERT INTO public.lessons (id, course_id, title, description, content, xp_reward, order_index, duration_minutes, language, starter_code, solution_code, hints, expected_output, test_cases) VALUES
('js-fundamentals-1', 'js-fundamentals', 'Variables and Data Types', 'Learn how to store and work with different types of data in JavaScript', '# Variables and Data Types

## What are Variables?
Variables are containers for storing data values.

### Variable Declaration
```javascript
let age = 25;
const name = "Alice";
```

## Challenge
Create three variables: userName, userAge, isStudent and print them.', 50, 1, 15, 'javascript',
'// Create your variables here
let userName = "";
let userAge = 0;
let isStudent = false;

// Print the variables
',
'// Create your variables here
let userName = "Alice";
let userAge = 25;
let isStudent = true;

// Print the variables
console.log("Name:", userName);
console.log("Age:", userAge);
console.log("Is Student:", isStudent);',
$$["💡 Use let or const to declare variables", "💡 Strings need quotes around them", "💡 Use console.log() to print values"]$$::jsonb,
'Name: Alice
Age: 25
Is Student: true',
$$[]$$::jsonb);

INSERT INTO public.lessons (id, course_id, title, description, content, xp_reward, order_index, duration_minutes, language, starter_code, solution_code, hints, expected_output, test_cases) VALUES
('js-fundamentals-2', 'js-fundamentals', 'Functions - Reusable Code Blocks', 'Learn how to create and use functions to organize your code', '# Functions in JavaScript

## What is a Function?
A function is a reusable block of code.

## Challenge
Create a function calculateArea that takes width and height and returns the area.', 50, 2, 20, 'javascript',
'// Create your calculateArea function here


// Test your function
let area = calculateArea(10, 5);
console.log("Area:", area);',
'// Create your calculateArea function here
function calculateArea(width, height) {
  return width * height;
}

// Test your function
let area = calculateArea(10, 5);
console.log("Area:", area);',
$$["💡 Use the function keyword", "💡 Use return to send a value back", "💡 Multiply width and height using *"]$$::jsonb,
'Area: 50',
$$[]$$::jsonb);

INSERT INTO public.lessons (id, course_id, title, description, content, xp_reward, order_index, duration_minutes, language, starter_code, solution_code, hints, expected_output, test_cases) VALUES
('js-fundamentals-3', 'js-fundamentals', 'Making Decisions with If/Else', 'Learn how to make your code make decisions based on conditions', '# Conditional Statements

## If/Else If/Else
```javascript
if (score >= 90) {
  console.log("Grade: A");
} else if (score >= 80) {
  console.log("Grade: B");
}
```

## Challenge
Create a function checkAge that prints "Adult" (>=18), "Teenager" (>=13), or "Child".', 50, 3, 20, 'javascript',
'// Create your checkAge function here


// Test your function
checkAge(25);
checkAge(15);
checkAge(10);',
'// Create your checkAge function here
function checkAge(age) {
  if (age >= 18) {
    console.log("Adult");
  } else if (age >= 13) {
    console.log("Teenager");
  } else {
    console.log("Child");
  }
}

// Test your function
checkAge(25);
checkAge(15);
checkAge(10);',
$$["💡 Use if/else if/else structure", "💡 Check for >= 18 first, then >= 13"]$$::jsonb,
'Adult
Teenager
Child',
$$[]$$::jsonb);

-- ============================================
-- COURSE 2: Python Programming Basics
-- ============================================

INSERT INTO public.courses (id, title, description, difficulty, lessons_count, xp_total, category) VALUES
('python-basics', 'Python Programming Basics', 'Learn Python from scratch! Master variables, functions, loops, and data structures.', 'beginner', 10, 500, 'python');

INSERT INTO public.lessons (id, course_id, title, description, content, xp_reward, order_index, duration_minutes, language, starter_code, solution_code, hints, expected_output, test_cases) VALUES
('python-basics-1', 'python-basics', 'Python Variables and Print', 'Learn how to create variables and print output in Python', '# Variables and Print in Python

## Variables
```python
name = "Alice"
age = 25
is_student = True
```

## Challenge
Create user_name, user_age, is_coder variables and print them using f-strings.', 50, 1, 15, 'python',
'# Create your variables here
user_name = ""
user_age = 0
is_coder = False

# Print the variables using f-strings
',
'# Create your variables here
user_name = "Alice"
user_age = 25
is_coder = True

# Print the variables using f-strings
print(f"Name: {user_name}")
print(f"Age: {user_age}")
print(f"Is Coder: {is_coder}")',
$$["💡 Use f-strings: f'Text {variable}'", "💡 Python is case-sensitive: True not true"]$$::jsonb,
'Name: Alice
Age: 25
Is Coder: True',
$$[]$$::jsonb);

INSERT INTO public.lessons (id, course_id, title, description, content, xp_reward, order_index, duration_minutes, language, starter_code, solution_code, hints, expected_output, test_cases) VALUES
('python-basics-2', 'python-basics', 'Python Functions', 'Create reusable code with Python functions', '# Functions in Python

## Defining Functions
```python
def greet(name):
    return f"Hello, {name}!"
```

## Challenge
Create calculate_rectangle_area function that takes width and height, returns area.', 50, 2, 20, 'python',
'# Create your calculate_rectangle_area function here


# Test your function
area = calculate_rectangle_area(12, 8)
print(f"Area: {area}")',
'# Create your calculate_rectangle_area function here
def calculate_rectangle_area(width, height):
    return width * height

# Test your function
area = calculate_rectangle_area(12, 8)
print(f"Area: {area}")',
$$["💡 Use def keyword", "💡 Don't forget the colon :", "💡 Indentation matters!"]$$::jsonb,
'Area: 96',
$$[]$$::jsonb);

-- ============================================
-- COURSE 3: Web Development Fundamentals
-- ============================================

INSERT INTO public.courses (id, title, description, difficulty, lessons_count, xp_total, category) VALUES
('web-dev-fundamentals', 'Web Development Fundamentals', 'Build modern web applications! Learn JavaScript DOM manipulation.', 'intermediate', 8, 400, 'web-dev');

INSERT INTO public.lessons (id, course_id, title, description, content, xp_reward, order_index, duration_minutes, language, starter_code, solution_code, hints, expected_output, test_cases) VALUES
('web-dev-1', 'web-dev-fundamentals', 'DOM Manipulation Basics', 'Learn how to interact with web page elements using JavaScript', '# DOM Manipulation

## Selecting Elements
```javascript
const header = document.querySelector("#header");
```

## Challenge
Create pageTitle and buttonColor variables and print them.', 50, 1, 25, 'javascript',
'// Simulate DOM manipulation
let pageTitle = "";
let buttonColor = "";

// Print the values
',
'// Simulate DOM manipulation
let pageTitle = "Welcome";
let buttonColor = "blue";

// Print the values
console.log("Page Title:", pageTitle);
console.log("Button Color:", buttonColor);',
$$["💡 This is simplified for practice", "💡 Just create variables and print them"]$$::jsonb,
'Page Title: Welcome
Button Color: blue',
$$[]$$::jsonb);

-- ============================================
-- CODE SNIPPETS LIBRARY
-- ============================================

INSERT INTO public.code_snippets (title, description, language, code, category, difficulty, tags) VALUES
('For Loop', 'Basic for loop to iterate a specific number of times', 'javascript', 
'for (let i = 0; i < 10; i++) {
  console.log(i);
}', 'loops', 'beginner', ARRAY['loop', 'for', 'iteration']),

('Array Map', 'Transform array elements using map', 'javascript',
'const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map(num => num * 2);
console.log(doubled);', 'arrays', 'intermediate', ARRAY['array', 'map', 'transform']),

('Array Filter', 'Filter array elements based on condition', 'javascript',
'const numbers = [1, 2, 3, 4, 5, 6];
const evens = numbers.filter(num => num % 2 === 0);
console.log(evens);', 'arrays', 'intermediate', ARRAY['array', 'filter', 'condition']),

('Arrow Function', 'Modern function syntax', 'javascript',
'const add = (a, b) => a + b;', 'functions', 'beginner', ARRAY['function', 'arrow', 'es6']),

('For Loop', 'Iterate over a range of numbers', 'python',
'for i in range(10):
    print(i)', 'loops', 'beginner', ARRAY['loop', 'for', 'range']),

('List Comprehension', 'Create lists using comprehension', 'python',
'numbers = [1, 2, 3, 4, 5]
doubled = [num * 2 for num in numbers]
print(doubled)', 'lists', 'intermediate', ARRAY['list', 'comprehension', 'transform']),

('Dictionary', 'Working with key-value pairs', 'python',
'person = {
    "name": "Alice",
    "age": 25
}
print(person["name"])', 'dictionaries', 'beginner', ARRAY['dict', 'dictionary', 'key-value']);
