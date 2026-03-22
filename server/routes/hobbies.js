const express = require("express");
const router = express.Router();
const pool = require("../db/pool");

// GET /api/hobbies - All hobbies with latest snapshot + video totals
router.get("/", async (req, res) => {
  try {
    const { category } = req.query;

    let query = `
      SELECT
        h.id, h.name, h.category, h.keywords, h.tiktok_hashtags,
        s.snapshot_date,
        s.yt_search_results, s.yt_avg_views, s.yt_new_videos_24h, s.yt_unique_channels,
        s.tt_hashtag_views, s.tt_avg_plays, s.tt_avg_engagement_rate,
        s.tt_new_videos_24h, s.tt_unique_creators,
        s.trends_interest_score, s.trends_sparkline, s.search_volume,
        s.trend_score, s.yt_growth_rate, s.tt_growth_rate,
        s.search_acceleration, s.creator_adoption_rate, s.direction,
        p.prediction_text, p.signals, p.confidence,
        yt_totals.total_views as yt_total_views,
        yt_totals.video_count as yt_video_count,
        tt_totals.total_views as tt_total_views,
        tt_totals.video_count as tt_video_count
      FROM hobbies h
      LEFT JOIN LATERAL (
        SELECT * FROM hobby_snapshots
        WHERE hobby_id = h.id
        ORDER BY snapshot_date DESC
        LIMIT 1
      ) s ON true
      LEFT JOIN LATERAL (
        SELECT * FROM predictions
        WHERE hobby_id = h.id
        ORDER BY prediction_date DESC
        LIMIT 1
      ) p ON true
      LEFT JOIN LATERAL (
        SELECT
          COALESCE(SUM(views), 0) as total_views,
          COUNT(*) as video_count
        FROM videos
        WHERE hobby_id = h.id
          AND platform = 'youtube'
          AND published_at >= NOW() - INTERVAL '30 days'
      ) yt_totals ON true
      LEFT JOIN LATERAL (
        SELECT
          COALESCE(SUM(views), 0) as total_views,
          COUNT(*) as video_count
        FROM videos
        WHERE hobby_id = h.id
          AND platform = 'tiktok'
      ) tt_totals ON true
      WHERE h.active = true
    `;

    const params = [];
    if (category && category !== "All") {
      params.push(category);
      query += ` AND h.category = $${params.length}`;
    }

    query += ` ORDER BY COALESCE(s.trend_score, 0) DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching hobbies:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/hobbies/categories
router.get("/categories", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT category FROM hobbies WHERE active = true ORDER BY category`
    );
    res.json(result.rows.map((r) => r.category));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/hobbies
router.post("/", async (req, res) => {
  try {
    const { name, category, keywords, tiktok_hashtags } = req.body;
    const result = await pool.query(
      `INSERT INTO hobbies (name, category, keywords, tiktok_hashtags)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, category, keywords || [], tiktok_hashtags || []]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
