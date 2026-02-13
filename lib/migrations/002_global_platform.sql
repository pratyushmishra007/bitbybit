-- ============================================================================
-- BITBYBIT GLOBAL PLATFORM MIGRATION
-- Version: 1.0
-- Date: February 14, 2026
-- 
-- Run this in Supabase SQL Editor AFTER 001_academic_system.sql
-- ============================================================================

-- ============================================================================
-- PART 1: COMPANIES TABLE (For problem tagging - Amazon, Google, etc.)
-- ============================================================================

CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(255) NOT NULL UNIQUE,
  slug varchar(100) NOT NULL UNIQUE,
  logo_url text,
  website_url text,
  description text,
  is_active boolean DEFAULT true,
  problem_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- RLS for companies
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Companies viewable by all authenticated users" ON companies
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Companies manageable by admins" ON companies
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'platform_admin'))
  );

-- Insert popular companies
INSERT INTO companies (name, slug, description) VALUES
  ('Google', 'google', 'Technology company'),
  ('Amazon', 'amazon', 'E-commerce and cloud computing'),
  ('Microsoft', 'microsoft', 'Technology corporation'),
  ('Meta', 'meta', 'Social media and technology'),
  ('Apple', 'apple', 'Technology company'),
  ('Netflix', 'netflix', 'Streaming entertainment'),
  ('Adobe', 'adobe', 'Software company'),
  ('Uber', 'uber', 'Ride-sharing and delivery'),
  ('Twitter', 'twitter', 'Social media platform'),
  ('LinkedIn', 'linkedin', 'Professional networking'),
  ('Salesforce', 'salesforce', 'Cloud computing'),
  ('Oracle', 'oracle', 'Database and cloud'),
  ('IBM', 'ibm', 'Technology and consulting'),
  ('Intel', 'intel', 'Semiconductor company'),
  ('Cisco', 'cisco', 'Networking technology'),
  ('PayPal', 'paypal', 'Online payments'),
  ('Stripe', 'stripe', 'Payment processing'),
  ('Airbnb', 'airbnb', 'Online marketplace'),
  ('Spotify', 'spotify', 'Audio streaming'),
  ('TCS', 'tcs', 'IT services'),
  ('Infosys', 'infosys', 'IT services'),
  ('Wipro', 'wipro', 'IT services'),
  ('HCL', 'hcl', 'IT services'),
  ('Cognizant', 'cognizant', 'IT services'),
  ('Accenture', 'accenture', 'Management consulting')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- PART 2: TOPICS TABLE (DSA topics - Arrays, Trees, DP, etc.)
-- ============================================================================

CREATE TABLE IF NOT EXISTS topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(255) NOT NULL UNIQUE,
  slug varchar(100) NOT NULL UNIQUE,
  description text,
  parent_topic_id uuid REFERENCES topics(id),
  difficulty_weight decimal(3,2) DEFAULT 1.0,
  icon varchar(50),
  color varchar(20),
  order_index integer DEFAULT 0,
  is_active boolean DEFAULT true,
  problem_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- RLS for topics
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Topics viewable by all authenticated users" ON topics
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Topics manageable by admins" ON topics
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'platform_admin'))
  );

