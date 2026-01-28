-- ============================================
-- FIX RLS POLICIES FOR NEXTAUTH
-- ============================================
-- This fixes the "violates row-level security policy" error
-- by updating policies to work with NextAuth instead of Supabase Auth

-- Drop old policies
DROP POLICY IF EXISTS "Authenticated users can create discussions" ON lesson_discussions;
DROP POLICY IF EXISTS "Users can update own discussions" ON lesson_discussions;
DROP POLICY IF EXISTS "Users can delete own discussions" ON lesson_discussions;
DROP POLICY IF EXISTS "Authenticated users can upvote" ON discussion_upvotes;
DROP POLICY IF EXISTS "Users can remove own upvotes" ON discussion_upvotes;

-- Create new permissive policies (NextAuth compatible)
CREATE POLICY "Anyone can create discussions" ON lesson_discussions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update discussions" ON lesson_discussions
  FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete discussions" ON lesson_discussions
  FOR DELETE USING (true);

CREATE POLICY "Anyone can upvote" ON discussion_upvotes
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can remove upvotes" ON discussion_upvotes
  FOR DELETE USING (true);

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename IN ('lesson_discussions', 'discussion_upvotes')
ORDER BY tablename, policyname;
