# CampusSwap — Campus Marketplace

A student-only peer-to-peer trading platform for university campuses.

## Tech Stack
- React 18 + TypeScript
- Vite (build tool)
- React Router v6
- Supabase (auth + database)

## Getting Started

### 1. Install dependencies
```bash
npm install
```

### 2. Set up Supabase
1. Create a project at [supabase.com](https://supabase.com)
2. Copy `.env.example` to `.env`
3. Fill in your `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from your Supabase dashboard (Settings → API)

### 3. Enable Google OAuth (optional)
In your Supabase dashboard: Authentication → Providers → Google → Enable and fill in credentials.

### 4. Run the dev server
```bash
npm run dev
```

### 5. Build for production
```bash
npm run build
```

## Routes
- `/` — Landing page
- `/auth?mode=login` — Login
- `/auth?mode=signup` — Sign up

## Project Structure
```
src/
  lib/
    supabase.ts       # Supabase client
  pages/
    LandingPage.tsx   # Marketing landing page
    LandingPage.css
    AuthPage.tsx      # Login + signup (combined)
    AuthPage.css
  index.css           # Global styles & design tokens
  main.tsx            # App entry
```

## Roles
- **Student** — Can list items, browse, buy, and trade
- **Trade Facility Staff** — Manages drop-off/collection bookings
- **Admin** — Platform management and moderation
