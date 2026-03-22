/**
 * Run all data collection scripts in sequence, then calculate scores.
 *
 * Run: npm run collect (from project root)
 */

const { execSync } = require("child_process");
const path = require("path");

const scripts = [
  { name: "YouTube", file: "collect-youtube.js" },
  { name: "TikTok", file: "collect-tiktok.js" },
  { name: "Google Trends", file: "collect-trends.js" },
  { name: "Search Volume", file: "collect-volume.js" },
  { name: "Score Calculator", file: "calculate-scores.js" },
];

async function main() {
  console.log("=== Starting full data collection pipeline ===\n");
  const start = Date.now();

  for (const script of scripts) {
    console.log(`--- ${script.name} ---`);
    try {
      execSync(`node ${path.join(__dirname, script.file)}`, {
        stdio: "inherit",
        env: process.env,
      });
      console.log("");
    } catch (err) {
      console.error(`${script.name} failed, continuing...\n`);
    }
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`=== Pipeline complete in ${elapsed}s ===`);
}

main();
