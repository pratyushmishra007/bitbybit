-- ============================================
-- BitByBit Course Content - 3 Complete Courses
-- JavaScript, Python, and Web Development
-- ============================================

-- Clear existing data (optional - remove if you want to keep existing)
-- DELETE FROM public.lessons;
-- DELETE FROM public.courses;

-- ============================================
-- COURSE 1: JavaScript Fundamentals
-- ============================================

INSERT INTO public.courses (id, title, description, difficulty, lessons_count, xp_total, category) VALUES
('js-fundamentals', 'JavaScript Fundamentals', 'Master the basics of JavaScript programming. Learn variables, functions, loops, and objects through hands-on coding exercises.', 'beginner', 10, 500, 'javascript');

-- Lesson 1: Variables and Data Types
INSERT INTO public.lessons (
  id, course_id, title, description, content, xp_reward, order_index, duration_minutes,
  language, starter_code, solution_code, hints, expected_output, test_cases
) VALUES (
  'js-fundamentals-1',
  'js-fundamentals',
  'Variables and Data Types',
  'Learn how to store and work with different types of data in JavaScript',
  '# Variables and Data Types

## What are Variables?

Variables are containers for storing data values. In JavaScript, we use `let`, `const`, and `var` to declare variables.

### Variable Declaration

```javascript
let age = 25;           // Can be changed
const name = "Alice";   // Cannot be changed
var city = "New York";  // Old way (avoid in modern JS)
```

## Data Types

JavaScript has several primitive data types:

### 1. **Numbers**
```javascript
let score = 100;
let price = 19.99;
let negative = -42;
```

### 2. **Strings**
```javascript
let greeting = "Hello";
let message = ''Welcome!'';
let template = `Hello, ${name}!`; // Template literal
```

### 3. **Booleans**
```javascript
let isActive = true;
let isCompleted = false;
```

### 4. **Undefined and Null**
```javascript
let notDefined;      // undefined
let empty = null;    // null (intentionally empty)
```

## Challenge

Create three variables:
- A string variable `userName` with your name
- A number variable `userAge` with your age
- A boolean variable `isStudent` set to true or false

Then print each variable using `console.log()`.',
  50,
  1,
  15,
  'javascript',
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
  $$["💡 Use let or const to declare variables", "💡 Strings need quotes around them", "💡 Use console.log() to print values", "💡 You can print multiple values: console.log('Name:', userName)"]$$::jsonb,
  'Name: Alice
Age: 25
Is Student: true',
  $$[
    {"input": "", "expectedOutput": "Name:", "description": "Should print name"},
    {"input": "", "expectedOutput": "Age:", "description": "Should print age"},
    {"input": "", "expectedOutput": "Student:", "description": "Should print student status"}
  ]$$::jsonb
);

-- Lesson 2: Functions
INSERT INTO public.lessons (
  id, course_id, title, description, content, xp_reward, order_index, duration_minutes,
  language, starter_code, solution_code, hints, expected_output, test_cases
) VALUES (
  'js-fundamentals-2',
  'js-fundamentals',
  'Functions - Reusable Code Blocks',
  'Learn how to create and use functions to organize your code',
  '# Functions in JavaScript

## What is a Function?

A function is a reusable block of code that performs a specific task.

### Function Declaration

```javascript
function greet(name) {
  return "Hello, " + name + "!";
}

// Call the function
console.log(greet("Alice")); // "Hello, Alice!"
```

### Arrow Functions (Modern Way)

```javascript
const greet = (name) => {
  return "Hello, " + name + "!";
};

// Shorter version (implicit return)
const greet = (name) => "Hello, " + name + "!";
```

## Parameters and Arguments

```javascript
function add(a, b) {  // a and b are parameters
  return a + b;
}

let result = add(5, 3);  // 5 and 3 are arguments
console.log(result);     // 8
```

## Return Values

Functions can return values using the `return` keyword:

```javascript
function multiply(x, y) {
  return x * y;
}

let product = multiply(4, 5);
console.log(product); // 20
```

## Challenge

Create a function called `calculateArea` that:
- Takes two parameters: `width` and `height`
- Returns the area (width × height)
- Test it by calculating the area of a 10×5 rectangle',
  50,
  2,
  20,
  'javascript',
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
  $$["💡 Use the function keyword to declare a function", "💡 Parameters go inside the parentheses", "💡 Use return to send a value back", "💡 Multiply width and height using the * operator"]$$::jsonb,
  'Area: 50',
  $$[
    {"input": "10, 5", "expectedOutput": "50", "description": "Should calculate 10 × 5 = 50"}
  ]$$::jsonb
);

