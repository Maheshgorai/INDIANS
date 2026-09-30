# INDIANS Stat Center
React + Vite clan analytics. Weekly PR/SR scores are the single source of truth; rankings, trends, records and ratings are all derived (`src/services/stats.js`).

    npm install && npm run dev      # local
    npm run build                   # static site in dist/

## Publish free on GitHub Pages
1. Create a repo, push this folder to `main`.
2. Settings → Pages → Source: **GitHub Actions**. The included workflow builds and deploys on every push.
(Netlify / Vercel / Cloudflare Pages: build `npm run build`, publish `dist`.)

## Weekly workflow
1. In your spreadsheet keep four columns: `Week, Event, Player, Score` (Event = PR or SR; Week can be `18Sep`, `2026-W38`, `18/09/2026`…). Save as CSV.
2. Open **Data** in the menu → *Import scores* → choose the file → check the preview → *Confirm import*.
   New player names are created automatically; existing scores are never overwritten.
3. To show it to everyone: on the Data page click *Copy data JSON*, then in GitHub create/edit `public/data.json` and paste. The site redeploys itself.

## Persistence
Edits are saved in your browser (localStorage). Visitors see `public/data.json` if it exists. To go multi-user later, replace the functions in `src/services/db.js` with Supabase/Firebase/REST calls — the UI only talks to that file and `stats.js`.
