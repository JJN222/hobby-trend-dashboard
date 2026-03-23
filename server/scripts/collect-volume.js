/**
 * Collect monthly search volume for each hobby's primary keyword.
 * Uses DataForSEO Google Ads Search Volume endpoint.
 * This gives REAL comparable monthly search numbers across hobbies.
const HOBBY_ID = process.argv.find(a => a.startsWith("--hobby-id="))?.split("=")[1];
 *
 * Run: node scripts/collect-volume.js
 * Cost: ~$0.05 per hobby (batched), ~$3 per full run
 */

const pool = require("../db/pool");
require("dotenv").config();

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

async function main() {
  if (!LOGIN || !PASSWORD) {
    console.error("DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD not set.");
    process.exit(1);
  }

  console.log("Collecting search volume data...\n");

  const { rows: hobbies } = await pool.query(
    HOBBY_ID ? `SELECT id, name, keywords FROM hobbies WHERE active = true AND id = ${parseInt(HOBBY_ID)}` : `SELECT id, name, keywords FROM hobbies WHERE active = true`
  );

  const today = new Date().toISOString().split("T")[0];

  // Batch keywords in groups of 10 to reduce API calls
  const batchSize = 10;
  for (let i = 0; i < hobbies.length; i += batchSize) {
    const batch = hobbies.slice(i, i + batchSize);
    const keywords = batch.map((h) => h.keywords[0]).filter(Boolean);

    if (keywords.length === 0) continue;

    console.log(`  Batch ${Math.floor(i / batchSize) + 1}: ${keywords.join(", ")}`);

    try {
      const data = await dfsPost("/keywords_data/google_ads/search_volume/live", [
        {
          keywords: keywords,
          location_code: 2840,
          language_code: "en",
        },
      ]);

      const task = data?.tasks?.[0];
      if (task?.status_code !== 20000) {
        console.error(`    API error: ${task?.status_code} ${task?.status_message}`);
        continue;
      }

      const results = task?.result || [];

      for (const result of results) {
        const keyword = result.keyword;
        const volume = result.search_volume || 0;

        // Find matching hobby
        const hobby = batch.find((h) => h.keywords[0] === keyword);
        if (!hobby) continue;

        // Upsert into today's snapshot
        await pool.query(
          `INSERT INTO hobby_snapshots (hobby_id, snapshot_date, search_volume)
           VALUES ($1, $2, $3)
           ON CONFLICT (hobby_id, snapshot_date) DO UPDATE SET
             search_volume = EXCLUDED.search_volume`,
          [hobby.id, today, volume]
        );

        const fmtVol = volume >= 1000 ? `${(volume / 1000).toFixed(1)}K` : volume;
        console.log(`    ${hobby.name}: ${fmtVol}/mo`);
      }
    } catch (err) {
      console.error(`    Batch failed:`, err.message);
    }

    // Small delay between batches
    if (i + batchSize < hobbies.length) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  console.log("\nSearch volume collection complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Volume collection failed:", err);
  process.exit(1);
});