-- Insert DSA topics
INSERT INTO topics (name, slug, description, order_index) VALUES
  ('Arrays', 'arrays', 'Array manipulation and techniques', 1),
  ('Strings', 'strings', 'String processing and manipulation', 2),
  ('Linked Lists', 'linked-lists', 'Singly and doubly linked lists', 3),
  ('Stacks', 'stacks', 'LIFO data structure', 4),
  ('Queues', 'queues', 'FIFO data structure', 5),
  ('Hash Tables', 'hash-tables', 'Hash maps and sets', 6),
  ('Trees', 'trees', 'Binary trees and BST', 7),
  ('Graphs', 'graphs', 'Graph traversal and algorithms', 8),
  ('Heaps', 'heaps', 'Priority queues and heap operations', 9),
  ('Tries', 'tries', 'Prefix trees', 10),
  ('Dynamic Programming', 'dynamic-programming', 'Memoization and tabulation', 11),
  ('Greedy', 'greedy', 'Greedy algorithms', 12),
  ('Backtracking', 'backtracking', 'Recursive backtracking', 13),
  ('Binary Search', 'binary-search', 'Binary search techniques', 14),
  ('Two Pointers', 'two-pointers', 'Two pointer technique', 15),
  ('Sliding Window', 'sliding-window', 'Sliding window pattern', 16),
  ('Recursion', 'recursion', 'Recursive problem solving', 17),
  ('Sorting', 'sorting', 'Sorting algorithms', 18),
  ('Searching', 'searching', 'Search algorithms', 19),
  ('Bit Manipulation', 'bit-manipulation', 'Bitwise operations', 20),
  ('Math', 'math', 'Mathematical algorithms', 21),
  ('Geometry', 'geometry', 'Computational geometry', 22),
  ('Divide and Conquer', 'divide-and-conquer', 'Divide and conquer strategy', 23),
  ('Union Find', 'union-find', 'Disjoint set union', 24),
  ('Segment Trees', 'segment-trees', 'Range query structures', 25)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- PART 3: PROBLEMS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS problems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic Info
  title varchar(255) NOT NULL,
  slug varchar(255) NOT NULL UNIQUE,
  description text NOT NULL,
  
  -- Problem Content (stored as JSON for flexibility)
  examples jsonb DEFAULT '[]'::jsonb,
  constraints text,
  hints jsonb DEFAULT '[]'::jsonb,
  
  -- Solution Templates
  starter_code jsonb DEFAULT '{}'::jsonb,  -- { "python": "...", "javascript": "...", "cpp": "..." }
  solution_code jsonb DEFAULT '{}'::jsonb, -- Official solutions
  solution_explanation text,
  
  -- Test Cases
  test_cases jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{ input: "", output: "", is_hidden: false }]
  
  -- Difficulty & Classification
  difficulty varchar(20) NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  acceptance_rate decimal(5,2) DEFAULT 0,
  
  -- Stats
  submission_count integer DEFAULT 0,
  accepted_count integer DEFAULT 0,
  like_count integer DEFAULT 0,
  dislike_count integer DEFAULT 0,
  
  -- Access Control
  is_premium boolean DEFAULT false,
  is_active boolean DEFAULT true,
  is_archived boolean DEFAULT false,
  
  -- Source
  source varchar(50) DEFAULT 'original' CHECK (source IN ('original', 'leetcode', 'codeforces', 'hackerrank', 'community')),
  source_url text,
  external_id varchar(100),
  
  -- Metadata
  time_limit_ms integer DEFAULT 2000,
  memory_limit_mb integer DEFAULT 256,
  
  -- Audit
  created_by uuid REFERENCES users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- RLS for problems
ALTER TABLE problems ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Problems viewable by authenticated users" ON problems
  FOR SELECT USING (
    auth.uid() IS NOT NULL 
    AND is_active = true
    AND (
      is_premium = false 
      OR EXISTS (
        SELECT 1 FROM users WHERE id = auth.uid() 
        AND (role IN ('admin', 'platform_admin') OR is_premium = true)
      )
    )
  );

CREATE POLICY "Problems manageable by admins" ON problems
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'platform_admin'))
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_problems_difficulty ON problems(difficulty);
CREATE INDEX IF NOT EXISTS idx_problems_slug ON problems(slug);
CREATE INDEX IF NOT EXISTS idx_problems_active ON problems(is_active) WHERE is_active = true;

-- ============================================================================
-- PART 4: PROBLEM-COMPANY TAGS (Many-to-Many)
-- ============================================================================

CREATE TABLE IF NOT EXISTS problem_company_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id uuid REFERENCES problems(id) ON DELETE CASCADE,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  frequency integer DEFAULT 1, -- How often asked at this company
  last_asked date,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(problem_id, company_id)
);

-- RLS
ALTER TABLE problem_company_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Problem company tags viewable by authenticated users" ON problem_company_tags
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Problem company tags manageable by admins" ON problem_company_tags
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'platform_admin'))
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_problem_company_tags_problem ON problem_company_tags(problem_id);
CREATE INDEX IF NOT EXISTS idx_problem_company_tags_company ON problem_company_tags(company_id);

-- ============================================================================
-- PART 5: PROBLEM-TOPIC TAGS (Many-to-Many)
-- ============================================================================

CREATE TABLE IF NOT EXISTS problem_topic_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id uuid REFERENCES problems(id) ON DELETE CASCADE,
  topic_id uuid REFERENCES topics(id) ON DELETE CASCADE,
  is_primary boolean DEFAULT false, -- Primary topic vs additional tag
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(problem_id, topic_id)
);

