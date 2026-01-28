-- Contests System Database Schema - Clean Installation
-- This script drops existing tables and recreates them with the correct schema

-- Drop existing tables in correct order (reverse of dependencies)
DROP TABLE IF EXISTS contest_submissions CASCADE;
DROP TABLE IF EXISTS contest_participants CASCADE;
DROP TABLE IF EXISTS contest_problems CASCADE;
DROP TABLE IF EXISTS contests CASCADE;

-- Drop existing view and function
DROP VIEW IF EXISTS contest_leaderboard CASCADE;
DROP FUNCTION IF EXISTS update_contest_status() CASCADE;

-- Contests table
CREATE TABLE contests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  difficulty VARCHAR(50) CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  status VARCHAR(50) DEFAULT 'upcoming' CHECK (status IN ('active', 'upcoming', 'ended')),
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  total_points INTEGER DEFAULT 0,
  max_participants INTEGER,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contest problems table
CREATE TABLE contest_problems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id UUID REFERENCES contests(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  difficulty VARCHAR(50) CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  points INTEGER DEFAULT 100,
  language VARCHAR(50) DEFAULT 'javascript',
  starter_code TEXT,
  solution_code TEXT,
  test_cases JSONB,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contest participants table
CREATE TABLE contest_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id UUID REFERENCES contests(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  total_score INTEGER DEFAULT 0,
  problems_solved INTEGER DEFAULT 0,
  rank INTEGER,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(contest_id, user_id)
);

-- Contest submissions table
CREATE TABLE contest_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id UUID REFERENCES contests(id) ON DELETE CASCADE,
  problem_id UUID REFERENCES contest_problems(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  language VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'wrong_answer', 'runtime_error', 'time_limit_exceeded')),
  score INTEGER DEFAULT 0,
  execution_time FLOAT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contest leaderboard view
CREATE OR REPLACE VIEW contest_leaderboard AS
SELECT 
  cp.contest_id,
  cp.user_id,
  u.name as user_name,
  u.email,
  cp.total_score,
  cp.problems_solved,
  cp.rank,
  ROW_NUMBER() OVER (PARTITION BY cp.contest_id ORDER BY cp.total_score DESC, cp.joined_at ASC) as current_rank
FROM contest_participants cp
JOIN users u ON cp.user_id = u.id
ORDER BY cp.contest_id, current_rank;

-- Indexes for performance
CREATE INDEX idx_contests_status ON contests(status);
CREATE INDEX idx_contests_start_time ON contests(start_time);
CREATE INDEX idx_contest_problems_contest_id ON contest_problems(contest_id);
CREATE INDEX idx_contest_participants_contest_id ON contest_participants(contest_id);
CREATE INDEX idx_contest_participants_user_id ON contest_participants(user_id);
CREATE INDEX idx_contest_submissions_contest_id ON contest_submissions(contest_id);
CREATE INDEX idx_contest_submissions_user_id ON contest_submissions(user_id);

-- RLS Policies
ALTER TABLE contests ENABLE ROW LEVEL SECURITY;
ALTER TABLE contest_problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE contest_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE contest_submissions ENABLE ROW LEVEL SECURITY;

-- Contests policies
CREATE POLICY "Contests are viewable by everyone" ON contests FOR SELECT USING (true);
CREATE POLICY "Only admins can create contests" ON contests FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'teacher'))
);
CREATE POLICY "Only admins can update contests" ON contests FOR UPDATE USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'teacher'))
);
CREATE POLICY "Only admins can delete contests" ON contests FOR DELETE USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'teacher'))
);

-- Contest problems policies
CREATE POLICY "Contest problems are viewable by participants" ON contest_problems FOR SELECT USING (
  EXISTS (SELECT 1 FROM contest_participants WHERE contest_id = contest_problems.contest_id AND user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'teacher'))
);
CREATE POLICY "Only admins can create contest problems" ON contest_problems FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'teacher'))
);
CREATE POLICY "Only admins can update contest problems" ON contest_problems FOR UPDATE USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'teacher'))
);

