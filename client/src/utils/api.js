const BASE = "/api";

export async function fetchHobbies(category) {
  const params = category && category !== "All" ? `?category=${category}` : "";
  const res = await fetch(`${BASE}/hobbies${params}`);
  if (!res.ok) throw new Error("Failed to fetch hobbies");
  return res.json();
}

export async function fetchCategories() {
  const res = await fetch(`${BASE}/hobbies/categories`);
  if (!res.ok) throw new Error("Failed to fetch categories");
  return res.json();
}

export async function fetchVideos({ hobby_id, platform, category, limit = 40 }) {
  const params = new URLSearchParams();
  if (hobby_id) params.set("hobby_id", hobby_id);
  if (platform && platform !== "all") params.set("platform", platform);
  if (category && category !== "All") params.set("category", category);
  params.set("limit", limit);

  const res = await fetch(`${BASE}/videos?${params}`);
  if (!res.ok) throw new Error("Failed to fetch videos");
  return res.json();
}

export async function fetchTopVideos(hobbyId) {
  const res = await fetch(`${BASE}/videos/top/${hobbyId}`);
  if (!res.ok) throw new Error("Failed to fetch top videos");
  return res.json();
}

export async function fetchSnapshots(hobbyId, days = 56) {
  const res = await fetch(`${BASE}/snapshots/${hobbyId}?days=${days}`);
  if (!res.ok) throw new Error("Failed to fetch snapshots");
  return res.json();
}

export async function fetchOverviewBrief() {
  const res = await fetch(`${BASE}/briefs/overview`);
  if (!res.ok) throw new Error("Failed to fetch overview");
  return res.json();
}

export async function refreshOverviewBrief() {
  const res = await fetch(`${BASE}/briefs/refresh`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to refresh overview");
  return res.json();
}

export async function fetchHobbyBrief(hobbyId) {
  const res = await fetch(`${BASE}/briefs/hobby/${hobbyId}`);
  if (!res.ok) return null;
  return res.json();
}

export async function generateHobbyBrief(hobbyId) {
  const res = await fetch(`${BASE}/briefs/hobby/${hobbyId}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Generation failed");
  }
  return res.json();
}
