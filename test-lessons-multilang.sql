-- Multi-Language Test Lessons
-- Run this in Supabase SQL Editor to create lessons for JavaScript, Python, TypeScript, and C++

-- First, ensure the required courses exist
INSERT INTO courses (id, title, description)
VALUES 
  ('javascript-basics', 'JavaScript Basics', 'Learn JavaScript fundamentals'),
  ('python-basics', 'Python Basics', 'Learn Python programming'),
  ('cpp-basics', 'C++ Basics', 'Learn C++ programming')
ON CONFLICT (id) DO NOTHING;

-- 1. JavaScript: Array Filtering (order_index: 200)
INSERT INTO lessons (
  id,
  course_id,
  title,
  description,
  content,
  language,
  starter_code,
  solution_code,
  hints,
  expected_output,
  hints_enabled,
  test_cases,
  xp_reward,
  order_index,
  duration_minutes
) VALUES (
  gen_random_uuid(),
  'javascript-basics',
  'JavaScript: Filter Even Numbers',
  'Learn to filter even numbers from an array using JavaScript',
  E'# Filter Even Numbers\n\nCreate a function that takes an array of numbers and returns only the even numbers.\n\n## Task\n\nWrite a function called `filterEvens` that:\n- Takes an array of numbers as input\n- Returns a new array containing only even numbers\n- Use the `filter()` method\n\n## Example\n```javascript\nconsole.log(filterEvens([1, 2, 3, 4, 5, 6])); // [2, 4, 6]\n```',
  'javascript',
  E'// Write your function here\nfunction filterEvens(numbers) {\n  // Your code here\n}\n\n// Test your function\nconsole.log(filterEvens([1, 2, 3, 4, 5, 6]));',
  E'function filterEvens(numbers) {\n  return numbers.filter(n => n % 2 === 0);\n}\n\nconsole.log(filterEvens([1, 2, 3, 4, 5, 6]));',
  '["Use the filter() method", "Check if number % 2 === 0", "Return filtered array"]'::jsonb,
  '[2, 4, 6]',
  true,
  '[
    {"input": "[1, 2, 3, 4, 5, 6]", "expectedOutput": "[2, 4, 6]", "hidden": false},
    {"input": "[10, 15, 20, 25]", "expectedOutput": "[10, 20]", "hidden": false},
    {"input": "[1, 3, 5, 7]", "expectedOutput": "[]", "hidden": true},
    {"input": "[2, 4, 6, 8, 10]", "expectedOutput": "[2, 4, 6, 8, 10]", "hidden": true}
  ]'::jsonb,
  50,
  200,
  15
);

-- 2. Python: List Comprehension (order_index: 201)
INSERT INTO lessons (
  id,
  course_id,
  title,
  description,
  content,
  language,
  starter_code,
  solution_code,
  hints,
  expected_output,
  hints_enabled,
  test_cases,
  xp_reward,
  order_index,
  duration_minutes
) VALUES (
  gen_random_uuid(),
  'python-basics',
  'Python: Square Numbers',
  'Learn list comprehension by squaring numbers',
  E'# Square Numbers with Python\n\nCreate a function that squares all numbers in a list using list comprehension.\n\n## Task\n\nWrite a function called `square_numbers` that:\n- Takes a list of numbers\n- Returns a new list with each number squared\n- Use list comprehension\n\n## Example\n```python\nprint(square_numbers([1, 2, 3, 4]))\n# Output: [1, 4, 9, 16]\n```',
  'python',
  E'# Write your function here\ndef square_numbers(numbers):\n    # Your code here\n    pass\n\n# Test your function\nprint(square_numbers([1, 2, 3, 4]))',
  E'def square_numbers(numbers):\n    return [n ** 2 for n in numbers]\n\nprint(square_numbers([1, 2, 3, 4]))',
  '["Use list comprehension: [... for n in numbers]", "Square each number using n ** 2", "Return the new list"]'::jsonb,
  '[1, 4, 9, 16]',
  true,
  '[
    {"input": "[1, 2, 3, 4]", "expectedOutput": "[1, 4, 9, 16]", "hidden": false},
    {"input": "[5, 6, 7]", "expectedOutput": "[25, 36, 49]", "hidden": false},
    {"input": "[0, -2, 3]", "expectedOutput": "[0, 4, 9]", "hidden": true},
    {"input": "[10]", "expectedOutput": "[100]", "hidden": true}
  ]'::jsonb,
  50,
  201,
  15
);