-- RLS
ALTER TABLE problem_topic_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Problem topic tags viewable by authenticated users" ON problem_topic_tags
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Problem topic tags manageable by admins" ON problem_topic_tags
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'platform_admin'))
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_problem_topic_tags_problem ON problem_topic_tags(problem_id);
CREATE INDEX IF NOT EXISTS idx_problem_topic_tags_topic ON problem_topic_tags(topic_id);

-- ============================================================================
-- PART 6: PROBLEM SUBMISSIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS problem_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id uuid REFERENCES problems(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  
  -- Code
  code text NOT NULL,
  language varchar(20) NOT NULL CHECK (language IN ('python', 'javascript', 'typescript', 'cpp', 'java', 'c', 'go', 'rust')),
  
  -- Result
  status varchar(20) NOT NULL CHECK (status IN ('pending', 'running', 'accepted', 'wrong_answer', 'time_limit', 'memory_limit', 'runtime_error', 'compilation_error')),
  
  -- Performance
  runtime_ms integer,
  memory_kb integer,
  
  -- Test Results
  test_cases_passed integer DEFAULT 0,
  test_cases_total integer DEFAULT 0,
  error_message text,
  
  -- Execution Details
  execution_details jsonb DEFAULT '{}'::jsonb, -- Detailed per-test-case results
  
  -- Context (for contest submissions)
  contest_id uuid, -- Will reference contests table when created
  is_contest_submission boolean DEFAULT false,
  
  -- Audit
  submitted_at timestamp with time zone DEFAULT now()
);

-- RLS
ALTER TABLE problem_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own submissions" ON problem_submissions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all submissions" ON problem_submissions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'platform_admin', 'teacher'))
  );

CREATE POLICY "Users can create own submissions" ON problem_submissions
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_problem_submissions_user ON problem_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_problem_submissions_problem ON problem_submissions(problem_id);
CREATE INDEX IF NOT EXISTS idx_problem_submissions_status ON problem_submissions(status);
CREATE INDEX IF NOT EXISTS idx_problem_submissions_time ON problem_submissions(submitted_at DESC);

-- ============================================================================
-- PART 7: USER SOLVED PROBLEMS (Track which problems a user has solved)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_solved_problems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  problem_id uuid REFERENCES problems(id) ON DELETE CASCADE,
  
  -- Solve Status
  status varchar(20) DEFAULT 'solved' CHECK (status IN ('attempted', 'solved', 'starred')),
  
  -- Best Performance
  best_runtime_ms integer,
  best_memory_kb integer,
  best_submission_id uuid REFERENCES problem_submissions(id),
  
  -- Stats
  attempt_count integer DEFAULT 1,
  solve_count integer DEFAULT 1,
  
  -- Dates
  first_attempted_at timestamp with time zone DEFAULT now(),
  first_solved_at timestamp with time zone DEFAULT now(),
  last_attempted_at timestamp with time zone DEFAULT now(),
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, problem_id)
);

-- RLS
ALTER TABLE user_solved_problems ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own solved problems" ON user_solved_problems
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage own solved problems" ON user_solved_problems
  FOR ALL USING (user_id = auth.uid());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_solved_problems_user ON user_solved_problems(user_id);
CREATE INDEX IF NOT EXISTS idx_user_solved_problems_problem ON user_solved_problems(problem_id);
CREATE INDEX IF NOT EXISTS idx_user_solved_problems_status ON user_solved_problems(status);

-- ============================================================================
-- PART 8: USER PROBLEM STATS (Aggregate stats per user)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_problem_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  
  -- Total Counts
  total_problems_attempted integer DEFAULT 0,
  total_problems_solved integer DEFAULT 0,
  total_submissions integer DEFAULT 0,
  total_accepted integer DEFAULT 0,
  
  -- By Difficulty
  easy_solved integer DEFAULT 0,
  medium_solved integer DEFAULT 0,
  hard_solved integer DEFAULT 0,
  
  -- Performance
  avg_runtime_percentile decimal(5,2) DEFAULT 0,
  avg_memory_percentile decimal(5,2) DEFAULT 0,
  
  -- Streaks & Activity
  current_streak integer DEFAULT 0,
  longest_streak integer DEFAULT 0,
  last_submission_date date,
  
  -- Rankings (updated periodically)
  global_rank integer,
  organization_rank integer,
  
  -- Contest Stats
  contests_participated integer DEFAULT 0,
  best_contest_rank integer,
  contest_rating integer DEFAULT 1500,
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- RLS
ALTER TABLE user_problem_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Stats viewable by all authenticated users" ON user_problem_stats
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage own stats" ON user_problem_stats
  FOR ALL USING (user_id = auth.uid());

