/**
 * TikAPI collection script (correct two-step endpoint)
 *
 * Step 1: GET /public/hashtag?name=X  --> gets hashtag ID + stats
 * Step 2: GET /public/hashtag?id=X&count=30  --> gets actual video list
 *
 * Run: node scripts/collect-tiktok.js
 */

const pool = require("../db/pool");
require("dotenv").config();
const HOBBY_ID = process.argv.find(a => a.startsWith("--hobby-id="))?.split("=")[1];

const TIKAPI_KEY = process.env.TIKAPI_KEY;
const BASE = "https://api.tikapi.io";

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

async function getHashtagInfo(hashtag) {
  try {
    const data = await ttFetch("/public/hashtag", {
      name: hashtag.replace("#", ""),
    });

    const challenge = data?.challengeInfo?.challenge;
    const stats = data?.challengeInfo?.stats;

    return {
      id: challenge?.id,
      title: challenge?.title,
      viewCount: stats?.viewCount || 0,
    };
  } catch (err) {
    console.error(`    Hashtag info failed for ${hashtag}:`, err.message);
    return null;
  }
}

async function getHashtagVideos(hashtagId) {
  try {
    const data = await ttFetch("/public/hashtag", {
      id: hashtagId,
      count: "30",
    });

    return data?.itemList || [];
  } catch (err) {
    console.error(`    Video fetch failed for hashtag ${hashtagId}:`, err.message);
    return [];
  }
}

async function storeVideos(videos, hobbyId) {
  const stored = [];
  const uniqueCreators = new Set();

  for (const v of videos) {
    const videoId = v.id;
    if (!videoId) continue;

    const user = v.author?.uniqueId || "unknown";
    const videoUrl = `https://www.tiktok.com/@${user}/video/${videoId}`;
    const thumbUrl = v.video?.cover || v.video?.dynamicCover || "";

    const views = v.stats?.playCount || 0;
    const likes = v.stats?.diggCount || 0;
    const comments = v.stats?.commentCount || 0;
    const shares = v.stats?.shareCount || 0;
    const engRate = views > 0 ? (((likes + comments + shares) / views) * 100).toFixed(2) : 0;

    if (views < 1000) continue;

    try {
      await pool.query(
        `INSERT INTO videos (hobby_id, platform, platform_id, title, channel_or_user, thumbnail_url, video_url, views, likes, comments, shares, engagement_rate, published_at)
         VALUES ($1, 'tiktok', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, to_timestamp($12))
         ON CONFLICT (platform, platform_id) DO UPDATE SET
           views = EXCLUDED.views, likes = EXCLUDED.likes,
           comments = EXCLUDED.comments, shares = EXCLUDED.shares,
           engagement_rate = EXCLUDED.engagement_rate,
           thumbnail_url = EXCLUDED.thumbnail_url,
           last_updated = NOW()`,
        [hobbyId, String(videoId), v.desc || "", `@${user}`, thumbUrl, videoUrl, views, likes, comments, shares, engRate, v.createTime || 0]
      );

      stored.push({ views, likes, comments, shares, engRate: parseFloat(engRate), user });
      uniqueCreators.add(user);
    } catch (dbErr) {
      // Skip individual video errors
    }
  }

  return { stored, uniqueCreators };
}

async function collectForHobby(hobby) {
  console.log(`  Collecting TikTok data for: ${hobby.name}`);

  let totalHashtagViews = 0;
  const allStored = [];
  const allCreators = new Set();

  // Limit to top 3 hashtags per hobby
  const hashtags = hobby.tiktok_hashtags.slice(0, 3);

  for (const tag of hashtags) {
    // Step 1: Get hashtag info (ID + view count)
    const info = await getHashtagInfo(tag);
    if (!info || !info.id) continue;

    totalHashtagViews += info.viewCount || 0;

    // Small delay between calls
    await new Promise((r) => setTimeout(r, 1000));

    // Step 2: Get videos using hashtag ID
    const videos = await getHashtagVideos(info.id);

    if (videos.length > 0) {
      const { stored, uniqueCreators } = await storeVideos(videos, hobby.id);
      allStored.push(...stored);
      uniqueCreators.forEach((c) => allCreators.add(c));
    }

    // Respect rate limits
    await new Promise((r) => setTimeout(r, 1500));
  }

  // Calculate averages
  const avgPlays = allStored.length > 0
    ? Math.round(allStored.reduce((a, v) => a + v.views, 0) / allStored.length)
    : 0;
  const avgLikes = allStored.length > 0
    ? Math.round(allStored.reduce((a, v) => a + v.likes, 0) / allStored.length)
    : 0;
  const avgShares = allStored.length > 0
    ? Math.round(allStored.reduce((a, v) => a + v.shares, 0) / allStored.length)
    : 0;
  const avgEngRate = allStored.length > 0
    ? (allStored.reduce((a, v) => a + v.engRate, 0) / allStored.length).toFixed(2)
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
    [hobby.id, today, totalHashtagViews, avgPlays, avgLikes, avgShares, avgEngRate, allStored.length, allCreators.size]
  );

  const topVideo = allStored.sort((a, b) => b.views - a.views)[0];
  const topViews = topVideo ? topVideo.views.toLocaleString() : "0";
  console.log(`    ${allStored.length} videos, ${allCreators.size} creators, ${(totalHashtagViews / 1e9).toFixed(1)}B hashtag views, top: ${topViews} views`);
}

async function main() {
  if (!TIKAPI_KEY) {
    console.error("TIKAPI_KEY not set. Add it to your .env file.");
    process.exit(1);
  }

  console.log("Starting TikTok data collection...");
  const { rows: hobbies } = await pool.query(
    HOBBY_ID ? `SELECT id, name, tiktok_hashtags FROM hobbies WHERE active = true AND id = ${parseInt(HOBBY_ID)}` : `SELECT id, name, tiktok_hashtags FROM hobbies WHERE active = true`
  );

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
