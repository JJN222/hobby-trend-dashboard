/**
 * Add search_volume column for comparable monthly search volume.
 * Run: node server/db/migrate-volume.js
 */
const pool = require("./pool");
require("dotenv").config();

async function migrate() {
  console.log("Adding search_volume column...");
  await pool.query(`
    ALTER TABLE hobby_snapshots
    ADD COLUMN IF NOT EXISTS search_volume INTEGER DEFAULT 0
  `);
  console.log("Done.");
  process.exit(0);
}

migrate().catch((err) => { console.error(err); process.exit(1); });
