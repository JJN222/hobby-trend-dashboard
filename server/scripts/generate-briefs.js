/**
 * Generate a single monthly overview brief analyzing all hobbies.
 *
 * One Claude call with ALL hobby data -> ranked overview with
 * top opportunities, emerging trends, declining niches, and picks.
 *
 * Run: node scripts/generate-briefs.js
 * Cost: ~$0.10-0.15 per run (one Sonnet call)
 */

const pool = require("../db/pool");
require("dotenv").config();

const API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = "claude-sonnet-4-6";

const SYSTEM_PROMPT = `You are a senior content strategist who analyzes hobby trend data across YouTube, TikTok, and Google Trends to produce a monthly intelligence report for a talent management agency.

Your report helps the team decide which hobby niches to invest in for content creation. Be specific, data-driven, and opinionated. Don't hedge -- make clear recommendations.

RULES:
- Reference specific numbers from the data
- Rank hobbies by opportunity, not just raw popularity
- Identify cross-category patterns and emerging themes
- Call out hobbies that are declining or oversaturated
- Be concise -- every sentence should be actionable
- When naming hobbies, use the exact names from the data

Respond with valid JSON only. No markdown, no code blocks, no preamble.

The JSON must match this structure:
{
  "headline": "One punchy sentence summarizing this month's biggest takeaway",
  "executive_summary": "3-5 sentence overview of the hobby landscape this month",
  "top_opportunities": [
    {
      "hobby": "exact hobby name",
      "category": "category",
      "why": "2-3 sentences on why this is an opportunity right now",
      "urgency": "ACT_NOW or THIS_MONTH or WATCH",
      "suggested_angle": "One specific content angle to pursue"
    }
  ],
  "emerging_trends": [
    {
      "trend": "description of the emerging pattern",
      "hobbies_involved": ["hobby1", "hobby2"],
      "signal": "what data supports this"
    }
  ],
  "declining_niches": [
    {
      "hobby": "exact hobby name",
      "concern": "why it's declining and what to watch for"
    }
  ],
  "cross_category_insights": "2-3 sentences on patterns across categories",
  "monthly_picks": {
    "best_for_youtube": { "hobby": "name", "why": "reason" },
    "best_for_tiktok": { "hobby": "name", "why": "reason" },
    "dark_horse": { "hobby": "name", "why": "reason" }
  }
}

Include 5-8 top_opportunities, 2-4 emerging_trends, and 2-4 declining_niches.`;

async function getAllTrendData() {
  const { rows } = await pool.query(
    `SELECT
      h.id, h.name, h.category,
      s.trend_score, s.direction,
      s.yt_avg_views, s.yt_growth_rate, s.yt_new_videos_24h, s.yt_unique_channels,
      s.tt_hashtag_views, s.tt_growth_rate, s.tt_avg_engagement_rate, s.tt_unique_creators,
      s.trends_interest_score, s.search_acceleration, s.creator_adoption_rate
    FROM hobbies h
    LEFT JOIN LATERAL (
      SELECT * FROM hobby_snapshots
      WHERE hobby_id = h.id
      ORDER BY snapshot_date DESC
      LIMIT 1
    ) s ON true
    WHERE h.active = true
    ORDER BY COALESCE(s.trend_score, 0) DESC`
  );
  return rows;
}

function buildPrompt(hobbies) {
  const lines = hobbies.map((h, i) =>
    `${i + 1}. ${h.name} (${h.category}) | Score: ${h.trend_score || "N/A"}/100 | ${h.direction || "unknown"}
   YT: ${h.yt_avg_views ? Number(h.yt_avg_views).toLocaleString() + " avg views" : "no data"}, ${h.yt_growth_rate || 0}% growth, ${h.yt_unique_channels || 0} channels, ${h.yt_new_videos_24h || 0} new/day
   TT: ${h.tt_hashtag_views ? Number(h.tt_hashtag_views).toLocaleString() + " hashtag views" : "no data"}, ${h.tt_avg_engagement_rate || 0}% eng, ${h.tt_unique_creators || 0} creators
   Trends: ${h.trends_interest_score || 0}/100 interest, ${h.search_acceleration || 0}% acceleration`
  ).join("\n\n");

  return `Analyze trend data for ${hobbies.length} hobbies and produce the Monthly Trend Intelligence Report.

<all_hobby_data>
${lines}
</all_hobby_data>

<context>
Report date: ${new Date().toISOString().split("T")[0]}
Data sources: YouTube Data API (30-day top videos), TikAPI (TikTok hashtags), DataForSEO (Google Trends 3-month)
Note: Growth rates may show 0% if this is the first day of data collection. Focus on absolute metrics and cross-platform signals in that case.
</context>`;
}

async function callClaude(prompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Claude API ${res.status}: ${body}`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text || "";

  let parsed;
  try {
    const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new Error(`JSON parse failed: ${err.message}\nRaw: ${text.slice(0, 500)}`);
  }

  return {
    brief: parsed,
    inputTokens: data.usage?.input_tokens || 0,
    outputTokens: data.usage?.output_tokens || 0,
  };
}

async function main() {
  if (!API_KEY) {
    console.error("ANTHROPIC_API_KEY not set.");
    process.exit(1);
  }

  const month = new Date().toISOString().slice(0, 8) + "01";
  console.log(`Generating monthly overview for ${month}...\n`);

  const { rows } = await pool.query(
    `INSERT INTO report_generations (generation_month, status, total_briefs)
     VALUES ($1, 'processing', 1)
     ON CONFLICT (generation_month) DO UPDATE SET status = 'processing', started_at = NOW()
     RETURNING id`,
    [month]
  );
  const genId = rows[0].id;

  const hobbies = await getAllTrendData();
  console.log(`Sending ${hobbies.length} hobbies to Claude...\n`);

  try {
    const { brief, inputTokens, outputTokens } = await callClaude(buildPrompt(hobbies));

    // Remove old overview for this month, insert new
    await pool.query(`DELETE FROM hobby_briefs WHERE brief_type = 'overview' AND generation_month = $1`, [month]);
    await pool.query(
      `INSERT INTO hobby_briefs (generation_id, hobby_id, generation_month, status, brief_type, brief_content, input_tokens, output_tokens, model_used)
       VALUES ($1, NULL, $2, 'completed', 'overview', $3, $4, $5, $6)`,
      [genId, month, JSON.stringify(brief), inputTokens, outputTokens, MODEL]
    );

    await pool.query(
      `UPDATE report_generations SET status = 'completed', completed_briefs = 1, completed_at = NOW() WHERE id = $1`,
      [genId]
    );

    const cost = ((inputTokens * 3 + outputTokens * 15) / 1_000_000).toFixed(3);
    console.log(`Done: ${inputTokens + outputTokens} tokens, ~$${cost}`);
    console.log(`\nHeadline: ${brief.headline}`);
    console.log(`\nTop opportunities:`);
    (brief.top_opportunities || []).forEach((t, i) => console.log(`  ${i + 1}. ${t.hobby} (${t.urgency})`));
    console.log(`\nMonthly picks:`);
    if (brief.monthly_picks) {
      console.log(`  YouTube: ${brief.monthly_picks.best_for_youtube?.hobby}`);
      console.log(`  TikTok: ${brief.monthly_picks.best_for_tiktok?.hobby}`);
      console.log(`  Dark horse: ${brief.monthly_picks.dark_horse?.hobby}`);
    }
  } catch (err) {
    console.error("Failed:", err.message);
    await pool.query(`UPDATE report_generations SET status = 'failed', completed_at = NOW() WHERE id = $1`, [genId]);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
