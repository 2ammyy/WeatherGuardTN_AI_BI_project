// frontend/src/forum/pages/ForumPage.jsx
import { useState, useEffect, useCallback } from "react";
import { postsAPI } from "../api/client";
import PostCard from "../components/PostCard";
import ComposeModal from "../components/ComposeModal";
import NotificationBell from "../components/NotificationBell";
import { useTheme } from "../../contexts/ThemeContext";

const CATEGORIES = [
  { value: "", label: "All posts", icon: "📰" },
  { value: "school_closure", label: "School closures", icon: "🏫" },
  { value: "community_aid", label: "Community aid", icon: "🤝" },
  { value: "infrastructure", label: "Infrastructure", icon: "🏗" },
  { value: "weather_alert", label: "Weather alerts", icon: "⚠️" },
];

const GOVERNORATES = [
  "", "Tunis", "Ariana", "Ben Arous", "Nabeul", "Sfax", "Sousse",
  "Bizerte", "Jendouba", "Monastir", "Mahdia", "Kairouan", "Gafsa",
];

// ── Forum content (user already authenticated by platform) ───────────────────────────────
function ForumInner({ onBack, existingUser }) {
  const { t } = useTheme();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [category, setCategory] = useState("");
  const [governorate, setGovernorate] = useState("");
  const [compose, setCompose] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const user = existingUser;

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, size: 10 };
      if (category) params.category = category;
      if (governorate) params.governorate = governorate;
      const data = await postsAPI.list(params);
      setPosts(data.items);
      setTotalPages(data.pages);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [page, category, governorate]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleCompose = () => {
    setCompose(true);
  };

  const handlePublished = (newPost) => {
    setPosts((p) => [newPost, ...p]);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const sel = {
    background: t.bgInput,
    border: `1px solid ${t.border}`,
    color: t.text,
    padding: "10px 14px",
    borderRadius: 12,
    fontSize: 13,
    fontFamily: "sans-serif",
    cursor: "pointer",
    transition: "all 0.2s",
  };

  return (
    <div style={{ minHeight: "100vh", background: t.bg, color: t.text, fontFamily: "sans-serif" }}>
      {/* CSS Animations */}
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes shimmer {
            0% { background-position: -1000px 0; }
            100% { background-position: 1000px 0; }
          }
          .shimmer {
            background: linear-gradient(90deg, ${t.bgMuted} 25%, ${t.border} 50%, ${t.bgMuted} 75%);
            background-size: 1000px 100%;
            animation: shimmer 2s infinite;
          }
        `}
      </style>

      {/* Top bar */}
      <div style={{ background: t.navbarBg, backdropFilter: "blur(12px)", borderBottom: `1px solid ${t.border}`, padding: "0 1.5rem", display: "flex", alignItems: "center", gap: 12, height: 64, position: "sticky", top: 0, zIndex: 100 }}>
        <button
          onClick={onBack}
          style={{ background: "transparent", border: `1px solid ${t.border}`, color: t.textMuted, cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "8px 12px", borderRadius: 10, transition: "all 0.2s" }}
          onMouseEnter={(e) => { e.target.style.background = t.bgHover; e.target.style.color = t.text; }}
          onMouseLeave={(e) => { e.target.style.background = "transparent"; e.target.style.color = t.textMuted; }}
          title="Back to dashboard"
        >
          ←
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ background: `linear-gradient(135deg, ${t.accent}, ${t.isDark ? '#0f6e56' : '#15803d'})`, width: 34, height: 34, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🌦</div>
          <div>
            <span style={{ fontWeight: 700, fontSize: 16, color: t.text }}>WeatherGuard Forum</span>
            <span style={{ fontSize: 11, color: t.textMuted, marginLeft: 8 }}>Community Hub</span>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <NotificationBell />
        <button
          onClick={handleCompose}
          style={{ padding: "8px 18px", background: `linear-gradient(135deg, ${t.accent}, ${t.isDark ? '#0f6e56' : '#15803d'})`, border: "none", borderRadius: 12, color: "white", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "sans-serif", transition: "all 0.2s", display: "flex", alignItems: "center", gap: 6 }}
          onMouseEnter={(e) => e.target.style.transform = "translateY(-1px)"}
          onMouseLeave={(e) => e.target.style.transform = "translateY(0)"}
        >
          <span>✏️</span> New post
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: 4 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg, ${t.accent}40, ${t.accent}20)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 600, color: t.accent }}>
            {(user?.display_name ?? user?.username ?? user?.name ?? "?")[0].toUpperCase()}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "2rem 1rem" }}>
        {/* Hero Section */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h1 style={{ fontSize: 32, fontWeight: 700, background: `linear-gradient(135deg, ${t.text}, ${t.accent})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 8 }}>Community Forum</h1>
          <p style={{ color: t.textMuted, fontSize: 14 }}>Share updates, ask questions, and help your neighbors stay informed</p>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 12, marginBottom: "1.5rem", flexWrap: "wrap", background: t.bgCard, padding: "1rem", borderRadius: 16, border: `1px solid ${t.border}` }}>
          <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} style={{ ...sel, flex: 1 }}>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
            ))}
          </select>
          <select value={governorate} onChange={(e) => { setGovernorate(e.target.value); setPage(1); }} style={{ ...sel, flex: 1 }}>
            <option value="">📍 All governorates</option>
            {GOVERNORATES.filter(Boolean).map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
          <button
            onClick={fetchPosts}
            style={{ ...sel, background: t.bgMuted, border: `1px solid ${t.accent}`, display: "flex", alignItems: "center", gap: 6 }}
            onMouseEnter={(e) => e.target.style.background = t.accentBg}
            onMouseLeave={(e) => e.target.style.background = t.bgMuted}
          >
            🔄 Refresh
          </button>
        </div>

        {/* Stats Bar */}
        {!loading && posts.length > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", padding: "0 0.5rem" }}>
            <span style={{ fontSize: 12, color: t.textMuted }}>📄 {posts.length} posts • Page {page} of {totalPages}</span>
            <span style={{ fontSize: 12, color: t.textMuted }}>💬 Join the conversation</span>
          </div>
        )}

        {/* Feed */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="shimmer" style={{ height: 140, borderRadius: 16 }} />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem 2rem", background: t.bgCard, borderRadius: 24, border: `1px solid ${t.border}` }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🌱</div>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: t.text }}>No posts yet</h3>
            <p style={{ color: t.textMuted, fontSize: 14, marginBottom: 20 }}>Be the first to share an update with your community!</p>
            <button
              onClick={handleCompose}
              style={{ padding: "8px 20px", background: `linear-gradient(135deg, ${t.accent}, ${t.isDark ? '#0f6e56' : '#15803d'})`, border: "none", borderRadius: 12, color: "white", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
            >
              Create first post →
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {posts.map((p) => (
              <PostCard key={p.id} post={p} user={user} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: "2rem" }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{ ...sel, opacity: page === 1 ? 0.4 : 1, display: "flex", alignItems: "center", gap: 6 }}
            >
              ← Prev
            </button>
            <div style={{ display: "flex", gap: 6 }}>
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                let pageNum;
                if (totalPages <= 5) pageNum = i + 1;
                else if (page <= 3) pageNum = i + 1;
                else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                else pageNum = page - 2 + i;
                if (pageNum > 0 && pageNum <= totalPages) {
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      style={{
                        ...sel,
                        background: pageNum === page ? `linear-gradient(135deg, ${t.accent}, ${t.isDark ? '#0f6e56' : '#15803d'})` : t.bgMuted,
                        minWidth: 40,
                      }}
                    >
                      {pageNum}
                    </button>
                  );
                }
                return null;
              })}
            </div>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={{ ...sel, opacity: page === totalPages ? 0.4 : 1, display: "flex", alignItems: "center", gap: 6 }}
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          style={{
            position: "fixed",
            bottom: "2rem",
            right: "2rem",
            background: `linear-gradient(135deg, ${t.accent}, ${t.isDark ? '#0f6e56' : '#15803d'})`,
            border: "none",
            borderRadius: 40,
            padding: "12px 16px",
            color: "white",
            cursor: "pointer",
            fontSize: 18,
            boxShadow: t.shadowCard,
            transition: "all 0.2s",
            zIndex: 99,
          }}
          onMouseEnter={(e) => e.target.style.transform = "translateY(-2px)"}
          onMouseLeave={(e) => e.target.style.transform = "translateY(0)"}
        >
          ↑
        </button>
      )}

      {compose && <ComposeModal onClose={() => setCompose(false)} onPublished={handlePublished} />}
    </div>
  );
}

// ── Export: forum page (user already authenticated by platform) ──────────────────────────────
export default function ForumPage({ onBack, existingUser }) {
  return <ForumInner onBack={onBack} existingUser={existingUser} />;
}