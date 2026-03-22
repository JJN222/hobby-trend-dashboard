# Hobby Trend Predictor

Track and predict which hobbies are trending on YouTube and TikTok using real API data, Google Trends signals, and AI-powered scoring.

**Stack:** React/Vite + Node/Express + PostgreSQL

---

## Setup (step by step)

### 1. Clone and install

```bash
cd hobby-trend-dashboard
npm run install:all
```

This installs dependencies for the root, server, and client.

### 2. Set up PostgreSQL

You need a local Postgres database. If you have Postgres running:

```bash
createdb hobby_trends
```

Or if you're using Railway for the DB from the start, grab the connection string from your Railway dashboard.

### 3. Configure environment variables

```bash
cp server/.env.example server/.env
```

Edit `server/.env` and fill in:
- `DATABASE_URL` - your Postgres connection string
- `YOUTUBE_API_KEY` - from Google Cloud Console (enable YouTube Data API v3)
- `TIKAPI_KEY` - from tikapi.io ($79/mo standard plan)
- `DATAFORSEO_LOGIN` and `DATAFORSEO_PASSWORD` - from dataforseo.com ($50 one-time deposit)
- `ANTHROPIC_API_KEY` - your Claude API key (for future LLM classification)

**You can start with just DATABASE_URL and YOUTUBE_API_KEY** -- the other collectors will gracefully skip if their keys aren't set.

### 4. Initialize the database

```bash
npm run db:init
```

This creates all tables and seeds 10 default hobbies to track.

### 5. Start the dev servers

```bash
npm run dev
```

This runs both the Express API (port 3001) and Vite dev server (port 5173) concurrently. Open http://localhost:5173 in your browser.

The dashboard will load but show empty data until you run the collectors.

### 6. Collect data

Run all collectors in sequence:

```bash
npm run collect
```

Or run them individually:

```bash
npm run collect:youtube    # YouTube Data API
npm run collect:tiktok     # TikAPI (TikTok)
npm run collect:trends     # DataForSEO (Google Trends)
npm run score              # Calculate composite trend scores
```

### 7. View your data

Refresh the dashboard at http://localhost:5173. You should see hobby scores, growth rates, and videos populating.

---

## Project structure

```
hobby-trend-dashboard/
  client/                  # React/Vite frontend
    src/
      components/
        DetailPanel.jsx    # Hobby detail modal
        DirectionTag.jsx   # Rising/stable/declining badge
        HobbyTable.jsx     # Main data table
        Sparkline.jsx      # SVG sparkline chart
        VideoCard.jsx      # Video cards (grid + row)
        VideoGrid.jsx      # Category video browser
      hooks/
        useApi.js          # Data fetching hook
      utils/
        api.js             # API client functions
      App.jsx              # Root component
      main.jsx             # React entry point
  server/                  # Express backend
    db/
      init.js              # Schema + seed data
      pool.js              # Postgres connection pool
    routes/
      hobbies.js           # /api/hobbies endpoints
      videos.js            # /api/videos endpoints
      snapshots.js         # /api/snapshots endpoints
    scripts/
      collect-all.js       # Orchestrator
      collect-youtube.js   # YouTube Data API collector
      collect-tiktok.js    # TikAPI collector
      collect-trends.js    # DataForSEO collector
      calculate-scores.js  # Composite score calculator
    index.js               # Express server entry
```

---

## Scoring formula

The composite trend score (0-100) weights these signals:

| Signal | Weight | Source |
|--------|--------|--------|
| Search acceleration | 30% | DataForSEO / Google Trends |
| Creator adoption rate | 25% | YouTube + TikTok unique creators |
| Cross-platform presence | 20% | Active on YT + TT + Trends |
| Engagement velocity | 15% | TikTok engagement rate |
| Search interest | 10% | Google Trends raw score |

Direction (rising/stable/declining) is determined by the trend of scores over the last 7 days.

---

## Deploying to Railway

1. Push to GitHub
2. Create a new Railway project
3. Add a PostgreSQL service
4. Add a new service from your GitHub repo
5. Set the root directory to `/` 
6. Add all env vars from `.env.example` to Railway variables
7. Set start command: `cd server && npm start`
8. Deploy the client separately or serve static build from Express

---

## Adding new hobbies

POST to `/api/hobbies`:

```bash
curl -X POST http://localhost:3001/api/hobbies \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Candle Making",
    "category": "Crafts",
    "keywords": ["candle making", "soy candles", "candle tutorial"],
    "tiktok_hashtags": ["#candlemaking", "#candletok", "#soycandles"]
  }'
```

Then run `npm run collect` to start gathering data for it.
