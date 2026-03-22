import React, { useState, useEffect } from "react";
import { useApi } from "../hooks/useApi";
import { fetchOverviewBrief, fetchHobbyBrief, generateHobbyBrief, fetchHobbies } from "../utils/api";

const COLORS = { hot: "#2d6a4f", warming: "#b08930" };

const URGENCY = {
  ACT_NOW: { label: "ACT NOW", bg: "#2d6a4f", fg: "#fff" },
  THIS_MONTH: { label: "THIS MONTH", bg: "#e8e6e3", fg: "#1a1a1a" },
  WATCH: { label: "WATCH", bg: "#f4f3f0", fg: "#888" },
};

const DIFFICULTY = {
  easy: { label: "EASY", bg: "#f0efec" },
  medium: { label: "MEDIUM", bg: "#e8e6e3" },
  hard: { label: "HARD", bg: "#ddd" },
};

function UrgencyTag({ urgency }) {
  const s = URGENCY[urgency] || URGENCY.WATCH;
  return <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", padding: "2px 8px", background: s.bg, color: s.fg, flexShrink: 0, borderRadius: 2 }}>{s.label}</span>;
}

function SectionLabel({ children }) {
  return <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.12em", color: "#999", textTransform: "uppercase", marginBottom: 12 }}>{children}</div>;
}

