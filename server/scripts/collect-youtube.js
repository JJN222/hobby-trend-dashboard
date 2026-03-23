/**
 * YouTube Data API v3 collection script
 *
 * Collects top-performing videos for each hobby from the past 30 days.
 * Searches the top 2 keywords per hobby for wider coverage.
 * Sorted by view count to surface viral/trending content.
 *
 * Quota budget (10,000 free units/day):
 *   - search.list = 100 units per call
 *   - videos.list = 1 unit per call (batches up to 50 IDs)
 *   - ~47 hobbies x 2 searches = 9,400 units
 *   - ~47 batch stat calls = ~94 units
 *   - Total: ~9,494 units (tight but under 10,000)
 *
 * Run: node scripts/collect-youtube.js
 */

const pool = require("../db/pool");
require("dotenv").config();
const HOBBY_ID = process.argv.find(a => a.startsWith("--hobby-id="))?.split("=")[1];

const API_KEY = process.env.YOUTUBE_API_KEY;
const BASE = "https://www.googleapis.com/youtube/v3";

async function ytFetch(endpoint, params) {
  const url = new URL(`${BASE}/${endpoint}`);
  url.searchParams.set("key", API_KEY);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`YouTube API ${res.status}: ${body}`);
  }
  return res.json();
}

// Search for top-performing videos from last 30 days
async function searchVideos(keyword) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const data = await ytFetch("search", {
    part: "snippet",
    q: keyword,
    type: "video",
    order: "viewCount",
    publishedAfter: thirtyDaysAgo,
    maxResults: 15,
    relevanceLanguage: "en",
  });
  return data;
}

// Batch fetch video stats (up to 50 IDs per call = 1 unit)
async function getVideoStats(videoIds) {
  if (videoIds.length === 0) return [];

  const batches = [];
  for (let i = 0; i < videoIds.length; i += 50) {
    batches.push(videoIds.slice(i, i + 50));
  }

  const allVideos = [];
  for (const batch of batches) {
    const data = await ytFetch("videos", {
      part: "snippet,statistics",
      id: batch.join(","),
    });
    allVideos.push(...(data.items || []));
  }
  return allVideos;
}

