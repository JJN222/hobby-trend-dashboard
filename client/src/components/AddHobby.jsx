import React, { useState } from "react";

const CATEGORIES = ["Crafts", "Collecting", "Food", "Games", "Lifestyle", "Outdoors", "Sports", "Tech"];

export default function AddHobby({ onAdded, onClose }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Crafts");
  const [keywordsText, setKeywordsText] = useState("");
  const [hashtagsText, setHashtagsText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    const keywords = keywordsText
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

    const hashtags = hashtagsText
      .split(",")
      .map((t) => t.trim())
      .map((t) => (t.startsWith("#") ? t : `#${t}`))
      .filter((t) => t.length > 1);

    if (keywords.length === 0) {
      setError("Add at least one keyword");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/hobbies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          category,
          keywords,
          tiktok_hashtags: hashtags,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add hobby");
      }

      const hobby = await res.json();
      if (onAdded) onAdded(hobby);
      onClose();
    } catch (err) {
      setError(err.message);
    }
    setSaving(false);
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #ddd",
    background: "#fff",
    fontSize: 13,
    fontWeight: 400,
    color: "#1a1a1a",
    outline: "none",
    fontFamily: "inherit",
  };

  const labelStyle = {
    fontSize: 10,
    fontWeight: 500,
    letterSpacing: "0.12em",
    color: "#999",
    textTransform: "uppercase",
    marginBottom: 6,
    display: "block",
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.18)",
        display: "flex", justifyContent: "center", alignItems: "flex-start",
        zIndex: 100, paddingTop: 60, overflowY: "auto",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#faf9f7", width: "100%", maxWidth: 480,
          padding: "36px 40px", marginBottom: 40,
          boxShadow: "0 4px 40px rgba(0,0,0,0.06)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.12em", color: "#999", textTransform: "uppercase", marginBottom: 6 }}>
              Add New Hobby
            </div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#1a1a1a" }}>Track a Hobby</h2>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 11, cursor: "pointer", color: "#999", fontWeight: 500, letterSpacing: "0.1em" }}>
            CLOSE
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Name */}
          <div>
            <label style={labelStyle}>Hobby Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Candle Making"
              style={inputStyle}
            />
          </div>

          {/* Category */}
          <div>
            <label style={labelStyle}>Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{ ...inputStyle, cursor: "pointer" }}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Keywords */}
          <div>
            <label style={labelStyle}>YouTube Keywords (comma-separated)</label>
            <textarea
              value={keywordsText}
              onChange={(e) => setKeywordsText(e.target.value)}
              placeholder="e.g. candle making, soy candles, candle tutorial, homemade candles"
              rows={3}
              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
            />
            <div style={{ fontSize: 11, color: "#888", fontWeight: 300, marginTop: 4 }}>
              The first keyword is used as the primary search term. Add 3-6 variations.
            </div>
          </div>

          {/* Hashtags */}
          <div>
            <label style={labelStyle}>TikTok Hashtags (comma-separated)</label>
            <textarea
              value={hashtagsText}
              onChange={(e) => setHashtagsText(e.target.value)}
              placeholder="e.g. #candlemaking, #candletok, #soycandles, #candlebusiness"
              rows={3}
              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
            />
            <div style={{ fontSize: 11, color: "#888", fontWeight: 300, marginTop: 4 }}>
              The # is added automatically if you skip it. Top 3 hashtags are tracked.
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{ fontSize: 12, color: "#c62828", fontWeight: 400 }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={saving}
            style={{
              padding: "12px 24px",
              background: saving ? "#999" : "#1a1a1a",
              color: "#faf9f7",
              border: "none",
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: "0.08em",
              cursor: saving ? "default" : "pointer",
              textTransform: "uppercase",
              marginTop: 4,
            }}
          >
            {saving ? "ADDING..." : "ADD HOBBY"}
          </button>

          <div style={{ fontSize: 11, color: "#888", fontWeight: 300, lineHeight: 1.5 }}>
            After adding, run the data collectors to start gathering YouTube, TikTok, and Google Trends data for this hobby.
          </div>
        </div>
      </div>
    </div>
  );
}
