// frontend/src/forum/api/client.js
// Axios instance pre-configured with base URL and JWT injection

import axios from "axios";

const BASE = process.env.REACT_APP_API_URL ? `${process.env.REACT_APP_API_URL}/api/forum` : "http://localhost:8001/api/forum";

const api = axios.create({ baseURL: BASE });

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("wg_token") || localStorage.getItem("forum_access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401 (simplified)
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("wg_token");
      localStorage.removeItem("forum_access_token");
      localStorage.removeItem("forum_refresh_token");
      window.dispatchEvent(new CustomEvent("forum:logout"));
    }
    return Promise.reject(err);
  }
);

export default api;

// ── Auth ──────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post("/auth/register", data).then((r) => r.data),
  login:    (data) => api.post("/auth/login",    data).then((r) => r.data),
  me:       ()     => api.get("/auth/me")              .then((r) => r.data),
};

// ── Users ─────────────────────────────────────────────────────────────
export const usersAPI = {
  search:   (q, limit=10)   => api.get(`/users/search`, { params: { q, limit } }).then((r) => r.data),
  profile:  (username)        => api.get(`/users/${username}`).then((r) => r.data),
  update:   (data)            => api.patch("/users/me", data).then((r) => r.data),
  follow:   (username)        => api.post(`/users/${username}/follow`).then((r) => r.data),
  unfollow: (username)        => api.delete(`/users/${username}/follow`).then((r) => r.data),
  block:    (username)        => api.post(`/users/${username}/block`).then((r) => r.data),
  unblock:  (username)        => api.delete(`/users/${username}/block`).then((r) => r.data),
  report:   (username, reason) => api.post(`/users/${username}/report`, { reason }).then((r) => r.data),
  posts:    (username, params) => api.get(`/users/${username}/posts`, { params }).then((r) => r.data),
};

// ── Posts ─────────────────────────────────────────────────────────────
export const postsAPI = {
  list:    (params)   => api.get("/posts", { params }).then((r) => r.data),
  get:     (id)       => api.get(`/posts/${id}`).then((r) => r.data),
  check:   (data)     => api.post("/posts/check", data).then((r) => r.data),
  create:  (data)     => api.post("/posts", data).then((r) => r.data),
  update:  (id, data) => api.patch(`/posts/${id}`, data).then((r) => r.data),
  remove:  (id)       => api.delete(`/posts/${id}`).then((r) => r.data),
  like:    (id)       => api.post(`/posts/${id}/like`).then((r) => r.data),
  unlike:  (id)       => api.delete(`/posts/${id}/like`).then((r) => r.data),
  share:   (id)       => api.post(`/posts/${id}/share`).then((r) => r.data),
  report:  (id, reason) => api.post(`/posts/${id}/report`, { reason }).then((r) => r.data),
  likers:  (id, limit = 10) => api.get(`/posts/${id}/likers`, { params: { limit } }).then((r) => r.data),
  sharers: (id, limit = 10) => api.get(`/posts/${id}/sharers`, { params: { limit } }).then((r) => r.data),
  commenters: (id, limit = 10) => api.get(`/posts/${id}/commenters`, { params: { limit } }).then((r) => r.data),
};

// ── Media Upload ──────────────────────────────────────────────────────
export const uploadAPI = {
  upload: (file, onProgress) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post("/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded * 100) / e.total));
        }
      },
    }).then((r) => r.data);
  },
};

// ── Comments ──────────────────────────────────────────────────────────
export const commentsAPI = {
  list:        (postId, params) => api.get(`/posts/${postId}/comments`, { params }).then((r) => r.data),
  create:      (postId, data)   => api.post(`/posts/${postId}/comments`, data).then((r) => r.data),
  remove:      (id)             => api.delete(`/comments/${id}`).then((r) => r.data),
  like:        (id)             => api.post(`/comments/${id}/like`).then((r) => r.data),
  unlike:      (id)             => api.delete(`/comments/${id}/like`).then((r) => r.data),
  report:      (id, reason)     => api.post(`/comments/${id}/report`, { reason }).then((r) => r.data),
};

// ── Notifications ─────────────────────────────────────────────────────
export const notifsAPI = {
  list:       (params) => api.get("/notifications", { params }).then((r) => r.data),
  unreadCount: ()      => api.get("/notifications/unread-count").then((r) => r.data),
  readAll:    ()       => api.post("/notifications/read-all").then((r) => r.data),
  read:       (id)     => api.post(`/notifications/${id}/read`).then((r) => r.data),
};

// ── Messages ─────────────────────────────────────────────────────────
export const messagesAPI = {
  conversations: ()        => api.get("/messages").then((r) => r.data),
  conversation:  (otherId) => api.get(`/messages/${otherId}`).then((r) => r.data),
  send:          (receiverId, body) => api.post(`/messages/${receiverId}`, { body }).then((r) => r.data),
  markRead:      (msgId)   => api.put(`/messages/${msgId}/read`).then((r) => r.data),
};

// ── Activity (profile feed) ─────────────────────────────────────────
export const activityAPI = {
  list: (username, params) => api.get(`/users/${username}/activity`, { params }).then((r) => r.data),
};

// ── Followers / Following ─────────────────────────────────────────
export const followsAPI = {
  followers: (username, params) => api.get(`/users/${username}/followers`, { params }).then((r) => r.data),
  following: (username, params) => api.get(`/users/${username}/following`, { params }).then((r) => r.data),
};
