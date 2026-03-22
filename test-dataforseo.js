require("dotenv").config();

const LOGIN = process.env.DATAFORSEO_LOGIN;
const PASSWORD = process.env.DATAFORSEO_PASSWORD;

async function test() {
  const res = await fetch("https://api.dataforseo.com/v3/keywords_data/google_trends/explore/live", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Basic " + Buffer.from(LOGIN + ":" + PASSWORD).toString("base64"),
    },
    body: JSON.stringify([
      {
        keywords: ["crochet"],
        location_code: 2840,
        language_code: "en",
        type: "web",
        time_range: "past_3_months",
      },
    ]),
  });

  const data = await res.json();

  console.log("Status:", data.status_code, data.status_message);
  console.log("");

  const tasks = data.tasks || [];
  console.log("Tasks count:", tasks.length);

  if (tasks.length > 0) {
    const task = tasks[0];
    console.log("Task status:", task.status_code, task.status_message);

    const results = task.result || [];
    console.log("Results count:", results.length);

    if (results.length > 0) {
      const result = results[0];
      console.log("Result keys:", Object.keys(result));
      console.log("");

      const items = result.items || [];
      console.log("Items count:", items.length);

      if (items.length > 0) {
        console.log("First item keys:", Object.keys(items[0]));
        console.log("First item type:", items[0].type);

        if (items[0].data) {
          console.log("Data is array:", Array.isArray(items[0].data));
          if (Array.isArray(items[0].data)) {
            console.log("Data points count:", items[0].data.length);
            console.log("First data point:", JSON.stringify(items[0].data[0], null, 2));
            console.log("Last data point:", JSON.stringify(items[0].data[items[0].data.length - 1], null, 2));
          } else {
            console.log("Data:", JSON.stringify(items[0].data, null, 2).slice(0, 500));
          }
        }

        if (items[0].keywords) {
          console.log("Keywords:", items[0].keywords);
        }

        // Print full first item structure (truncated)
        console.log("");
        console.log("Full first item (truncated):");
        console.log(JSON.stringify(items[0], null, 2).slice(0, 1500));
      }
    }
  }
}

test().catch(console.error);
