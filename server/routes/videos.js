const express = require("express");
const router = express.Router();
const pool = require("../db/pool");

// GET /api/videos - Videos with optional filters
router.get("/", async (req, res) => {
  try {
    const { hobby_id, platform, category, limit = 40, offset = 0 } = req.query;

    let query = `
      SELECT v.*, h.name as hobby_name, h.category
      FROM videos v
      JOIN hobbies h ON v.hobby_id = h.id
      WHERE 1=1
    `;
    const params = [];

    if (hobby_id) {
      params.push(hobby_id);
      query += ` AND v.hobby_id = $${params.length}`;
    }
    if (platform && platform !== "all") {
      params.push(platform);
      query += ` AND v.platform = $${params.length}`;
    }
    if (category && category !== "All") {
      params.push(category);
      query += ` AND h.category = $${params.length}`;
    }

    params.push(parseInt(limit));
    query += ` ORDER BY v.views DESC LIMIT $${params.length}`;

    params.push(parseInt(offset));
    query += ` OFFSET $${params.length}`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching videos:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/videos/top - Top videos per hobby (for detail panel)
router.get("/top/:hobbyId", async (req, res) => {
  try {
    const { hobbyId } = req.params;
    const { limit = 4 } = req.query;

    const youtube = await pool.query(
      `SELECT * FROM videos WHERE hobby_id = $1 AND platform = 'youtube'
       ORDER BY views DESC LIMIT $2`,
      [hobbyId, parseInt(limit)]
    );

    const tiktok = await pool.query(
      `SELECT * FROM videos WHERE hobby_id = $1 AND platform = 'tiktok'
       ORDER BY views DESC LIMIT $2`,
      [hobbyId, parseInt(limit)]
    );

    res.json({ youtube: youtube.rows, tiktok: tiktok.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
