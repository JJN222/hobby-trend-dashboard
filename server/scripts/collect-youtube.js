/**
 * YouTube Data API v3 collection script
 *
 * Collects search results and video metrics for each hobby's keywords.
 * Designed to stay well under the 10,000 daily quota:
 *   - search.list = 100 units per call
 *   - videos.list = 1 unit per call (batches up to 50 IDs)
 *
 * Run: node scripts/collect-youtube.js
 * Single hobby: node scripts/collect-youtube.js --hobby-id=123
 */

const pool = require("../db/pool");
require("dotenv").config();

const API_KEY = process.env.YOUTUBE_API_KEY;
const BASE = "https://www.googleapis.com/youtube/v3";
const HOBBY_ID = process.argv.find(a => a.startsWith("--hobby-id="))?.split("=")[1];

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

// Search for recent videos about a hobby keyword
async function searchVideos(keyword) {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const data = await ytFetch("search", {
    part: "snippet",
    q: keyword,
    type: "video",
    order: "date",
    publishedAfter: oneDayAgo,
    maxResults: 10,
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

  const allVideoIds = [];
  let totalResults = 0;

  // Search each keyword (1 search per keyword = 100 units each)
  // Only use the first keyword to conserve quota
  const keyword = hobby.keywords[0];
  if (!keyword) return;

  try {
    const searchData = await searchVideos(keyword);
    totalResults += searchData.pageInfo?.totalResults || 0;

    const ids = (searchData.items || [])
      .map((item) => item.id?.videoId)
      .filter(Boolean);
    allVideoIds.push(...ids);
  } catch (err) {
    console.error(`    Search failed for "${keyword}":`, err.message);
    return;
  }

  // Fetch stats for discovered videos (1 unit per batch of 50)
  const uniqueIds = [...new Set(allVideoIds)];
  const videos = await getVideoStats(uniqueIds);

  // Calculate averages
  const viewCounts = videos.map((v) => parseInt(v.statistics?.viewCount || 0));
  const likeCounts = videos.map((v) => parseInt(v.statistics?.likeCount || 0));
  const commentCounts = videos.map((v) => parseInt(v.statistics?.commentCount || 0));
  const channels = new Set(videos.map((v) => v.snippet?.channelId));

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
    [hobby.id, today, totalResults, avgViews, avgLikes, avgComments, videos.length, channels.size]
  );

  // Store individual videos
  for (const v of videos) {
    const videoUrl = `https://youtube.com/watch?v=${v.id}`;
    const thumbUrl = v.snippet?.thumbnails?.medium?.url || `https://img.youtube.com/vi/${v.id}/mqdefault.jpg`;

    await pool.query(
      `INSERT INTO videos (hobby_id, platform, platform_id, title, channel_or_user, thumbnail_url, video_url, views, likes, comments, published_at)
       VALUES ($1, 'youtube', $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (platform, platform_id) DO UPDATE SET
         views = EXCLUDED.views, likes = EXCLUDED.likes,
         comments = EXCLUDED.comments, last_updated = NOW()`,
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

  console.log(`    Found ${videos.length} videos, ${channels.size} unique channels`);
}

async function main() {
  if (!API_KEY) {
    console.error("YOUTUBE_API_KEY not set. Copy .env.example to .env and add your key.");
    process.exit(1);
  }

  console.log("Starting YouTube data collection...");
  const query = HOBBY_ID
    ? `SELECT id, name, keywords FROM hobbies WHERE active = true AND id = ${parseInt(HOBBY_ID)}`
    : `SELECT id, name, keywords FROM hobbies WHERE active = true`;
  const { rows: hobbies } = await pool.query(query);

  for (const hobby of hobbies) {
    await collectForHobby(hobby);
    // Small delay to be respectful of rate limits
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log("YouTube collection complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("YouTube collection failed:", err);
  process.exit(1);
});
