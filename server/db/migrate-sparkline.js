// ============================================
// FILE 1: server/db/migrate-sparkline.js
// Run: node server/db/migrate-sparkline.js
// ============================================

const pool = require("./pool");
require("dotenv").config();

async function migrate() {
  console.log("Adding trends_sparkline column...");
  await pool.query(`
    ALTER TABLE hobby_snapshots
    ADD COLUMN IF NOT EXISTS trends_sparkline JSONB DEFAULT '[]'
  `);
  console.log("Done.");
  process.exit(0);
}

migrate().catch((err) => { console.error(err); process.exit(1); });
