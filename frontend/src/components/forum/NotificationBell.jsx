// frontend/src/components/forum/NotificationBell.jsx
// Bell icon with unread badge + dropdown list of notifications.
// Polls every 30s via useNotifications hook.

import { useState, useRef, useEffect } from "react";
import { useNotifications } from "../../hooks/useNotifications";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../contexts/ThemeContext";

const TYPE_ICON = {
  news_recommendation: "📰",
  comment_reply:       "💬",
  post_like:           "👍",
  default:             "🔔",
};

const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
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
  const { t } = useTheme();
  const [open, setOpen] = useState(false);
  const ref             = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!isLoggedIn) return null;

  const handleOpen = () => setOpen((v) => !v);

  const handleClick = (notif) => {
    if (!notif.is_read) markRead(notif.id);
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
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:16 }}>🔔</span>
              <span className="notif-title">Notifications</span>
              {unreadCount > 0 && (
                <span style={{ fontSize:11, fontWeight:700, color: t.accent, background: t.accentBg, padding:"2px 8px", borderRadius:10 }}>
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button className="notif-mark-all" onClick={markAllRead}>
                Mark all read
              </button>
            )}
          </div>

          <div className="notif-list">
            {notifications.length === 0 && (
              <div className="notif-empty">
                <div style={{ fontSize:36, marginBottom:8, opacity:0.5 }}>🔕</div>
                No notifications yet
              </div>
            )}
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`notif-item ${n.is_read ? "read" : "unread"}`}
                onClick={() => handleClick(n)}
              >
                <div className="notif-icon-wrap">
                  <span className="notif-icon">{TYPE_ICON[n.type] || TYPE_ICON.default}</span>
                </div>
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
          background: none; border: 1px solid ${t.border}; cursor: pointer;
          font-size: 20px; position: relative; padding: 6px 10px; border-radius: 10px;
          transition: all 0.2s;
        }
        .notif-bell-btn:hover { background: ${t.bgHover}; border-color: ${t.accentBorder}; }
        .notif-badge {
          position: absolute; top: -2px; right: -4px;
          background: linear-gradient(135deg, #ef4444, #dc2626); color: #fff; border-radius: 10px;
          font-size: 10px; font-weight: 700; padding: 1px 5px;
          min-width: 18px; text-align: center;
          box-shadow: 0 2px 6px rgba(239,68,68,0.4);
        }
        .notif-dropdown {
          position: absolute; right: 0; top: 110%;
          width: 360px; max-height: 500px;
          background: ${t.bgCard}; border: 1px solid ${t.border};
          border-radius: 16px; box-shadow: ${t.shadowModal};
          z-index: 1000; overflow: hidden; display: flex; flex-direction: column;
          animation: slideUp 0.2s ease-out;
        }
        @keyframes slideUp { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        .notif-header {
          display: flex; justify-content: space-between; align-items: center;
          padding: 14px 16px; border-bottom: 1px solid ${t.border};
          background: ${t.bgMuted};
        }
        .notif-title { font-weight: 700; font-size: 15px; color: ${t.text}; }
        .notif-mark-all { background: none; border: none; cursor: pointer; color: ${t.accent}; font-size: 12px; font-weight: 600; }
        .notif-list { overflow-y: auto; flex: 1; padding: 4px 0; }
        .notif-empty { padding: 3rem 1.5rem; text-align: center; color: ${t.textMuted}; font-size: 14px; }
        .notif-item {
          display: flex; align-items: flex-start; gap: 12px;
          padding: 12px 16px; cursor: pointer; transition: background 0.15s;
          border-bottom: 0.5px solid ${t.border};
        }
        .notif-item:hover { background: ${t.bgHover}; }
        .notif-item.unread { background: ${t.accentBg}; }
        .notif-item.unread:hover { background: ${t.accent}20; }
        .notif-icon-wrap {
          width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
          background: ${t.bgMuted}; display: flex; align-items: center; justify-content: center;
          border: 1px solid ${t.border};
        }
        .notif-item.unread .notif-icon-wrap { background: ${t.accentBg}; border-color: ${t.accentBorder}; }
        .notif-icon { font-size: 16px; }
        .notif-content { flex: 1; min-width: 0; }
        .notif-message { margin: 0 0 3px; font-size: 13px; color: ${t.text}; line-height: 1.4; }
        .notif-time { font-size: 11px; color: ${t.textMuted}; }
        .notif-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: ${t.accent}; flex-shrink: 0; margin-top: 6px;
          box-shadow: 0 0 6px ${t.accent}60;
        }
      `}</style>
    </div>
  );
}