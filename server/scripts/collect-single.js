/**
 * Collect data for a single hobby.
 * Called automatically when a new hobby is added.
 *
 * Run: node scripts/collect-single.js --hobby-id=123
 */

const { execSync } = require("child_process");
const path = require("path");

const hobbyIdArg = process.argv.find(a => a.startsWith("--hobby-id="));
if (!hobbyIdArg) {
  console.error("Usage: node collect-single.js --hobby-id=123");
  process.exit(1);
}

const scripts = [
  "collect-youtube.js",
  "collect-tiktok.js",
  "collect-trends.js",
  "collect-volume.js",
  "calculate-scores.js",
];

console.log(`=== Collecting data for ${hobbyIdArg} ===`);
const start = Date.now();

for (const file of scripts) {
  try {
    console.log(`--- ${file} ---`);
    execSync(`node ${path.join(__dirname, file)} ${hobbyIdArg}`, {
      stdio: "inherit",
      env: process.env,
    });
  } catch (e) {
    console.error(`${file} failed, continuing...`);
  }
}

const elapsed = ((Date.now() - start) / 1000).toFixed(1);
console.log(`=== Single hobby collection complete in ${elapsed}s ===`);
