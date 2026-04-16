// frontend/src/pages/Forum.jsx
// Main WeatherGuardTN Forum / News Feed page.
// Shows scraped weather news with filters, reactions, comments, shares.
// Authenticated users get personalised feed + notifications.

import { useState, useEffect, useCallback, useRef } from "react";
import NewsCard from "../components/forum/NewsCard";
import NotificationBell from "../components/forum/NotificationBell";
import { ProfileTag, ProfileSetupPrompt } from "../components/forum/ProfileTag";
import { useAuth } from "../hooks/useAuth";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8001";

const RISK_FILTERS = [
  { value: "",       label: "All",    emoji: "ðŸ“‹" },
  { value: "green",  label: "Safe",   emoji: "ðŸŸ¢" },
  { value: "yellow", label: "Watch",  emoji: "ðŸŸ¡" },
  { value: "orange", label: "Alert",  emoji: "ðŸŸ " },
  { value: "red",    label: "Danger", emoji: "ðŸ”´" },
  { value: "purple", label: "Extreme",emoji: "ðŸŸ£" },
];

const CATEGORY_FILTERS = [
  { value: "",               label: "All categories" },
  { value: "meteo",          label: "ðŸŒ¤ MÃ©tÃ©o" },
  { value: "alert",          label: "ðŸš¨ Alerts" },
  { value: "impact",         label: "ðŸŒŠ Impacts" },
  { value: "infrastructure", label: "ðŸ›£ Infrastructure" },
];

const TUNISIAN_GOVS = [
  "", "Tunis","Ariana","Ben Arous","Manouba","Nabeul","Zaghouan","Bizerte",
  "BÃ©ja","Jendouba","Le Kef","Siliana","Sousse","Monastir","Mahdia",
  "Sfax","Kairouan","Kasserine","Sidi Bouzid","GabÃ¨s","MÃ©denine",
  "Tataouine","Gafsa","Tozeur","KÃ©bili",
];

