-- ════════════════════════════════════════════════════════════════════
-- Security hardening migration
-- Run this in the Supabase SQL editor AFTER migrations.sql / schema.sql.
-- Fixes two real exposures:
--   1. focus_users had a public `SELECT USING (true)` policy, so anyone with
--      the (public) anon key could dump every visitor's name + email.
--   2. blog_comments/blog_reactions accepted unbounded anonymous inserts.
-- ════════════════════════════════════════════════════════════════════

-- 1. Lock down focus_users -------------------------------------------------
-- Remove the blanket read policy. Visitor emails must never be listable.
drop policy if exists "Anyone can read focus users" on public.focus_users;

-- Exact-email lookup only, via a security-definer function. This returns at
-- most one row and cannot be used to enumerate the table.
create or replace function public.focus_user_lookup(p_email text)
returns table (name text, email text)
language sql
security definer
set search_path = public
as $$
  select fu.name, fu.email
  from public.focus_users fu
  where fu.email = lower(trim(p_email))
  limit 1;
$$;

revoke all on function public.focus_user_lookup(text) from public;
grant execute on function public.focus_user_lookup(text) to anon, authenticated;

-- Registration (INSERT) stays open so new visitors can create a profile, but
-- reads now only happen through the function above.
-- (The existing "Anyone can insert focus users" policy is kept as-is.)


-- 2. Constrain blog comments ----------------------------------------------
-- Cap comment length so the open insert policy can't be used to store huge
-- payloads. Adjust the limits to taste. Drop-then-add keeps this script
-- idempotent (ADD CONSTRAINT has no IF NOT EXISTS), so re-running is safe.
alter table public.blog_comments
  drop constraint if exists blog_comments_name_len,
  drop constraint if exists blog_comments_body_len;
alter table public.blog_comments
  add constraint blog_comments_name_len  check (char_length(name) between 1 and 80),
  add constraint blog_comments_body_len  check (char_length(body) between 1 and 4000);

-- NOTE: Anonymous inserts to blog_comments / blog_reactions are still open by
-- design (no login for a personal blog). For real spam protection, route these
-- writes through the Node server so they can be rate-limited per IP, or add a
-- lightweight captcha / hCaptcha token check. Tracked as a follow-up.
