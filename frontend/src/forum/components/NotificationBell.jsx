// frontend/src/forum/components/NotificationBell.jsx
import { useRef, useEffect } from "react";
import { useNotifications } from "../../hooks/useNotifications";

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

export default function NotificationBell() {
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
          position:"relative", padding:"7px 10px", borderRadius:8,
          border:"0.5px solid var(--color-border-secondary)",
          background:"transparent", cursor:"pointer", fontSize:16,
          lineHeight:1, fontFamily:"var(--font-sans)",
        }}
        title="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span style={{
            position:"absolute", top:-4, right:-4,
            background:"#E24B4A", color:"white",
            fontSize:10, fontWeight:600, borderRadius:10,
            padding:"1px 5px", lineHeight:"14px",
          }}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position:"absolute", right:0, top:"calc(100% + 8px)",
          background:"var(--color-background-primary)",
          border:"0.5px solid var(--color-border-secondary)",
          borderRadius:12, width:340, maxHeight:480,
          overflowY:"auto", zIndex:300, boxSizing:"border-box",
        }}>
          <div style={{ padding:"10px 14px", borderBottom:"0.5px solid var(--color-border-tertiary)", display:"flex", alignItems:"center" }}>
            <span style={{ flex:1, fontSize:14, fontWeight:500 }}>Notifications</span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} style={{ fontSize:12, color:"#1D9E75", background:"none", border:"none", cursor:"pointer", fontFamily:"var(--font-sans)" }}>
                Mark all read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div style={{ padding:"2rem", textAlign:"center", fontSize:13, color:"var(--color-text-tertiary)" }}>
              No notifications yet
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => !n.is_read && markOneRead(n.id)}
                style={{
                  display:"flex", gap:10, padding:"10px 14px", cursor:"pointer",
                  background: n.is_read ? "transparent" : "#E1F5EE",
                  borderBottom:"0.5px solid var(--color-border-tertiary)",
                  transition:"background 0.1s",
                }}
              >
                <span style={{ fontSize:15, flexShrink:0, marginTop:1 }}>
                  {TYPE_ICONS[n.type] ?? "•"}
                </span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, lineHeight:1.4, color:"var(--color-text-primary)" }}>
                    {n.message}
                  </div>
                  <div style={{ fontSize:11, color:"var(--color-text-tertiary)", marginTop:2 }}>
                    {new Date(n.created_at).toLocaleDateString("fr-TN", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" })}
                  </div>
                </div>
                {!n.is_read && (
                  <div style={{ width:7, height:7, borderRadius:"50%", background:"#1D9E75", flexShrink:0, marginTop:5 }} />
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}