/**
 * Calculate composite trend scores using percentile ranking.
 *
 * Scoring formula (weighted):
 *   YoY Search Growth     x 0.25  (sparkline last 4 weeks vs first 4 weeks)
 *   YouTube View Volume   x 0.20  (total views of top tracked videos, percentile)
 *   TikTok View Volume    x 0.20  (total views of top tracked videos, percentile)
 *   TikTok Hashtag Reach  x 0.15  (hashtag view count, percentile)
 *   Search Volume          x 0.20  (monthly Google searches, percentile)
 *
 * Run: node scripts/calculate-scores.js
 * Single hobby: node scripts/calculate-scores.js --hobby-id=123
 */

const pool = require("../db/pool");
require("dotenv").config();

const HOBBY_ID = process.argv.find(a => a.startsWith("--hobby-id="))?.split("=")[1];

// Calculate YoY growth from sparkline (last 4 weeks vs first 4 weeks)
function calcYoYGrowth(sparkline) {
  if (!sparkline || !Array.isArray(sparkline) || sparkline.length < 50) return null;
  const recent = sparkline.slice(-4);
  const yearAgo = sparkline.slice(0, 4);
  const avgRecent = recent.reduce((a, b) => a + b, 0) / recent.length;
  const avgYearAgo = yearAgo.reduce((a, b) => a + b, 0) / yearAgo.length;
  if (avgYearAgo === 0) return null;
  return ((avgRecent - avgYearAgo) / avgYearAgo) * 100;
}

// Percentile rank: what % of values is this value >= to?
function percentileRank(value, allValues) {
  if (allValues.length === 0) return 50;
  const below = allValues.filter(v => v < value).length;
  return Math.round((below / allValues.length) * 100);
}

function determineDirection(scores) {
  if (scores.length < 3) return "stable";
  const recent = scores.slice(-3);
  const trend = recent[2] - recent[0];
  if (trend > 5) return "rising";
  if (trend < -5) return "declining";
  return "stable";
}

