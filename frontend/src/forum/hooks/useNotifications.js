// frontend/src/forum/hooks/useNotifications.js
// Polls unread count every 30 s and fetches full list on demand

import { useState, useEffect, useCallback } from "react";
import { notifsAPI } from "../api/client";
import { useAuth } from "./useAuth";

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [open,          setOpen]          = useState(false);

  const fetchCount = useCallback(async () => {
    if (!user) return;
    try {
      const { count } = await notifsAPI.unreadCount();
      setUnreadCount(count);
    } catch { /* silently ignore */ }
  }, [user]);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    try {
      const list = await notifsAPI.list({ limit: 30 });
      setNotifications(list);
    } catch { /* silently ignore */ }
  }, [user]);

  // Poll every 30 s
  useEffect(() => {
    fetchCount();
    const id = setInterval(fetchCount, 30_000);
    return () => clearInterval(id);
  }, [fetchCount]);

  const openPanel = () => {
    setOpen(true);
    fetchAll();
  };

  const markAllRead = async () => {
    await notifsAPI.readAll();
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const markOneRead = async (id) => {
    await notifsAPI.read(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  return { notifications, unreadCount, open, setOpen, openPanel, markAllRead, markOneRead };
}