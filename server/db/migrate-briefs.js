/**
 * Add tables for AI-generated content briefs.
 * Run: node server/db/migrate-briefs.js
 */

const pool = require("./pool");
require("dotenv").config();

async function migrate() {
  console.log("Adding briefs tables...");

  await pool.query(`

    CREATE TABLE IF NOT EXISTS report_generations (
      id SERIAL PRIMARY KEY,
      generation_month DATE NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'pending',
      total_briefs INTEGER NOT NULL DEFAULT 0,
      completed_briefs INTEGER DEFAULT 0,
      failed_briefs INTEGER DEFAULT 0,
      started_at TIMESTAMPTZ DEFAULT NOW(),
      completed_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS hobby_briefs (
      id SERIAL PRIMARY KEY,
      generation_id INTEGER REFERENCES report_generations(id),
      hobby_id INTEGER REFERENCES hobbies(id),
      generation_month DATE NOT NULL,
      status TEXT DEFAULT 'pending',
      brief_type TEXT DEFAULT 'individual',
      brief_content JSONB NOT NULL DEFAULT '{}',
      input_tokens INTEGER,
      output_tokens INTEGER,
      model_used TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_briefs_month ON hobby_briefs(generation_month DESC);
    CREATE INDEX IF NOT EXISTS idx_briefs_hobby ON hobby_briefs(hobby_id);
    CREATE INDEX IF NOT EXISTS idx_briefs_type ON hobby_briefs(brief_type);

  `);

  console.log("Briefs tables created successfully.");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