async function main() {
  console.log("Calculating trend scores...\n");

  const today = new Date().toISOString().split("T")[0];

  // Get ALL active hobbies with latest snapshot (needed for percentile ranking)
  const { rows: allHobbies } = await pool.query(`
    SELECT
      h.id, h.name,
      s.snapshot_date,
      s.yt_avg_views,
      s.tt_hashtag_views,
      s.tt_avg_plays,
      s.trends_interest_score,
      s.trends_sparkline,
      s.search_volume,
      s.trend_score,
      s.yt_new_videos_24h,
      s.tt_new_videos_24h,
      s.yt_unique_channels,
      s.tt_unique_creators
    FROM hobbies h
    LEFT JOIN LATERAL (
      SELECT * FROM hobby_snapshots
      WHERE hobby_id = h.id
      ORDER BY snapshot_date DESC
      LIMIT 1
    ) s ON true
    WHERE h.active = true
  `);

  // Get total video views per hobby from videos table
  const { rows: ytViewTotals } = await pool.query(`
    SELECT hobby_id, SUM(views) as total_views, COUNT(*) as video_count
    FROM videos WHERE platform = 'youtube'
    GROUP BY hobby_id
  `);
  const { rows: ttViewTotals } = await pool.query(`
    SELECT hobby_id, SUM(views) as total_views, COUNT(*) as video_count
    FROM videos WHERE platform = 'tiktok'
    GROUP BY hobby_id
  `);

  const ytViewMap = Object.fromEntries(ytViewTotals.map(r => [r.hobby_id, Number(r.total_views) || 0]));
  const ttViewMap = Object.fromEntries(ttViewTotals.map(r => [r.hobby_id, Number(r.total_views) || 0]));

  // Build raw metrics for all hobbies
  const metrics = allHobbies.map(h => ({
    id: h.id,
    name: h.name,
    snapshotDate: h.snapshot_date,
    yoyGrowth: calcYoYGrowth(h.trends_sparkline),
    ytViews: ytViewMap[h.id] || 0,
    ttViews: ttViewMap[h.id] || 0,
    ttHashtag: Number(h.tt_hashtag_views) || 0,
    searchVolume: Number(h.search_volume) || 0,
    // Keep for direction calculation
    trendScore: h.trend_score,
    trendsSparkline: h.trends_sparkline,
    ytNewVideos: h.yt_new_videos_24h,
    ttNewVideos: h.tt_new_videos_24h,
    ytChannels: h.yt_unique_channels,
    ttCreators: h.tt_unique_creators,
  }));

  // Collect all values for percentile ranking
  const allYoY = metrics.map(m => m.yoyGrowth).filter(v => v !== null);
  const allYtViews = metrics.map(m => m.ytViews);
  const allTtViews = metrics.map(m => m.ttViews);
  const allTtHashtag = metrics.map(m => m.ttHashtag);
  const allSearchVol = metrics.map(m => m.searchVolume);

  // Filter to only hobbies we're scoring (if --hobby-id passed)
  const toScore = HOBBY_ID
    ? metrics.filter(m => m.id === parseInt(HOBBY_ID))
    : metrics;

  // Score each hobby
  const results = [];
  for (const m of toScore) {
    if (!m.snapshotDate) {
      console.log(`  ${m.name}: No data yet, skipping`);
      continue;
    }

    // Percentile scores for each component
    const yoyPct = m.yoyGrowth !== null ? percentileRank(m.yoyGrowth, allYoY) : 50;
    const ytViewsPct = percentileRank(m.ytViews, allYtViews);
    const ttViewsPct = percentileRank(m.ttViews, allTtViews);
    const ttHashtagPct = percentileRank(m.ttHashtag, allTtHashtag);
    const searchVolPct = percentileRank(m.searchVolume, allSearchVol);

    // Weighted composite
    const rawScore =
      yoyPct * 0.25 +
      ytViewsPct * 0.20 +
      ttViewsPct * 0.20 +
      ttHashtagPct * 0.15 +
      searchVolPct * 0.20;

    const trendScore = Math.round(Math.max(0, Math.min(100, rawScore)));

    // Direction from recent scores
    const { rows: recentSnapshots } = await pool.query(
      `SELECT trend_score FROM hobby_snapshots
       WHERE hobby_id = $1 ORDER BY snapshot_date DESC LIMIT 7`,
      [m.id]
    );
    const recentScores = recentSnapshots.reverse().map(s => s.trend_score || 0);
    recentScores.push(trendScore);
    const direction = determineDirection(recentScores);

    // Calculate growth rates for display (not used in scoring)
    const yoyDisplay = m.yoyGrowth !== null ? m.yoyGrowth.toFixed(1) : "0.0";

    // Update snapshot
    await pool.query(
      `UPDATE hobby_snapshots SET
        trend_score = $1,
        direction = $2,
        search_acceleration = $3
      WHERE hobby_id = $4 AND snapshot_date = $5`,
      [trendScore, direction, yoyDisplay, m.id, today]
    );

    results.push({ name: m.name, score: trendScore, direction, yoyPct, ytViewsPct, ttViewsPct, ttHashtagPct, searchVolPct });
  }

  // Print ranked results
  results.sort((a, b) => b.score - a.score);
  console.log("Rank  Score  Hobby                          YoY%  YT%   TT%   Hash%  Vol%   Dir");
  console.log("----  -----  ----------------------------  ----  ----  ----  -----  -----  --------");
  results.forEach((r, i) => {
    console.log(
      `${String(i + 1).padStart(4)}  ${String(r.score).padStart(5)}  ${r.name.padEnd(30)}${String(r.yoyPct).padStart(4)}  ${String(r.ytViewsPct).padStart(4)}  ${String(r.ttViewsPct).padStart(4)}  ${String(r.ttHashtagPct).padStart(5)}  ${String(r.searchVolPct).padStart(5)}  ${r.direction}`
    );
  });

  console.log(`\nScored ${results.length} hobbies. Top: ${results[0]?.name} (${results[0]?.score})`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Score calculation failed:", err);
  process.exit(1);
});
