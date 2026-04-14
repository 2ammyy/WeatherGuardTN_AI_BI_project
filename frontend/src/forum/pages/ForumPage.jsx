// frontend/src/forum/pages/ForumPage.jsx
import { useState, useEffect, useCallback } from "react";
import { postsAPI } from "../api/client";
import { AuthProvider, useAuth } from "../../hooks/useAuth";
import PostCard from "../components/PostCard";
import ComposeModal from "../components/ComposeModal";
import NotificationBell from "../components/NotificationBell";

const CATEGORIES = [
  { value: "",               label: "All posts" },
  { value: "school_closure", label: "🏫 School closures" },
  { value: "community_aid",  label: "🤝 Community aid" },
  { value: "infrastructure", label: "🏗 Infrastructure" },
  { value: "weather_alert",  label: "⚠️ Weather alerts" },
];

const GOVERNORATES = [
  "","Tunis","Ariana","Ben Arous","Nabeul","Sfax","Sousse",
  "Bizerte","Jendouba","Monastir","Mahdia","Kairouan","Gafsa",
];

// ── Auth modal ────────────────────────────────────────────────────────────────
function AuthModal({ onClose }) {
  const { login, register } = useAuth();
  const [mode,   setMode]   = useState("login");
  const [form,   setForm]   = useState({ username:"", email:"", password:"", display_name:"", governorate:"" });
  const [error,  setError]  = useState(null);
  const [loading,setLoading]= useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    setLoading(true); setError(null);
    try {
      if (mode === "login") await login(form.email, form.password);
      else                  await register(form);
      onClose();
    } catch (e) {
      setError(e.response?.data?.detail ?? "Authentication error");
    } finally { setLoading(false); }
  };

  const inp = {
    width:"100%", padding:"9px 12px", borderRadius:8,
    border:"1px solid #334155", background:"#1e293b",
    color:"white", fontSize:14, fontFamily:"sans-serif",
    marginBottom:10, boxSizing:"border-box",
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:500, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:"#0f172a", border:"1px solid #334155", borderRadius:16, width:380, padding:"2rem" }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"1.5rem" }}>
          <h2 style={{ color:"white", fontSize:18, fontWeight:600, margin:0 }}>
            {mode === "login" ? "Sign in to Forum" : "Create account"}
          </h2>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#94a3b8", cursor:"pointer", fontSize:20 }}>×</button>
        </div>

        {mode === "register" && (
          <>
            <input style={inp} placeholder="Username" value={form.username} onChange={set("username")} />
            <input style={inp} placeholder="Display name" value={form.display_name} onChange={set("display_name")} />
          </>
        )}
        <input style={inp} placeholder="Email" type="email" value={form.email} onChange={set("email")} />
        <input style={inp} placeholder="Password" type="password" value={form.password} onChange={set("password")} />

        {error && (
          <div style={{ background:"#450a0a", border:"1px solid #991b1b", color:"#fca5a5", borderRadius:8, padding:"8px 12px", fontSize:13, marginBottom:10 }}>
            {error}
          </div>
        )}

        <button onClick={submit} disabled={loading} style={{
          width:"100%", padding:"10px", borderRadius:8, background:"#1D9E75",
          color:"white", border:"none", cursor:"pointer", fontSize:14,
          fontWeight:600, fontFamily:"sans-serif", opacity: loading ? 0.6 : 1,
        }}>
          {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
        </button>

        <div style={{ textAlign:"center", marginTop:12, fontSize:13, color:"#64748b" }}>
          {mode === "login" ? (
            <>No account? <span style={{ color:"#1D9E75", cursor:"pointer" }} onClick={() => setMode("register")}>Sign up</span></>
          ) : (
            <>Have an account? <span style={{ color:"#1D9E75", cursor:"pointer" }} onClick={() => setMode("login")}>Sign in</span></>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Inner forum (needs auth context) ─────────────────────────────────────────
function ForumInner({ onBack }) {
  const { user, logout } = useAuth();
  const [posts,       setPosts]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [page,        setPage]        = useState(1);
  const [totalPages,  setTotalPages]  = useState(1);
  const [category,    setCategory]    = useState("");
  const [governorate, setGovernorate] = useState("");
  const [compose,     setCompose]     = useState(false);
  const [authModal,   setAuthModal]   = useState(false);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, size: 10 };
      if (category)    params.category    = category;
      if (governorate) params.governorate = governorate;
      const data = await postsAPI.list(params);
      setPosts(data.items);
      setTotalPages(data.pages);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [page, category, governorate]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const handleCompose = () => {
    if (!user) { setAuthModal(true); return; }
    setCompose(true);
  };

  const handlePublished = (newPost) => {
    setPosts((p) => [newPost, ...p]);
  };

  const sel = {
    background:"#1e293b", border:"1px solid #334155", color:"white",
    padding:"7px 12px", borderRadius:8, fontSize:13, fontFamily:"sans-serif", cursor:"pointer",
  };

  return (
    <div style={{ minHeight:"100vh", background:"#020617", color:"white", fontFamily:"sans-serif" }}>

      {/* Top bar */}
      <div style={{ background:"#0b1120", borderBottom:"1px solid #1e293b", padding:"0 1.5rem", display:"flex", alignItems:"center", gap:12, height:56, position:"sticky", top:0, zIndex:50 }}>
        <button onClick={onBack} style={{ background:"none", border:"none", color:"#64748b", cursor:"pointer", fontSize:20, lineHeight:1, padding:"0 4px" }} title="Back to dashboard">←</button>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ background:"#1D9E75", width:28, height:28, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>🌦</div>
          <span style={{ fontWeight:700, fontSize:15 }}>WeatherGuard Forum</span>
        </div>
        <div style={{ flex:1 }} />
        {user ? (
          <>
            <NotificationBell />
            <button onClick={handleCompose} style={{ padding:"7px 16px", background:"#1D9E75", border:"none", borderRadius:8, color:"white", cursor:"pointer", fontSize:13, fontWeight:600, fontFamily:"sans-serif" }}>
              + New post
            </button>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ width:30, height:30, borderRadius:"50%", background:"#9FE1CB", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:600, color:"#0F6E56" }}>
                {(user.display_name ?? user.username ?? "?")[0].toUpperCase()}
              </div>
              <button onClick={logout} style={{ background:"none", border:"none", color:"#64748b", cursor:"pointer", fontSize:12, fontFamily:"sans-serif" }}>Sign out</button>
            </div>
          </>
        ) : (
          <button onClick={() => setAuthModal(true)} style={{ padding:"7px 16px", background:"#1D9E75", border:"none", borderRadius:8, color:"white", cursor:"pointer", fontSize:13, fontWeight:600, fontFamily:"sans-serif" }}>
            Sign in
          </button>
        )}
      </div>

      <div style={{ maxWidth:720, margin:"0 auto", padding:"1.5rem 1rem" }}>

        {/* Filters */}
        <div style={{ display:"flex", gap:10, marginBottom:"1.25rem", flexWrap:"wrap" }}>
          <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} style={sel}>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <select value={governorate} onChange={(e) => { setGovernorate(e.target.value); setPage(1); }} style={sel}>
            <option value="">All governorates</option>
            {GOVERNORATES.filter(Boolean).map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
          <button onClick={fetchPosts} style={{ ...sel, background:"transparent", border:"1px solid #334155" }}>↻ Refresh</button>
        </div>

        {/* Feed */}
        {loading ? (
          <div style={{ textAlign:"center", padding:"3rem", color:"#64748b" }}>Loading posts…</div>
        ) : posts.length === 0 ? (
          <div style={{ textAlign:"center", padding:"3rem", color:"#64748b" }}>
            No posts yet. Be the first to share an update!
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {posts.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display:"flex", justifyContent:"center", gap:8, marginTop:"1.5rem" }}>
            <button onClick={() => setPage((p) => Math.max(1, p-1))} disabled={page===1}
              style={{ ...sel, opacity: page===1 ? 0.4 : 1 }}>← Prev</button>
            <span style={{ padding:"7px 12px", color:"#94a3b8", fontSize:13 }}>{page} / {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p+1))} disabled={page===totalPages}
              style={{ ...sel, opacity: page===totalPages ? 0.4 : 1 }}>Next →</button>
          </div>
        )}
      </div>

      {compose   && <ComposeModal onClose={() => setCompose(false)} onPublished={handlePublished} />}
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