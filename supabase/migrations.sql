-- ════════════════════════════════════════════
-- Supabase SQL Migrations for Portfolio
-- Run these in Supabase SQL Editor
-- ════════════════════════════════════════════

-- 1. Focus Users (updated: no unique_code column needed)
CREATE TABLE IF NOT EXISTS focus_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE focus_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert focus users"
  ON focus_users FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can read focus users"
  ON focus_users FOR SELECT USING (true);


-- 2. Blog Reactions
CREATE TABLE IF NOT EXISTS blog_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_slug TEXT NOT NULL,
  reaction TEXT NOT NULL CHECK (reaction IN ('like', 'dislike')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE blog_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert blog reactions"
  ON blog_reactions FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can read blog reactions"
  ON blog_reactions FOR SELECT USING (true);


-- 3. Blog Comments
CREATE TABLE IF NOT EXISTS blog_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_slug TEXT NOT NULL,
  name TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE blog_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert blog comments"
  ON blog_comments FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can read blog comments"
  ON blog_comments FOR SELECT USING (true);


-- ════════════════════════════════════════════
-- Indexes for performance
-- ════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_focus_users_email ON focus_users(email);
CREATE INDEX IF NOT EXISTS idx_blog_reactions_slug ON blog_reactions(post_slug);
CREATE INDEX IF NOT EXISTS idx_blog_comments_slug ON blog_comments(post_slug);

-- 4. Blog Post Editorial Source
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS markdown TEXT NOT NULL DEFAULT '';

-- 5. Focus OS tracking redesign: link sessions to tasks, daily session goal
ALTER TABLE focus_sessions ADD COLUMN IF NOT EXISTS task_id TEXT;
ALTER TABLE focus_settings ADD COLUMN IF NOT EXISTS daily_goal INTEGER NOT NULL DEFAULT 4;
CREATE INDEX IF NOT EXISTS idx_focus_sessions_task ON focus_sessions(task_id);