export default function Forum() {
  const { isLoggedIn, user, authFetch } = useAuth();

  // Feed state
  const [articles, setArticles]   = useState([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [loading, setLoading]     = useState(false);
  const [hasMore, setHasMore]     = useState(true);

  // Filters
  const [riskLevel,   setRiskLevel]   = useState("");
  const [governorate, setGovernorate] = useState("");
  const [category,    setCategory]    = useState("");
  const [search,      setSearch]      = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Reset when filters change
  useEffect(() => {
    setArticles([]);
    setPage(1);
    setHasMore(true);
  }, [riskLevel, governorate, category, debouncedSearch]);

  // Fetch articles
  const fetchArticles = useCallback(async (pageNum = 1, append = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: pageNum, per_page: 15 });
      if (riskLevel)        params.set("risk_level",  riskLevel);
      if (governorate)      params.set("governorate", governorate);
      if (category)         params.set("category",    category);
      if (debouncedSearch)  params.set("search",      debouncedSearch);

      const fetchFn = isLoggedIn ? authFetch : (url) => fetch(`${API_BASE}${url}`);
      const res  = await fetchFn(`/api/forum/news?${params}`);
      if (!res.ok) throw new Error("Failed to fetch news");
      const data = await res.json();

      setTotal(data.total);
      setArticles((prev) => append ? [...prev, ...data.items] : data.items);
      setHasMore(data.items.length === 15);
    } catch (e) {
      console.error("Forum fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, [riskLevel, governorate, category, debouncedSearch, isLoggedIn, authFetch]);

  useEffect(() => {
    fetchArticles(1, false);
  }, [fetchArticles]);

  // Infinite scroll
  const loaderRef = useRef(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !loading) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchArticles(nextPage, true);
        }
      },
      { threshold: 0.1 }
    );
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, page, fetchArticles]);

  const handleFilterReset = () => {
    setRiskLevel("");
    setGovernorate("");
    setCategory("");
    setSearch("");
  };

  const hasActiveFilters = riskLevel || governorate || category || debouncedSearch;

  return (
    <div className="forum-page">
      {/* â”€â”€ Top bar â”€â”€ */}
      <div className="forum-topbar">
        <div className="forum-title-wrap">
          <h1 className="forum-title">â›ˆ WeatherGuard News</h1>
          <span className="forum-subtitle">Live weather news & alerts for Tunisia</span>
        </div>
        <div className="forum-topbar-right">
          {isLoggedIn && user && <ProfileTag user={user} compact />}
          <NotificationBell />
          {!isLoggedIn && (
            <a href="/login" className="sign-in-link">Sign in for personalised alerts</a>
          )}
        </div>
      </div>

      {/* â”€â”€ Profile setup prompt (only for logged-in users without profile) â”€â”€ */}
      {isLoggedIn && <ProfileSetupPrompt />}

      {/* â”€â”€ Filters â”€â”€ */}
      <div className="forum-filters">
        {/* Search */}
        <div className="search-wrap">
          <span className="search-icon">ðŸ”</span>
          <input
            className="search-input"
            type="text"
            placeholder="Search newsâ€¦"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="search-clear" onClick={() => setSearch("")}>âœ•</button>
          )}
        </div>

        {/* Risk level pills */}
        <div className="filter-row">
          {RISK_FILTERS.map((f) => (
            <button
              key={f.value}
              className={`filter-pill ${riskLevel === f.value ? "active" : ""}`}
              onClick={() => setRiskLevel(riskLevel === f.value ? "" : f.value)}
            >
              {f.emoji} {f.label}
            </button>
          ))}
        </div>

        {/* Category + governorate */}
        <div className="filter-row filter-row-selects">
          <select
            className="filter-select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {CATEGORY_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>

          <select
            className="filter-select"
            value={governorate}
            onChange={(e) => setGovernorate(e.target.value)}
          >
            <option value="">All governorates</option>
            {TUNISIAN_GOVS.filter(Boolean).map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>

          {hasActiveFilters && (
            <button className="filter-reset" onClick={handleFilterReset}>
              âœ• Clear filters
            </button>
          )}
        </div>
      </div>

      {/* â”€â”€ Stats bar â”€â”€ */}
      <div className="forum-stats">
        <span>{total} article{total !== 1 ? "s" : ""} found</span>
        {hasActiveFilters && <span className="filter-active-note">Â· Filters active</span>}
        <button className="refresh-btn" onClick={() => fetchArticles(1, false)} disabled={loading}>
          ðŸ”„ Refresh
        </button>
      </div>

      {/* â”€â”€ News Feed â”€â”€ */}
      <div className="forum-feed">
        {!loading && articles.length === 0 && (
          <div className="empty-state">
            <span className="empty-icon">ðŸŒ¤</span>
            <h3>No articles found</h3>
            <p>Try adjusting your filters or check back later.</p>
            {hasActiveFilters && (
              <button className="btn-reset-filters" onClick={handleFilterReset}>
                Clear all filters
              </button>
            )}
          </div>
        )}

        {articles.map((article) => (
          <NewsCard key={article.id} article={article} />
        ))}

        {/* Infinite scroll loader */}
        <div ref={loaderRef} className="scroll-loader">
          {loading && (
            <div className="loading-spinner">
              <span className="spinner" />
              Loading articlesâ€¦
            </div>
          )}
          {!loading && !hasMore && articles.length > 0 && (
            <p className="end-of-feed">You've seen all articles Â· {total} total</p>
          )}
        </div>
      </div>

      <style>{`
        * { box-sizing: border-box; }

        .forum-page {
          max-width: 780px;
          margin: 0 auto;
          padding: 20px 16px 60px;
          font-family: system-ui, -apple-system, sans-serif;
          background: #f7f9fc;
          min-height: 100vh;
        }

        /* â”€â”€ Top bar â”€â”€ */
        .forum-topbar {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 20px;
        }
        .forum-title {
          font-size: 24px;
          font-weight: 800;
          color: #1a237e;
          margin: 0;
        }
        .forum-subtitle {
          display: block;
          font-size: 13px;
          color: #888;
          margin-top: 2px;
        }
        .forum-topbar-right {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .sign-in-link {
          font-size: 13px;
          color: #1976d2;
          text-decoration: none;
          padding: 5px 12px;
          border: 1px solid #90caf9;
          border-radius: 20px;
          transition: all 0.15s;
        }
        .sign-in-link:hover { background: #e3f2fd; }

        /* â”€â”€ Filters â”€â”€ */
        .forum-filters {
          background: #fff;
          border-radius: 12px;
          padding: 14px 16px;
          box-shadow: 0 1px 6px rgba(0,0,0,0.06);
          margin-bottom: 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .search-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #f5f5f5;
          border-radius: 8px;
          padding: 6px 12px;
        }
        .search-icon { font-size: 16px; color: #aaa; }
        .search-input {
          flex: 1;
          border: none;
          background: transparent;
          font-size: 14px;
          outline: none;
        }
        .search-clear {
          background: none;
          border: none;
          cursor: pointer;
          color: #bbb;
          font-size: 14px;
        }
        .filter-row {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .filter-pill {
          padding: 5px 12px;
          border-radius: 20px;
          border: 1.5px solid #e0e0e0;
          background: #fff;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          transition: all 0.15s;
          color: #555;
        }
        .filter-pill:hover { border-color: #90caf9; color: #1976d2; background: #e8f4fd; }
        .filter-pill.active { background: #1976d2; color: #fff; border-color: #1976d2; }
        .filter-row-selects { align-items: center; }
        .filter-select {
          padding: 6px 10px;
          border: 1.5px solid #e0e0e0;
          border-radius: 8px;
          font-size: 13px;
          background: #fff;
          cursor: pointer;
        }
        .filter-reset {
          padding: 5px 12px;
          border: 1px solid #ef9a9a;
          border-radius: 20px;
          background: #fff;
          color: #d32f2f;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
        }

        /* â”€â”€ Stats bar â”€â”€ */
        .forum-stats {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #888;
          margin-bottom: 12px;
          padding: 0 4px;
        }
        .filter-active-note { color: #1976d2; }
        .refresh-btn {
          margin-left: auto;
          background: none;
          border: 1px solid #e0e0e0;
          border-radius: 20px;
          padding: 4px 12px;
          cursor: pointer;
          font-size: 12px;
          color: #666;
          transition: all 0.15s;
        }
        .refresh-btn:hover { border-color: #90caf9; color: #1976d2; }
        .refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        /* â”€â”€ Feed â”€â”€ */
        .forum-feed { display: flex; flex-direction: column; }

        /* â”€â”€ Empty state â”€â”€ */
        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #aaa;
        }
        .empty-icon { font-size: 48px; display: block; margin-bottom: 12px; }
        .empty-state h3 { color: #555; margin: 0 0 8px; }
        .empty-state p  { margin: 0 0 16px; font-size: 14px; }
        .btn-reset-filters {
          padding: 8px 20px;
          background: #1976d2;
          color: #fff;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
        }

        /* â”€â”€ Loader â”€â”€ */
        .scroll-loader { padding: 20px; text-align: center; }
        .loading-spinner {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: #888;
          font-size: 14px;
        }
        .spinner {
          display: inline-block;
          width: 18px; height: 18px;
          border: 2px solid #e0e0e0;
          border-top-color: #1976d2;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .end-of-feed { color: #ccc; font-size: 13px; }

        /* â”€â”€ Responsive â”€â”€ */
        @media (max-width: 480px) {
          .forum-title { font-size: 20px; }
          .forum-topbar { flex-direction: column; }
          .filter-row-selects { flex-direction: column; align-items: flex-start; }
          .filter-select { width: 100%; }
        }
      `}</style>
    </div>
  );
}
