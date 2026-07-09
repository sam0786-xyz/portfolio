-- Focus OS Users table for unique code authentication
-- Run this in your Supabase SQL editor (https://supabase.com/dashboard)

CREATE TABLE IF NOT EXISTS focus_users (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  unique_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE focus_users ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to insert (register)
CREATE POLICY "Allow anonymous insert" ON focus_users
  FOR INSERT WITH CHECK (true);

-- Allow anonymous users to read (validate code)
CREATE POLICY "Allow anonymous read" ON focus_users
  FOR SELECT USING (true);

-- Create index on unique_code for fast lookups
CREATE INDEX IF NOT EXISTS idx_focus_users_code ON focus_users (unique_code);
