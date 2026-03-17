const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export async function apiPost(endpoint: string, body: Record<string, unknown>) {
  const token = typeof window !== "undefined" ? localStorage.getItem("guardian_token") : null;
  const res = await fetch(`${API_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return res.json();
}

export async function apiGet(endpoint: string) {
  const token = typeof window !== "undefined" ? localStorage.getItem("guardian_token") : null;
  const res = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return res.json();
}
