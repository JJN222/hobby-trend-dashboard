import React from "react";

export function VideoCardGrid({ video, showHobby }) {
  const isYT = video.platform === "youtube";
  const url = video.video_url || (isYT
    ? `https://youtube.com/watch?v=${video.platform_id}`
    : `https://www.tiktok.com/@${(video.channel_or_user || "").replace("@", "")}/video/${video.platform_id}`);

  const thumb = video.thumbnail_url || (isYT
    ? `https://img.youtube.com/vi/${video.platform_id}/mqdefault.jpg`
    : null);

  const formattedViews = formatViews(video.views);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      style={{ textDecoration: "none", color: "inherit", transition: "opacity 0.15s", display: "block" }}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.6")}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
    >
      <div
        style={{
          width: "100%",
          paddingBottom: "56.25%",
          position: "relative",
          overflow: "hidden",
          marginBottom: 8,
          background: isYT ? "#eee" : "#1a1a1a",
        }}
      >
        {thumb ? (
          <img
            src={thumb}
            alt=""
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          <span
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              color: "#faf9f7",
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: "0.08em",
            }}
          >
            TIKTOK
          </span>
        )}
      </div>
      <div
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: "#1a1a1a",
          lineHeight: 1.3,
          marginBottom: 3,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {video.title}
      </div>
      <div style={{ fontSize: 11, fontWeight: 400, color: "#666" }}>
        {video.channel_or_user} -- {formattedViews} views
      </div>
      {showHobby && video.hobby_name && (
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: "#666",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            marginTop: 4,
          }}
        >
          {video.hobby_name}
        </div>
      )}
    </a>
  );
}

export function VideoCardRow({ video }) {
  const isYT = video.platform === "youtube";
  const url = video.video_url || (isYT
    ? `https://youtube.com/watch?v=${video.platform_id}`
    : `https://www.tiktok.com/@${(video.channel_or_user || "").replace("@", "")}/video/${video.platform_id}`);

  const thumb = video.thumbnail_url || (isYT
    ? `https://img.youtube.com/vi/${video.platform_id}/mqdefault.jpg`
    : null);

  const formattedViews = formatViews(video.views);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "flex",
        gap: 10,
        padding: "10px 0",
        borderBottom: "1px solid #eeece9",
        textDecoration: "none",
        color: "inherit",
        transition: "opacity 0.15s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.6")}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
    >
      {thumb ? (
        <img src={thumb} alt="" style={{ width: 96, height: 54, objectFit: "cover", flexShrink: 0 }} />
      ) : (
        <div
          style={{
            width: 54,
            height: 54,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#1a1a1a",
            color: "#faf9f7",
            fontSize: 9,
            fontWeight: 500,
            letterSpacing: "0.08em",
          }}
        >
          TT
        </div>
      )}
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: "#1a1a1a",
            lineHeight: 1.3,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {video.title}
        </div>
        <div style={{ fontSize: 11, fontWeight: 400, color: "#666", marginTop: 3 }}>
          {video.channel_or_user} -- {formattedViews} views
        </div>
      </div>
    </a>
  );
}

function formatViews(views) {
  if (!views) return "0";
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M`;
  if (views >= 1_000) return `${(views / 1_000).toFixed(0)}K`;
  return views.toLocaleString();
}
