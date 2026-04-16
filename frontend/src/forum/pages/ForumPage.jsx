// frontend/src/forum/pages/ForumPage.jsx
import { useState, useEffect, useCallback } from "react";
import { postsAPI } from "../api/client";
import { AuthProvider, useAuth } from "../../hooks/useAuth";
import PostCard from "../components/PostCard";
import ComposeModal from "../components/ComposeModal";
import NotificationBell from "../components/NotificationBell";

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

// ── Auth modal ────────────────────────────────────────────────────────────────
function AuthModal({ onClose }) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ username: "", email: "", password: "", display_name: "", governorate: "" });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      if (mode === "login") await login(form.email, form.password);
      else await register(form);
      onClose();
    } catch (e) {
      setError(e.response?.data?.detail ?? "Authentication error");
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    overlay: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.8)",
      backdropFilter: "blur(4px)",
      zIndex: 500,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      animation: "fadeIn 0.2s ease-out",
    },
    modal: {
      background: "linear-gradient(135deg, #0f172a 0%, #0a0f1c 100%)",
      border: "1px solid rgba(29, 158, 117, 0.2)",
      borderRadius: 24,
      width: 400,
      padding: "2rem",
      boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
      animation: "slideUp 0.3s ease-out",
    },
    input: {
      width: "100%",
      padding: "12px 14px",
      borderRadius: 12,
      border: "1px solid #334155",
      background: "#1e293b",
      color: "white",
      fontSize: 14,
      fontFamily: "sans-serif",
      marginBottom: 12,
      boxSizing: "border-box",
      transition: "all 0.2s",
      outline: "none",
    },
    button: {
      width: "100%",
      padding: "12px",
      borderRadius: 12,
      background: "linear-gradient(135deg, #1D9E75 0%, #0f6e56 100%)",
      color: "white",
      border: "none",
      cursor: "pointer",
      fontSize: 14,
      fontWeight: 600,
      fontFamily: "sans-serif",
      transition: "all 0.2s",
    },
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.5rem" }}>
          <div>
            <div style={{ fontSize: 24, marginBottom: 4 }}>{mode === "login" ? "👋" : "✨"}</div>
            <h2 style={{ color: "white", fontSize: 20, fontWeight: 600, margin: 0 }}>
              {mode === "login" ? "Welcome back" : "Join the community"}
            </h2>
            <p style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>
              {mode === "login" ? "Sign in to continue" : "Create your account to post"}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 24, transition: "color 0.2s" }}
            onMouseEnter={(e) => e.target.style.color = "#fff"}
            onMouseLeave={(e) => e.target.style.color = "#94a3b8"}
          >
            ×
          </button>
        </div>

        {mode === "register" && (
          <>
            <input
              style={styles.input}
              placeholder="Username"
              value={form.username}
              onChange={set("username")}
              onFocus={(e) => e.target.style.borderColor = "#1D9E75"}
              onBlur={(e) => e.target.style.borderColor = "#334155"}
            />
            <input
              style={styles.input}
              placeholder="Display name"
              value={form.display_name}
              onChange={set("display_name")}
              onFocus={(e) => e.target.style.borderColor = "#1D9E75"}
              onBlur={(e) => e.target.style.borderColor = "#334155"}
            />
          </>
        )}
        <input
          style={styles.input}
          placeholder="Email"
          type="email"
          value={form.email}
          onChange={set("email")}
          onFocus={(e) => e.target.style.borderColor = "#1D9E75"}
          onBlur={(e) => e.target.style.borderColor = "#334155"}
        />
        <input
          style={styles.input}
          placeholder="Password"
          type="password"
          value={form.password}
          onChange={set("password")}
          onFocus={(e) => e.target.style.borderColor = "#1D9E75"}
          onBlur={(e) => e.target.style.borderColor = "#334155"}
        />

        {error && (
          <div style={{ background: "#450a0a", border: "1px solid #991b1b", color: "#fca5a5", borderRadius: 12, padding: "10px 14px", fontSize: 13, marginBottom: 12 }}>
            ⚠️ {error}
          </div>
        )}

        <button
          onClick={submit}
          disabled={loading}
          style={{ ...styles.button, opacity: loading ? 0.6 : 1 }}
          onMouseEnter={(e) => { if (!loading) e.target.style.transform = "translateY(-1px)"; }}
          onMouseLeave={(e) => { if (!loading) e.target.style.transform = "translateY(0)"; }}
        >
          {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
        </button>

        <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "#64748b" }}>
          {mode === "login" ? (
            <>No account? <span style={{ color: "#1D9E75", cursor: "pointer", fontWeight: 500 }} onClick={() => setMode("register")}>Sign up</span></>
          ) : (
            <>Have an account? <span style={{ color: "#1D9E75", cursor: "pointer", fontWeight: 500 }} onClick={() => setMode("login")}>Sign in</span></>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Inner forum (needs auth context) ─────────────────────────────────────────
function ForumInner({ onBack }) {
  const { user, logout } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [category, setCategory] = useState("");
  const [governorate, setGovernorate] = useState("");
  const [compose, setCompose] = useState(false);
  const [authModal, setAuthModal] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

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
    if (!user) {
      setAuthModal(true);
      return;
    }
    setCompose(true);
  };

  const handlePublished = (newPost) => {
    setPosts((p) => [newPost, ...p]);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const sel = {
    background: "#1e293b",
    border: "1px solid #334155",
    color: "white",
    padding: "10px 14px",
    borderRadius: 12,
    fontSize: 13,
    fontFamily: "sans-serif",
    cursor: "pointer",
    transition: "all 0.2s",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#020617", color: "white", fontFamily: "sans-serif" }}>
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
            background: linear-gradient(90deg, #1e293b 25%, #334155 50%, #1e293b 75%);
            background-size: 1000px 100%;
            animation: shimmer 2s infinite;
          }
        `}
      </style>

      {/* Top bar */}
      <div style={{ background: "rgba(11, 17, 32, 0.95)", backdropFilter: "blur(12px)", borderBottom: "1px solid #1e293b", padding: "0 1.5rem", display: "flex", alignItems: "center", gap: 12, height: 64, position: "sticky", top: 0, zIndex: 100 }}>
        <button
          onClick={onBack}
          style={{ background: "rgba(255,255,255,0.05)", border: "none", color: "#64748b", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "8px 12px", borderRadius: 10, transition: "all 0.2s" }}
          onMouseEnter={(e) => { e.target.style.background = "rgba(255,255,255,0.1)"; e.target.style.color = "#fff"; }}
          onMouseLeave={(e) => { e.target.style.background = "rgba(255,255,255,0.05)"; e.target.style.color = "#64748b"; }}
          title="Back to dashboard"
        >
          ←
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ background: "linear-gradient(135deg, #1D9E75 0%, #0f6e56 100%)", width: 34, height: 34, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🌦</div>
          <div>
            <span style={{ fontWeight: 700, fontSize: 16 }}>WeatherGuard Forum</span>
            <span style={{ fontSize: 11, color: "#64748b", marginLeft: 8 }}>Community Hub</span>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        {user ? (
          <>
            <NotificationBell />
            <button
              onClick={handleCompose}
              style={{ padding: "8px 18px", background: "linear-gradient(135deg, #1D9E75 0%, #0f6e56 100%)", border: "none", borderRadius: 12, color: "white", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "sans-serif", transition: "all 0.2s", display: "flex", alignItems: "center", gap: 6 }}
              onMouseEnter={(e) => e.target.style.transform = "translateY(-1px)"}
              onMouseLeave={(e) => e.target.style.transform = "translateY(0)"}
            >
              <span>✏️</span> New post
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: 4 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #9FE1CB 0%, #6bc4a8 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 600, color: "#0F6E56" }}>
                {(user.display_name ?? user.username ?? "?")[0].toUpperCase()}
              </div>
              <button
                onClick={logout}
                style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 12, fontFamily: "sans-serif", transition: "color 0.2s" }}
                onMouseEnter={(e) => e.target.style.color = "#ef4444"}
                onMouseLeave={(e) => e.target.style.color = "#64748b"}
              >
                Sign out
              </button>
            </div>
          </>
        ) : (
          <button
            onClick={() => setAuthModal(true)}
            style={{ padding: "8px 18px", background: "linear-gradient(135deg, #1D9E75 0%, #0f6e56 100%)", border: "none", borderRadius: 12, color: "white", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "sans-serif", transition: "all 0.2s" }}
            onMouseEnter={(e) => e.target.style.transform = "translateY(-1px)"}
            onMouseLeave={(e) => e.target.style.transform = "translateY(0)"}
          >
            Sign in
          </button>
        )}
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "2rem 1rem" }}>
        {/* Hero Section */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h1 style={{ fontSize: 32, fontWeight: 700, background: "linear-gradient(135deg, #fff 0%, #9FE1CB 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 8 }}>Community Forum</h1>
          <p style={{ color: "#64748b", fontSize: 14 }}>Share updates, ask questions, and help your neighbors stay informed</p>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 12, marginBottom: "1.5rem", flexWrap: "wrap", background: "#0b1120", padding: "1rem", borderRadius: 16, border: "1px solid #1e293b" }}>
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
            style={{ ...sel, background: "#1e293b", border: "1px solid #1D9E75", display: "flex", alignItems: "center", gap: 6 }}
            onMouseEnter={(e) => e.target.style.background = "#2d3a5e"}
            onMouseLeave={(e) => e.target.style.background = "#1e293b"}
          >
            🔄 Refresh
          </button>
        </div>

        {/* Stats Bar */}
        {!loading && posts.length > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", padding: "0 0.5rem" }}>
            <span style={{ fontSize: 12, color: "#64748b" }}>📄 {posts.length} posts • Page {page} of {totalPages}</span>
            <span style={{ fontSize: 12, color: "#64748b" }}>💬 Join the conversation</span>
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
          <div style={{ textAlign: "center", padding: "3rem 2rem", background: "#0b1120", borderRadius: 24, border: "1px solid #1e293b" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🌱</div>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>No posts yet</h3>
            <p style={{ color: "#64748b", fontSize: 14, marginBottom: 20 }}>Be the first to share an update with your community!</p>
            <button
              onClick={handleCompose}
              style={{ padding: "8px 20px", background: "linear-gradient(135deg, #1D9E75 0%, #0f6e56 100%)", border: "none", borderRadius: 12, color: "white", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
            >
              Create first post →
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {posts.map((p) => (
              <PostCard key={p.id} post={p} />
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
                        background: pageNum === page ? "linear-gradient(135deg, #1D9E75 0%, #0f6e56 100%)" : "#1e293b",
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
            background: "linear-gradient(135deg, #1D9E75 0%, #0f6e56 100%)",
            border: "none",
            borderRadius: 40,
            padding: "12px 16px",
            color: "white",
            cursor: "pointer",
            fontSize: 18,
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
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
      {authModal && <AuthModal onClose={() => setAuthModal(false)} />}
    </div>
  );
}

// ── Export: wraps everything in AuthProvider ──────────────────────────────────
export default function ForumPage({ onBack, existingUser }) {
  return (
    <AuthProvider existingUser={existingUser}>
      <ForumInner onBack={onBack} />
    </AuthProvider>
  );
}