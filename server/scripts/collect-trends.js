/**
 * DataForSEO Google Trends collection script
 *
 * Stores both the latest interest score AND an 8-week daily sparkline.
 *
 * Run: node scripts/collect-trends.js
 * Cost: ~$0.009 per hobby, ~$0.42 per run
 */

const pool = require("../db/pool");
require("dotenv").config();
const HOBBY_ID = process.argv.find(a => a.startsWith("--hobby-id="))?.split("=")[1];

const LOGIN = process.env.DATAFORSEO_LOGIN;
const PASSWORD = process.env.DATAFORSEO_PASSWORD;
const AUTH = "Basic " + Buffer.from(LOGIN + ":" + PASSWORD).toString("base64");

async function dfsPost(endpoint, body) {
  const res = await fetch("https://api.dataforseo.com/v3" + endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: AUTH,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DataForSEO ${res.status}: ${text}`);
  }
  return res.json();
}

function formatDate(date) {
  return date.toISOString().split("T")[0];
}

async function collectForHobby(hobby) {
  console.log(`  Collecting trends data for: ${hobby.name}`);

  const keyword = hobby.keywords[0];
  if (!keyword) return;

  try {
    const data = await dfsPost("/keywords_data/google_trends/explore/live", [
      {
        keywords: [keyword],
        location_code: 2840,
        language_code: "en",
        type: "web",
        time_range: "past_12_months",
      },
    ]);

    const task = data?.tasks?.[0];
    if (task?.status_code !== 20000) {
      console.error(`    API error: ${task?.status_code} ${task?.status_message}`);
      return;
    }

    const result = task?.result?.[0];
    if (!result || !result.items) {
      console.log(`    No results returned`);
      return;
    }

    const graph = result.items.find((item) => item.type === "google_trends_graph");
    if (!graph || !graph.data || graph.data.length === 0) {
      console.log(`    No graph data`);
      return;
    }

    // Get valid data points
    const validPoints = graph.data.filter((d) => !d.missing_data && d.values && d.values.length > 0);
    const latestPoint = validPoints[validPoints.length - 1];
    const interestScore = latestPoint?.values?.[0] || 0;

    // Build sparkline: last 56 days (8 weeks) of daily values
    const sparklineValues = validPoints.slice(-56).map((d) => d.values[0]);

    // Calculate 7-day acceleration
    const recentPoints = validPoints.slice(-7);
    const priorPoints = validPoints.slice(-14, -7);
    const recentAvg = recentPoints.length > 0
      ? recentPoints.reduce((a, d) => a + (d.values?.[0] || 0), 0) / recentPoints.length
      : 0;
    const priorAvg = priorPoints.length > 0
      ? priorPoints.reduce((a, d) => a + (d.values?.[0] || 0), 0) / priorPoints.length
      : 0;

    // Related queries
    let relatedQueries = [];
    const relatedItem = result.items.find(
      (item) => item.type === "google_trends_queries_list" && item.title === "Related queries"
    );
    if (relatedItem && relatedItem.data) {
      relatedQueries = relatedItem.data
        .slice(0, 5)
        .map((d) => d.query || d.keyword)
        .filter(Boolean);
    }

    // Upsert today's snapshot
    const today = new Date().toISOString().split("T")[0];
    await pool.query(
      `INSERT INTO hobby_snapshots (hobby_id, snapshot_date, trends_interest_score, trends_related_queries, trends_sparkline)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (hobby_id, snapshot_date) DO UPDATE SET
         trends_interest_score = EXCLUDED.trends_interest_score,
         trends_related_queries = EXCLUDED.trends_related_queries,
         trends_sparkline = EXCLUDED.trends_sparkline`,
      [hobby.id, today, interestScore, JSON.stringify(relatedQueries), JSON.stringify(sparklineValues)]
    );

    const accel = priorAvg > 0 ? (((recentAvg - priorAvg) / priorAvg) * 100).toFixed(1) : "N/A";
    console.log(`    Interest: ${interestScore}/100, sparkline: ${sparklineValues.length} pts, accel: ${accel}%`);
  } catch (err) {
    console.error(`    Trends fetch failed:`, err.message);
  }
}

async function main() {
  if (!LOGIN || !PASSWORD) {
    console.error("DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD not set.");
    process.exit(1);
  }

  console.log("Starting Google Trends data collection...");
  const { rows: hobbies } = await pool.query(
    HOBBY_ID ? `SELECT id, name, keywords FROM hobbies WHERE active = true AND id = ${parseInt(HOBBY_ID)}` : `SELECT id, name, keywords FROM hobbies WHERE active = true`
  );

  console.log(`Collecting for ${hobbies.length} hobbies (~$${(hobbies.length * 0.009).toFixed(2)} estimated cost)\n`);

  for (const hobby of hobbies) {
    await collectForHobby(hobby);
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log("\nTrends collection complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Trends collection failed:", err);
  process.exit(1);
});
