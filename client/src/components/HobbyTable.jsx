import React, { useMemo, useState } from "react";
import Sparkline from "./Sparkline";
import DirectionTag from "./DirectionTag";

const COLORS = {
  hot: "#2d6a4f",
  hotBg: "#f0f7f4",
  above: "#5a7c65",
  warming: "#b08930",
  warmingBg: "#fdf8ef",
  scoreHigh: "#2d6a4f",
  scoreMid: "#1a1a1a",
  scoreLow: "#b0b0b0",
};

function getScoreColor(score) {
  if (!score && score !== 0) return COLORS.scoreMid;
  if (score >= 75) return COLORS.scoreHigh;
  if (score >= 50) return COLORS.scoreMid;
  return COLORS.scoreLow;
}

export default function HobbyTable({ hobbies, onSelect }) {
  const [sortCol, setSortCol] = useState("trendScore");
  const [sortDir, setSortDir] = useState("desc");

  // Calculate YoY search interest growth (this month vs same month last year)
  const calcSearchGrowth = (sparkline) => {
    if (!sparkline || !Array.isArray(sparkline) || sparkline.length < 50) return null;
    const recent = sparkline.slice(-4);
    const yearAgo = sparkline.slice(0, 4);
    const avgRecent = recent.reduce((a, b) => a + b, 0) / recent.length;
    const avgYearAgo = yearAgo.reduce((a, b) => a + b, 0) / yearAgo.length;
    if (avgYearAgo === 0) return null;
    return ((avgRecent - avgYearAgo) / avgYearAgo) * 100;
  };

  const fmtViews = (v) => {
    if (!v || v === "0") return "--";
    const n = Number(v);
    if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
    if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
    return n.toLocaleString();
  };

  const fmtVolume = (v) => {
    if (!v || v === 0) return "--";
    const n = Number(v);
    if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
    return n.toLocaleString();
  };

  // Global averages for badge logic
  const avgMetrics = useMemo(() => {
    const withYT = hobbies.filter((h) => Number(h.yt_total_views) > 0);
    const withTT = hobbies.filter((h) => Number(h.tt_total_views) > 0);
    const withTrends = hobbies.filter((h) => Number(h.trends_interest_score) > 0);
    return {
      ytViews: withYT.length > 0 ? withYT.reduce((a, h) => a + Number(h.yt_total_views), 0) / withYT.length : 0,
      ttViews: withTT.length > 0 ? withTT.reduce((a, h) => a + Number(h.tt_total_views), 0) / withTT.length : 0,
      trends: withTrends.length > 0 ? withTrends.reduce((a, h) => a + Number(h.trends_interest_score), 0) / withTrends.length : 0,
    };
  }, [hobbies]);

  function getHobbyStatus(hobby) {
    const yt = Number(hobby.yt_total_views) || 0;
    const tt = Number(hobby.tt_total_views) || 0;
    const trends = Number(hobby.trends_interest_score) || 0;
    if (yt === 0 || tt === 0 || trends === 0) return { badge: null, reasons: [] };

    const ytRatio = avgMetrics.ytViews > 0 ? yt / avgMetrics.ytViews : 0;
    const ttRatio = avgMetrics.ttViews > 0 ? tt / avgMetrics.ttViews : 0;
    const trendsRatio = avgMetrics.trends > 0 ? trends / avgMetrics.trends : 0;

    const ytAbove = ytRatio > 1.15;
    const ttAbove = ttRatio > 1.15;
    const trendsAbove = trendsRatio > 1.15;
    const ytHot = ytRatio > 1.5;
    const ttHot = ttRatio > 1.5;
    const trendsHot = trendsRatio > 1.5;

    const reasons = [];

    if (ytAbove && ttAbove && trendsAbove && (ytHot || ttHot || trendsHot)) {
      reasons.push(`YT +${Math.round((ytRatio - 1) * 100)}%`);
      reasons.push(`TT +${Math.round((ttRatio - 1) * 100)}%`);
      reasons.push(`Trends ${trends} vs ${Math.round(avgMetrics.trends)} avg`);
      return { badge: "hot", reasons };
    }
    if (ytAbove && ttAbove && trendsAbove) {
      reasons.push(`YT +${Math.round((ytRatio - 1) * 100)}%`);
      reasons.push(`TT +${Math.round((ttRatio - 1) * 100)}%`);
      reasons.push(`Trends ${trends} vs ${Math.round(avgMetrics.trends)} avg`);
      return { badge: "above", reasons };
    }
    const aboveCount = [ytAbove, ttAbove, trendsAbove].filter(Boolean).length;
    if (aboveCount === 2) {
      if (ytAbove) reasons.push(`YT +${Math.round((ytRatio - 1) * 100)}%`);
      if (ttAbove) reasons.push(`TT +${Math.round((ttRatio - 1) * 100)}%`);
      if (trendsAbove) reasons.push(`Trends +${Math.round((trendsRatio - 1) * 100)}%`);
      return { badge: "warming", reasons };
    }
    return { badge: null, reasons: [] };
  }

  const sorted = useMemo(() => {
    return [...hobbies].sort((a, b) => {
      let valA, valB;
      switch (sortCol) {
        case "name": valA = a.name || ""; valB = b.name || ""; return sortDir === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
        case "trendScore": valA = a.trend_score || 0; valB = b.trend_score || 0; break;
        case "ytViews": valA = Number(a.yt_total_views) || 0; valB = Number(b.yt_total_views) || 0; break;
        case "ttViews": valA = Number(a.tt_total_views) || 0; valB = Number(b.tt_total_views) || 0; break;
        case "ttHashtag": valA = Number(a.tt_hashtag_views) || 0; valB = Number(b.tt_hashtag_views) || 0; break;
        case "volume": valA = Number(a.search_volume) || 0; valB = Number(b.search_volume) || 0; break;
        case "searchGrowth": valA = calcSearchGrowth(a.trends_sparkline) ?? -999; valB = calcSearchGrowth(b.trends_sparkline) ?? -999; break;
        default: valA = a.trend_score || 0; valB = b.trend_score || 0;
      }
      return sortDir === "asc" ? valA - valB : valB - valA;
    });
  }, [hobbies, sortCol, sortDir]);

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(sortDir === "desc" ? "asc" : "desc");
    else { setSortCol(col); setSortDir("desc"); }
  };

  const columns = [
    { key: "name", label: "Hobby" },
    { key: "trendScore", label: "Score" },
    { key: null, label: "Direction" },
    { key: "ytViews", label: "YT Top Videos" },
    { key: "ttViews", label: "TT Top Videos" },
    { key: "ttHashtag", label: "TT Hashtag" },
    { key: "volume", label: "Search Vol", tooltip: "Monthly Google searches -- comparable across hobbies" },
    { key: "searchGrowth", label: "Search Growth", tooltip: "Google search interest change -- this month vs same month last year (YoY)" },
    { key: null, label: "Trend" },
  ];

  const badgeConfig = {
    hot: { label: "HOT", bg: COLORS.hot, fg: "#fff", border: `3px solid ${COLORS.hot}`, rowBg: COLORS.hotBg },
    above: { label: "ABOVE AVG", bg: "#e8f0eb", fg: COLORS.above, border: `3px solid ${COLORS.above}`, rowBg: "#fbfdfb" },
    warming: { label: "WARMING", bg: "#fdf3e0", fg: COLORS.warming, border: `3px solid ${COLORS.warming}`, rowBg: COLORS.warmingBg },
  };

  return (
    <div style={{ padding: "0 48px" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #1a1a1a" }}>
            {columns.map((col) => (
              <th
                key={col.label}
                onClick={() => col.key && handleSort(col.key)}
                title={col.tooltip || ""}
                style={{
                  padding: "14px 8px 10px", fontSize: 9, fontWeight: 500,
                  color: sortCol === col.key ? "#1a1a1a" : "#999",
                  textTransform: "uppercase", letterSpacing: "0.12em", textAlign: "left",
                  cursor: col.key ? "pointer" : "default", userSelect: "none",
                  borderBottom: col.tooltip ? "1px dashed #ccc" : "none",
                }}
              >
                {col.label}
                {sortCol === col.key && (
                  <span style={{ marginLeft: 4, fontSize: 8 }}>{sortDir === "desc" ? "\u25BC" : "\u25B2"}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((hobby) => {
            const primaryKeyword = hobby.keywords?.[0] || "";
            const sparkline = hobby.trends_sparkline;
            const hasRealData = Array.isArray(sparkline) && sparkline.length > 1;
            const { badge, reasons } = getHobbyStatus(hobby);
            const bStyle = badge ? badgeConfig[badge] : null;
            const score = hobby.trend_score;
            const scoreColor = getScoreColor(score);

            let sparkColor = "#1a1a1a";
            if (hasRealData) {
              const recent = sparkline.slice(-7);
              const prior = sparkline.slice(-14, -7);
              if (recent.length > 0 && prior.length > 0) {
                const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
                const priorAvg = prior.reduce((a, b) => a + b, 0) / prior.length;
                if (recentAvg > priorAvg * 1.05) sparkColor = COLORS.hot;
                else if (recentAvg < priorAvg * 0.95) sparkColor = "#c4c4c4";
              }
            }

            return (
              <tr
                key={hobby.id}
                onClick={() => onSelect(hobby)}
                style={{
                  borderBottom: "1px solid #e8e6e3", cursor: "pointer", transition: "background 0.15s",
                  borderLeft: bStyle ? bStyle.border : "3px solid transparent",
                  background: bStyle ? bStyle.rowBg : "transparent",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#f0efec")}
                onMouseLeave={(e) => (e.currentTarget.style.background = bStyle ? bStyle.rowBg : "transparent")}
              >
                <td style={{ padding: "14px 8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 15, fontWeight: 500, letterSpacing: "-0.01em", color: "#1a1a1a" }}>{hobby.name}</span>
                    {bStyle && (
                      <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", padding: "2px 7px", background: bStyle.bg, color: bStyle.fg, borderRadius: 2 }}>{bStyle.label}</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: "#888", fontWeight: 400, textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 2 }}>
                    {hobby.category}
                  </div>
                  {reasons.length > 0 && (
                    <div style={{ fontSize: 10, color: badge === "hot" ? COLORS.hot : badge === "warming" ? COLORS.warming : "#999", fontWeight: 400, marginTop: 3 }}>
                      {reasons.join(" / ")}
                    </div>
                  )}
                  {reasons.length === 0 && primaryKeyword && primaryKeyword.toLowerCase() !== hobby.name.toLowerCase() && (
                    <div style={{ fontSize: 10, color: "#888", fontWeight: 300, fontStyle: "italic", marginTop: 2 }}>
                      searching: {primaryKeyword}
                    </div>
                  )}
                </td>
                <td style={{ padding: "14px 8px" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
                    <span style={{ fontSize: 20, fontWeight: 700, color: scoreColor }}>{score ?? "--"}</span>
                    <span style={{ fontSize: 10, color: "#aaa", fontWeight: 300 }}>/100</span>
                  </div>
                </td>
                <td style={{ padding: "14px 8px" }}>
                  <DirectionTag direction={hobby.direction || "stable"} />
                </td>
                <td style={{ padding: "14px 8px" }}>
                  <div style={{ fontSize: 15, fontWeight: 500, color: "#1a1a1a" }}>{fmtViews(hobby.yt_total_views)}</div>
                  {hobby.yt_video_count > 0 && (
                    <div style={{ fontSize: 10, color: "#999", fontWeight: 400, marginTop: 2 }}>top {hobby.yt_video_count} tracked</div>
                  )}
                </td>
                <td style={{ padding: "14px 8px" }}>
                  <div style={{ fontSize: 15, fontWeight: 500, color: "#1a1a1a" }}>{fmtViews(hobby.tt_total_views)}</div>
                  {hobby.tt_video_count > 0 && (
                    <div style={{ fontSize: 10, color: "#999", fontWeight: 400, marginTop: 2 }}>top {hobby.tt_video_count} tracked</div>
                  )}
                </td>
                <td style={{ padding: "14px 8px" }}>
                  <span style={{ fontSize: 15, fontWeight: 500, color: "#1a1a1a" }}>{fmtViews(hobby.tt_hashtag_views)}</span>
                </td>
                <td style={{ padding: "14px 8px" }}>
                  <div style={{ fontSize: 15, fontWeight: 500, color: "#1a1a1a" }}>{fmtVolume(hobby.search_volume)}</div>
                  {hobby.search_volume > 0 && (
                    <div style={{ fontSize: 10, color: "#999", fontWeight: 400, marginTop: 2 }}>/month</div>
                  )}
                </td>
                <td style={{ padding: "14px 8px" }}>
                  {(() => {
                    const growth = calcSearchGrowth(hobby.trends_sparkline);
                    if (growth == null) return <span style={{ fontSize: 15, color: "#bbb" }}>--</span>;
                    const color = growth > 5 ? "#2d6a4f" : growth < -5 ? "#c0392b" : "#888";
                    return (
                      <span style={{ fontSize: 15, fontWeight: 500, color }}>
                        {growth >= 0 ? "+" : ""}{growth.toFixed(0)}%
                      </span>
                    );
                  })()}
                </td>
                <td style={{ padding: "14px 8px" }}>
                  {hasRealData ? (
                    <Sparkline data={sparkline} width={80} height={24} color={sparkColor} />
                  ) : (
                    <span style={{ fontSize: 10, color: "#aaa", fontWeight: 300 }}>No data</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {hobbies.length === 0 && (
        <div style={{ padding: "48px 0", textAlign: "center", color: "#aaa", fontSize: 14, fontWeight: 300 }}>
          No data yet. Run the collection scripts to populate.
        </div>
      )}
    </div>
  );
}