-- 3. TypeScript: Type-Safe String Reversal (order_index: 202)
INSERT INTO lessons (
  id,
  course_id,
  title,
  description,
  content,
  language,
  starter_code,
  solution_code,
  hints,
  expected_output,
  hints_enabled,
  test_cases,
  xp_reward,
  order_index,
  duration_minutes
) VALUES (
  gen_random_uuid(),
  'javascript-basics',
  'TypeScript: Reverse String',
  'Learn TypeScript by reversing strings with type safety',
  E'# Reverse String with TypeScript\n\nCreate a type-safe function that reverses a string.\n\n## Task\n\nWrite a function called `reverseString` that:\n- Takes a string as input (typed)\n- Returns the reversed string\n- Uses TypeScript type annotations\n\n## Example\n```typescript\nconsole.log(reverseString("hello")); // "olleh"\n```',
  'typescript',
  E'// Write your function here\nfunction reverseString(str: string): string {\n  // Your code here\n  return "";\n}\n\n// Test your function\nconsole.log(reverseString("hello"));',
  E'function reverseString(str: string): string {\n  return str.split("").reverse().join("");\n}\n\nconsole.log(reverseString("hello"));',
  '["Use split(\"\") to convert to array", "Use reverse() method", "Use join(\"\") to convert back to string"]'::jsonb,
  'olleh',
  true,
  '[
    {"input": "hello", "expectedOutput": "olleh", "hidden": false},
    {"input": "world", "expectedOutput": "dlrow", "hidden": false},
    {"input": "TypeScript", "expectedOutput": "tpircSepyT", "hidden": true},
    {"input": "a", "expectedOutput": "a", "hidden": true}
  ]'::jsonb,
  50,
  202,
  15
);

-- 4. C++: Sum of Array (order_index: 203)
INSERT INTO lessons (
  id,
  course_id,
  title,
  description,
  content,
  language,
  starter_code,
  solution_code,
  hints,
  expected_output,
  hints_enabled,
  test_cases,
  xp_reward,
  order_index,
  duration_minutes
) VALUES (
  gen_random_uuid(),
  'cpp-basics',
  'C++: Array Sum',
  'Learn to sum array elements in C++',
  E'# Sum Array Elements in C++\n\nCreate a function that calculates the sum of all elements in an array.\n\n## Task\n\nWrite a function called `arraySum` that:\n- Takes an array and its size\n- Returns the sum of all elements\n- Uses a loop to iterate\n\n## Example\n```cpp\nint arr[] = {1, 2, 3, 4, 5};\ncout << arraySum(arr, 5); // 15\n```',
  'cpp',
  E'#include <iostream>\nusing namespace std;\n\n// Write your function here\nint arraySum(int arr[], int size) {\n    // Your code here\n    return 0;\n}\n\nint main() {\n    int arr[] = {1, 2, 3, 4, 5};\n    cout << arraySum(arr, 5) << endl;\n    return 0;\n}',
  E'#include <iostream>\nusing namespace std;\n\nint arraySum(int arr[], int size) {\n    int sum = 0;\n    for(int i = 0; i < size; i++) {\n        sum += arr[i];\n    }\n    return sum;\n}\n\nint main() {\n    int arr[] = {1, 2, 3, 4, 5};\n    cout << arraySum(arr, 5) << endl;\n    return 0;\n}',
  '["Initialize sum = 0", "Use for loop: for(int i=0; i<size; i++)", "Add each element: sum += arr[i]"]'::jsonb,
  '15',
  true,
  '[
    {"input": "", "expectedOutput": "15", "hidden": false},
    {"input": "", "expectedOutput": "10", "hidden": true}
  ]'::jsonb,
  75,
  203,
  20
);

-- Verify the lessons were created
SELECT id, title, language, course_id, order_index 
FROM lessons 
WHERE order_index >= 200 AND order_index <= 203
ORDER BY order_index;
