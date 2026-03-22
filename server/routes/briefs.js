const express = require("express");
const router = express.Router();
const pool = require("../db/pool");

const API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = "claude-sonnet-4-6";

const OVERVIEW_SYSTEM_PROMPT = `You are a senior content strategist who analyzes hobby trend data across YouTube, TikTok, and Google Trends to produce a monthly intelligence report for a talent management agency.

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

// Helper: get all hobby trend data
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

// Helper: build overview prompt
function buildOverviewPrompt(hobbies) {
  const lines = hobbies.map((h, i) =>
    `${i + 1}. ${h.name} (${h.category}) | Score: ${h.trend_score || "N/A"}/100 | ${h.direction || "unknown"}
   YT: ${h.yt_avg_views ? Number(h.yt_avg_views).toLocaleString() + " avg views" : "no data"}, ${h.yt_growth_rate || 0}% growth, ${h.yt_unique_channels || 0} channels
   TT: ${h.tt_hashtag_views ? Number(h.tt_hashtag_views).toLocaleString() + " hashtag views" : "no data"}, ${h.tt_avg_engagement_rate || 0}% eng, ${h.tt_unique_creators || 0} creators
   Trends: ${h.trends_interest_score || 0}/100 interest, ${h.search_acceleration || 0}% acceleration`
  ).join("\n\n");

  return `Analyze trend data for ${hobbies.length} hobbies and produce the Monthly Trend Intelligence Report.

<all_hobby_data>
${lines}
</all_hobby_data>

<context>
Report date: ${new Date().toISOString().split("T")[0]}
Data sources: YouTube Data API (30-day top videos), TikAPI (TikTok hashtags), DataForSEO (Google Trends)
Note: Growth rates may show 0% if this is the first day of data collection. Focus on absolute metrics and cross-platform signals in that case.
</context>`;
}

// Helper: call Claude API
async function callClaude(systemPrompt, userPrompt, maxTokens = 4000) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Claude API ${res.status}: ${body}`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text || "";
  const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  return {
    brief: JSON.parse(cleaned),
    inputTokens: data.usage?.input_tokens || 0,
    outputTokens: data.usage?.output_tokens || 0,
  };
}

// ─── ROUTES ────────────────────────────────────────────

