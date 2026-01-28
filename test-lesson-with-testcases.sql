-- ============================================
-- TEST LESSON WITH SAMPLE & HIDDEN TEST CASES
-- ============================================
-- This creates a test lesson to demonstrate the test case feature

-- First, get a course ID (replace with your actual course ID)
-- You can find this by running: SELECT id, title FROM courses LIMIT 5;

-- Insert a test lesson with test cases
INSERT INTO lessons (
  id,
  course_id,
  title,
  description,
  content,
  xp_reward,
  order_index,
  duration_minutes,
  language,
  starter_code,
  solution_code,
  hints,
  test_cases,
  hints_enabled
) VALUES (
  'test-lesson-square-function',
  'python-basics', -- Replace with your actual course_id
  'Create a Square Function',
  'Write a function that returns the square of a number',
  '<h2>Challenge: Square Function</h2>
<p>Your task is to create a function named <code>solve</code> that takes a number as input and returns its square.</p>

<h3>Requirements:</h3>
<ul>
  <li>Function name must be: <code>solve</code></li>
  <li>It should accept one parameter (a number)</li>
  <li>It should return the square of that number</li>
</ul>

<h3>Example:</h3>
<pre><code>solve(5)  → returns 25
solve(10) → returns 100
solve(7)  → returns 49</code></pre>

<h3>How to Test:</h3>
<ol>
  <li>Click <strong>"Run Code"</strong> to test against sample test cases</li>
  <li>Click <strong>"Complete Lesson"</strong> to validate against ALL test cases (including hidden ones)</li>
</ol>',
  50,
  100,
  15,
  'javascript',
  '// Create a function named solve that returns the square of a number
function solve(n) {
  // Your code here
  
}',
  '// Solution
function solve(n) {
  return n * n;
}',
  '[
    "Remember: squaring a number means multiplying it by itself",
    "The formula is: n * n or n ** 2",
    "Make sure to return the result, not just calculate it"
  ]'::jsonb,
  '[
    {"input": "5", "expectedOutput": "25", "hidden": false},
    {"input": "10", "expectedOutput": "100", "hidden": false},
    {"input": "7", "expectedOutput": "49", "hidden": true},
    {"input": "0", "expectedOutput": "0", "hidden": true},
    {"input": "-3", "expectedOutput": "9", "hidden": true},
    {"input": "100", "expectedOutput": "10000", "hidden": true}
  ]'::jsonb,
  true
);

-- Another test lesson: Sum of Array
INSERT INTO lessons (
  id,
  course_id,
  title,
  description,
  content,
  xp_reward,
  order_index,
  duration_minutes,
  language,
  starter_code,
  solution_code,
  hints,
  test_cases,
  hints_enabled
) VALUES (
  'test-lesson-array-sum',
  'python-basics', -- Replace with your actual course_id
  'Calculate Sum of Array',
  'Write a function that calculates the sum of all numbers in an array',
  '<h2>Challenge: Array Sum Function</h2>
<p>Create a function named <code>solve</code> that takes an array of numbers and returns their sum.</p>

<h3>Requirements:</h3>
<ul>
  <li>Function name must be: <code>solve</code></li>
  <li>It should accept an array of numbers</li>
  <li>It should return the sum of all numbers in the array</li>
</ul>

<h3>Example:</h3>
<pre><code>solve([1, 2, 3])    → returns 6
solve([10, 20, 30]) → returns 60
solve([5])          → returns 5</code></pre>',
  75,
  101,
  20,
  'javascript',
  '// Create a function named solve that returns the sum of array elements
function solve(arr) {
  // Your code here
  
}',
  '// Solution
function solve(arr) {
  return arr.reduce((sum, num) => sum + num, 0);
}',
  '[
    "You can use a loop to iterate through the array",
    "Try using the reduce() method for a cleaner solution",
    "Initialize a sum variable to 0, then add each element"
  ]'::jsonb,
  '[
    {"input": "[1,2,3]", "expectedOutput": "6", "hidden": false},
    {"input": "[10,20,30]", "expectedOutput": "60", "hidden": false},
    {"input": "[5]", "expectedOutput": "5", "hidden": true},
    {"input": "[]", "expectedOutput": "0", "hidden": true},
    {"input": "[-1,1,-2,2]", "expectedOutput": "0", "hidden": true},
    {"input": "[100,200,300,400,500]", "expectedOutput": "1500", "hidden": true}
  ]'::jsonb,
  true
);

-- Third test lesson: Palindrome Checker
INSERT INTO lessons (
  id,
  course_id,
  title,
  description,
  content,
  xp_reward,
  order_index,
  duration_minutes,
  language,
  starter_code,
  solution_code,
  hints,
  test_cases,
  hints_enabled
) VALUES (
  'test-lesson-palindrome',
  'python-basics', -- Replace with your actual course_id
  'Check if String is Palindrome',
  'Write a function that checks if a string reads the same forwards and backwards',
  '<h2>Challenge: Palindrome Checker</h2>
<p>Create a function named <code>solve</code> that determines if a string is a palindrome.</p>

<h3>What is a Palindrome?</h3>
<p>A palindrome is a word, phrase, or sequence that reads the same backward as forward.</p>

<h3>Requirements:</h3>
<ul>
  <li>Function name must be: <code>solve</code></li>
  <li>It should accept a string</li>
  <li>It should return <code>true</code> if palindrome, <code>false</code> otherwise</li>
  <li>Ignore case (treat "A" and "a" as the same)</li>
</ul>

<h3>Example:</h3>
<pre><code>solve("racecar") → returns true
solve("hello")   → returns false
solve("Madam")   → returns true</code></pre>',
  100,
  102,
  25,
  'javascript',
  '// Create a function that checks if a string is a palindrome
function solve(str) {
  // Your code here
  
}',
  '// Solution
function solve(str) {
  const cleaned = str.toLowerCase();
  return cleaned === cleaned.split("").reverse().join("");
}',
  '[
    "Convert the string to lowercase first",
    "Compare the string with its reverse",
    "You can use split(), reverse(), and join() methods"
  ]'::jsonb,
  '[
    {"input": "\"racecar\"", "expectedOutput": "true", "hidden": false},
    {"input": "\"hello\"", "expectedOutput": "false", "hidden": false},
    {"input": "\"Madam\"", "expectedOutput": "true", "hidden": true},
    {"input": "\"A\"", "expectedOutput": "true", "hidden": true},
    {"input": "\"level\"", "expectedOutput": "true", "hidden": true},
    {"input": "\"python\"", "expectedOutput": "false", "hidden": true}
  ]'::jsonb,
  true
);

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 
  id,
  title,
  language,
  jsonb_array_length(test_cases) as total_test_cases,
  (
    SELECT COUNT(*)
    FROM jsonb_array_elements(test_cases) tc
    WHERE (tc->>'hidden')::boolean = false
  ) as sample_test_cases,
  (
    SELECT COUNT(*)
    FROM jsonb_array_elements(test_cases) tc
    WHERE (tc->>'hidden')::boolean = true
  ) as hidden_test_cases
FROM lessons
WHERE id LIKE 'test-lesson-%'
ORDER BY order_index;

-- Show test cases detail
SELECT 
  id,
  title,
  jsonb_pretty(test_cases) as test_cases_detail
FROM lessons
WHERE id LIKE 'test-lesson-%'
ORDER BY order_index;
