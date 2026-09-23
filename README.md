# Yakton

A small static site: a landing page with an animated wordmark, and a dashboard
with three rooms — **Stocks** (search, chart with a hover crosshair, watchlist),
**Games** (tic-tac-toe + snake), and **Projects** (downloadable code cards).

No build step. It's plain HTML/CSS/JS, so it deploys to Cloudflare Pages as-is.

## Deploy to Cloudflare Pages

**Option A — drag and drop (fastest)**
1. Go to the Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → **Upload assets**.
2. Drag this whole folder in (or a zip of it).
3. Cloudflare gives you a `*.pages.dev` URL immediately. Add a custom domain later from the project's **Custom domains** tab if you want.

**Option B — connect a Git repo**
1. Push this folder to a GitHub/GitLab repo.
2. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
3. Build settings: leave the build command empty and set the output directory to `/` (root) — there's nothing to build.
4. Deploy. Every push to your main branch will auto-redeploy.

**Option C — Wrangler CLI**
```bash
npm install -g wrangler
wrangler pages deploy . --project-name=yakton
```

## Wiring up real stock data

Yakton tries three sources, in order, and always labels which one you're looking at:

1. **Twelve Data** — real quotes and history, and it's built for browser use so its
   CORS headers actually work. This is the one to use. Get a free key at
   [twelvedata.com](https://twelvedata.com/pricing) (no card required — a couple
   hundred requests/day on the free plan), then either:
   - paste it into the box that says *"No real prices loading?"* right above the
     chart on the Stocks page (saved in your browser, no redeploy needed), or
   - open `assets/js/stocks.js` and paste it into `TWELVE_DATA_API_KEY` near the
     top, so it's baked in for every visitor.
2. **Stooq** — a free, keyless, delayed end-of-day source Yakton tries automatically
   if no Twelve Data key is set. Because Stooq doesn't publish an official CORS
   policy, your browser or Cloudflare may silently block these requests — if that
   happens you'll just see demo data with no error, which is exactly the "prices
   don't work" symptom a Twelve Data key fixes.
3. **Demo data** — a deterministic simulated price, used only if both real sources
   fail, so the chart never just breaks.

## Adding your own downloadable projects

Edit `assets/js/projects-data.js` — it's a plain array. Drop your zip/file into
`/projects` and point `file` at it:

```js
{
  title: "My CLI tool",
  tag: "Python",
  description: "One line on what it does.",
  file: "projects/my-cli-tool.zip",
  size: "18 KB",
}
```

The array starts empty, so the Projects page shows a "coming soon" state until
you add entries.

## File structure

```
index.html                     landing page
dashboard.html                 the app shell (stocks / games / projects)
assets/css/style.css           all styling
assets/js/main.js              nav switching + ticker strip
assets/js/stocks.js            search, quote card, chart, watchlist
assets/js/games.js             tic-tac-toe + snake
assets/js/projects.js          renders project cards
assets/js/projects-data.js     ← edit this to list your own downloads
projects/                      the actual downloadable files
```