-- Index
CREATE INDEX IF NOT EXISTS idx_user_problem_stats_user ON user_problem_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_user_problem_stats_rank ON user_problem_stats(global_rank);

-- ============================================================================
-- PART 9: DAILY CHALLENGES
-- ============================================================================

CREATE TABLE IF NOT EXISTS daily_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id uuid REFERENCES problems(id) ON DELETE CASCADE,
  challenge_date date NOT NULL UNIQUE,
  bonus_xp integer DEFAULT 50,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- RLS
ALTER TABLE daily_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Daily challenges viewable by all" ON daily_challenges
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Daily challenges manageable by admins" ON daily_challenges
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'platform_admin'))
  );

-- Index
CREATE INDEX IF NOT EXISTS idx_daily_challenges_date ON daily_challenges(challenge_date);

-- ============================================================================
-- PART 10: USER DAILY CHALLENGE COMPLETIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS daily_challenge_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  challenge_id uuid REFERENCES daily_challenges(id) ON DELETE CASCADE,
  submission_id uuid REFERENCES problem_submissions(id),
  completed_at timestamp with time zone DEFAULT now(),
  xp_earned integer DEFAULT 0,
  UNIQUE(user_id, challenge_id)
);

-- RLS
ALTER TABLE daily_challenge_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own completions" ON daily_challenge_completions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create own completions" ON daily_challenge_completions
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- PART 11: HELPER FUNCTIONS
-- ============================================================================

-- Function: Update problem stats after submission
CREATE OR REPLACE FUNCTION update_problem_stats_on_submission()
RETURNS TRIGGER AS $$
BEGIN
  -- Update problem submission count
  UPDATE problems
  SET 
    submission_count = submission_count + 1,
    accepted_count = CASE WHEN NEW.status = 'accepted' THEN accepted_count + 1 ELSE accepted_count END,
    acceptance_rate = CASE 
      WHEN submission_count > 0 
      THEN ROUND((accepted_count::decimal / submission_count) * 100, 2)
      ELSE 0 
    END,
    updated_at = now()
  WHERE id = NEW.problem_id;

  -- Update user stats
  INSERT INTO user_problem_stats (user_id, total_submissions)
  VALUES (NEW.user_id, 1)
  ON CONFLICT (user_id) DO UPDATE
  SET 
    total_submissions = user_problem_stats.total_submissions + 1,
    total_accepted = CASE WHEN NEW.status = 'accepted' THEN user_problem_stats.total_accepted + 1 ELSE user_problem_stats.total_accepted END,
    last_submission_date = CURRENT_DATE,
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for submission stats
DROP TRIGGER IF EXISTS trigger_update_problem_stats ON problem_submissions;
CREATE TRIGGER trigger_update_problem_stats
  AFTER INSERT ON problem_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_problem_stats_on_submission();

-- Function: Update user solved problems on accepted submission
CREATE OR REPLACE FUNCTION update_user_solved_on_accept()
RETURNS TRIGGER AS $$
DECLARE
  v_difficulty varchar;
BEGIN
  IF NEW.status = 'accepted' THEN
    -- Get problem difficulty
    SELECT difficulty INTO v_difficulty FROM problems WHERE id = NEW.problem_id;
    
    -- Insert or update user_solved_problems
    INSERT INTO user_solved_problems (user_id, problem_id, status, best_submission_id, best_runtime_ms, best_memory_kb)
    VALUES (NEW.user_id, NEW.problem_id, 'solved', NEW.id, NEW.runtime_ms, NEW.memory_kb)
    ON CONFLICT (user_id, problem_id) DO UPDATE
    SET 
      status = 'solved',
      solve_count = user_solved_problems.solve_count + 1,
      best_runtime_ms = LEAST(COALESCE(user_solved_problems.best_runtime_ms, NEW.runtime_ms), NEW.runtime_ms),
      best_memory_kb = LEAST(COALESCE(user_solved_problems.best_memory_kb, NEW.memory_kb), NEW.memory_kb),
      best_submission_id = CASE 
        WHEN NEW.runtime_ms < COALESCE(user_solved_problems.best_runtime_ms, NEW.runtime_ms) 
        THEN NEW.id 
        ELSE user_solved_problems.best_submission_id 
      END,
      last_attempted_at = now(),
      updated_at = now();
    
    -- Update user stats by difficulty
    UPDATE user_problem_stats
    SET 
      total_problems_solved = (SELECT COUNT(DISTINCT problem_id) FROM user_solved_problems WHERE user_id = NEW.user_id AND status = 'solved'),
      easy_solved = CASE WHEN v_difficulty = 'easy' THEN easy_solved + 1 ELSE easy_solved END,
      medium_solved = CASE WHEN v_difficulty = 'medium' THEN medium_solved + 1 ELSE medium_solved END,
      hard_solved = CASE WHEN v_difficulty = 'hard' THEN hard_solved + 1 ELSE hard_solved END,
      updated_at = now()
    WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for solved problems