// GET /api/briefs/overview - Latest monthly overview
router.get("/overview", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM hobby_briefs
       WHERE brief_type = 'overview' AND status = 'completed'
       ORDER BY created_at DESC
       LIMIT 1`
    );
    res.json(result.rows.length > 0 ? result.rows[0] : null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/briefs/refresh - Regenerate overview (calls Claude inline)
router.post("/refresh", async (req, res) => {
  try {
    if (!API_KEY) {
      return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });
    }

    console.log("Refreshing overview brief...");

    const hobbies = await getAllTrendData();
    const prompt = buildOverviewPrompt(hobbies);
    const { brief, inputTokens, outputTokens } = await callClaude(OVERVIEW_SYSTEM_PROMPT, prompt);

    const month = new Date().toISOString().slice(0, 8) + "01";

    // Delete old overview for this month, insert new
    await pool.query(`DELETE FROM hobby_briefs WHERE brief_type = 'overview' AND generation_month = $1`, [month]);

    const { rows } = await pool.query(
      `INSERT INTO report_generations (generation_month, status, total_briefs, completed_briefs, completed_at)
       VALUES ($1, 'completed', 1, 1, NOW())
       ON CONFLICT (generation_month) DO UPDATE SET status = 'completed', completed_at = NOW()
       RETURNING id`,
      [month]
    );
    const genId = rows[0].id;

    await pool.query(
      `INSERT INTO hobby_briefs (generation_id, hobby_id, generation_month, status, brief_type, brief_content, input_tokens, output_tokens, model_used)
       VALUES ($1, NULL, $2, 'completed', 'overview', $3, $4, $5, $6)`,
      [genId, month, JSON.stringify(brief), inputTokens, outputTokens, MODEL]
    );

    const cost = ((inputTokens * 3 + outputTokens * 15) / 1_000_000).toFixed(3);
    console.log(`Overview refreshed: ${inputTokens + outputTokens} tokens, ~$${cost}`);

    // Return the newly created overview
    const result = await pool.query(
      `SELECT * FROM hobby_briefs WHERE brief_type = 'overview' AND status = 'completed' ORDER BY created_at DESC LIMIT 1`
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Overview refresh failed:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/briefs/hobby/:hobbyId - Cached individual brief
router.get("/hobby/:hobbyId", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM hobby_briefs
       WHERE hobby_id = $1 AND brief_type = 'individual' AND status = 'completed'
       ORDER BY created_at DESC LIMIT 1`,
      [req.params.hobbyId]
    );
    res.json(result.rows.length > 0 ? result.rows[0] : null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/briefs/hobby/:hobbyId/generate - On-demand individual brief
router.post("/hobby/:hobbyId/generate", async (req, res) => {
  try {
    const { hobbyId } = req.params;

    if (!API_KEY) return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });

    const { rows: [hobby] } = await pool.query(
      `SELECT id, name, category, keywords, tiktok_hashtags FROM hobbies WHERE id = $1`, [hobbyId]
    );
    if (!hobby) return res.status(404).json({ error: "Hobby not found" });

    const { rows: snapshots } = await pool.query(
      `SELECT * FROM hobby_snapshots WHERE hobby_id = $1 ORDER BY snapshot_date DESC LIMIT 1`, [hobbyId]
    );
    const latest = snapshots[0] || {};

    const { rows: ytVideos } = await pool.query(
      `SELECT title, channel_or_user, views, likes FROM videos
       WHERE hobby_id = $1 AND platform = 'youtube' ORDER BY views DESC LIMIT 10`, [hobbyId]
    );
    const { rows: ttVideos } = await pool.query(
      `SELECT title, channel_or_user, views, engagement_rate FROM videos
       WHERE hobby_id = $1 AND platform = 'tiktok' ORDER BY views DESC LIMIT 10`, [hobbyId]
    );

    const prompt = `Generate a detailed Content Strategy Brief for "${hobby.name}" (${hobby.category}).

<metrics>
Trend Score: ${latest.trend_score || "N/A"}/100 | Direction: ${latest.direction || "unknown"}
YT Avg Views: ${latest.yt_avg_views ? Number(latest.yt_avg_views).toLocaleString() : "N/A"}, ${latest.yt_unique_channels || 0} channels
TT Hashtag Views: ${latest.tt_hashtag_views ? Number(latest.tt_hashtag_views).toLocaleString() : "N/A"}, ${latest.tt_avg_engagement_rate || 0}% eng
Google Trends: ${latest.trends_interest_score || 0}/100 interest
</metrics>
<keywords>YT: ${hobby.keywords.join(", ")} | TT: ${hobby.tiktok_hashtags.join(", ")}</keywords>
<top_yt>${ytVideos.map((v, i) => `${i + 1}. "${v.title}" by ${v.channel_or_user} - ${Number(v.views).toLocaleString()} views`).join("\n")}</top_yt>
<top_tt>${ttVideos.map((v, i) => `${i + 1}. "${v.title}" by ${v.channel_or_user} - ${Number(v.views).toLocaleString()} views, ${v.engagement_rate}% eng`).join("\n")}</top_tt>`;

    const systemPrompt = `You are a senior content strategist. Produce a detailed, actionable content brief. Respond with valid JSON only. No markdown, no code blocks.
JSON structure: { "summary": "3-5 sentences", "trend_status": "RISING|DECLINING|STABLE|EMERGING|SEASONAL", "confidence": 8, "key_insights": [{"insight":"","urgency":"ACT_NOW|THIS_MONTH|WATCH","data_point":""}], "video_concepts": [{"title":"<60 chars","format":"","platform":"youtube|tiktok|both","hook":"5-sec hook","why_now":"","difficulty":"easy|medium|hard"}], "competitor_gaps": "", "timing": "", "hashtags": [] }
Include 3-5 key_insights and 3-5 video_concepts.`;

    const { brief, inputTokens, outputTokens } = await callClaude(systemPrompt, prompt, 3000);

    const month = new Date().toISOString().slice(0, 8) + "01";
    await pool.query(`DELETE FROM hobby_briefs WHERE hobby_id = $1 AND brief_type = 'individual' AND generation_month = $2`, [hobbyId, month]);
    await pool.query(
      `INSERT INTO hobby_briefs (hobby_id, generation_month, status, brief_type, brief_content, input_tokens, output_tokens, model_used)
       VALUES ($1, $2, 'completed', 'individual', $3, $4, $5, $6)`,
      [hobbyId, month, JSON.stringify(brief), inputTokens, outputTokens, MODEL]
    );

    res.json({ brief_content: brief, hobby_name: hobby.name, category: hobby.category });
  } catch (err) {
    console.error("Brief generation failed:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
