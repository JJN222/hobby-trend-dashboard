import React, { useEffect, useState } from "react";
import Sparkline from "./Sparkline";
import DirectionTag from "./DirectionTag";
import { VideoCardRow } from "./VideoCard";
import { fetchTopVideos, fetchSnapshots } from "../utils/api";

export default function DetailPanel({ hobby, onClose }) {
  const [videos, setVideos] = useState({ youtube: [], tiktok: [] });
  const [sparkData, setSparkData] = useState([]);

  useEffect(() => {
    fetchTopVideos(hobby.id).then(setVideos).catch(console.error);
    fetchSnapshots(hobby.id, 56).then((snaps) => {
      setSparkData(snaps.map((s) => s.trend_score || 0));
    }).catch(console.error);
  }, [hobby.id]);

  const fmt = (v) => (v >= 0 ? `+${v}` : `${v}`);
  const fmtViews = (v) => {
    if (!v) return "N/A";
    if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
    if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
    if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
    return v.toLocaleString();
  };

  const keywords = hobby.keywords || [];
  const hashtags = hobby.tiktok_hashtags || [];

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.18)",
        display: "flex", justifyContent: "center", alignItems: "flex-start",
        zIndex: 100, paddingTop: 40, overflowY: "auto",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#faf9f7", width: "100%", maxWidth: 640,
          padding: "40px 44px", marginBottom: 40,
          boxShadow: "0 4px 40px rgba(0,0,0,0.06)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.12em", color: "#999", textTransform: "uppercase", marginBottom: 6 }}>
              {hobby.category}
            </div>
            <h2 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: "#1a1a1a", letterSpacing: "-0.01em" }}>
              {hobby.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none", border: "none", fontSize: 11, cursor: "pointer",
              color: "#999", padding: "4px 8px", fontWeight: 500, letterSpacing: "0.1em",
            }}
          >
            CLOSE
          </button>
        </div>

        {/* Score + Spark + Direction */}
        <div style={{ display: "flex", gap: 32, alignItems: "center", marginBottom: 32, paddingBottom: 32, borderBottom: "1px solid #e8e6e3" }}>
          <div>
            <div style={{ fontSize: 44, fontWeight: 300, color: "#1a1a1a", lineHeight: 1 }}>
              {hobby.trend_score ?? "--"}
            </div>
            <div style={{ fontSize: 9, color: "#999", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 500 }}>
              Trend Score
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <Sparkline data={sparkData.length > 1 ? sparkData : [0, 0]} width={100} height={28} />
            <div style={{ fontSize: 9, color: "#888", marginTop: 4, letterSpacing: "0.08em", fontWeight: 500 }}>
              {sparkData.length > 1 ? `${sparkData.length}-DAY TREND` : "COLLECTING DATA"}
            </div>
          </div>
          <DirectionTag direction={hobby.direction || "stable"} />
        </div>

        {/* Tracked Search Terms */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 20, marginBottom: 28, paddingBottom: 28, borderBottom: "1px solid #e8e6e3" }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.12em", color: "#999", textTransform: "uppercase", marginBottom: 10 }}>
              YouTube Keywords
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {keywords.map((kw, i) => (
                <span key={i} style={{ fontSize: 11, fontWeight: 400, color: "#666", padding: "3px 8px", background: "#f0efec", letterSpacing: "0.02em" }}>
                  {kw}
                </span>
              ))}
              {keywords.length === 0 && <span style={{ fontSize: 11, color: "#aaa", fontWeight: 300 }}>None configured</span>}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.12em", color: "#999", textTransform: "uppercase", marginBottom: 10 }}>
              TikTok Hashtags
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {hashtags.map((tag, i) => (
                <span key={i} style={{ fontSize: 11, fontWeight: 400, color: "#666", padding: "3px 8px", background: "#f0efec", letterSpacing: "0.02em" }}>
                  {tag}
                </span>
              ))}
              {hashtags.length === 0 && <span style={{ fontSize: 11, color: "#aaa", fontWeight: 300 }}>None configured</span>}
            </div>
          </div>
        </div>

        {/* Prediction */}
        {hobby.prediction_text && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.12em", color: "#999", textTransform: "uppercase", marginBottom: 8 }}>
              Prediction
            </div>
            <div style={{ fontSize: 15, fontWeight: 300, color: "#1a1a1a", lineHeight: 1.6 }}>
              {hobby.prediction_text}
            </div>
          </div>
        )}

        {/* Platform Metrics 3-col */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginBottom: 28, paddingBottom: 28, borderBottom: "1px solid #e8e6e3" }}>
          <MetricColumn label="YouTube" rows={[
            ["Search Results", hobby.yt_search_results ?? "N/A"],
            ["Growth", hobby.yt_growth_rate != null ? `${fmt(Number(hobby.yt_growth_rate).toFixed(1))}%` : "N/A"],
            ["Avg Views", fmtViews(hobby.yt_avg_views)],
            ["New / 24h", hobby.yt_new_videos_24h ?? "N/A"],
          ]} />
          <MetricColumn label="TikTok" rows={[
            ["Hashtag Views", fmtViews(hobby.tt_hashtag_views)],
            ["Growth", hobby.tt_growth_rate != null ? `${fmt(Number(hobby.tt_growth_rate).toFixed(1))}%` : "N/A"],
            ["Eng. Rate", hobby.tt_avg_engagement_rate != null ? `${hobby.tt_avg_engagement_rate}%` : "N/A"],
            ["New / 24h", hobby.tt_new_videos_24h ?? "N/A"],
          ]} />
          <MetricColumn label="Google Trends" rows={[
            ["Interest", hobby.trends_interest_score ?? "N/A"],
            ["Acceleration", hobby.search_acceleration != null ? `${fmt(Number(hobby.search_acceleration).toFixed(1))}%` : "N/A"],
          ]} />
        </div>

        {/* Signals */}
        {hobby.signals && hobby.signals.length > 0 && (
          <div style={{ marginBottom: 28, paddingBottom: 28, borderBottom: "1px solid #e8e6e3" }}>
            <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.12em", color: "#999", textTransform: "uppercase", marginBottom: 12 }}>
              Key Signals
            </div>
            {hobby.signals.map((s, i) => (
              <div key={i} style={{ fontSize: 13, fontWeight: 300, color: "#444", lineHeight: 1.7, paddingLeft: 16, position: "relative", marginBottom: 2 }}>
                <span style={{ position: "absolute", left: 0, color: "#aaa", fontWeight: 400 }}>/</span>
                {s}
              </div>
            ))}
          </div>
        )}

        {/* Video Links */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 24, overflow: "hidden" }}>
          <div style={{ overflow: "hidden" }}>
            <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.12em", color: "#999", textTransform: "uppercase", marginBottom: 8 }}>
              Top YouTube
            </div>
            {videos.youtube.length === 0 && <div style={{ fontSize: 12, color: "#aaa", fontWeight: 300 }}>No videos collected yet</div>}
            {videos.youtube.map((v) => (
              <VideoCardRow key={v.id} video={v} />
            ))}
          </div>
          <div style={{ overflow: "hidden" }}>
            <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.12em", color: "#999", textTransform: "uppercase", marginBottom: 8 }}>
              Top TikTok
            </div>
            {videos.tiktok.length === 0 && <div style={{ fontSize: 12, color: "#aaa", fontWeight: 300 }}>No videos collected yet</div>}
            {videos.tiktok.map((v) => (
              <VideoCardRow key={v.id} video={v} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricColumn({ label, rows }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.12em", color: "#999", textTransform: "uppercase", marginBottom: 12 }}>
        {label}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {rows.map(([l, v]) => (
          <div key={l} style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: "#888", fontWeight: 300 }}>{l}</span>
            <span style={{ fontSize: 13, fontWeight: 500 }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
