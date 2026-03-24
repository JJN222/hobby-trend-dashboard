import React, { useEffect, useState } from "react";
import Sparkline from "./Sparkline";
import DirectionTag from "./DirectionTag";
import { VideoCardRow } from "./VideoCard";
import { fetchTopVideos, fetchSnapshots, deleteHobby, updateHobby } from "../utils/api";

export default function DetailPanel({ hobby, onClose, onRefresh, categories }) {
  const [videos, setVideos] = useState({ youtube: [], tiktok: [] });
  const [sparkData, setSparkData] = useState([]);
  const [editingCategory, setEditingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState(hobby.category);
  const [customCategory, setCustomCategory] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);

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

  const handleDelete = async () => {
    setSaving(true);
    try {
      await deleteHobby(hobby.id);
      onClose();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert("Failed to delete: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCategoryChange = async () => {
    const finalCategory = newCategory === "__custom__" ? customCategory.trim() : newCategory;
    if (!finalCategory) return;
    setSaving(true);
    try {
      await updateHobby(hobby.id, { category: finalCategory });
      setEditingCategory(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert("Failed to update: " + err.message);
    } finally {
      setSaving(false);
    }
  };

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
          background: "#faf9f7", width: "100%", maxWidth: 640, overflow: "hidden",
          padding: "40px 44px", marginBottom: 40,
          boxShadow: "0 4px 40px rgba(0,0,0,0.06)", position: "relative", overflow: "auto", maxHeight: "90vh",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
          <div>
            {!editingCategory ? (
              <div
                onClick={() => setEditingCategory(true)}
                style={{
                  fontSize: 10, fontWeight: 500, letterSpacing: "0.12em", color: "#999",
                  textTransform: "uppercase", marginBottom: 6, cursor: "pointer",
                  borderBottom: "1px dashed #ccc", display: "inline-block",
                }}
                title="Click to change category"
              >
                {hobby.category}
              </div>
            ) : (
              <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  style={{
                    fontSize: 11, padding: "3px 6px", border: "1px solid #ccc",
                    background: "#fff", color: "#444",
                  }}
                >
                  {(categories || []).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  <option value="__custom__">+ New category...</option>
                </select>
                {newCategory === "__custom__" && (
                  <input
                    type="text"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="Category name"
                    style={{
                      fontSize: 11, padding: "3px 6px", border: "1px solid #ccc",
                      width: 120,
                    }}
                    autoFocus
                  />
                )}
                <button
                  onClick={handleCategoryChange}
                  disabled={saving}
                  style={{
                    fontSize: 10, padding: "3px 8px", background: "#1a1a1a", color: "#fff",
                    border: "none", cursor: "pointer", letterSpacing: "0.06em",
                  }}
                >
                  SAVE
                </button>
                <button
                  onClick={() => { setEditingCategory(false); setNewCategory(hobby.category); }}
                  style={{
                    fontSize: 10, padding: "3px 8px", background: "transparent", color: "#999",
                    border: "1px solid #ddd", cursor: "pointer",
                  }}
                >
                  CANCEL
                </button>
              </div>
            )}
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
            <div style={{ fontSize: 9, color: "#bbb", marginTop: 4, letterSpacing: "0.08em", fontWeight: 500 }}>
              {sparkData.length > 0 ? `${sparkData.length}-DAY TREND` : "NO HISTORY YET"}
            </div>
          </div>
          <DirectionTag direction={hobby.direction || "stable"} />
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
                <span style={{ position: "absolute", left: 0, color: "#ccc", fontWeight: 400 }}>/</span>
                {s}
              </div>
            ))}
          </div>
        )}

        {/* Video Links */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 28, paddingBottom: 28, borderBottom: "1px solid #e8e6e3" }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.12em", color: "#999", textTransform: "uppercase", marginBottom: 8 }}>
              Top YouTube
            </div>
            {videos.youtube.length === 0 && <div style={{ fontSize: 12, color: "#ccc", fontWeight: 300 }}>No videos collected yet</div>}
            {videos.youtube.map((v) => (
              <VideoCardRow key={v.id} video={v} />
            ))}
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.12em", color: "#999", textTransform: "uppercase", marginBottom: 8 }}>
              Top TikTok
            </div>
            {videos.tiktok.length === 0 && <div style={{ fontSize: 12, color: "#ccc", fontWeight: 300 }}>No videos collected yet</div>}
            {videos.tiktok.map((v) => (
              <VideoCardRow key={v.id} video={v} />
            ))}
          </div>
        </div>

        {/* Delete Hobby */}
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12 }}>
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              style={{
                fontSize: 10, fontWeight: 500, letterSpacing: "0.08em", padding: "6px 14px",
                background: "transparent", color: "#c0392b", border: "1px solid #e8e6e3",
                cursor: "pointer", textTransform: "uppercase",
              }}
            >
              Remove Hobby
            </button>
          ) : (
            <>
              <span style={{ fontSize: 12, color: "#c0392b", fontWeight: 400 }}>
                Remove {hobby.name}? This hides it from tracking.
              </span>
              <button
                onClick={handleDelete}
                disabled={saving}
                style={{
                  fontSize: 10, fontWeight: 500, letterSpacing: "0.08em", padding: "6px 14px",
                  background: "#c0392b", color: "#fff", border: "none",
                  cursor: "pointer", textTransform: "uppercase",
                }}
              >
                {saving ? "REMOVING..." : "CONFIRM"}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                style={{
                  fontSize: 10, fontWeight: 500, letterSpacing: "0.08em", padding: "6px 14px",
                  background: "transparent", color: "#999", border: "1px solid #ddd",
                  cursor: "pointer", textTransform: "uppercase",
                }}
              >
                CANCEL
              </button>
            </>
          )}
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
