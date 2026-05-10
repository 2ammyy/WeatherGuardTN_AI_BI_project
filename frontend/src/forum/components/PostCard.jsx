// frontend/src/forum/components/PostCard.jsx
import { useState, useEffect, useRef } from "react";
import { postsAPI } from "../api/client";
import CommentsSection from "./CommentsSection";
import { useTheme } from "../../contexts/ThemeContext";
import { useTranslation } from "../../contexts/LanguageContext";

const RISK_STYLES = {
  green:  { bg: "#E1F5EE", color: "#0F6E56", dot: "🟢" },
  yellow: { bg: "#FAEEDA", color: "#854F0B", dot: "🟡" },
  orange: { bg: "#FAEEDA", color: "#633806", dot: "🟠" },
  red:    { bg: "#FCEBEB", color: "#A32D2D", dot: "🔴" },
  purple: { bg: "#EEEDFE", color: "#3C3489", dot: "🟣" },
};

const CAT_LABELS = {
  school_closure: "School closure",
  community_aid:  "Community aid",
  infrastructure: "Infrastructure",
  weather_alert:  "Weather alert",
  other:          "Other",
};

const CAT_STYLES = {
  school_closure: { bg: "#FAECE7", color: "#993C1D" },
  community_aid:  { bg: "#E1F5EE", color: "#0F6E56" },
  infrastructure: { bg: "#E6F1FB", color: "#185FA5" },
  weather_alert:  { bg: "#FAEEDA", color: "#854F0B" },
  other:          { bg: "#F1EFE8", color: "#5F5E5A" },
};

