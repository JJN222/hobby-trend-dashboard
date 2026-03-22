const express = require("express");
const router = express.Router();
const pool = require("../db/pool");

// GET /api/snapshots/:hobbyId - Historical snapshots for sparklines
router.get("/:hobbyId", async (req, res) => {
  try {
    const { hobbyId } = req.params;
    const { days = 56 } = req.query; // 8 weeks default

    const result = await pool.query(
      `SELECT snapshot_date, trend_score, yt_growth_rate, tt_growth_rate,
              trends_interest_score, yt_avg_views, tt_hashtag_views, direction
       FROM hobby_snapshots
       WHERE hobby_id = $1
         AND snapshot_date >= CURRENT_DATE - $2::integer
       ORDER BY snapshot_date ASC`,
      [hobbyId, parseInt(days)]
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
