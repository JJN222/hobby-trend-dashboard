/**
 * DataForSEO Google Trends collection script
 *
 * Collects search interest data for each hobby's keywords.
 * Uses the DataForSEO Trends API (~$0.001 per request).
 *
 * Run: node scripts/collect-trends.js
 * Single hobby: node scripts/collect-trends.js --hobby-id=123
 */

const pool = require("../db/pool");
require("dotenv").config();

const LOGIN = process.env.DATAFORSEO_LOGIN;
const PASSWORD = process.env.DATAFORSEO_PASSWORD;
const BASE = "https://api.dataforseo.com/v3";
const HOBBY_ID = process.argv.find(a => a.startsWith("--hobby-id="))?.split("=")[1];

async function dfsPost(endpoint, body) {
  const res = await fetch(`${BASE}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Basic " + Buffer.from(`${LOGIN}:${PASSWORD}`).toString("base64"),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DataForSEO ${res.status}: ${text}`);
  }
  return res.json();
}

async function getTrendsData(keywords) {
  // Use DataForSEO's Google Trends explore endpoint
  const data = await dfsPost("/keywords_data/google_trends/explore/live", [
    {
      keywords,
      location_code: 2840, // United States
      language_code: "en",
      type: "web",
      time_range: "past_3_months",
    },
  ]);

  return data?.tasks?.[0]?.result || [];
}

async function collectForHobby(hobby) {
  console.log(`  Collecting trends data for: ${hobby.name}`);

  // Use first keyword as primary
  const keyword = hobby.keywords[0];
  if (!keyword) return;

  try {
    const results = await getTrendsData([keyword]);

    // Extract the latest interest score (0-100)
    let interestScore = 0;
    let relatedQueries = [];

    if (results.length > 0) {
      const items = results[0]?.items || [];
      // Get the most recent data point
      if (items.length > 0 && items[0]?.data) {
        const dataPoints = items[0].data;
        // Interest score from the latest period
        if (Array.isArray(dataPoints)) {
          const latest = dataPoints[dataPoints.length - 1];
          interestScore = latest?.values?.[0] || 0;
        }
      }
    }

    // Also fetch related queries for discovery
    try {
      const relatedData = await dfsPost("/keywords_data/google_trends/explore/live", [
        {
          keywords: [keyword],
          location_code: 2840,
          language_code: "en",
          type: "web",
          category: 0,
          time_range: "past_12_months",
          item_types: ["related_queries"],
        },
      ]);

      const relatedItems = relatedData?.tasks?.[0]?.result?.[0]?.items || [];
      relatedQueries = relatedItems
        .filter((item) => item.type === "related_queries")
        .flatMap((item) => (item.data || []).slice(0, 5).map((d) => d.query))
        .filter(Boolean);
    } catch (err) {
      // Related queries is optional, don't fail
      console.log(`    Related queries lookup skipped: ${err.message}`);
    }

    // Upsert today's snapshot (trends columns)
    const today = new Date().toISOString().split("T")[0];
    await pool.query(
      `INSERT INTO hobby_snapshots (hobby_id, snapshot_date, trends_interest_score, trends_related_queries)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (hobby_id, snapshot_date) DO UPDATE SET
         trends_interest_score = EXCLUDED.trends_interest_score,
         trends_related_queries = EXCLUDED.trends_related_queries`,
      [hobby.id, today, interestScore, JSON.stringify(relatedQueries)]
    );

    console.log(`    Interest: ${interestScore}/100, Related: ${relatedQueries.join(", ") || "none"}`);
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
  const query = HOBBY_ID
    ? `SELECT id, name, keywords FROM hobbies WHERE active = true AND id = ${parseInt(HOBBY_ID)}`
    : `SELECT id, name, keywords FROM hobbies WHERE active = true`;
  const { rows: hobbies } = await pool.query(query);

  for (const hobby of hobbies) {
    await collectForHobby(hobby);
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log("Trends collection complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Trends collection failed:", err);
  process.exit(1);
});