-- Contest participants policies
CREATE POLICY "Participants can view their own participation" ON contest_participants FOR SELECT USING (
  user_id = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'teacher'))
);
CREATE POLICY "Users can join contests" ON contest_participants FOR INSERT WITH CHECK (user_id = auth.uid());

-- Contest submissions policies
CREATE POLICY "Users can view their own submissions" ON contest_submissions FOR SELECT USING (
  user_id = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'teacher'))
);
CREATE POLICY "Users can submit solutions" ON contest_submissions FOR INSERT WITH CHECK (user_id = auth.uid());

-- Function to update contest status based on time
CREATE OR REPLACE FUNCTION update_contest_status()
RETURNS void AS $$
BEGIN
  UPDATE contests 
  SET status = 'active' 
  WHERE status = 'upcoming' AND start_time <= NOW();
  
  UPDATE contests 
  SET status = 'ended' 
  WHERE status = 'active' AND end_time <= NOW();
END;
$$ LANGUAGE plpgsql;

-- Insert test contest data
INSERT INTO contests (title, description, difficulty, status, start_time, end_time, total_points, max_participants)
VALUES 
  (
    'Beginner JavaScript Marathon',
    'Perfect for beginners! Test your JavaScript fundamentals with basic problems covering variables, loops, functions, and arrays.',
    'Easy',
    'active',
    NOW() - INTERVAL '1 day',
    NOW() + INTERVAL '6 days',
    500,
    1000
  ),
  (
    'Array Manipulation Challenge',
    'Master array operations! Solve problems involving sorting, filtering, mapping, and reducing. Intermediate level difficulty.',
    'Medium',
    'active',
    NOW() - INTERVAL '2 hours',
    NOW() + INTERVAL '22 hours',
    800,
    500
  ),
  (
    'Python Data Structures Sprint',
    'Dive deep into Python! Work with lists, dictionaries, sets, and tuples. Build efficient data processing solutions.',
    'Easy',
    'upcoming',
    NOW() + INTERVAL '2 days',
    NOW() + INTERVAL '4 days',
    600,
    800
  ),
  (
    'Algorithm Championship 2026',
    'The ultimate challenge! Advanced algorithms including dynamic programming, graph theory, and complex optimizations.',
    'Hard',
    'upcoming',
    NOW() + INTERVAL '7 days',
    NOW() + INTERVAL '9 days',
    2000,
    200
  ),
  (
    'TypeScript Type Challenge',
    'Test your TypeScript skills! Work with interfaces, generics, union types, and advanced type manipulations.',
    'Medium',
    'active',
    NOW() - INTERVAL '5 hours',
    NOW() + INTERVAL '19 hours',
    1000,
    300
  ),
  (
    'C++ Performance Showdown',
    'Optimize for speed! Write high-performance C++ code for computational challenges. Memory and time constraints apply.',
    'Hard',
    'ended',
    NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '3 days',
    1500,
    150
  );

-- Insert contest problems for the active contests
-- Problems for Beginner JavaScript Marathon
INSERT INTO contest_problems (contest_id, title, description, difficulty, points, language, starter_code, test_cases, order_index)
SELECT 
  id,
  'Sum Two Numbers',
  'Write a function that takes two numbers and returns their sum.',
  'Easy',
  100,
  'javascript',
  'function sum(a, b) {
  // Your code here
  return 0;
}',
  '[
    {"input": "1, 2", "expectedOutput": "3", "hidden": false, "description": "Basic addition"},
    {"input": "10, 20", "expectedOutput": "30", "hidden": false, "description": "Larger numbers"},
    {"input": "-5, 5", "expectedOutput": "0", "hidden": true, "description": "Negative numbers"}
  ]'::jsonb,
  1
FROM contests WHERE title = 'Beginner JavaScript Marathon';

INSERT INTO contest_problems (contest_id, title, description, difficulty, points, language, starter_code, test_cases, order_index)
SELECT 
  id,
  'Find Maximum',
  'Write a function that finds the maximum number in an array.',
  'Easy',
  150,
  'javascript',
  'function findMax(arr) {
  // Your code here
  return 0;
}',
  '[
    {"input": "[1, 2, 3, 4, 5]", "expectedOutput": "5", "hidden": false, "description": "Simple array"},
    {"input": "[10, 50, 30, 90, 20]", "expectedOutput": "90", "hidden": false, "description": "Unordered array"},
    {"input": "[-10, -5, -20]", "expectedOutput": "-5", "hidden": true, "description": "Negative numbers"}
  ]'::jsonb,
  2
