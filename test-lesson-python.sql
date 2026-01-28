-- ============================================
-- PYTHON TEST LESSONS WITH TEST CASES
-- ============================================

-- Test Lesson 1: Python Square Function
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
  'test-lesson-python-square',
  'python-basics',
  'Python: Square Function',
  'Write a Python function that returns the square of a number',
  '<h2>Challenge: Square Function</h2>
<p>Create a function named <code>solve</code> that takes a number and returns its square.</p>

<h3>Requirements:</h3>
<ul>
  <li>Function name: <code>solve(n)</code></li>
  <li>Parameter: one number</li>
  <li>Return: the square of that number</li>
</ul>

<h3>Example:</h3>
<pre><code>solve(5)  → returns 25
solve(10) → returns 100
solve(7)  → returns 49</code></pre>',
  50,
  103,
  15,
  'python',
  '# Create a function named solve that returns the square of a number
def solve(n):
    # Your code here
    pass',
  '# Solution
def solve(n):
    return n * n',
  '[
    "Remember: squaring means n * n",
    "You can also use n ** 2 in Python",
    "Don''t forget to return the result"
  ]'::jsonb,
  '[
    {"input": "5", "expectedOutput": "25", "hidden": false},
    {"input": "10", "expectedOutput": "100", "hidden": false},
    {"input": "7", "expectedOutput": "49", "hidden": true},
    {"input": "0", "expectedOutput": "0", "hidden": true},
    {"input": "-3", "expectedOutput": "9", "hidden": true}
  ]'::jsonb,
  true
);

-- Test Lesson 2: Python Sum Function
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
  'test-lesson-python-sum',
  'python-basics',
  'Python: Sum of List',
  'Write a Python function that calculates the sum of a list',
  '<h2>Challenge: Sum of List</h2>
<p>Create a function named <code>solve</code> that takes a list of numbers and returns their sum.</p>

<h3>Requirements:</h3>
<ul>
  <li>Function name: <code>solve(arr)</code></li>
  <li>Parameter: a list of numbers</li>
  <li>Return: the sum of all numbers</li>
</ul>

<h3>Example:</h3>
<pre><code>solve([1, 2, 3])    → returns 6
solve([10, 20, 30]) → returns 60</code></pre>',
  75,
  104,
  20,
  'python',
  '# Create a function that returns the sum of a list
def solve(arr):
    # Your code here
    pass',
  '# Solution
def solve(arr):
    return sum(arr)',
  '[
    "Python has a built-in sum() function",
    "You can also use a for loop to add each element",
    "Initialize total = 0, then loop through the list"
  ]'::jsonb,
  '[
    {"input": "[1,2,3]", "expectedOutput": "6", "hidden": false},
    {"input": "[10,20,30]", "expectedOutput": "60", "hidden": false},
    {"input": "[5]", "expectedOutput": "5", "hidden": true},
    {"input": "[]", "expectedOutput": "0", "hidden": true}
  ]'::jsonb,
  true
);

-- Verification
SELECT 
  id,
  title,
  language,
  jsonb_array_length(test_cases) as total_tests
FROM lessons
WHERE id LIKE 'test-lesson-python-%'
ORDER BY order_index;
