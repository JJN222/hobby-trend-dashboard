/**
 * TikAPI collection script
 *
 * Collects hashtag data and trending videos for each hobby.
 * Endpoints used:
 *   - /public/hashtag (search by hashtag)
 *   - /public/explore (trending/For You videos)
 *
 * Run: node scripts/collect-tiktok.js
 * Single hobby: node scripts/collect-tiktok.js --hobby-id=123
 */

const pool = require("../db/pool");
require("dotenv").config();

const TIKAPI_KEY = process.env.TIKAPI_KEY;
const BASE = "https://api.tikapi.io";
const HOBBY_ID = process.argv.find(a => a.startsWith("--hobby-id="))?.split("=")[1];

async function ttFetch(endpoint, params = {}) {
  const url = new URL(`${BASE}${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    headers: { "X-API-KEY": TIKAPI_KEY },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`TikAPI ${res.status}: ${body}`);
  }
  return res.json();
}

async function collectHashtag(hashtag) {
  try {
    // Search for the hashtag to get its ID and view count
    const searchData = await ttFetch("/public/hashtag", { name: hashtag.replace("#", "") });
    const challengeInfo = searchData?.challengeInfo?.challenge;
    const stats = searchData?.challengeInfo?.stats;

    return {
      hashtagId: challengeInfo?.id,
      title: challengeInfo?.title,
      totalViews: stats?.videoCount || 0,
      viewCount: stats?.viewCount || 0,
    };
  } catch (err) {
    console.error(`    Hashtag lookup failed for ${hashtag}:`, err.message);
    return null;
  }
}

async function collectHashtagVideos(hashtagId, hobbyId) {
  if (!hashtagId) return [];

  try {
    const data = await ttFetch("/public/hashtag/videos", {
      id: hashtagId,
      count: 20,
    });

    const videos = data?.itemList || [];
    const stored = [];

    for (const v of videos) {
      const videoId = v.id;
      const user = v.author?.uniqueId || "unknown";
      const videoUrl = `https://www.tiktok.com/@${user}/video/${videoId}`;
      const thumbUrl = v.video?.cover || v.video?.dynamicCover || "";

      const views = v.stats?.playCount || 0;
      const likes = v.stats?.diggCount || 0;
      const comments = v.stats?.commentCount || 0;
      const shares = v.stats?.shareCount || 0;
      const engRate = views > 0 ? (((likes + comments + shares) / views) * 100).toFixed(2) : 0;

      await pool.query(
        `INSERT INTO videos (hobby_id, platform, platform_id, title, channel_or_user, thumbnail_url, video_url, views, likes, comments, shares, engagement_rate, published_at)
         VALUES ($1, 'tiktok', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, to_timestamp($12))
         ON CONFLICT (platform, platform_id) DO UPDATE SET
           views = EXCLUDED.views, likes = EXCLUDED.likes,
           comments = EXCLUDED.comments, shares = EXCLUDED.shares,
           engagement_rate = EXCLUDED.engagement_rate,
           thumbnail_url = EXCLUDED.thumbnail_url,
           last_updated = NOW()`,
        [hobbyId, videoId, v.desc || "", `@${user}`, thumbUrl, videoUrl, views, likes, comments, shares, engRate, v.createTime || 0]
      );

      stored.push({ views, likes, comments, shares, engRate: parseFloat(engRate), user });
    }

    return stored;
  } catch (err) {
    console.error(`    Video fetch failed for hashtag ${hashtagId}:`, err.message);
    return [];
  }
}

async function collectForHobby(hobby) {
  console.log(`  Collecting TikTok data for: ${hobby.name}`);

  let totalHashtagViews = 0;
  const allVideos = [];
  const uniqueCreators = new Set();

  // Collect data for each hashtag
  for (const tag of hobby.tiktok_hashtags) {
    const info = await collectHashtag(tag);
    if (info) {
      totalHashtagViews += info.viewCount || 0;

      const videos = await collectHashtagVideos(info.hashtagId, hobby.id);
      allVideos.push(...videos);
      videos.forEach((v) => uniqueCreators.add(v.user));
    }

    // Respect rate limits
    await new Promise((r) => setTimeout(r, 1000));
  }

  // Calculate averages
  const avgPlays = allVideos.length > 0
    ? Math.round(allVideos.reduce((a, v) => a + v.views, 0) / allVideos.length)
    : 0;
  const avgLikes = allVideos.length > 0
    ? Math.round(allVideos.reduce((a, v) => a + v.likes, 0) / allVideos.length)
    : 0;
  const avgShares = allVideos.length > 0
    ? Math.round(allVideos.reduce((a, v) => a + v.shares, 0) / allVideos.length)
    : 0;
  const avgEngRate = allVideos.length > 0
    ? (allVideos.reduce((a, v) => a + v.engRate, 0) / allVideos.length).toFixed(2)
    : 0;

  // Upsert today's snapshot (TikTok columns)
  const today = new Date().toISOString().split("T")[0];
  await pool.query(
    `INSERT INTO hobby_snapshots (hobby_id, snapshot_date, tt_hashtag_views, tt_avg_plays, tt_avg_likes, tt_avg_shares, tt_avg_engagement_rate, tt_new_videos_24h, tt_unique_creators)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (hobby_id, snapshot_date) DO UPDATE SET
       tt_hashtag_views = EXCLUDED.tt_hashtag_views,
       tt_avg_plays = EXCLUDED.tt_avg_plays,
       tt_avg_likes = EXCLUDED.tt_avg_likes,
       tt_avg_shares = EXCLUDED.tt_avg_shares,
       tt_avg_engagement_rate = EXCLUDED.tt_avg_engagement_rate,
       tt_new_videos_24h = EXCLUDED.tt_new_videos_24h,
       tt_unique_creators = EXCLUDED.tt_unique_creators`,
    [hobby.id, today, totalHashtagViews, avgPlays, avgLikes, avgShares, avgEngRate, allVideos.length, uniqueCreators.size]
  );

  console.log(`    ${allVideos.length} videos, ${uniqueCreators.size} creators, ${totalHashtagViews.toLocaleString()} hashtag views`);
}

async function main() {
  if (!TIKAPI_KEY) {
    console.error("TIKAPI_KEY not set. Copy .env.example to .env and add your key.");
    process.exit(1);
  }

  console.log("Starting TikTok data collection...");
  const query = HOBBY_ID
    ? `SELECT id, name, tiktok_hashtags FROM hobbies WHERE active = true AND id = ${parseInt(HOBBY_ID)}`
    : `SELECT id, name, tiktok_hashtags FROM hobbies WHERE active = true`;
  const { rows: hobbies } = await pool.query(query);

  for (const hobby of hobbies) {
    await collectForHobby(hobby);
    await new Promise((r) => setTimeout(r, 2000));
  }

  console.log("TikTok collection complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("TikTok collection failed:", err);
  process.exit(1);
});