-- Lesson 3: Conditional Statements
INSERT INTO public.lessons (
  id, course_id, title, description, content, xp_reward, order_index, duration_minutes,
  language, starter_code, solution_code, hints, expected_output, test_cases
) VALUES (
  'js-fundamentals-3',
  'js-fundamentals',
  'Making Decisions with If/Else',
  'Learn how to make your code make decisions based on conditions',
  '# Conditional Statements

## If Statements

Make decisions in your code based on conditions:

```javascript
let age = 18;

if (age >= 18) {
  console.log("You are an adult");
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
  console.log("Grade: A");
} else if (score >= 80) {
  console.log("Grade: B");
} else if (score >= 70) {
  console.log("Grade: C");
} else {
  console.log("Grade: F");
}
```

## Comparison Operators

- `===` Equal to
- `!==` Not equal to
- `>` Greater than
- `<` Less than
- `>=` Greater than or equal
- `<=` Less than or equal

## Challenge

Create a function `checkAge` that:
- Takes an `age` parameter
- If age >= 18, print "Adult"
- If age >= 13, print "Teenager"
- Otherwise, print "Child"',
  50,
  3,
  20,
  'javascript',
  '// Create your checkAge function here


// Test your function
checkAge(25);  // Should print "Adult"
checkAge(15);  // Should print "Teenager"
checkAge(10);  // Should print "Child"',
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
checkAge(25);  // Should print "Adult"
checkAge(15);  // Should print "Teenager"
checkAge(10);  // Should print "Child"',
  $$["💡 Use if/else if/else structure", "💡 Check for >= 18 first, then >= 13", "💡 The else clause handles all other cases", "💡 Use console.log() to print the result"]$$::jsonb,
  'Adult
Teenager
Child',
  $$[]$$::jsonb
);

-- ============================================
-- COURSE 2: Python Programming Basics
-- ============================================

INSERT INTO public.courses (id, title, description, difficulty, lessons_count, xp_total, category) VALUES
('python-basics', 'Python Programming Basics', 'Learn Python from scratch! Master variables, functions, loops, and data structures with practical examples.', 'beginner', 10, 500, 'python');

-- Lesson 1: Python Variables and Print
INSERT INTO public.lessons (
  id, course_id, title, description, content, xp_reward, order_index, duration_minutes,
  language, starter_code, solution_code, hints, expected_output, test_cases
) VALUES (
  'python-basics-1',
  'python-basics',
  'Python Variables and Print',
  'Learn how to create variables and print output in Python',
  '# Variables and Print in Python

## Variables in Python

Python makes it easy to create variables - no need for `let` or `const`:

```python
name = "Alice"
age = 25
is_student = True
```

## The print() Function

```python
print("Hello, World!")
print("My name is", name)
print(f"I am {age} years old")  # f-string (formatted string)
```

## Data Types

```python
# Numbers
score = 100
price = 19.99

# Strings
message = "Hello"
message = ''Hello''
message = """Multi
line string"""

# Booleans
is_active = True
is_completed = False
```

## Challenge

Create three variables:
- `user_name` with your name
- `user_age` with your age
- `is_coder` set to True

Print them using f-strings.',
  50,
  1,
  15,
  'python',
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
  $$["💡 No need for let or const in Python", "💡 Use f-strings: f'Text {variable}'", "💡 Python is case-sensitive: True not true", "💡 Use print() function to display output"]$$::jsonb,
  'Name: Alice
Age: 25
Is Coder: True',
  $$[]$$::jsonb
);

-- Lesson 2: Python Functions
INSERT INTO public.lessons (
  id, course_id, title, description, content, xp_reward, order_index, duration_minutes,
  language, starter_code, solution_code, hints, expected_output, test_cases
) VALUES (
  'python-basics-2',
  'python-basics',
  'Python Functions',
  'Create reusable code with Python functions',
  '# Functions in Python

## Defining Functions

```python
def greet(name):
    return f"Hello, {name}!"

# Call the function
message = greet("Alice")
print(message)  # Hello, Alice!
```

## Parameters and Return Values

```python
def add(a, b):
    result = a + b
    return result

total = add(5, 3)
print(total)  # 8
```

## Default Parameters

```python
def greet(name="Guest"):
    return f"Hello, {name}!"

print(greet())         # Hello, Guest!
print(greet("Alice"))  # Hello, Alice!
```

## Challenge

Create a function `calculate_rectangle_area` that:
- Takes `width` and `height` as parameters
- Returns the area (width × height)
- Test it with a 12×8 rectangle',
  50,
  2,
  20,
  'python',
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
  $$["💡 Use def keyword to define functions", "💡 Don't forget the colon : after the function definition", "💡 Indentation matters in Python!", "💡 Use return to send a value back"]$$::jsonb,
  'Area: 96',
  $$[]$$::jsonb
);

