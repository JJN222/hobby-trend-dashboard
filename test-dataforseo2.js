require("dotenv").config();

const LOGIN = process.env.DATAFORSEO_LOGIN;
const PASSWORD = process.env.DATAFORSEO_PASSWORD;
const AUTH = "Basic " + Buffer.from(LOGIN + ":" + PASSWORD).toString("base64");

async function dfsPost(endpoint, body) {
  const res = await fetch("https://api.dataforseo.com/v3" + endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: AUTH },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function test() {
  // Test 1: Google Trends explore with date_from/date_to instead of time_range
  console.log("=== Test 1: Google Trends with date_from/date_to ===");
  const test1 = await dfsPost("/keywords_data/google_trends/explore/live", [
    {
      keywords: ["crochet"],
      location_code: 2840,
      language_code: "en",
      type: "web",
      date_from: "2025-12-01",
      date_to: "2026-03-19",
    },
  ]);
  console.log("Status:", test1.tasks?.[0]?.status_code, test1.tasks?.[0]?.status_message);
  const r1 = test1.tasks?.[0]?.result?.[0];
  if (r1) {
    console.log("Items count:", r1.items_count);
    const graph = r1.items?.find((i) => i.type === "google_trends_graph");
    if (graph && graph.data) {
      console.log("Graph data points:", graph.data.length);
      console.log("Last 3 data points:", JSON.stringify(graph.data.slice(-3), null, 2));
    }
  }

  console.log("");

  // Test 2: Google Trends with past_12_months
  console.log("=== Test 2: Google Trends with past_12_months ===");
  const test2 = await dfsPost("/keywords_data/google_trends/explore/live", [
    {
      keywords: ["crochet"],
      location_code: 2840,
      language_code: "en",
      type: "web",
      time_range: "past_12_months",
    },
  ]);
  console.log("Status:", test2.tasks?.[0]?.status_code, test2.tasks?.[0]?.status_message);
  const r2 = test2.tasks?.[0]?.result?.[0];
  if (r2) {
    console.log("Items count:", r2.items_count);
    const graph = r2.items?.find((i) => i.type === "google_trends_graph");
    if (graph && graph.data) {
      console.log("Graph data points:", graph.data.length);
      console.log("Last 3 data points:", JSON.stringify(graph.data.slice(-3), null, 2));
    }
  }

  console.log("");

  // Test 3: DataForSEO Trends (their proprietary, cheaper API)
  console.log("=== Test 3: DataForSEO Trends (proprietary, $0.001/req) ===");
  const test3 = await dfsPost("/keywords_data/dataforseo_trends/explore/live", [
    {
      keywords: ["crochet"],
      location_code: 2840,
      language_code: "en",
      date_from: "2025-12-01",
      date_to: "2026-03-19",
    },
  ]);
  console.log("Status:", test3.tasks?.[0]?.status_code, test3.tasks?.[0]?.status_message);
  const r3 = test3.tasks?.[0]?.result?.[0];
  if (r3) {
    console.log("Items count:", r3.items_count);
    if (r3.items && r3.items[0]) {
      console.log("First item type:", r3.items[0].type);
      if (r3.items[0].data) {
        console.log("Data points:", r3.items[0].data.length);
        console.log("Last 3:", JSON.stringify(r3.items[0].data.slice(-3), null, 2));
      }
    }
  }
}

test().catch(console.error);
