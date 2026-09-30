# INDIANS Stat Center
React + Vite clan analytics. Weekly PR/SR scores are the single source of truth; rankings, trends, records and ratings are all derived (`src/services/stats.js`).

    npm install && npm run dev      # local
    npm run build                   # static site in dist/

## Publish free on GitHub Pages
1. Create a repo, push this folder to `main`.
2. Settings → Pages → Source: **GitHub Actions**. The included workflow builds and deploys on every push.
(Netlify / Vercel / Cloudflare Pages: build `npm run build`, publish `dist`.)

## Weekly workflow
Open **Data** in the menu → *Add New Week* (or import a CSV) → save. Previous weeks are never overwritten; use *Edit* explicitly.

## Persistence
Data lives in browser localStorage, so edits are per-browser (use *Export JSON* to back up). To go multi-device, replace the functions in `src/services/db.js` with Supabase/Firebase/REST calls — the UI only talks to that file and `stats.js`.
