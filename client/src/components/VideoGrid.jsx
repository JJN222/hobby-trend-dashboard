import React from "react";
import { VideoCardGrid } from "./VideoCard";
import { useApi } from "../hooks/useApi";
import { fetchVideos } from "../utils/api";

export default function VideoGrid({ category, platform }) {
  const { data: videos, loading } = useApi(
    () => fetchVideos({ category, platform, limit: 40 }),
    [category, platform]
  );

  if (loading) {
    return (
      <div style={{ padding: "48px", textAlign: "center", color: "#ccc", fontSize: 13, fontWeight: 300 }}>
        Loading videos...
      </div>
    );
  }

  if (!videos || videos.length === 0) {
    return (
      <div style={{ padding: "48px", textAlign: "center", color: "#ccc", fontSize: 14, fontWeight: 300 }}>
        No videos collected yet. Run the collection scripts to populate.
      </div>
    );
  }

  const platformLabel =
    platform === "all" ? "YouTube + TikTok" : platform === "youtube" ? "YouTube" : "TikTok";
  const catLabel = category && category !== "All" ? ` in ${category}` : " across all categories";

  return (
    <div>
      <div style={{ padding: "20px 48px 0", fontSize: 11, fontWeight: 300, color: "#999" }}>
        Showing {platformLabel} videos{catLabel} -- {videos.length} results
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 20,
          padding: "24px 48px 48px",
        }}
      >
        {videos.map((v) => (
          <VideoCardGrid key={`${v.platform}-${v.platform_id}`} video={v} showHobby={true} />
        ))}
      </div>
    </div>
  );
}
