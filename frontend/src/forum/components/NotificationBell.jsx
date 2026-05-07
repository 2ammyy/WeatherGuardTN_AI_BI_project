// frontend/src/forum/components/NotificationBell.jsx
import { useRef, useEffect } from "react";
import { useNotifications } from "../../hooks/useNotifications";
import { useTheme } from "../../contexts/ThemeContext";

const TYPE_ICONS = {
  post_like:            "♥",
  post_comment:         "💬",
  post_share:           "↗",
  post_approved:        "✓",
  post_rejected:        "✗",
  comment_like:         "♥",
  new_follower:         "👤",
  user_report_resolved: "⚑",
  post_report_resolved: "⚑",
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
  const { t } = useTheme();
  const { notifications, unreadCount, open, setOpen, openPanel, markAllRead, markOneRead } = useNotifications();
  const ref = useRef();

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [setOpen]);

  return (
    <div ref={ref} style={{ position:"relative" }}>
      <button
        onClick={open ? () => setOpen(false) : openPanel}
        style={{
          position:"relative", padding:"8px 10px", borderRadius:10,
          border:`1px solid ${t.border}`,
          background:"transparent", cursor:"pointer", fontSize:16,
          lineHeight:1, transition:"all 0.2s",
        }}
        title="Notifications"
        onMouseEnter={(e) => { e.target.style.background = t.bgHover; e.target.style.borderColor = t.accentBorder; }}
        onMouseLeave={(e) => { e.target.style.background = "transparent"; e.target.style.borderColor = t.border; }}
      >
        🔔
        {unreadCount > 0 && (
          <span style={{
            position:"absolute", top:-4, right:-4,
            background:"linear-gradient(135deg, #ef4444, #dc2626)", color:"white",
            fontSize:10, fontWeight:700, borderRadius:10,
            padding:"1px 5px", lineHeight:"14px",
            boxShadow: "0 2px 6px rgba(239,68,68,0.4)",
            animation: unreadCount > 5 ? "pulse 2s ease-in-out infinite" : "none",
          }}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position:"absolute", right:0, top:"calc(100% + 8px)",
          background: t.bgCard,
          border:`1px solid ${t.border}`,
          borderRadius:16, width:360, maxHeight:500,
          overflowY:"auto", zIndex:300, boxSizing:"border-box",
          boxShadow: t.shadowModal,
          animation: "slideUp 0.2s ease-out",
        }}>
          <style>{`
            @keyframes slideUp { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
            .notif-item-hover:hover { background: ${t.bgHover}; }
            .notif-item-hover { transition: background 0.15s; }
          `}</style>

          {/* Header */}
          <div style={{ padding:"14px 16px", borderBottom:`1px solid ${t.border}`, display:"flex", alignItems:"center", background: t.bgMuted }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, flex:1 }}>
              <span style={{ fontSize:16 }}>🔔</span>
              <span style={{ fontSize:14, fontWeight:700, color: t.text }}>Notifications</span>
              {unreadCount > 0 && (
                <span style={{ fontSize:11, fontWeight:700, color: t.accent, background: t.accentBg, padding:"2px 8px", borderRadius:10 }}>
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button onClick={markAllRead} style={{ fontSize:12, color: t.accent, background: t.accentBg, border:"none", cursor:"pointer", padding:"4px 10px", borderRadius:8, fontWeight:600, transition:"all 0.2s" }}
                onMouseEnter={(e) => e.target.style.opacity = "0.8"}
                onMouseLeave={(e) => e.target.style.opacity = "1"}
              >
                Mark all read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div style={{ padding:"3rem 1.5rem", textAlign:"center" }}>
              <div style={{ fontSize:40, marginBottom:12, opacity:0.5 }}>🔕</div>
              <div style={{ fontSize:14, fontWeight:600, color: t.textSecondary, marginBottom:4 }}>No notifications</div>
              <div style={{ fontSize:12, color: t.textMuted }}>We'll notify you when something happens</div>
            </div>
          ) : (
            <div style={{ padding:"4px 0" }}>
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className="notif-item-hover"
                  onClick={() => { if (!n.is_read) markOneRead(n.id); }}
                  style={{
                    display:"flex", gap:12, padding:"12px 16px", cursor:"pointer",
                    background: n.is_read ? "transparent" : t.accentBg,
                    borderBottom:`0.5px solid ${t.border}`,
                  }}
                >
                  <div style={{
                    width:36, height:36, borderRadius:10, flexShrink:0,
                    background: n.is_read ? t.bgMuted : t.accentBg,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:16,
                    border: `1px solid ${n.is_read ? t.border : t.accentBorder}`,
                  }}>
                    {TYPE_ICONS[n.type] ?? "•"}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, lineHeight:1.4, color: t.text, fontWeight: n.is_read ? 400 : 600 }}>
                      {n.message}
                    </div>
                    <div style={{ fontSize:11, color: t.textMuted, marginTop:3 }}>
                      {timeAgo(n.created_at)}
                    </div>
                  </div>
                  {!n.is_read && (
                    <div style={{ width:8, height:8, borderRadius:"50%", background: t.accent, flexShrink:0, marginTop:6, boxShadow: `0 0 6px ${t.accent}60` }} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}