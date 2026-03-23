/**
 * Calculate composite trend scores from raw snapshot data.
 *
 * Scoring formula (weighted):
 *   search_acceleration  x 0.30
 *   creator_adoption     x 0.25
 *   cross_platform       x 0.20
 *   engagement_velocity  x 0.15
 *   search_interest      x 0.10
 *
 * Run: node scripts/calculate-scores.js
 * Single hobby: node scripts/calculate-scores.js --hobby-id=123
 */

const pool = require("../db/pool");
require("dotenv").config();

const HOBBY_ID = process.argv.find(a => a.startsWith("--hobby-id="))?.split("=")[1];

function calculateGrowthRate(current, previous) {
  if (!previous || previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

function normalize(value, min, max) {
  if (max === min) return 50;
  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
}

function determineDirection(scores) {
  if (scores.length < 3) return "stable";

  // Look at last 3 scores
  const recent = scores.slice(-3);
  const trend = recent[2] - recent[0];

  if (trend > 5) return "rising";
  if (trend < -5) return "declining";
  return "stable";
}

async function main() {
  console.log("Calculating trend scores...");

  const query = HOBBY_ID
    ? `SELECT id, name FROM hobbies WHERE active = true AND id = ${parseInt(HOBBY_ID)}`
    : `SELECT id, name FROM hobbies WHERE active = true`;
  const { rows: hobbies } = await pool.query(query);

  const today = new Date().toISOString().split("T")[0];

  for (const hobby of hobbies) {
    // Get last 14 days of snapshots
    const { rows: snapshots } = await pool.query(
      `SELECT * FROM hobby_snapshots
       WHERE hobby_id = $1
       ORDER BY snapshot_date DESC
       LIMIT 14`,
      [hobby.id]
    );

    if (snapshots.length === 0) {
      console.log(`  ${hobby.name}: No data yet, skipping`);
      continue;
    }

    const current = snapshots[0];
    const weekAgo = snapshots.find((s) => {
      const diff = (new Date(current.snapshot_date) - new Date(s.snapshot_date)) / (1000 * 60 * 60 * 24);
      return diff >= 6 && diff <= 8;
    }) || snapshots[Math.min(6, snapshots.length - 1)];

    // 1. Search acceleration (Google Trends week-over-week)
    const searchAccel = calculateGrowthRate(
      current.trends_interest_score || 0,
      weekAgo?.trends_interest_score || 0
    );

    // 2. YouTube growth rate
    const ytGrowth = calculateGrowthRate(
      current.yt_new_videos_24h || 0,
      weekAgo?.yt_new_videos_24h || 0
    );

    // 3. TikTok growth rate
    const ttGrowth = calculateGrowthRate(
      current.tt_new_videos_24h || 0,
      weekAgo?.tt_new_videos_24h || 0
    );

    // 4. Creator adoption rate (unique creators across platforms)
    const currentCreators = (current.yt_unique_channels || 0) + (current.tt_unique_creators || 0);
    const prevCreators = (weekAgo?.yt_unique_channels || 0) + (weekAgo?.tt_unique_creators || 0);
    const creatorAdoption = calculateGrowthRate(currentCreators, prevCreators);

    // 5. Cross-platform presence score
    const hasYT = (current.yt_new_videos_24h || 0) > 0;
    const hasTT = (current.tt_new_videos_24h || 0) > 0;
    const hasTrends = (current.trends_interest_score || 0) > 20;
    const crossPlatform = [hasYT, hasTT, hasTrends].filter(Boolean).length;

    // 6. Engagement velocity
    const engagementVelocity = (current.tt_avg_engagement_rate || 0);

    // 7. Raw search interest
    const searchInterest = current.trends_interest_score || 0;

    // Composite score (0-100)
    const rawScore =
      normalize(searchAccel, -50, 50) * 0.30 +
      normalize(creatorAdoption, -30, 100) * 0.25 +
      normalize(crossPlatform, 0, 3) * 0.20 +
      normalize(engagementVelocity, 0, 15) * 0.15 +
      normalize(searchInterest, 0, 100) * 0.10;

    const trendScore = Math.round(Math.max(0, Math.min(100, rawScore)));

    // Direction from recent scores
    const recentScores = snapshots
      .slice(0, 7)
      .reverse()
      .map((s) => s.trend_score || 0);
    recentScores.push(trendScore);
    const direction = determineDirection(recentScores);

    // Update snapshot
    await pool.query(
      `UPDATE hobby_snapshots SET
        trend_score = $1,
        yt_growth_rate = $2,
        tt_growth_rate = $3,
        search_acceleration = $4,
        creator_adoption_rate = $5,
        direction = $6
      WHERE hobby_id = $7 AND snapshot_date = $8`,
      [trendScore, ytGrowth.toFixed(2), ttGrowth.toFixed(2), searchAccel.toFixed(2), creatorAdoption.toFixed(2), direction, hobby.id, today]
    );

    console.log(`  ${hobby.name}: score=${trendScore}, direction=${direction}, yt=${ytGrowth.toFixed(1)}%, tt=${ttGrowth.toFixed(1)}%`);
  }

  console.log("Score calculation complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Score calculation failed:", err);
  process.exit(1);
});
