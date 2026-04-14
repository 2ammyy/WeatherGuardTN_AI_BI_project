// frontend/src/components/forum/NotificationBell.jsx
// Bell icon with unread badge + dropdown list of notifications.
// Polls every 30s via useNotifications hook.

import { useState, useRef, useEffect } from "react";
import { useNotifications } from "../../hooks/useNotifications";
import { useAuth } from "../../hooks/useAuth";

const TYPE_ICON = {
  news_recommendation: "📰",
  comment_reply:       "💬",
  post_like:           "👍",
  default:             "🔔",
};

const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr);
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

export default function NotificationBell() {
  const { isLoggedIn } = useAuth();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref             = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!isLoggedIn) return null;

  const handleOpen = () => setOpen((v) => !v);

  const handleClick = (notif) => {
    if (!notif.is_read) markRead(notif.id);
    // Navigate to article if available
    if (notif.article_id) {
      window.location.href = `/forum?article=${notif.article_id}`;
    }
  };

  return (
    <div className="notif-bell-wrap" ref={ref}>
      <button className="notif-bell-btn" onClick={handleOpen} aria-label="Notifications">
        🔔
        {unreadCount > 0 && (
          <span className="notif-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="notif-dropdown">
          <div className="notif-header">
            <span className="notif-title">Notifications</span>
            {unreadCount > 0 && (
              <button className="notif-mark-all" onClick={markAllRead}>
                Mark all read
              </button>
            )}
          </div>

          <div className="notif-list">
            {notifications.length === 0 && (
              <div className="notif-empty">No notifications yet</div>
            )}
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`notif-item ${n.is_read ? "read" : "unread"}`}
                onClick={() => handleClick(n)}
              >
                <span className="notif-icon">{TYPE_ICON[n.type] || TYPE_ICON.default}</span>
                <div className="notif-content">
                  <p className="notif-message">{n.message}</p>
                  <span className="notif-time">{timeAgo(n.created_at)}</span>
                </div>
                {!n.is_read && <span className="notif-dot" />}
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .notif-bell-wrap { position: relative; display: inline-block; }
        .notif-bell-btn {
          background: none; border: none; cursor: pointer;
          font-size: 22px; position: relative; padding: 4px;
        }
        .notif-badge {
          position: absolute; top: -2px; right: -4px;
          background: #d32f2f; color: #fff; border-radius: 10px;
          font-size: 10px; font-weight: 700; padding: 1px 5px;
          min-width: 18px; text-align: center;
        }
        .notif-dropdown {
          position: absolute; right: 0; top: 110%;
          width: 340px; max-height: 480px;
          background: #fff; border: 1px solid #e0e0e0;
          border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.12);
          z-index: 1000; overflow: hidden; display: flex; flex-direction: column;
        }
        .notif-header {
          display: flex; justify-content: space-between; align-items: center;
          padding: 12px 16px; border-bottom: 1px solid #f0f0f0;
        }
        .notif-title { font-weight: 700; font-size: 15px; }
        .notif-mark-all { background: none; border: none; cursor: pointer; color: #1976d2; font-size: 12px; }
        .notif-list { overflow-y: auto; flex: 1; }
        .notif-empty { padding: 24px; text-align: center; color: #bbb; font-size: 14px; }
        .notif-item {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 12px 16px; cursor: pointer; transition: background 0.15s;
          border-bottom: 1px solid #fafafa;
        }
        .notif-item:hover { background: #f5f5f5; }
        .notif-item.unread { background: #e8f4fd; }
        .notif-item.unread:hover { background: #d6eaf8; }
        .notif-icon { font-size: 20px; flex-shrink: 0; }
        .notif-content { flex: 1; min-width: 0; }
        .notif-message { margin: 0 0 3px; font-size: 13px; color: #333; line-height: 1.4; }
        .notif-time { font-size: 11px; color: #aaa; }
        .notif-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: #1976d2; flex-shrink: 0; margin-top: 5px;
        }
      `}</style>
    </div>
  );
}