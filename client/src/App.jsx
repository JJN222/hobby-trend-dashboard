import React, { useState } from "react";
import HobbyTable from "./components/HobbyTable";
import VideoGrid from "./components/VideoGrid";
import DetailPanel from "./components/DetailPanel";
import InsightsView from "./components/InsightsView";
import { useApi } from "./hooks/useApi";
import { fetchHobbies, fetchCategories } from "./utils/api";

export default function App() {
  const [category, setCategory] = useState("All");
  const [view, setView] = useState("table");
  const [videoPlatform, setVideoPlatform] = useState("all");
  const [selected, setSelected] = useState(null);
  const [sortBy, setSortBy] = useState("trendScore");

  const { data: hobbies, loading, refetch } = useApi(() => fetchHobbies(category), [category]);
  const { data: categories, refetch: refetchCategories } = useApi(() => fetchCategories(), []);

  const allCategories = ["All", ...(categories || [])];

  const sortedHobbies = [...(hobbies || [])].sort((a, b) => {
    if (sortBy === "trendScore") return (b.trend_score || 0) - (a.trend_score || 0);
    if (sortBy === "growthRate") return (Number(b.yt_growth_rate) || 0) - (Number(a.yt_growth_rate) || 0);
    if (sortBy === "name") return (a.name || "").localeCompare(b.name || "");
    return 0;
  });

  const risingCount = (hobbies || []).filter((h) => h.direction === "rising").length;
  const avgScore = hobbies && hobbies.length > 0
    ? Math.round(hobbies.reduce((a, h) => a + (h.trend_score || 0), 0) / hobbies.length)
    : 0;

  const handleRefresh = () => {
    refetch();
    refetchCategories();
  };

  return (
    <div style={{ background: "#faf9f7", minHeight: "100vh", color: "#1a1a1a" }}>
      {/* Header */}
      <div style={{ padding: "36px 48px 28px", borderBottom: "1px solid #e8e6e3" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "0.08em", color: "#1a1a1a", lineHeight: 1 }}>
              NADYA'S PLAYGROUND
            </h1>
            <p style={{ fontSize: 12, color: "#888", marginTop: 8, letterSpacing: "0.02em", fontWeight: 400, textTransform: "none" }}>
              Tracks trending hobbies across social media using a mix of Google Search, YouTube, and TikTok data
            </p>
          </div>
          <div style={{ display: "flex", gap: 36, alignItems: "center" }}>
            {[
              { value: (hobbies || []).length, label: "TRACKED" },
              { value: risingCount, label: "RISING" },
              { value: avgScore, label: "AVG SCORE" },
            ].map((stat) => (
              <div key={stat.label} style={{ textAlign: "right" }}>
                <div style={{ fontSize: 26, fontWeight: 300, color: "#1a1a1a", lineHeight: 1 }}>{stat.value}</div>
                <div style={{ fontSize: 9, color: "#bbb", letterSpacing: "0.12em", fontWeight: 500, marginTop: 4 }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filters + View Toggle */}
      <div style={{ padding: "16px 48px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e8e6e3" }}>
        <div style={{ display: "flex", gap: 4 }}>
          {allCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              style={{
                padding: "6px 16px", border: "none", fontSize: 11, fontWeight: 500,
                cursor: "pointer", letterSpacing: "0.08em", textTransform: "uppercase",
                transition: "all 0.15s",
                background: category === cat ? "#1a1a1a" : "transparent",
                color: category === cat ? "#faf9f7" : "#999",
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", gap: 2, background: "#eee", padding: 2 }}>
            {[
              { key: "table", label: "DATA" },
              { key: "videos", label: "VIDEOS" },
              { key: "insights", label: "INSIGHTS" },
            ].map((v) => (
              <button
                key={v.key}
                onClick={() => setView(v.key)}
                style={{
                  padding: "5px 14px", border: "none", fontSize: 10, fontWeight: 500,
                  cursor: "pointer", letterSpacing: "0.08em", transition: "all 0.15s",
                  background: view === v.key ? "#1a1a1a" : "transparent",
                  color: view === v.key ? "#faf9f7" : "#888",
                }}
              >
                {v.label}
              </button>
            ))}
          </div>

          {view === "table" && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 10, color: "#bbb", letterSpacing: "0.1em", fontWeight: 500, textTransform: "uppercase" }}>Sort</span>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                style={{ fontSize: 12, padding: "5px 10px", border: "1px solid #e0e0e0", background: "transparent", color: "#444", fontWeight: 400, cursor: "pointer" }}>
                <option value="trendScore">Trend Score</option>
                <option value="growthRate">Growth Rate</option>
                <option value="name">Name</option>
              </select>
            </div>
          )}

          {view === "videos" && (
            <div style={{ display: "flex", gap: 2, background: "#eee", padding: 2 }}>
              {[{ key: "all", label: "ALL" }, { key: "youtube", label: "YOUTUBE" }, { key: "tiktok", label: "TIKTOK" }].map((p) => (
                <button key={p.key} onClick={() => setVideoPlatform(p.key)}
                  style={{
                    padding: "5px 12px", border: "none", fontSize: 10, fontWeight: 500,
                    cursor: "pointer", letterSpacing: "0.08em", transition: "all 0.15s",
                    background: videoPlatform === p.key ? "#1a1a1a" : "transparent",
                    color: videoPlatform === p.key ? "#faf9f7" : "#888",
                  }}>{p.label}</button>
              ))}
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div style={{ padding: "48px", textAlign: "center", color: "#ccc", fontSize: 13, fontWeight: 300 }}>Loading...</div>
      )}

      {!loading && view === "table" && <HobbyTable hobbies={sortedHobbies} onSelect={setSelected} />}
      {!loading && view === "videos" && <VideoGrid category={category} platform={videoPlatform} />}
      {!loading && view === "insights" && <InsightsView hobbies={hobbies || []} category={category} />}

      {selected && (
        <DetailPanel
          hobby={selected}
          onClose={() => setSelected(null)}
          onRefresh={handleRefresh}
          categories={categories || []}
        />
      )}

      <div style={{ padding: "32px 48px", borderTop: "1px solid #e8e6e3", marginTop: view === "table" ? 32 : 0, display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 10, color: "#ccc", letterSpacing: "0.1em", fontWeight: 500, textTransform: "uppercase" }}>Shorthand Studios</span>
        <span style={{ fontSize: 10, color: "#ccc", letterSpacing: "0.1em", fontWeight: 300, textTransform: "uppercase" }}>Hobby Trend Predictor</span>
      </div>
    </div>
  );
}
