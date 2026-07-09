<p align="center">
  <strong>sam18.xyz</strong><br>
  <em>AI/ML Engineer Portfolio — Mohammad Sameer</em>
</p>

<p align="center">
  <a href="https://sam18.xyz">Live Site</a> · 
  <a href="https://linkedin.com/in/connect-to-sam-xyz">LinkedIn</a> · 
  <a href="https://github.com/sam0786-xyz">GitHub</a>
</p>

---

## Overview

A modern, dependency-free portfolio website built with vanilla JavaScript, HTML, and CSS — designed to reflect an AI/ML engineering identity. Features a neural network loading animation, interactive project workbench, Focus OS productivity suite, blog with reactions and comments, certificate timeline, and LinkedIn post showcase.

**Live at:** [sam18.xyz](https://sam18.xyz)

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Vanilla JS (ES Modules), HTML5, CSS3 |
| **Server** | Node.js (`node:http`) — zero dependencies |
| **Database** | [Supabase](https://supabase.com) (PostgreSQL + REST API) |
| **Hosting** | Google Cloud Run (containerized) |
| **CI/CD** | Google Cloud Build → auto-deploy on push |
| **Domain** | `sam18.xyz` via custom DNS |
| **Icons** | [Simple Icons CDN](https://simpleicons.org) for brand logos |

## Project Structure

```text
├── server.mjs              # Node.js HTTP server (static files + API routes)
├── Dockerfile              # Cloud Run container config
├── package.json            # Scripts (start, dev, check)
│
├── index.html              # Home shell (server-rendered on request)
├── v3.css                  # Global stylesheet (design tokens, components, animations)
├── blog/index.html                    # Blog listing shell
├── blog/genai-field-notes/index.html  # Shared blog-post template shell
├── certificates/index.html # Certificate timeline shell
├── linkedin/index.html     # LinkedIn showcase shell
├── focus/index.html        # Focus OS workspace shell
├── cms/index.html          # Protected admin CMS shell
├── cms/login.html          # Admin login page
├── studio/index.html       # Protected writing studio shell
│
├── src/
│   ├── data/
│   │   └── content.js      # Default site content (profile, projects, skills, blog, etc.)
│   ├── ssr.mjs             # Server-side render helpers for the home page
│   ├── main.js             # Home page renderer and interactions
│   ├── home-view.js        # Home page markup (hero, experience, skills, projects, GitHub)
│   ├── render.js           # Shared UI components (cards, pills, icons, skill logos)
│   ├── github-repos.js     # Live GitHub repos section (progressive enhancement)
│   ├── loader.js           # Global page-loader control
│   ├── animations.js       # Scroll-triggered reveal animations + neural canvas
│   ├── theme.js            # Theme control (dark-only "Glass & Void")
│   ├── content-store.js    # Content layer (localStorage + Supabase sync)
│   ├── supabase-client.js  # Supabase REST API helper (browser)
│   ├── blog.js             # Blog listing page logic
│   ├── post.js             # Blog post page logic
│   ├── blog-admin-store.js # Blog CRUD client for the studio
│   ├── blog-reactions.js   # Like/dislike + comments (Supabase-backed)
│   ├── certificates.js     # Certificate timeline page logic
│   ├── linkedin.js         # LinkedIn showcase page logic
│   ├── focus.js            # Focus OS — Pomodoro, tasks, calendar, streaks
│   ├── focus-auth.js       # Focus OS email-based authentication
│   ├── focus-store.js      # Focus OS data persistence layer
│   ├── admin-login.js      # Admin login for CMS/Studio
│   ├── cms.js              # Admin CMS (edit profile, projects, certs, blog)
│   └── studio.js           # Writing studio (drafts, markdown)
│
├── assets/                  # Static assets (resume PDF, images)
├── data/
│   └── site-content.json    # CMS-managed content (auto-generated)
└── supabase/
    ├── schema.sql              # Database schema + RLS policies
    ├── migrations.sql          # Incremental migrations
    └── security-hardening.sql  # focus_users lockdown + comment constraints
```

> Routing note: the Node server serves only an allowlist of top-level paths
> (`assets/`, `src/`, the page directories, and a few root files). Source like
> `server.mjs`, `package.json`, and `supabase/*` is never exposed over HTTP.
> `/sitemap.xml` and `/blog/rss.xml` are generated dynamically from live posts.

## Features

### 🏠 Portfolio Home
- Hero section with contact links, status badges, and resume download
- Interactive project showcase with tabbed detail view
- Skills grid with **real brand logos** (Python, TensorFlow, AWS, etc.)
- Separated Education and Leadership sections
- Impact stats counter
- Blog preview cards

### 📝 Blog
- Markdown-ready blog posts with cover images
- **Like/Dislike reactions** persisted to Supabase
- **Comment system** with name + body, sorted by date
- Reading time estimates
- Tag-based categorization

### 🎓 Certificates
- Timeline layout with issuer, skills, and verification links
- Featured certificate highlighting

### 🔗 LinkedIn Showcase
- Curated LinkedIn post cards with stats
- Optional raw embed support for official LinkedIn iframes
- Direct links to profile

### 🧠 Focus OS
- Email-based authentication (profiles stored in Supabase)
- Pomodoro timer with session tracking
- Task management with streaks
- Calendar view
- Data synced via Supabase with localStorage fallback

### 🔒 Admin CMS & Studio
- Password-protected admin panel
- Edit profile, projects, certificates, and blog posts
- Resume PDF upload
- Writing studio with draft management and markdown editing

### ✨ Design & UX
- Neural network canvas backdrop — animated particle system
- Scroll-triggered fade/slide animations
- Single, deliberate dark "Glass & Void" theme
- Fully responsive (mobile → desktop)
- Glassmorphism panels and micro-interactions

## Getting Started

### Prerequisites
- Node.js 18+

### Local Development

```bash
# Clone the repository
git clone https://github.com/sam0786-xyz/portfolio.git
cd portfolio

# Start the dev server
npm run dev
```

Open [http://localhost:8080](http://localhost:8080)

### Environment Variables

Create a `.env` file in the project root:

```env
# Admin credentials
ADMIN_USERNAME=your_username
ADMIN_PASSWORD_HASH=your_pbkdf2_hash

# Supabase (optional — falls back to localStorage)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# Server
PORT=8080
HOST=0.0.0.0
```

### Docker

```bash
docker build -t portfolio .
docker run -p 8080:8080 portfolio
```

## Database Setup (Supabase)

Run the SQL from `supabase/schema.sql` in your Supabase SQL editor. This creates:

| Table | Purpose |
|---|---|
| `site_content` | CMS-managed site content |
| `focus_users` | Focus OS user profiles |
| `focus_data` | Focus OS tasks, streaks, sessions |
| `blog_reactions` | Blog like/dislike counts |
| `blog_comments` | Blog comment threads |

All tables include Row Level Security (RLS) policies for public read/write access on interaction tables and service-role-only access for admin content.

## Deployment

The project auto-deploys to **Google Cloud Run** via Cloud Build:

1. Push to the `sam-dev` branch
2. Cloud Build triggers automatically
3. Builds Docker container
4. Deploys to Cloud Run
5. Custom domain `sam18.xyz` routes to the service

## Routes

| Path | Description | Auth |
|---|---|---|
| `/` | Portfolio home | Public |
| `/blog/` | Blog listing | Public |
| `/blog/:slug/` | Blog post with reactions | Public |
| `/certificates/` | Certificate timeline | Public |
| `/linkedin/` | LinkedIn showcase | Public |
| `/focus/` | Focus OS workspace | Email login |
| `/cms/` | Admin content manager | Admin password |
| `/studio/` | Writing studio | Admin password |

## Scripts

```bash
npm run dev      # Start development server
npm run start    # Start production server
npm run check    # Syntax-check all source files
```

## Author

**Mohammad Sameer**  
Generative AI Developer Intern at AI Zoned  
B.Tech CS (AI & ML) — Sharda University  

📧 [hello@sam18.xyz](mailto:hello@sam18.xyz)  
🔗 [linkedin.com/in/connect-to-sam-xyz](https://linkedin.com/in/connect-to-sam-xyz)  
🐙 [github.com/sam0786-xyz](https://github.com/sam0786-xyz)

---

<p align="center"><em>Built with curiosity and AI Agents</em></p>
