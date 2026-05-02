# Mohammad Sameer Research OS Portfolio

A static-first portfolio implementation for Mohammad Sameer with an AI/ML identity, certificate timeline, blog, LinkedIn highlights, Focus OS, and a protected admin writing studio.

## Run

```bash
node server.mjs
```

Open `http://127.0.0.1:4173`.

Important routes:

- `/` dynamic portfolio workbench
- `/certificates/` verified certificate timeline
- `/blog/` published writing
- `/cms/` protected admin CMS for profile, projects, certificates, blogs, and resume upload
- `/studio/` protected admin writing studio, reachable after CMS login
- `/focus/` Pomodoro, tasks, calendar, and streak tracking
- `/linkedin/` curated LinkedIn post showcase

This workspace currently has Node available but no package manager on `PATH`, so the implementation is dependency-free and runnable immediately. The data layer is shaped so it can later move to Next.js, TypeScript, Tailwind, Motion, and a headless CMS without changing the content model.

## Update Content

Use `/cms/` while the local server is running to update the website. Admin saves are written to [data/site-content.json](/Users/sameer/Documents/Codex/2026-05-02/i-want-to-design-a-portfolio/data/site-content.json), synced to Supabase when the table exists, and resume uploads replace [assets/mohammad-sameer-resume.pdf](/Users/sameer/Documents/Codex/2026-05-02/i-want-to-design-a-portfolio/assets/mohammad-sameer-resume.pdf).

You can also edit [src/data/content.js](/Users/sameer/Documents/Codex/2026-05-02/i-want-to-design-a-portfolio/src/data/content.js) for default fallback content:

- profile links and email
- project cards
- certificate verification URLs
- published blog entries

The protected studio at `/studio/` is available after admin login. It can save drafts into CMS blog content and also export JSON or MDX-ready content.

## Focus OS Sync

Focus OS works with local storage immediately. For hosted sync, create Supabase tables using [supabase/schema.sql](/Users/sameer/Documents/Codex/2026-05-02/i-want-to-design-a-portfolio/supabase/schema.sql), enable RLS policies appropriate for your auth model, and keep service credentials server-side only.
