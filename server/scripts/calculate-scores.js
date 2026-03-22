/**
 * Calculate composite trend scores from current data.
 *
 * Scores each hobby by ranking it against all other hobbies
 * across 5 metrics from 3 platforms. Works from day one --
 * no historical data needed.
 *
 * Scoring (0-100):
 *   Google Trends interest    x 0.25
 *   YouTube top video views   x 0.20
 *   TikTok top video views    x 0.20
 *   TikTok hashtag reach      x 0.15
 *   TikTok engagement rate    x 0.10
 *   Cross-platform strength   x 0.10
 *
 * Direction (for future use once we have 7+ days):
 *   Compares this week's score to last week's score.
 *   Until then, defaults to "stable".
 *
 * Run: node scripts/calculate-scores.js
 */

const pool = require("../db/pool");
require("dotenv").config();

// Percentile rank: where does this value fall in the array? Returns 0-100.
function percentileRank(value, allValues) {
  if (allValues.length === 0 || value === 0) return 0;
  const sorted = [...allValues].sort((a, b) => a - b);
  const below = sorted.filter((v) => v < value).length;
  const equal = sorted.filter((v) => v === value).length;
  return Math.round(((below + equal * 0.5) / sorted.length) * 100);
}

async function main() {
  console.log("Calculating trend scores...\n");

  const today = new Date().toISOString().split("T")[0];

  // Get all active hobbies with their latest snapshot + video totals
  const { rows: hobbies } = await pool.query(`
    SELECT
      h.id, h.name, h.category,
      s.snapshot_date,
      s.trends_interest_score,
      s.tt_hashtag_views,
      s.tt_avg_engagement_rate,
      s.yt_unique_channels,
      s.tt_unique_creators,
      COALESCE(yt.total_views, 0) as yt_total_views,
      COALESCE(tt.total_views, 0) as tt_total_views
    FROM hobbies h
    LEFT JOIN LATERAL (
      SELECT * FROM hobby_snapshots
      WHERE hobby_id = h.id
      ORDER BY snapshot_date DESC
      LIMIT 1
    ) s ON true
    LEFT JOIN LATERAL (
      SELECT COALESCE(SUM(views), 0) as total_views
      FROM videos
      WHERE hobby_id = h.id AND platform = 'youtube'
        AND published_at >= NOW() - INTERVAL '30 days'
    ) yt ON true
    LEFT JOIN LATERAL (
      SELECT COALESCE(SUM(views), 0) as total_views
      FROM videos
      WHERE hobby_id = h.id AND platform = 'tiktok'
    ) tt ON true
    WHERE h.active = true
  `);

  if (hobbies.length === 0) {
    console.log("No hobbies found.");
    process.exit(0);
  }

  // Collect all values for each metric to compute percentile ranks
  const allTrends = hobbies.map((h) => Number(h.trends_interest_score) || 0);
  const allYtViews = hobbies.map((h) => Number(h.yt_total_views) || 0);
  const allTtViews = hobbies.map((h) => Number(h.tt_total_views) || 0);
  const allTtHashtag = hobbies.map((h) => Number(h.tt_hashtag_views) || 0);
  const allTtEng = hobbies.map((h) => Number(h.tt_avg_engagement_rate) || 0);

  const results = [];

  for (const hobby of hobbies) {
    const trendsScore = Number(hobby.trends_interest_score) || 0;
    const ytViews = Number(hobby.yt_total_views) || 0;
    const ttViews = Number(hobby.tt_total_views) || 0;
    const ttHashtag = Number(hobby.tt_hashtag_views) || 0;
    const ttEng = Number(hobby.tt_avg_engagement_rate) || 0;

    // Percentile rank for each metric (0-100)
    const pTrends = percentileRank(trendsScore, allTrends);
    const pYtViews = percentileRank(ytViews, allYtViews);
    const pTtViews = percentileRank(ttViews, allTtViews);
    const pTtHashtag = percentileRank(ttHashtag, allTtHashtag);
    const pTtEng = percentileRank(ttEng, allTtEng);

    // Cross-platform strength: how many platforms have above-median data?
    const hasYt = pYtViews > 50;
    const hasTt = pTtViews > 50;
    const hasTrends = pTrends > 50;
    const crossPlatform = [hasYt, hasTt, hasTrends].filter(Boolean).length;
    const pCross = Math.round((crossPlatform / 3) * 100);

    // Weighted composite score
    const trendScore = Math.round(
      pTrends * 0.25 +
      pYtViews * 0.20 +
      pTtViews * 0.20 +
      pTtHashtag * 0.15 +
      pTtEng * 0.10 +
      pCross * 0.10
    );

    // Direction: compare to 7-day-old score if available
    let direction = "stable";
    const { rows: prevRows } = await pool.query(
      `SELECT trend_score FROM hobby_snapshots
       WHERE hobby_id = $1 AND snapshot_date <= $2::date - 6
       ORDER BY snapshot_date DESC LIMIT 1`,
      [hobby.id, today]
    );
    if (prevRows.length > 0 && prevRows[0].trend_score != null) {
      const prevScore = prevRows[0].trend_score;
      const diff = trendScore - prevScore;
      if (diff > 5) direction = "rising";
      else if (diff < -5) direction = "declining";
    }

    // Update the snapshot
    if (hobby.snapshot_date) {
      await pool.query(
        `UPDATE hobby_snapshots SET
          trend_score = $1, direction = $2,
          search_acceleration = $3, creator_adoption_rate = $4,
          yt_growth_rate = $5, tt_growth_rate = $6
        WHERE hobby_id = $7 AND snapshot_date = $8`,
        [
          trendScore, direction,
          // Store percentile breakdowns in existing columns for reference
          pTrends, pCross,
          pYtViews, pTtViews,
          hobby.id, hobby.snapshot_date,
        ]
      );
    }

    results.push({ name: hobby.name, trendScore, direction, pTrends, pYtViews, pTtViews, pTtHashtag, pTtEng });
  }

  // Sort and display results
  results.sort((a, b) => b.trendScore - a.trendScore);

  console.log("Rank  Score  Hobby                          YT%   TT%   Trends%  Dir");
  console.log("----  -----  ----------------------------  ----  ----  -------  --------");
  results.forEach((r, i) => {
    const name = r.name.padEnd(28).slice(0, 28);
    const rank = String(i + 1).padStart(4);
    const score = String(r.trendScore).padStart(5);
    const yt = String(r.pYtViews).padStart(4);
    const tt = String(r.pTtViews).padStart(4);
    const tr = String(r.pTrends).padStart(7);
    console.log(`${rank}  ${score}  ${name}  ${yt}  ${tt}  ${tr}  ${r.direction}`);
  });

  console.log(`\nScored ${results.length} hobbies. Top: ${results[0]?.name} (${results[0]?.trendScore})`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Score calculation failed:", err);
  process.exit(1);
});
