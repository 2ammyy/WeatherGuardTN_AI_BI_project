// frontend/src/forum/components/PostCard.jsx
import { useState } from "react";
import { postsAPI } from "../api/client";
import CommentsSection from "./CommentsSection";

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

export default function PostCard({ post: initial, onProfileClick, user }) {
  const [post,          setPost]          = useState(initial);
  const [showComments,  setShowComments]  = useState(false);
  const [reportReason,  setReportReason]  = useState("");
  const [showReport,    setShowReport]    = useState(false);
  const [toast,         setToast]         = useState(null);
  const [loading,       setLoading]       = useState(false);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

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
    } catch (e) { showToast(e.response?.data?.detail ?? "Error"); }
    finally { setLoading(false); }
  };

  const handleShare = async () => {
    try {
      await postsAPI.share(post.id);
      setPost((p) => ({ ...p, shares_count: p.shares_count + 1 }));
      await navigator.clipboard.writeText(window.location.origin + "/forum/posts/" + post.id);
      showToast("Link copied to clipboard!");
    } catch { showToast("Error sharing post"); }
  };

  const handleReport = async () => {
    try {
      await postsAPI.report(post.id, reportReason);
      setShowReport(false);
      showToast("Report submitted — our moderators will review it.");
    } catch { showToast("Error submitting report"); }
  };

  const risk  = RISK_STYLES[post.risk_level]  ?? RISK_STYLES.green;
  const cat   = CAT_STYLES[post.category]     ?? CAT_STYLES.other;
  const label = CAT_LABELS[post.category]     ?? "Other";

  return (
    <div style={{
      background: "var(--color-background-primary)",
      borderRadius: "var(--border-radius-lg)",
      border: "0.5px solid var(--color-border-tertiary)",
      overflow: "hidden",
      position: "relative",
    }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: "absolute", top: 10, right: 12, zIndex: 10,
          background: "#1D9E75", color: "white", padding: "6px 14px",
          borderRadius: 8, fontSize: 13,
        }}>{toast}</div>
      )}

      {/* Header */}
      <div style={{ padding: "1rem 1.25rem 0.75rem", display: "flex", gap: 10 }}>
        <Avatar name={post.author?.display_name ?? post.author?.username ?? "?"} />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span
              style={{ fontSize: 13, fontWeight: 500, cursor: "pointer", color: "var(--color-text-primary)" }}
              onClick={() => onProfileClick?.(post.author?.username)}
            >
              {post.author?.display_name ?? post.author?.username}
            </span>
            <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>
              {new Date(post.created_at).toLocaleDateString("fr-TN", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" })}
            </span>
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 5, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, fontWeight: 500, padding: "3px 8px", borderRadius: 10, background: cat.bg, color: cat.color }}>
              {label}
            </span>
            {post.governorate && (
              <span style={{ fontSize: 12, color: "var(--color-text-secondary)", background: "var(--color-background-secondary)", padding: "2px 7px", borderRadius: 10 }}>
                📍 {post.governorate}
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
        <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 6, lineHeight: 1.4, color: "var(--color-text-primary)" }}>
          {post.title}
        </div>
        <div style={{ fontSize: 14, color: "var(--color-text-secondary)", lineHeight: 1.65 }}>
          {post.body}
        </div>
        {post.image_url && (
          <img src={post.image_url} alt="" style={{ width: "100%", marginTop: 12, borderRadius: 8, maxHeight: 280, objectFit: "cover" }} />
        )}
      </div>

      {/* Actions */}
      <div style={{ borderTop: "0.5px solid var(--color-border-tertiary)", padding: "0.5rem 1rem", display: "flex", alignItems: "center", gap: 4 }}>
        <button onClick={handleLike} disabled={loading}
          style={{
            display: "flex", alignItems: "center", gap: 5, padding: "6px 10px",
            borderRadius: 8, border: "none", background: "transparent", cursor: "pointer",
            fontSize: 13, color: post.is_liked ? "#D85A30" : "var(--color-text-secondary)",
            fontFamily: "var(--font-sans)",
          }}>
          {post.is_liked ? "♥" : "♡"} {post.likes_count}
        </button>
        <button onClick={() => setShowComments((s) => !s)}
          style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 10px", borderRadius:8, border:"none", background:"transparent", cursor:"pointer", fontSize:13, color:"var(--color-text-secondary)", fontFamily:"var(--font-sans)" }}>
          💬 {post.comments_count}
        </button>
        <button onClick={handleShare}
          style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 10px", borderRadius:8, border:"none", background:"transparent", cursor:"pointer", fontSize:13, color:"var(--color-text-secondary)", fontFamily:"var(--font-sans)" }}>
          ↗ {post.shares_count}
        </button>
        <div style={{ flex: 1 }} />
        <button onClick={() => setShowReport((s) => !s)}
          style={{ padding:"5px 8px", border:"none", background:"transparent", cursor:"pointer", fontSize:12, color:"var(--color-text-tertiary)", fontFamily:"var(--font-sans)" }}>
          ⚑ Report
        </button>
      </div>

      {/* Report form */}
      {showReport && (
        <div style={{ padding:"0.75rem 1.25rem", borderTop:"0.5px solid var(--color-border-tertiary)", background:"var(--color-background-secondary)" }}>
          <div style={{ fontSize:13, fontWeight:500, marginBottom:6 }}>Why are you reporting this post?</div>
          <textarea
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            placeholder="Optional reason…"
            style={{ width:"100%", padding:"8px 10px", borderRadius:8, border:"0.5px solid var(--color-border-secondary)", fontSize:13, fontFamily:"var(--font-sans)", resize:"none", height:70, background:"var(--color-background-primary)", color:"var(--color-text-primary)" }}
          />
          <div style={{ display:"flex", gap:8, marginTop:8 }}>
            <button onClick={handleReport} style={{ padding:"6px 16px", borderRadius:8, background:"#E24B4A", color:"white", border:"none", cursor:"pointer", fontSize:13, fontFamily:"var(--font-sans)" }}>Submit report</button>
            <button onClick={() => setShowReport(false)} style={{ padding:"6px 12px", borderRadius:8, background:"transparent", border:"0.5px solid var(--color-border-secondary)", cursor:"pointer", fontSize:13, fontFamily:"var(--font-sans)", color:"var(--color-text-primary)" }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Comments */}
      {showComments && <CommentsSection postId={post.id} />}
    </div>
  );
}