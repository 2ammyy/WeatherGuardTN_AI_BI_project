// frontend/src/forum/api/client.js
// Axios instance pre-configured with base URL and JWT injection

import axios from "axios";

const BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api/forum` : "http://localhost:8001/api/forum";

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

// â”€â”€ Auth â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const authAPI = {
  register: (data) => api.post("/auth/register", data).then((r) => r.data),
  login:    (data) => api.post("/auth/login",    data).then((r) => r.data),
  me:       ()     => api.get("/auth/me")              .then((r) => r.data),
};

// â”€â”€ Users â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const usersAPI = {
  profile:  (username)        => api.get(`/users/${username}`).then((r) => r.data),
  update:   (data)            => api.patch("/users/me", data).then((r) => r.data),
  follow:   (username)        => api.post(`/users/${username}/follow`).then((r) => r.data),
  unfollow: (username)        => api.delete(`/users/${username}/follow`).then((r) => r.data),
  block:    (username)        => api.post(`/users/${username}/block`).then((r) => r.data),
  unblock:  (username)        => api.delete(`/users/${username}/block`).then((r) => r.data),
  report:   (username, reason) => api.post(`/users/${username}/report`, { reason }).then((r) => r.data),
  posts:    (username, params) => api.get(`/users/${username}/posts`, { params }).then((r) => r.data),
};

// â”€â”€ Posts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
};

// â”€â”€ Comments â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const commentsAPI = {
  list:        (postId, params) => api.get(`/posts/${postId}/comments`, { params }).then((r) => r.data),
  create:      (postId, data)   => api.post(`/posts/${postId}/comments`, data).then((r) => r.data),
  remove:      (id)             => api.delete(`/comments/${id}`).then((r) => r.data),
  like:        (id)             => api.post(`/comments/${id}/like`).then((r) => r.data),
  unlike:      (id)             => api.delete(`/comments/${id}/like`).then((r) => r.data),
  report:      (id, reason)     => api.post(`/comments/${id}/report`, { reason }).then((r) => r.data),
};

// â”€â”€ Notifications â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const notifsAPI = {
  list:       (params) => api.get("/notifications", { params }).then((r) => r.data),
  unreadCount: ()      => api.get("/notifications/unread-count").then((r) => r.data),
  readAll:    ()       => api.post("/notifications/read-all").then((r) => r.data),
  read:       (id)     => api.post(`/notifications/${id}/read`).then((r) => r.data),
};

