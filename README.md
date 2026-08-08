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

| Layer        | Technology                                                  |
| ------------ | ----------------------------------------------------------- |
| **Frontend** | Vanilla JS (ES Modules), HTML5, CSS3                        |
| **Server**   | Node.js (`node:http`) — zero dependencies                   |
| **Database** | [Supabase](https://supabase.com) (PostgreSQL + REST API)    |
| **Hosting**  | Google Cloud Run (containerized)                            |
| **CI/CD**    | Google Cloud Build → auto-deploy on push                    |
| **Domain**   | `sam18.xyz` via custom DNS                                  |
| **Icons**    | [Simple Icons CDN](https://simpleicons.org) for brand logos |

## Project Structure

```text
├── server.mjs              # Local Node.js dev server (static files + local API routes)
├── index.html              # Home shell (static entry)
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
│   │   └── content.js      # Default site content fallback
│   ├── main.js             # Home page renderer and interactions
│   ├── home-view.js        # Home page markup
│   ├── render.js           # Shared UI components & utilities
│   ├── animations.js       # IntersectionObserver scroll-reveals + neural canvas
│   ├── theme.js            # Theme control (dark-only "Glass & Void")
│   ├── content-store.js    # Content layer (localStorage fallback for static deploys)
│   ├── cms.js              # Admin CMS (edit profile, projects, certs, blog)
│   └── ...                 # Additional feature modules
│
├── assets/                  # Static assets (resume PDF, images)
├── data/
│   └── site-content.json    # CMS-managed content
```

> **Deployment Architecture Note:**
> The site is deployed as a **Static Site** on Netlify. Because there is no active Node.js backend in production (`server.mjs` is only used for local development), the site gracefully degrades its save operations. Changes made in the CMS are persisted to the browser's `localStorage`. The data layer (`content-store.js`) dynamically merges the base `site-content.json` file with your local storage overrides to render the site.

## Features

### 🏠 Portfolio Home

- Hero section with contact links, status badges, and resume download
- Interactive project showcase with tabbed detail view
- Skills grid with real brand logos
- Separated Education and Leadership sections
- Impact stats counter

### 📝 Blog

- Markdown-ready blog posts with cover images
- Scroll-triggered reveal animations optimized for tall content
- Reading time estimates
- Tag-based categorization

### 🎓 Certificates

- Timeline layout with issuer, skills, and verification links
- Featured certificate highlighting

### 🔗 LinkedIn Showcase

- Full iframe embeds of featured LinkedIn posts
- Direct links to profile

### 🔒 Admin CMS & Studio

- Admin panel for editing profile, projects, certificates, and skills
- Due to static hosting, saves are stored locally in the browser until manually committed to the repository `data/site-content.json`.

### ✨ Design & UX

- Neural network canvas backdrop — animated particle system
- Scroll-triggered fade/slide animations (optimized for all viewport heights)
- Single, deliberate dark "Glass & Void" theme
- Fully responsive (mobile → desktop)

## Getting Started

### Prerequisites

- Node.js 18+ (for local dev server)

### Local Development

```bash
# Clone the repository
git clone https://github.com/sam0786-xyz/portfolio.git
cd portfolio

# Start the local dev server (enables CMS JSON saving)
npm run dev
```

Open [http://localhost:8080](http://localhost:8080)

## Deployment

The project auto-deploys as a static site to **Netlify**:

1. Push to the `sam-dev` branch
2. Netlify triggers automatically
3. Serves the raw HTML/JS/CSS directly
4. Custom domain `sam18.xyz` routes to the service

## Routes

| Path             | Description              | Auth           |
| ---------------- | ------------------------ | -------------- |
| `/`              | Portfolio home           | Public         |
| `/blog/`         | Blog listing             | Public         |
| `/blog/:slug/`   | Blog post with reactions | Public         |
| `/certificates/` | Certificate timeline     | Public         |
| `/linkedin/`     | LinkedIn showcase        | Public         |
| `/focus/`        | Focus OS workspace       | Email login    |
| `/cms/`          | Admin content manager    | Admin password |
| `/studio/`       | Writing studio           | Admin password |

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