FROM contests WHERE title = 'Beginner JavaScript Marathon';

INSERT INTO contest_problems (contest_id, title, description, difficulty, points, language, starter_code, test_cases, order_index)
SELECT 
  id,
  'Reverse String',
  'Write a function that reverses a given string.',
  'Easy',
  100,
  'javascript',
  'function reverseString(str) {
  // Your code here
  return "";
}',
  '[
    {"input": "hello", "expectedOutput": "olleh", "hidden": false, "description": "Simple word"},
    {"input": "JavaScript", "expectedOutput": "tpircSavaJ", "hidden": false, "description": "Mixed case"},
    {"input": "12345", "expectedOutput": "54321", "hidden": true, "description": "Numbers as string"}
  ]'::jsonb,
  3
FROM contests WHERE title = 'Beginner JavaScript Marathon';

-- Problems for Array Manipulation Challenge
INSERT INTO contest_problems (contest_id, title, description, difficulty, points, language, starter_code, test_cases, order_index)
SELECT 
  id,
  'Filter Even Numbers',
  'Return an array containing only the even numbers from the input array.',
  'Medium',
  200,
  'javascript',
  'function filterEvens(arr) {
  // Your code here
  return [];
}',
  '[
    {"input": "[1, 2, 3, 4, 5, 6]", "expectedOutput": "[2, 4, 6]", "hidden": false, "description": "Simple array"},
    {"input": "[10, 15, 20, 25]", "expectedOutput": "[10, 20]", "hidden": false, "description": "Larger numbers"},
    {"input": "[1, 3, 5, 7]", "expectedOutput": "[]", "hidden": true, "description": "All odd numbers"}
  ]'::jsonb,
  1
FROM contests WHERE title = 'Array Manipulation Challenge';

INSERT INTO contest_problems (contest_id, title, description, difficulty, points, language, starter_code, test_cases, order_index)
SELECT 
  id,
  'Array Sum',
  'Calculate the sum of all numbers in an array.',
  'Medium',
  200,
  'javascript',
  'function arraySum(arr) {
  // Your code here
  return 0;
}',
  '[
    {"input": "[1, 2, 3, 4, 5]", "expectedOutput": "15", "hidden": false, "description": "Simple sum"},
    {"input": "[10, 20, 30]", "expectedOutput": "60", "hidden": false, "description": "Larger values"},
    {"input": "[-1, 1, -2, 2]", "expectedOutput": "0", "hidden": true, "description": "Mixed positive and negative"}
  ]'::jsonb,
  2
FROM contests WHERE title = 'Array Manipulation Challenge';

-- Problems for TypeScript Type Challenge
INSERT INTO contest_problems (contest_id, title, description, difficulty, points, language, starter_code, test_cases, order_index)
SELECT 
  id,
  'Type-Safe Calculator',
  'Create a calculator function with proper TypeScript types that handles addition and subtraction.',
  'Medium',
  300,
  'typescript',
  'function calculator(a: number, b: number, operation: string): number {
  // Your code here
  return 0;
}',
  '[
    {"input": "5, 3, add", "expectedOutput": "8", "hidden": false, "description": "Addition"},
    {"input": "10, 4, subtract", "expectedOutput": "6", "hidden": false, "description": "Subtraction"},
    {"input": "100, 50, add", "expectedOutput": "150", "hidden": true, "description": "Large numbers"}
  ]'::jsonb,
  1
FROM contests WHERE title = 'TypeScript Type Challenge';

-- Add comments
COMMENT ON TABLE contests IS 'Stores all coding contests';
COMMENT ON TABLE contest_problems IS 'Problems associated with each contest';
COMMENT ON TABLE contest_participants IS 'Tracks user participation in contests';
COMMENT ON TABLE contest_submissions IS 'Stores all code submissions for contest problems';

-- Verify installation
SELECT 'Installation complete! Found ' || COUNT(*) || ' test contests.' as result FROM contests;