-- ============================================
-- COURSE 3: Web Development Fundamentals
-- ============================================

INSERT INTO public.courses (id, title, description, difficulty, lessons_count, xp_total, category) VALUES
('web-dev-fundamentals', 'Web Development Fundamentals', 'Build modern web applications! Learn JavaScript DOM manipulation, events, and interactive web features.', 'intermediate', 8, 400, 'web-dev');

-- Lesson 1: DOM Manipulation
INSERT INTO public.lessons (
  id, course_id, title, description, content, xp_reward, order_index, duration_minutes,
  language, starter_code, solution_code, hints, expected_output, test_cases
) VALUES (
  'web-dev-1',
  'web-dev-fundamentals',
  'DOM Manipulation Basics',
  'Learn how to interact with web page elements using JavaScript',
  '# DOM Manipulation

## What is the DOM?

The Document Object Model (DOM) is how JavaScript interacts with HTML elements.

## Selecting Elements

```javascript
// By ID
const header = document.getElementById("header");

// By Class
const buttons = document.getElementsByClassName("btn");

// Modern way (recommended)
const header = document.querySelector("#header");
const buttons = document.querySelectorAll(".btn");
```

## Changing Content

```javascript
const title = document.querySelector("h1");
title.textContent = "New Title";
title.innerHTML = "<strong>Bold Title</strong>";
```

## Changing Styles

```javascript
const box = document.querySelector(".box");
box.style.backgroundColor = "blue";
box.style.fontSize = "20px";
```

## Challenge

Simulate selecting and modifying elements:
- Create a variable `pageTitle` with value "Welcome"
- Create a variable `buttonColor` with value "blue"
- Print both values',
  50,
  1,
  25,
  'javascript',
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
  $$["💡 This is a simplified version for practice", "💡 In real web pages, you'd use document.querySelector()", "💡 For now, just create variables and print them"]$$::jsonb,
  'Page Title: Welcome
Button Color: blue',
  $$[]$$::jsonb
);

-- ============================================
-- CODE SNIPPETS LIBRARY
-- ============================================

INSERT INTO public.code_snippets (title, description, language, code, category, difficulty, tags) VALUES
-- JavaScript Snippets
('For Loop', 'Basic for loop to iterate a specific number of times', 'javascript', 
'for (let i = 0; i < 10; i++) {
  console.log(i);
}', 'loops', 'beginner', ARRAY['loop', 'for', 'iteration']),

('Array Map', 'Transform array elements using map', 'javascript',
'const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map(num => num * 2);
console.log(doubled); // [2, 4, 6, 8, 10]', 'arrays', 'intermediate', ARRAY['array', 'map', 'transform']),

('Array Filter', 'Filter array elements based on condition', 'javascript',
'const numbers = [1, 2, 3, 4, 5, 6];
const evens = numbers.filter(num => num % 2 === 0);
console.log(evens); // [2, 4, 6]', 'arrays', 'intermediate', ARRAY['array', 'filter', 'condition']),

('Arrow Function', 'Modern function syntax', 'javascript',
'// Traditional
function add(a, b) {
  return a + b;
}

// Arrow function
const add = (a, b) => a + b;', 'functions', 'beginner', ARRAY['function', 'arrow', 'es6']),

-- Python Snippets
('For Loop', 'Iterate over a range of numbers', 'python',
'for i in range(10):
    print(i)', 'loops', 'beginner', ARRAY['loop', 'for', 'range']),

('List Comprehension', 'Create lists using comprehension', 'python',
'numbers = [1, 2, 3, 4, 5]
doubled = [num * 2 for num in numbers]
print(doubled)  # [2, 4, 6, 8, 10]', 'lists', 'intermediate', ARRAY['list', 'comprehension', 'transform']),

('Dictionary', 'Working with key-value pairs', 'python',
'person = {
    "name": "Alice",
    "age": 25,
    "city": "New York"
}
print(person["name"])  # Alice', 'dictionaries', 'beginner', ARRAY['dict', 'dictionary', 'key-value']);

