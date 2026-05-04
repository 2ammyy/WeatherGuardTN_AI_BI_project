// frontend/src/hooks/useNotifications.js
// Polls /api/forum/notifications every 30 seconds.

import { useState, useEffect, useCallback, useRef } from "react";
import { notifsAPI } from "../forum/api/client";

const POLL_INTERVAL = 30_000; // 30s

export function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const intervalRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await notifsAPI.list({ limit: 30 });
      setNotifications(data || []);
      const countResp = await notifsAPI.unreadCount();
      setUnreadCount(countResp.count || 0);
    } catch (_) {
      // silently ignore network errors during polling
    }
  }, []);

  // Start polling
  useEffect(() => {
    setLoading(true);
    fetchNotifications().finally(() => setLoading(false));

    intervalRef.current = setInterval(fetchNotifications, POLL_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, [fetchNotifications]);

  const openPanel = useCallback(() => {
    setOpen(true);
    fetchNotifications();
  }, [fetchNotifications]);

  const markRead = useCallback(async (notifId) => {
    try {
      await notifsAPI.read(notifId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notifId ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (_) {
      // ignore
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await notifsAPI.readAll();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (_) {
      // ignore
    }
  }, []);

  return { notifications, unreadCount, loading, open, setOpen, openPanel, markRead, markAllRead, refresh: fetchNotifications };
}