DROP TRIGGER IF EXISTS trigger_update_user_solved ON problem_submissions;
CREATE TRIGGER trigger_update_user_solved
  AFTER INSERT ON problem_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_solved_on_accept();

-- Function: Update topic/company problem counts
CREATE OR REPLACE FUNCTION update_tag_counts()
RETURNS TRIGGER AS $$
BEGIN
  -- Update topic counts
  UPDATE topics t
  SET problem_count = (
    SELECT COUNT(DISTINCT ptt.problem_id)
    FROM problem_topic_tags ptt
    JOIN problems p ON p.id = ptt.problem_id
    WHERE ptt.topic_id = t.id AND p.is_active = true
  );
  
  -- Update company counts
  UPDATE companies c
  SET problem_count = (
    SELECT COUNT(DISTINCT pct.problem_id)
    FROM problem_company_tags pct
    JOIN problems p ON p.id = pct.problem_id
    WHERE pct.company_id = c.id AND p.is_active = true
  );
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Triggers for tag counts
DROP TRIGGER IF EXISTS trigger_update_topic_counts ON problem_topic_tags;
CREATE TRIGGER trigger_update_topic_counts
  AFTER INSERT OR DELETE ON problem_topic_tags
  FOR EACH STATEMENT
  EXECUTE FUNCTION update_tag_counts();

DROP TRIGGER IF EXISTS trigger_update_company_counts ON problem_company_tags;
CREATE TRIGGER trigger_update_company_counts
  AFTER INSERT OR DELETE ON problem_company_tags
  FOR EACH STATEMENT
  EXECUTE FUNCTION update_tag_counts();

-- ============================================================================
-- PART 12: VIEWS FOR COMMON QUERIES
-- ============================================================================

-- View: Problem with all tags
CREATE OR REPLACE VIEW problems_with_tags AS
SELECT 
  p.*,
  COALESCE(
    (SELECT jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name, 'slug', t.slug, 'is_primary', ptt.is_primary))
     FROM problem_topic_tags ptt
     JOIN topics t ON t.id = ptt.topic_id
     WHERE ptt.problem_id = p.id),
    '[]'::jsonb
  ) as topics,
  COALESCE(
    (SELECT jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'slug', c.slug, 'frequency', pct.frequency))
     FROM problem_company_tags pct
     JOIN companies c ON c.id = pct.company_id
     WHERE pct.problem_id = p.id),
    '[]'::jsonb
  ) as companies
FROM problems p
WHERE p.is_active = true;

-- View: Leaderboard
CREATE OR REPLACE VIEW global_leaderboard AS
SELECT 
  u.id,
  u.name,
  u.avatar,
  ups.total_problems_solved,
  ups.easy_solved,
  ups.medium_solved,
  ups.hard_solved,
  ups.contest_rating,
  ups.global_rank,
  ROW_NUMBER() OVER (ORDER BY ups.total_problems_solved DESC, ups.hard_solved DESC) as rank
FROM users u
JOIN user_problem_stats ups ON ups.user_id = u.id
ORDER BY rank;

-- ============================================================================
-- PART 13: UPDATED_AT TRIGGERS
-- ============================================================================

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'companies', 'topics', 'problems', 'user_solved_problems', 'user_problem_stats'
  ]
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS trigger_update_%I_updated_at ON %I;
      CREATE TRIGGER trigger_update_%I_updated_at
        BEFORE UPDATE ON %I
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    ', t, t, t, t);
  END LOOP;
END;
$$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Global Platform Migration completed successfully!';
  RAISE NOTICE 'Tables created: companies, topics, problems, problem_company_tags, problem_topic_tags, problem_submissions, user_solved_problems, user_problem_stats, daily_challenges, daily_challenge_completions';
  RAISE NOTICE 'Views created: problems_with_tags, global_leaderboard';
  RAISE NOTICE 'Triggers: submission stats, solved tracking, tag counts';
END $$;
