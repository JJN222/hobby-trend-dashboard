const pool = require("./pool");

async function init() {
  console.log("Initializing database...");

  await pool.query(`

    -- Hobbies we're tracking
    CREATE TABLE IF NOT EXISTS hobbies (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      category TEXT NOT NULL,
      keywords TEXT[] DEFAULT '{}',
      tiktok_hashtags TEXT[] DEFAULT '{}',
      active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Daily snapshots of metrics per hobby
    CREATE TABLE IF NOT EXISTS hobby_snapshots (
      id SERIAL PRIMARY KEY,
      hobby_id INTEGER REFERENCES hobbies(id),
      snapshot_date DATE NOT NULL,

      -- YouTube metrics
      yt_search_results INTEGER,
      yt_avg_views BIGINT,
      yt_avg_likes BIGINT,
      yt_avg_comments BIGINT,
      yt_new_videos_24h INTEGER,
      yt_unique_channels INTEGER,

      -- TikTok metrics
      tt_hashtag_views BIGINT,
      tt_avg_plays BIGINT,
      tt_avg_likes BIGINT,
      tt_avg_shares BIGINT,
      tt_avg_engagement_rate NUMERIC(5,2),
      tt_new_videos_24h INTEGER,
      tt_unique_creators INTEGER,

      -- Google Trends / DataForSEO
      trends_interest_score INTEGER,
      trends_related_queries JSONB DEFAULT '[]',

      -- Computed scores (filled by calculate-scores.js)
      trend_score INTEGER,
      yt_growth_rate NUMERIC(6,2),
      tt_growth_rate NUMERIC(6,2),
      search_acceleration NUMERIC(6,2),
      creator_adoption_rate NUMERIC(6,2),
      direction TEXT CHECK (direction IN ('rising', 'stable', 'declining')),

      UNIQUE(hobby_id, snapshot_date)
    );

    -- Individual videos we've discovered
    CREATE TABLE IF NOT EXISTS videos (
      id SERIAL PRIMARY KEY,
      hobby_id INTEGER REFERENCES hobbies(id),
      platform TEXT NOT NULL CHECK (platform IN ('youtube', 'tiktok')),
      platform_id TEXT NOT NULL,
      title TEXT,
      channel_or_user TEXT,
      thumbnail_url TEXT,
      video_url TEXT,
      views BIGINT DEFAULT 0,
      likes BIGINT DEFAULT 0,
      comments BIGINT DEFAULT 0,
      shares BIGINT DEFAULT 0,
      engagement_rate NUMERIC(5,2),
      published_at TIMESTAMPTZ,
      discovered_at TIMESTAMPTZ DEFAULT NOW(),
      last_updated TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(platform, platform_id)
    );

    -- LLM-generated predictions and signal summaries
    CREATE TABLE IF NOT EXISTS predictions (
      id SERIAL PRIMARY KEY,
      hobby_id INTEGER REFERENCES hobbies(id),
      prediction_date DATE NOT NULL,
      prediction_text TEXT,
      signals JSONB DEFAULT '[]',
      confidence NUMERIC(3,2),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(hobby_id, prediction_date)
    );

    -- Indexes for common queries
    CREATE INDEX IF NOT EXISTS idx_snapshots_hobby_date ON hobby_snapshots(hobby_id, snapshot_date DESC);
    CREATE INDEX IF NOT EXISTS idx_videos_hobby_platform ON videos(hobby_id, platform);
    CREATE INDEX IF NOT EXISTS idx_videos_views ON videos(views DESC);
    CREATE INDEX IF NOT EXISTS idx_predictions_hobby_date ON predictions(hobby_id, prediction_date DESC);

  `);

  // Seed default hobbies
  const seedHobbies = [
    { name: "Rug Tufting", category: "Crafts", keywords: ["rug tufting", "tufting gun", "custom rug"], tiktok_hashtags: ["#rugtufting", "#tuftinggun", "#rugmaking"] },
    { name: "Pickleball", category: "Sports", keywords: ["pickleball", "pickleball tips", "pickleball paddle"], tiktok_hashtags: ["#pickleball", "#pickleballtok", "#pickleballtips"] },
    { name: "Crochet", category: "Crafts", keywords: ["crochet tutorial", "crochet for beginners", "crochet pattern"], tiktok_hashtags: ["#crochet", "#crochettok", "#crochetpattern"] },
    { name: "Drone Photography", category: "Tech", keywords: ["drone photography", "fpv drone", "drone footage"], tiktok_hashtags: ["#dronephotography", "#fpv", "#droneshots"] },
    { name: "Pottery / Ceramics", category: "Crafts", keywords: ["pottery wheel", "ceramics tutorial", "pottery for beginners"], tiktok_hashtags: ["#pottery", "#ceramics", "#potterywheel"] },
    { name: "Mushroom Foraging", category: "Outdoors", keywords: ["mushroom foraging", "wild mushrooms", "foraging guide"], tiktok_hashtags: ["#mushroomforaging", "#foraging", "#mycology"] },
    { name: "Indoor Rock Climbing", category: "Sports", keywords: ["rock climbing", "bouldering", "climbing gym"], tiktok_hashtags: ["#rockclimbing", "#bouldering", "#climbing"] },
    { name: "Sourdough Baking", category: "Food", keywords: ["sourdough bread", "sourdough starter", "bread baking"], tiktok_hashtags: ["#sourdough", "#sourdoughbread", "#breadtok"] },
    { name: "Journaling / Bullet Journal", category: "Lifestyle", keywords: ["bullet journal", "journaling", "bujo setup"], tiktok_hashtags: ["#bulletjournal", "#journaling", "#bujo"] },
    { name: "Resin Art", category: "Crafts", keywords: ["resin art", "epoxy resin", "resin tutorial"], tiktok_hashtags: ["#resinart", "#epoxyresin", "#resintok"] },
  ];

  for (const hobby of seedHobbies) {
    await pool.query(
      `INSERT INTO hobbies (name, category, keywords, tiktok_hashtags)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (name) DO NOTHING`,
      [hobby.name, hobby.category, hobby.keywords, hobby.tiktok_hashtags]
    );
  }

  console.log(`Seeded ${seedHobbies.length} hobbies.`);
  console.log("Database initialized successfully.");
  process.exit(0);
}

init().catch((err) => {
  console.error("Database init failed:", err);
  process.exit(1);
});
