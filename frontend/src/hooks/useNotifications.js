// frontend/src/hooks/useNotifications.js
// Polls /api/forum/notifications/mine every 30 seconds.
// Only active when user is logged in.

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "./useAuth";

const POLL_INTERVAL = 30_000; // 30s

export function useNotifications() {
  const { isLoggedIn, authFetch } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [loading, setLoading]             = useState(false);
  const intervalRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      const res  = await authFetch("/api/forum/notifications/mine");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.items || []);
      setUnreadCount(data.unread_count || 0);
    } catch (_) {
      // silently ignore network errors during polling
    }
  }, [isLoggedIn, authFetch]);

  // Start polling when logged in
  useEffect(() => {
    if (!isLoggedIn) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    setLoading(true);
    fetchNotifications().finally(() => setLoading(false));

    intervalRef.current = setInterval(fetchNotifications, POLL_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, [isLoggedIn, fetchNotifications]);

  const markRead = useCallback(async (notifId) => {
    await authFetch(`/api/forum/notifications/${notifId}/read`, { method: "POST" });
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, is_read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }, [authFetch]);

  const markAllRead = useCallback(async () => {
    await authFetch("/api/forum/notifications/read-all", { method: "POST" });
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }, [authFetch]);

  return { notifications, unreadCount, loading, markRead, markAllRead, refresh: fetchNotifications };
}