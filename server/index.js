const express = require("express");
const cors = require("cors");
const cron = require("node-cron");
const { execSync } = require("child_process");
const path = require("path");
require("dotenv").config();

const hobbiesRouter = require("./routes/hobbies");
const videosRouter = require("./routes/videos");
const snapshotsRouter = require("./routes/snapshots");
const briefsRouter = require("./routes/briefs");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// API routes
app.use("/api/hobbies", hobbiesRouter);
app.use("/api/videos", videosRouter);
app.use("/api/snapshots", snapshotsRouter);
app.use("/api/briefs", briefsRouter);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Manual trigger endpoints
app.post("/api/collect", (req, res) => {
  res.json({ status: "started", message: "Collection pipeline triggered" });
  runCollection();
});

// Daily data collection: 5am Pacific (12:00 UTC)
cron.schedule("0 12 * * *", () => {
  console.log(`[${new Date().toISOString()}] Cron: daily collection`);
  runCollection();
});

// Monthly brief generation: 1st of each month at 8am Pacific (15:00 UTC)
cron.schedule("0 15 1 * *", () => {
  console.log(`[${new Date().toISOString()}] Cron: monthly brief generation`);
  runScript(path.join(__dirname, "scripts", "generate-briefs.js"), "Monthly overview");
});

function runScript(scriptPath, label) {
  console.log(`[${new Date().toISOString()}] Running ${label}...`);
  try {
    execSync(`node ${scriptPath}`, {
      stdio: "inherit",
      env: process.env,
      timeout: 15 * 60 * 1000,
    });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] ${label} failed:`, err.message);
  }
}

function runCollection() {
  const scriptsDir = path.join(__dirname, "scripts");
  for (const [file, label] of [
    ["collect-youtube.js", "YouTube"],
    ["collect-tiktok.js", "TikTok"],
    ["collect-trends.js", "Google Trends"],
    ["calculate-scores.js", "Scores"],
  ]) {
    runScript(path.join(scriptsDir, file), label);
  }
  console.log(`[${new Date().toISOString()}] Collection complete.`);
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Daily collection: 5:00 AM PT | Monthly briefs: 1st at 8:00 AM PT`);
});

// Serve frontend in production
const serveStatic = require("path");
if (process.env.NODE_ENV === "production") {
  const frontendPath = serveStatic.join(__dirname, "..", "client", "dist");
  app.use(require("express").static(frontendPath));
  app.get("*", (req, res) => {
    res.sendFile(serveStatic.join(frontendPath, "index.html"));
  });
}