async function collectForHobby(hobby) {
  console.log(`  Collecting YouTube data for: ${hobby.name}`);

  const allVideoIds = new Set();
  let totalResults = 0;

  // Search the top 2 keywords for broader coverage
  const searchKeywords = hobby.keywords.slice(0, 2);

  for (const keyword of searchKeywords) {
    try {
      const searchData = await searchVideos(keyword);
      totalResults += searchData.pageInfo?.totalResults || 0;

      for (const item of searchData.items || []) {
        if (item.id?.videoId) allVideoIds.add(item.id.videoId);
      }
    } catch (err) {
      // If quota exceeded, stop gracefully
      if (err.message.includes("quotaExceeded")) {
        console.error(`    Quota exceeded, stopping collection.`);
        return "QUOTA_EXCEEDED";
      }
      console.error(`    Search failed for "${keyword}":`, err.message);
    }

    // Small delay between searches
    await new Promise((r) => setTimeout(r, 300));
  }

  if (allVideoIds.size === 0) {
    console.log(`    No videos found`);
    return;
  }

  // Fetch full stats for discovered videos
  const videos = await getVideoStats([...allVideoIds]);

  // Filter to only videos with meaningful view counts (1,000+)
  const significantVideos = videos.filter(
    (v) => parseInt(v.statistics?.viewCount || 0) >= 1000
  );

  // Calculate averages from significant videos
  const viewCounts = significantVideos.map((v) => parseInt(v.statistics?.viewCount || 0));
  const likeCounts = significantVideos.map((v) => parseInt(v.statistics?.likeCount || 0));
  const commentCounts = significantVideos.map((v) => parseInt(v.statistics?.commentCount || 0));
  const channels = new Set(significantVideos.map((v) => v.snippet?.channelId));

  const avgViews = viewCounts.length > 0
    ? Math.round(viewCounts.reduce((a, b) => a + b, 0) / viewCounts.length)
    : 0;
  const avgLikes = likeCounts.length > 0
    ? Math.round(likeCounts.reduce((a, b) => a + b, 0) / likeCounts.length)
    : 0;
  const avgComments = commentCounts.length > 0
    ? Math.round(commentCounts.reduce((a, b) => a + b, 0) / commentCounts.length)
    : 0;

  // Upsert today's snapshot (YouTube columns only)
  const today = new Date().toISOString().split("T")[0];
  await pool.query(
    `INSERT INTO hobby_snapshots (hobby_id, snapshot_date, yt_search_results, yt_avg_views, yt_avg_likes, yt_avg_comments, yt_new_videos_24h, yt_unique_channels)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (hobby_id, snapshot_date) DO UPDATE SET
       yt_search_results = EXCLUDED.yt_search_results,
       yt_avg_views = EXCLUDED.yt_avg_views,
       yt_avg_likes = EXCLUDED.yt_avg_likes,
       yt_avg_comments = EXCLUDED.yt_avg_comments,
       yt_new_videos_24h = EXCLUDED.yt_new_videos_24h,
       yt_unique_channels = EXCLUDED.yt_unique_channels`,
    [hobby.id, today, totalResults, avgViews, avgLikes, avgComments, significantVideos.length, channels.size]
  );

  // Store individual videos (sorted by views, keep top performers)
  const sortedVideos = significantVideos.sort(
    (a, b) => parseInt(b.statistics?.viewCount || 0) - parseInt(a.statistics?.viewCount || 0)
  );

  for (const v of sortedVideos) {
    const videoUrl = `https://youtube.com/watch?v=${v.id}`;
    const thumbUrl = v.snippet?.thumbnails?.medium?.url || `https://img.youtube.com/vi/${v.id}/mqdefault.jpg`;

    await pool.query(
      `INSERT INTO videos (hobby_id, platform, platform_id, title, channel_or_user, thumbnail_url, video_url, views, likes, comments, published_at)
       VALUES ($1, 'youtube', $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (platform, platform_id) DO UPDATE SET
         views = EXCLUDED.views, likes = EXCLUDED.likes,
         comments = EXCLUDED.comments, last_updated = NOW(),
         thumbnail_url = EXCLUDED.thumbnail_url`,
      [
        hobby.id, v.id, v.snippet?.title, v.snippet?.channelTitle,
        thumbUrl, videoUrl,
        parseInt(v.statistics?.viewCount || 0),
        parseInt(v.statistics?.likeCount || 0),
        parseInt(v.statistics?.commentCount || 0),
        v.snippet?.publishedAt,
      ]
    );
  }

  // Log the top video for visibility
  const topVideo = sortedVideos[0];
  const topViews = topVideo ? parseInt(topVideo.statistics?.viewCount || 0).toLocaleString() : "0";
  console.log(`    ${significantVideos.length} videos (1K+ views), ${channels.size} channels, top: ${topViews} views`);
}

async function main() {
  if (!API_KEY) {
    console.error("YOUTUBE_API_KEY not set. Copy .env.example to .env and add your key.");
    process.exit(1);
  }

  console.log("Starting YouTube data collection (last 30 days, top 2 keywords per hobby)...");
  const { rows: hobbies } = await pool.query(
    HOBBY_ID ? `SELECT id, name, keywords FROM hobbies WHERE active = true AND id = ${parseInt(HOBBY_ID)}` : `SELECT id, name, keywords FROM hobbies WHERE active = true`
  );

  for (const hobby of hobbies) {
    const result = await collectForHobby(hobby);
    if (result === "QUOTA_EXCEEDED") {
      console.log("\nQuota exceeded. Remaining hobbies will be collected on next run.");
      break;
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log("YouTube collection complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("YouTube collection failed:", err);
  process.exit(1);
});
