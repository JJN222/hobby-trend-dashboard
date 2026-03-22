require("dotenv").config();
const KEY = process.env.TIKAPI_KEY;

async function test() {
  const res = await fetch("https://api.tikapi.io/public/hashtag?name=crochet&count=30", {
    headers: { "X-API-KEY": KEY },
  });
  const data = await res.json();

  console.log("Top-level keys:", Object.keys(data));
  console.log("");

  // Check for video list in various possible locations
  const possibleVideoKeys = ["itemList", "items", "videoList", "videos", "item_list"];
  for (const key of possibleVideoKeys) {
    if (data[key]) {
      console.log("Found videos at:", key, "count:", data[key].length);
    }
  }

  // Check challengeInfo
  if (data.challengeInfo) {
    console.log("challengeInfo.challenge:", JSON.stringify(data.challengeInfo.challenge, null, 2));
    console.log("challengeInfo.stats:", JSON.stringify(data.challengeInfo.stats, null, 2));
  }

  // Print all top-level keys with their types and lengths
  console.log("");
  console.log("Full structure:");
  for (const [k, v] of Object.entries(data)) {
    if (Array.isArray(v)) {
      console.log("  " + k + ": array(" + v.length + ")");
      if (v.length > 0) {
        console.log("    first item keys:", Object.keys(v[0]).join(", "));
        if (v[0].stats) {
          console.log("    first item stats:", JSON.stringify(v[0].stats));
        }
        if (v[0].id) {
          console.log("    first item id:", v[0].id);
        }
      }
    } else if (typeof v === "object" && v !== null) {
      console.log("  " + k + ": object with keys [" + Object.keys(v).join(", ") + "]");
    } else {
      console.log("  " + k + ":", v);
    }
  }
}

test().catch(console.error);
