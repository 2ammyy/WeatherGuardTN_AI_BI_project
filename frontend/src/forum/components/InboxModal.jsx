import { useState, useEffect } from "react";
import { messagesAPI } from "../api/client";
import { useTheme } from "../../contexts/ThemeContext";
import ConversationModal from "./ConversationModal";

export default function InboxModal({ onClose, onNavigateToProfile }) {
  const { t } = useTheme();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const convos = await messagesAPI.conversations();
      setConversations(convos);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const totalUnread = conversations.reduce((s, c) => s + c.unread_count, 0);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.5)", padding: 20,
    }} onClick={onClose}>
      <div style={{
        width: "100%", maxWidth: 460, maxHeight: "80vh",
        background: t.bgCard, borderRadius: 16, border: `1px solid ${t.border}`,
        overflow: "hidden", display: "flex", flexDirection: "column",
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{
          padding: "16px 20px", borderBottom: `1px solid ${t.border}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: t.text }}>
            ✉ Messages {totalUnread > 0 && <span style={{ color: t.accent, fontSize: 13 }}>({totalUnread})</span>}
          </span>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: t.textMuted, cursor: "pointer", fontSize: 20, padding: 4 }}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", minHeight: 200 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: t.textMuted, fontSize: 13 }}>Loading...</div>
          ) : conversations.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: t.textMuted, fontSize: 13 }}>
              No conversations yet. Visit a user's profile to send a message.
            </div>
          ) : (
            conversations.map((c) => (
              <div key={c.other_user.id} onClick={() => setSelectedUser(c.other_user)}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "14px 20px", cursor: "pointer", borderBottom: `0.5px solid ${t.border}`,
                  background: c.unread_count > 0 ? t.accentBg : "transparent",
                }}
                onMouseEnter={(e) => e.target.style.background = t.bgHover}
                onMouseLeave={(e) => e.target.style.background = c.unread_count > 0 ? t.accentBg : "transparent"}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: "50%",
                  background: t.accent, color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 15, fontWeight: 600, flexShrink: 0,
                }}>
                  {(c.other_user.display_name || c.other_user.username).charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: c.unread_count > 0 ? 700 : 500, color: t.text }}>
                    {c.other_user.display_name || c.other_user.username}
                  </div>
                  {c.last_message && (
                    <div style={{ fontSize: 12, color: t.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.last_message.body}
                    </div>
                  )}
                </div>
                {c.unread_count > 0 && (
                  <div style={{
                    background: t.accent, color: t.accentText,
                    fontSize: 11, fontWeight: 700, borderRadius: 10,
                    padding: "2px 7px", minWidth: 20, textAlign: "center",
                  }}>
                    {c.unread_count}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {selectedUser && (
        <ConversationModal otherUser={selectedUser} onClose={() => { setSelectedUser(null); load(); }} />
      )}
    </div>
  );
}
