import { useState, useEffect } from "react";
import { followsAPI } from "../api/client";
import { useTheme } from "../../contexts/ThemeContext";
import { useTranslation } from "../../contexts/LanguageContext";

export default function UserListModal({ username, type, onClose, onNavigateToProfile }) {
  const { t } = useTheme();
  const { t: __ } = useTranslation();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const fn = type === "followers" ? followsAPI.followers : followsAPI.following;
        const data = await fn(username);
        setUsers(data || []);
      } catch {} finally { setLoading(false); }
    };
    load();
  }, [username, type]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.5)", padding: 20,
    }} onClick={onClose}>
      <div style={{
        width: "100%", maxWidth: 400, maxHeight: "70vh",
        background: t.bgCard, borderRadius: 16, border: `1px solid ${t.border}`,
        overflow: "hidden", display: "flex", flexDirection: "column",
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{
          padding: "14px 18px", borderBottom: `1px solid ${t.border}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: t.text }}>
            {type === "followers" ? __('followersList') : __('followingList')}
          </span>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: t.textMuted, cursor: "pointer", fontSize: 18, padding: 2 }}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", minHeight: 120 }}>
          {loading ? (
            <div style={{ padding: 30, textAlign: "center", color: t.textMuted, fontSize: 13 }}>{__('loading')}</div>
          ) : users.length === 0 ? (
            <div style={{ padding: 30, textAlign: "center", color: t.textMuted, fontSize: 13 }}>{__('noneYet')}</div>
          ) : (
            users.map((u) => (
              <div key={u.id} onClick={() => { onNavigateToProfile?.(u.username); onClose?.(); }}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 18px", cursor: "pointer", borderBottom: `0.5px solid ${t.border}`,
                }}
                onMouseEnter={(e) => e.target.style.background = t.bgHover}
                onMouseLeave={(e) => e.target.style.background = "transparent"}
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
                  <div style={{ fontSize: 14, fontWeight: 500, color: t.text }}>{u.display_name || u.username}</div>
                  <div style={{ fontSize: 12, color: t.textMuted }}>@{u.username}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
