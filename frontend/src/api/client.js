// In dev, Vite proxies /api -> backend (see vite.config.js).
// In production, set VITE_API_URL to the backend's public URL at build time.
const BASE = import.meta.env.VITE_API_URL || "/api";

function getToken() {
  return sessionStorage.getItem("token");
}

export function setToken(t) {
  if (t) sessionStorage.setItem("token", t);
  else sessionStorage.removeItem("token");
}

async function request(method, path, body, { auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) {
    setToken(null);
    throw new Error("Session expired. Please sign in again.");
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || "Request failed");
  }
  return data;
}

export const api = {
  // auth
  login: (email, password) =>
    request("POST", "/auth/login", { email, password }, { auth: false }),
  me: () => request("GET", "/auth/me"),
  // users
  listUsers: () => request("GET", "/users"),
  createUser: (payload) => request("POST", "/users", payload),
  deleteUser: (id) => request("DELETE", `/users/${id}`),
  // events
  listEvents: () => request("GET", "/events"),
  createEvent: (payload) => request("POST", "/events", payload),
  getEvent: (id) => request("GET", `/events/${id}`),
  updateEvent: (id, payload) => request("PATCH", `/events/${id}`, payload),
  deleteEvent: (id) => request("DELETE", `/events/${id}`),
  dashboard: (id) => request("GET", `/events/${id}/dashboard`),
  // participants
  listParticipants: (eventId, { search, status } = {}) => {
    const q = new URLSearchParams();
    if (search) q.set("search", search);
    if (status) q.set("status", status);
    const qs = q.toString();
    return request("GET", `/events/${eventId}/participants${qs ? `?${qs}` : ""}`);
  },
  addParticipant: (eventId, payload) =>
    request("POST", `/events/${eventId}/participants`, payload),
  updateParticipant: (id, payload) =>
    request("PATCH", `/participants/${id}`, payload),
  deleteParticipant: (id) => request("DELETE", `/participants/${id}`),
  invite: (id) => request("POST", `/participants/${id}/invite`),
  checkin: (id) => request("POST", `/participants/${id}/checkin`),
  // public
  publicEvent: (slug) =>
    request("GET", `/public/events/${slug}`, undefined, { auth: false }),
  publicRegister: (slug, payload) =>
    request("POST", `/public/events/${slug}/register`, payload, { auth: false }),
};