function HobbyBriefPanel({ hobbyId, hobbyName, onClose }) {
  const [brief, setBrief] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchHobbyBrief(hobbyId).then((data) => {
      if (data && data.brief_content) setBrief(data.brief_content);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [hobbyId]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const data = await generateHobbyBrief(hobbyId);
      if (data && data.brief_content) setBrief(data.brief_content);
    } catch (err) { console.error("Generation failed:", err); }
    setGenerating(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.18)", display: "flex", justifyContent: "center", alignItems: "flex-start", zIndex: 100, paddingTop: 40, overflowY: "auto" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#faf9f7", width: "100%", maxWidth: 680, padding: "40px 44px", marginBottom: 40, boxShadow: "0 4px 40px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.12em", color: "#999", textTransform: "uppercase", marginBottom: 6 }}>Content Brief</div>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "#1a1a1a" }}>{hobbyName}</h2>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 11, cursor: "pointer", color: "#999", fontWeight: 500, letterSpacing: "0.1em" }}>CLOSE</button>
        </div>

        {loading && <div style={{ padding: "32px 0", color: "#aaa", fontSize: 13, fontWeight: 300 }}>Checking for cached brief...</div>}
        {!loading && !brief && !generating && (
          <div style={{ padding: "32px 0", textAlign: "center" }}>
            <div style={{ color: "#888", fontSize: 14, fontWeight: 300, marginBottom: 16 }}>No brief generated yet for this hobby.</div>
            <button onClick={handleGenerate} style={{ padding: "10px 24px", background: "#1a1a1a", color: "#faf9f7", border: "none", fontSize: 12, fontWeight: 500, letterSpacing: "0.08em", cursor: "pointer" }}>GENERATE BRIEF</button>
            <div style={{ fontSize: 11, color: "#888", fontWeight: 300, marginTop: 8 }}>Takes ~10 seconds, costs ~$0.03</div>
          </div>
        )}
        {generating && <div style={{ padding: "32px 0", textAlign: "center", color: "#999", fontSize: 13, fontWeight: 300 }}>Claude is analyzing trend data and generating your brief...</div>}
        {brief && (
          <div>
            <div style={{ marginBottom: 24, paddingBottom: 24, borderBottom: "1px solid #e8e6e3" }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", color: COLORS.hot, borderBottom: `1.5px solid ${COLORS.hot}`, paddingBottom: 2 }}>{brief.trend_status}</span>
                <span style={{ fontSize: 11, color: "#888", fontWeight: 300 }}>{brief.confidence}/10 confidence</span>
              </div>
              <div style={{ fontSize: 16, fontWeight: 400, color: "#333", lineHeight: 1.6 }}>{brief.summary}</div>
            </div>
            {brief.key_insights?.length > 0 && (
              <div style={{ marginBottom: 24, paddingBottom: 24, borderBottom: "1px solid #e8e6e3" }}>
                <SectionLabel>Key Insights</SectionLabel>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {brief.key_insights.map((ins, i) => (
                    <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <UrgencyTag urgency={ins.urgency} />
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 400, color: "#1a1a1a", lineHeight: 1.5 }}>{ins.insight}</div>
                        <div style={{ fontSize: 13, fontWeight: 400, color: "#666", marginTop: 2 }}>Data: {ins.data_point}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {brief.video_concepts?.length > 0 && (
              <div style={{ marginBottom: 24, paddingBottom: 24, borderBottom: "1px solid #e8e6e3" }}>
                <SectionLabel>Video Concepts</SectionLabel>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
                  {brief.video_concepts.map((c, i) => {
                    const diff = DIFFICULTY[c.difficulty] || DIFFICULTY.medium;
                    return (
                      <div key={i} style={{ padding: 16, background: "#f4f3f0" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                          <span style={{ fontSize: 10, fontWeight: 500, color: "#999", textTransform: "uppercase", letterSpacing: "0.06em" }}>{c.format} / {c.platform}</span>
                          <span style={{ fontSize: 9, fontWeight: 500, color: "#888", padding: "2px 6px", background: diff.bg, letterSpacing: "0.06em" }}>{diff.label}</span>
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 500, color: "#1a1a1a", lineHeight: 1.4, marginBottom: 6 }}>"{c.title}"</div>
                        <div style={{ fontSize: 14, fontWeight: 400, color: "#444", lineHeight: 1.5, marginBottom: 6 }}><span style={{ fontWeight: 500, color: "#999" }}>Hook:</span> "{c.hook}"</div>
                        <div style={{ fontSize: 13, fontWeight: 400, color: "#666", lineHeight: 1.5 }}>{c.why_now}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 24, marginBottom: 24, paddingBottom: 24, borderBottom: "1px solid #e8e6e3" }}>
              {brief.competitor_gaps && <div><SectionLabel>Competitor Gaps</SectionLabel><div style={{ fontSize: 15, fontWeight: 400, color: "#333", lineHeight: 1.6 }}>{brief.competitor_gaps}</div></div>}
              {brief.timing && <div><SectionLabel>Timing</SectionLabel><div style={{ fontSize: 15, fontWeight: 400, color: "#333", lineHeight: 1.6 }}>{brief.timing}</div></div>}
            </div>
            {brief.hashtags?.length > 0 && (
              <div><SectionLabel>Recommended Hashtags</SectionLabel>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {brief.hashtags.map((tag, i) => <span key={i} style={{ fontSize: 11, fontWeight: 400, color: "#666", padding: "3px 8px", background: "#f0efec" }}>{tag}</span>)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function InsightsView({ category }) {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hobbies, setHobbies] = useState([]);
  const [selectedHobby, setSelectedHobby] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchOverviewBrief().then((data) => { setOverview(data); setLoading(false); }).catch(() => setLoading(false));
    fetchHobbies("All").then(setHobbies).catch(console.error);
  }, []);

  const hobbyMap = {};
  hobbies.forEach((h) => { hobbyMap[h.name.toLowerCase()] = h; });

  const resolveHobby = (name) => {
    if (!name) return null;
    const match = hobbyMap[name.toLowerCase()];
    if (match) return { id: match.id, name: match.name };
    const key = Object.keys(hobbyMap).find((k) => k.includes(name.toLowerCase()) || name.toLowerCase().includes(k));
    if (key) return { id: hobbyMap[key].id, name: hobbyMap[key].name };
    return null;
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/briefs/refresh", { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Refresh failed");
      }
      const newOverview = await res.json();
      setOverview(newOverview);
    } catch (err) {
      console.error("Refresh failed:", err);
      alert("Refresh failed: " + err.message);
    }
    setRefreshing(false);
  };

  if (loading) return <div style={{ padding: "48px", textAlign: "center", color: "#aaa", fontSize: 13, fontWeight: 300 }}>Loading insights...</div>;

  if (!overview) {
    return (
      <div style={{ padding: "48px", textAlign: "center" }}>
        <div style={{ color: "#999", fontSize: 14, fontWeight: 300, marginBottom: 16 }}>No monthly overview generated yet.</div>
        <button onClick={handleRefresh} disabled={refreshing}
          style={{ padding: "10px 24px", background: refreshing ? "#999" : "#1a1a1a", color: "#faf9f7", border: "none", fontSize: 12, fontWeight: 500, letterSpacing: "0.08em", cursor: refreshing ? "default" : "pointer" }}>
          {refreshing ? "GENERATING..." : "GENERATE OVERVIEW"}
        </button>
        <div style={{ fontSize: 11, color: "#888", fontWeight: 300, marginTop: 8 }}>Analyzes all hobbies with Claude (~15 seconds, ~$0.10)</div>
      </div>
    );
  }

  const brief = overview.brief_content;
  const monthLabel = overview.generation_month
    ? new Date(overview.generation_month).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "";
  const generatedAt = overview.created_at
    ? new Date(overview.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : "";

  return (
    <div style={{ padding: "0 48px" }}>
      <div style={{ padding: "24px 0 20px", borderBottom: "2px solid #1a1a1a", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.12em", color: "#999", textTransform: "uppercase", marginBottom: 4 }}>Monthly Trend Intelligence</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#1a1a1a", marginBottom: 8 }}>{monthLabel}</div>
          {brief.headline && <div style={{ fontSize: 17, fontWeight: 400, color: "#444", lineHeight: 1.5, maxWidth: 700 }}>{brief.headline}</div>}
        </div>
        <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 24 }}>
          <button onClick={handleRefresh} disabled={refreshing}
            style={{
              padding: "8px 18px", background: refreshing ? "#eee" : "none", border: "1px solid #ddd",
              fontSize: 11, fontWeight: 500, letterSpacing: "0.08em",
              cursor: refreshing ? "default" : "pointer", color: refreshing ? "#999" : "#888", textTransform: "uppercase",
            }}
            onMouseEnter={(e) => { if (!refreshing) { e.currentTarget.style.borderColor = "#1a1a1a"; e.currentTarget.style.color = "#1a1a1a"; }}}
            onMouseLeave={(e) => { if (!refreshing) { e.currentTarget.style.borderColor = "#ddd"; e.currentTarget.style.color = "#888"; }}}
          >
            {refreshing ? "REFRESHING..." : "REFRESH"}
          </button>
          {generatedAt && <div style={{ fontSize: 10, color: "#888", fontWeight: 300, marginTop: 6 }}>Last generated: {generatedAt}</div>}
        </div>
      </div>

      {brief.executive_summary && (
        <div style={{ padding: "24px 0", borderBottom: "1px solid #e8e6e3" }}>
          <div style={{ fontSize: 16, fontWeight: 400, color: "#333", lineHeight: 1.7, maxWidth: 700 }}>{brief.executive_summary}</div>
        </div>
      )}

      {brief.monthly_picks && (
        <div style={{ padding: "24px 0", borderBottom: "1px solid #e8e6e3" }}>
          <SectionLabel>Monthly Picks</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            {[
              { label: "BEST FOR YOUTUBE", pick: brief.monthly_picks.best_for_youtube },
              { label: "BEST FOR TIKTOK", pick: brief.monthly_picks.best_for_tiktok },
              { label: "DARK HORSE", pick: brief.monthly_picks.dark_horse },
            ].map((item) => {
              if (!item.pick) return null;
              const resolved = resolveHobby(item.pick.hobby);
              return (
                <div key={item.label} style={{ padding: 16, background: "#f4f3f0", cursor: resolved ? "pointer" : "default", transition: "background 0.15s" }}
                  onClick={() => resolved && setSelectedHobby(resolved)}
                  onMouseEnter={(e) => resolved && (e.currentTarget.style.background = "#eeedea")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "#f4f3f0")}>
                  <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.08em", color: "#999", marginBottom: 8 }}>{item.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 500, color: "#1a1a1a", marginBottom: 4 }}>{item.pick.hobby}</div>
                  <div style={{ fontSize: 14, fontWeight: 400, color: "#444", lineHeight: 1.5 }}>{item.pick.why}</div>
                  {resolved && <div style={{ fontSize: 10, fontWeight: 500, color: COLORS.hot, letterSpacing: "0.06em", marginTop: 8 }}>CLICK FOR FULL BRIEF</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {brief.top_opportunities?.length > 0 && (
        <div style={{ padding: "24px 0", borderBottom: "1px solid #e8e6e3" }}>
          <SectionLabel>Top Opportunities</SectionLabel>
          {brief.top_opportunities.map((opp, i) => {
            const resolved = resolveHobby(opp.hobby);
            return (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "12px 0", borderBottom: i < brief.top_opportunities.length - 1 ? "1px solid #f0efec" : "none" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 500, color: "#1a1a1a" }}>{opp.hobby}</span>
                    <UrgencyTag urgency={opp.urgency} />
                    <span style={{ fontSize: 11, color: "#888", fontWeight: 300 }}>{opp.category}</span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 400, color: "#444", lineHeight: 1.5, marginBottom: 4 }}>{opp.why}</div>
                  {opp.suggested_angle && <div style={{ fontSize: 14, fontWeight: 400, color: "#666" }}>Angle: {opp.suggested_angle}</div>}
                </div>
                {resolved && (
                  <button onClick={() => setSelectedHobby(resolved)} style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.08em", color: "#999", background: "none", border: "1px solid #ddd", padding: "5px 12px", cursor: "pointer", flexShrink: 0, marginLeft: 16 }}>DEEP DIVE</button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {brief.emerging_trends?.length > 0 && (
        <div style={{ padding: "24px 0", borderBottom: "1px solid #e8e6e3" }}>
          <SectionLabel>Emerging Trends</SectionLabel>
          {brief.emerging_trends.map((trend, i) => (
            <div key={i} style={{ padding: "12px 0", borderBottom: i < brief.emerging_trends.length - 1 ? "1px solid #f0efec" : "none" }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: "#1a1a1a", marginBottom: 4 }}>{trend.trend}</div>
              <div style={{ fontSize: 13, fontWeight: 400, color: "#666", marginBottom: 2 }}>Hobbies: {trend.hobbies_involved?.join(", ")}</div>
              <div style={{ fontSize: 12, fontWeight: 400, color: "#777" }}>Signal: {trend.signal}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 32, padding: "24px 0" }}>
        {brief.declining_niches?.length > 0 && (
          <div>
            <SectionLabel>Declining Niches</SectionLabel>
            {brief.declining_niches.map((d, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: "#777" }}>{d.hobby}</div>
                <div style={{ fontSize: 12, fontWeight: 400, color: "#777", lineHeight: 1.5 }}>{d.concern}</div>
              </div>
            ))}
          </div>
        )}
        {brief.cross_category_insights && (
          <div>
            <SectionLabel>Cross-Category Patterns</SectionLabel>
            <div style={{ fontSize: 15, fontWeight: 400, color: "#333", lineHeight: 1.6 }}>{brief.cross_category_insights}</div>
          </div>
        )}
      </div>

      {selectedHobby && <HobbyBriefPanel hobbyId={selectedHobby.id} hobbyName={selectedHobby.name} onClose={() => setSelectedHobby(null)} />}
    </div>
  );
}