function Avatar({ name = "?", size = 32 }) {
  const initials = name
    .split(" ")
    .map((w) => w[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
  const colors = ["#9FE1CB", "#B5D4F4", "#FAC775", "#F5C4B3", "#F4C0D1", "#CECBF6"];
  const bg = colors[name.charCodeAt(0) % colors.length];
  return (
    <div
      style={{
        width: size, height: size, borderRadius: "50%",
        background: bg, display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: size * 0.38,
        fontWeight: 500, flexShrink: 0, color: "#333",
      }}
    >
      {initials || "?"}
    </div>
  );
}

function SmallAvatar({ name = "?", size = 24 }) {
  const initials = name
    .split(" ")
    .map((w) => w[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
  const colors = ["#9FE1CB", "#B5D4F4", "#FAC775", "#F5C4B3", "#F4C0D1", "#CECBF6"];
  const bg = colors[name.charCodeAt(0) % colors.length];
  return (
    <div
      style={{
        width: size, height: size, borderRadius: "50%",
        background: bg, display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: size * 0.42,
        fontWeight: 600, flexShrink: 0, color: "#333",
      }}
      title={name}
    >
      {initials || "?"}
    </div>
  );
}

function InteractionPopover({ open, users, onClose, t }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  if (!open || !users.length) return null;

  return (
    <div ref={ref} style={{
      position: "absolute", bottom: "100%", left: 0, zIndex: 20,
      background: t.bgCard, border: `1px solid ${t.border}`,
      borderRadius: 12, padding: "10px 12px", minWidth: 200, maxWidth: 280,
      boxShadow: t.isDark ? "0 8px 32px rgba(0,0,0,0.5)" : "0 8px 32px rgba(0,0,0,0.12)",
    }}>
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: t.textMuted }}>
        {users.length} user{users.length !== 1 ? "s" : ""}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 200, overflowY: "auto" }}>
        {users.map((u) => (
          <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <SmallAvatar name={u.display_name ?? u.username} size={24} />
            <span style={{ fontSize: 13, color: t.text }}>{u.display_name ?? u.username}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PostCard({ post: initial, onProfileClick, user }) {
  const { t } = useTheme();
  const { t: __, tGovernorate } = useTranslation();
  const [post,          setPost]          = useState(initial);
  const [showComments,  setShowComments]  = useState(false);
  const [reportReason,  setReportReason]  = useState("");
  const [showReport,    setShowReport]    = useState(false);
  const [toast,         setToast]         = useState(null);
  const [loading,       setLoading]       = useState(false);
  const [interaction,   setInteraction]   = useState({ type: null, users: [], open: false });

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const fetchInteractions = async (type) => {
    // Use embedded data if available, otherwise fetch from API
    if (type === "likes" && post.liked_by?.length) {
      setInteraction({ type, users: post.liked_by, open: true });
      return;
    }
    if (type === "shares" && post.shared_by?.length) {
      setInteraction({ type, users: post.shared_by, open: true });
      return;
    }
    try {
      let users;
      if (type === "likes") users = await postsAPI.likers(post.id);
      else if (type === "shares") users = await postsAPI.sharers(post.id);
      else if (type === "comments") users = await postsAPI.commenters(post.id);
      else return;
      setInteraction({ type, users, open: true });
    } catch {
      setInteraction({ type, users: [], open: true });
    }
  };

  const closeInteraction = () => setInteraction({ type: null, users: [], open: false });

  const handleLike = async () => {
    setLoading(true);
    try {
      if (post.is_liked) {
        await postsAPI.unlike(post.id);
        setPost((p) => ({ ...p, is_liked: false, likes_count: p.likes_count - 1 }));
      } else {
        await postsAPI.like(post.id);
        setPost((p) => ({ ...p, is_liked: true, likes_count: p.likes_count + 1 }));
      }
      // Refresh post to get updated liked_by list
      const updated = await postsAPI.get(post.id);
      setPost(updated);
    } catch (e) { showToast(e.response?.data?.detail ?? "Error"); }
    finally { setLoading(false); }
  };

  const handleShare = async () => {
    try {
      await postsAPI.share(post.id);
      showToast(__('postShared'));
      const updated = await postsAPI.get(post.id);
      setPost(updated);
    } catch { showToast(__('shareError')); }
  };

  const handleReport = async () => {
    try {
      await postsAPI.report(post.id, reportReason);
      setShowReport(false);
      showToast(__('reportSubmitted'));
    } catch { showToast(__('reportError')); }
  };

  const risk  = RISK_STYLES[post.risk_level]  ?? RISK_STYLES.green;
  const cat   = CAT_STYLES[post.category]     ?? CAT_STYLES.other;
  const label = __(post.category === "school_closure" ? "schoolClosureSingle" : post.category === "community_aid" ? "communityAidSingle" : post.category === "infrastructure" ? "infrastructureSingle" : post.category === "weather_alert" ? "weatherAlertSingle" : "other");

  return (
    <div style={{
      background: t.bgCard,
      borderRadius: 16,
      border: `1px solid ${t.border}`,
      overflow: "visible",
      position: "relative",
    }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: "absolute", top: 10, right: 12, zIndex: 10,
          background: t.accent, color: "white", padding: "6px 14px",
          borderRadius: 8, fontSize: 13,
        }}>{toast}</div>
      )}

      {/* Header */}
      <div style={{ padding: "1rem 1.25rem 0.75rem", display: "flex", gap: 10 }}>
        <Avatar name={post.author?.display_name ?? post.author?.username ?? "?"} />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span
              style={{ fontSize: 13, fontWeight: 500, cursor: "pointer", color: t.text }}
              onClick={() => onProfileClick?.(post.author?.username)}
            >
              {post.author?.display_name ?? post.author?.username}
            </span>
            <span style={{ fontSize: 12, color: t.textMuted }}>
              {new Date(post.created_at).toLocaleDateString("fr-TN", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" })}
            </span>
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 5, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, fontWeight: 500, padding: "3px 8px", borderRadius: 10, background: cat.bg, color: cat.color }}>
              {label}
            </span>
            {post.governorate && (
              <span style={{ fontSize: 12, color: t.textSecondary, background: t.bgMuted, padding: "2px 7px", borderRadius: 10 }}>
                📍 {tGovernorate(post.governorate)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "0 1.25rem 1rem" }}>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          fontSize: 12, fontWeight: 500, padding: "3px 9px", borderRadius: 10,
          background: risk.bg, color: risk.color, marginBottom: 8,
        }}>
          {risk.dot} {post.risk_level.charAt(0).toUpperCase() + post.risk_level.slice(1)} risk
        </span>
        <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 6, lineHeight: 1.4, color: t.text }}>
          {post.title}
        </div>
        <div style={{ fontSize: 14, color: t.textSecondary, lineHeight: 1.65 }}>
          {post.body}
        </div>

        {/* Media gallery */}
        {(() => {
          const items = post.media_items && post.media_items.length > 0
            ? post.media_items
            : post.image_url
              ? [{ file_url: post.image_url, file_type: "image" }]
              : post.media_urls
                ? post.media_urls.map((u) => ({ file_url: u, file_type: u.match(/\.(mp4|webm|mov)$/i) ? "video" : "image" }))
                : [];

          if (items.length === 0) return null;

          return (
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              {items.map((item, i) => {
                const url = item.file_url;
                if (!url) return null;
                const isVideo = item.file_type === "video" || url.match(/\.(mp4|webm|mov)(\?|$)/i);
                const fullUrl = url.startsWith("/") ? `${process.env.REACT_APP_API_URL || 'http://localhost:8001'}${url}` : url;
                if (isVideo) {
                  return (
                    <video
                      key={i}
                      src={fullUrl}
                      controls
                      preload="metadata"
                      style={{ width: "100%", borderRadius: 8, maxHeight: 360, objectFit: "cover", background: t.bg }}
                    />
                  );
                }
                return (
                  <img
                    key={i}
                    src={fullUrl}
                    alt=""
                    style={{ width: "100%", borderRadius: 8, maxHeight: 360, objectFit: "cover" }}
                    loading="lazy"
                  />
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* Actions */}
      <div style={{ borderTop: `1px solid ${t.border}`, padding: "0.5rem 1rem", display: "flex", alignItems: "center", gap: 4, position: "relative" }}>
        <div style={{ position: "relative" }}>
          <InteractionPopover open={interaction.open && interaction.type === "likes"} users={interaction.users} onClose={closeInteraction} t={t} />
          <button onClick={handleLike}
            disabled={loading}
            style={{
              display: "flex", alignItems: "center", gap: 5, padding: "6px 10px",
              borderRadius: 8, border: "none", background: "transparent", cursor: loading ? "wait" : "pointer",
              fontSize: 13, color: post.is_liked ? t.danger : t.textSecondary,
              opacity: loading ? 0.6 : 1,
            }}>
            {post.is_liked ? "♥" : "♡"} {post.likes_count}
          </button>
          <span onClick={() => fetchInteractions("likes")}
            title={__('viewLikers')}
            style={{ cursor: "pointer", fontSize: 11, color: t.textMuted, marginLeft: -5, opacity: 0.7 }}>
            ({post.liked_by?.length || post.likes_count})
          </span>
        </div>
        <div style={{ position: "relative" }}>
          <InteractionPopover open={interaction.open && interaction.type === "comments"} users={interaction.users} onClose={closeInteraction} t={t} />
          <button onClick={() => { fetchInteractions("comments"); setShowComments((s) => !s); }}
            style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 10px", borderRadius:8, border:"none", background:"transparent", cursor:"pointer", fontSize:13, color: t.textSecondary }}>
            💬 {post.comments_count}
          </button>
        </div>
        <div style={{ position: "relative" }}>
          <InteractionPopover open={interaction.open && interaction.type === "shares"} users={interaction.users} onClose={closeInteraction} t={t} />
          <button onClick={handleShare}
            style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 10px", borderRadius:8, border:"none", background:"transparent", cursor:"pointer", fontSize:13, color: t.textSecondary }}>
            ↗ {post.shares_count}
          </button>
          <span onClick={() => fetchInteractions("shares")}
            title={__('viewSharers')}
            style={{ cursor: "pointer", fontSize: 11, color: t.textMuted, marginLeft: -5, opacity: 0.7 }}>
            ({post.shared_by?.length || post.shares_count})
          </span>
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={() => setShowReport((s) => !s)}
          style={{ padding:"5px 8px", border:"none", background:"transparent", cursor:"pointer", fontSize:12, color: t.textMuted }}>
          {__('report')}
        </button>
      </div>

      {/* Report form */}
      {showReport && (
        <div style={{ padding:"0.75rem 1.25rem", borderTop:`1px solid ${t.border}`, background: t.bgMuted }}>
          <div style={{ fontSize:13, fontWeight:500, marginBottom:6, color: t.text }}>{__('reportReasonTitle')}</div>
          <textarea
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            placeholder={__('optionalReason')}
            style={{ width:"100%", padding:"8px 10px", borderRadius:8, border:`1px solid ${t.border}`, fontSize:13, resize:"none", height:70, background: t.bgInput, color: t.text }}
          />
          <div style={{ display:"flex", gap:8, marginTop:8 }}>
            <button onClick={handleReport} style={{ padding:"6px 16px", borderRadius:8, background: t.danger, color:"white", border:"none", cursor:"pointer", fontSize:13 }}>{__('submitReport')}</button>
            <button onClick={() => setShowReport(false)} style={{ padding:"6px 12px", borderRadius:8, background:"transparent", border:`1px solid ${t.border}`, cursor:"pointer", fontSize:13, color: t.text }}>{__('cancel')}</button>
          </div>
        </div>
      )}

      {/* Comments */}
      {showComments && <CommentsSection postId={post.id} />}
    </div>
  );
}