-- Supabase-ready schema for Focus OS and curated LinkedIn posts.
-- Enable Row Level Security before using this in production.

create table if not exists public.focus_settings (
  id text primary key default 'default',
  focus_minutes integer not null default 25,
  short_break_minutes integer not null default 5,
  long_break_minutes integer not null default 15,
  long_break_interval integer not null default 4,
  daily_goal integer not null default 4,
  updated_at timestamptz not null default now()
);

create table if not exists public.focus_tasks (
  id text primary key,
  title text not null,
  date date not null,
  priority text not null default 'Medium',
  status text not null default 'todo',
  estimated_sessions integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.focus_sessions (
  id text primary key,
  mode text not null,
  duration_minutes integer not null,
  completed_at timestamptz not null,
  task_id text
);

create table if not exists public.linkedin_posts (
  id text primary key,
  title text not null,
  url text not null,
  published_at date not null,
  summary text not null default '',
  tags text[] not null default '{}',
  featured boolean not null default false,
  embed_html text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_content (
  id text primary key default 'main',
  content jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.blog_posts (
  slug text primary key,
  title text not null,
  excerpt text not null,
  date date not null,
  tags text[] not null default '{}',
  cover text not null,
  reading_time text not null,
  markdown text not null default '',
  body text not null,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.blog_posts add column if not exists markdown text not null default '';

alter table public.focus_settings enable row level security;
alter table public.focus_tasks enable row level security;
alter table public.focus_sessions enable row level security;
alter table public.linkedin_posts enable row level security;
alter table public.site_content enable row level security;
alter table public.blog_posts enable row level security;

-- For a public demo, replace these policies with authenticated user-owned policies.
-- create policy "Read public linkedin posts" on public.linkedin_posts for select using (true);
-- create policy "Read own focus data" on public.focus_tasks for select using (auth.uid() is not null);
create policy "Read public blog posts" on public.blog_posts for select using (published = true);
create policy "Read site content" on public.site_content for select using (true);
