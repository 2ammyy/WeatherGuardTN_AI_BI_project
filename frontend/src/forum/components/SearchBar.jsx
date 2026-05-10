import { useState } from "react";
import { usersAPI } from "../api/client";
import { useTheme } from "../../contexts/ThemeContext";

export default function SearchBar({ onClose, onNavigateToProfile }) {
  const { t } = useTheme();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const search = async (q) => {
    setQuery(q);
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const users = await usersAPI.search(q);
      setResults(users || []);
    } catch {
      setResults([]);
    } finally { setLoading(false); }
  };

  const goToProfile = (username) => {
    onNavigateToProfile?.(username);
    onClose?.();
  };

  return (
    <div style={{ position: "relative", width: "100%", maxWidth: 480, margin: "0 auto" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        background: t.bgCard, border: `1px solid ${t.border}`,
        borderRadius: 24, padding: "8px 16px",
      }}>
        🔍
        <input
          value={query}
          onChange={(e) => search(e.target.value)}
          placeholder="Search users..."
          style={{
            flex: 1, border: "none", background: "transparent",
            fontSize: 14, color: t.text, outline: "none",
          }}
        />
        {loading && <span style={{ fontSize: 12, color: t.textMuted }}>…</span>}
      </div>
      {results.length > 0 && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100,
          background: t.bgCard, border: `1px solid ${t.border}`,
          borderRadius: 12, marginTop: 4, maxHeight: 300, overflowY: "auto",
          boxShadow: t.shadowModal,
        }}>
          {results.map((u) => (
            <div
              key={u.id}
              onClick={() => goToProfile(u.username)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 16px", cursor: "pointer",
                borderBottom: `1px solid ${t.border}`,
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: t.accent, color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 600, flexShrink: 0,
              }}>
                {(u.display_name || u.username).charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: t.text }}>
                  {u.display_name || u.username}
                </div>
                <div style={{ fontSize: 12, color: t.textMuted }}>@{u.username}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
