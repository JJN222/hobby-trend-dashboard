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

export async function deleteHobby(id) {
  const res = await fetch(`${BASE}/hobbies/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete hobby");
  return res.json();
}

export async function updateHobby(id, updates) {
  const res = await fetch(`${BASE}/hobbies/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error("Failed to update hobby");
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

export async function fetchBriefs({ category, month } = {}) {
  const params = new URLSearchParams();
  if (category && category !== "All") params.set("category", category);
  if (month) params.set("month", month);
  const res = await fetch(`${BASE}/briefs?${params}`);
  if (!res.ok) throw new Error("Failed to fetch briefs");
  return res.json();
}

export async function fetchBrief(hobbyId) {
  const res = await fetch(`${BASE}/briefs/${hobbyId}`);
  if (!res.ok) return null;
  return res.json();
}
