# Courtside: Basketball Stats Dashboard

An interactive stats dashboard for a simulated basketball league: standings, league leaders, sortable player stats, player profiles with game logs, team trend charts and head-to-head comparisons.

**No frameworks, no chart libraries, no build step.** Everything is vanilla JavaScript, CSS and hand-drawn SVG.

## Features

- **Overview**: KPI tiles, standings with point-margin bars and last-5 form, and league leaders across five categories
- **Players**: a sortable, filterable table of all 90 players (search, team, position, minutes). Click any row for a full profile.
- **Player profile**: season averages with league percentiles, a points-per-game chart with a 5-game rolling average, and the full game log
- **Teams**: a cumulative point-differential chart (pick up to 4 teams) and an average-margin diverging bar chart
- **Compare**: a butterfly chart of percentile ranks plus a scoring-form line chart for any two players
- Crosshair tooltips on every chart, light and dark themes (follows your OS setting, with a toggle), responsive down to phone width, and keyboard accessible

## How it works

- `js/data.js` simulates a 24-round season **shot by shot** from a fixed random seed, so every visitor sees the same data. Standings, leaders and charts are all derived from the same box scores, so the numbers always agree with each other.
- `js/charts.js` is a small SVG chart kit with nice-number axis ticks, rounded columns, collision-avoiding direct labels, a crosshair hover layer and a ResizeObserver for responsive redraws.
- `js/app.js` handles aggregation, percentiles, hash routing, sorting and filtering, and rendering.
- Chart colors follow a colorblind-checked categorical palette. A team keeps its color while it's selected, so toggling other teams never repaints it.

## Run locally

Open `index.html` in a browser. That's it.

## Host it for free

### Option A: GitHub Pages
1. Create a new public repository on GitHub, e.g. `courtside`.
2. Upload the contents of this folder (`index.html`, `styles.css`, `js/`, `README.md`) using **Add file → Upload files**, then commit.
3. Go to **Settings → Pages**. Under *Build and deployment*, choose **Deploy from a branch**, branch `main`, folder `/ (root)`, and save.
4. After a minute your site is live at `https://<your-username>.github.io/courtside/`.

### Option B: Netlify Drop (no account setup needed to try it)
1. Go to https://app.netlify.com/drop
2. Drag this whole folder onto the page.
3. You get a live URL immediately. Sign in to keep it and rename the subdomain.

### Option C: Cloudflare Pages or Vercel
Both host static sites for free: create a project, upload or connect the repo, and leave the build command empty.

## Make it yours

- Change `SEED` in `js/data.js` to generate a different season.
- Rename teams and players in the `TEAMS`, `FIRST` and `LAST` arrays.
- Change the colors in the `:root` tokens at the top of `styles.css`.

---
Design inspiration. Teams, players and statistics are simulated.
