import { useState, useEffect, useRef } from "react";
import { messagesAPI } from "../api/client";
import { useTheme } from "../../contexts/ThemeContext";
import { useTranslation } from "../../contexts/LanguageContext";

export default function ConversationModal({ otherUser, onClose }) {
  const { t } = useTheme();
  const { t: __ } = useTranslation();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        const msgs = await messagesAPI.conversation(otherUser.id);
        setMessages(msgs);
        msgs.forEach((m) => {
          if (m.receiver_id === otherUser.id && !m.is_read) {
            messagesAPI.markRead(m.id).catch(() => {});
          }
        });
      } catch {}
    };
    load();
  }, [otherUser.id]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const msg = await messagesAPI.send(otherUser.id, text.trim());
      setMessages((prev) => [...prev, msg]);
      setText("");
    } catch (e) {
      alert(e.response?.data?.detail || "Failed to send");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.5)", padding: 20,
    }} onClick={onClose}>
      <div style={{
        width: "100%", maxWidth: 500, height: "80vh", maxHeight: 600,
        background: t.bgCard, borderRadius: 16, border: `1px solid ${t.border}`,
        display: "flex", flexDirection: "column", overflow: "hidden",
      }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          padding: "16px 20px", borderBottom: `1px solid ${t.border}`,
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            background: t.accent, color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 600,
          }}>
            {(otherUser.display_name || otherUser.username).charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: t.text }}>{otherUser.display_name || otherUser.username}</div>
            <div style={{ fontSize: 12, color: t.textMuted }}>@{otherUser.username}</div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: t.textMuted, cursor: "pointer", fontSize: 20, padding: 4 }}>✕</button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
          {messages.length === 0 && (
            <div style={{ textAlign: "center", color: t.textMuted, fontSize: 13, marginTop: 40 }}>
              {__('startConversation')}
            </div>
          )}
          {messages.map((m) => {
            const isFromOther = m.sender_id === otherUser.id;
            return (
              <div key={m.id} style={{
                alignSelf: isFromOther ? "flex-start" : "flex-end",
                maxWidth: "80%",
                background: isFromOther ? t.bgMuted : t.accent,
                color: isFromOther ? t.text : t.accentText,
                padding: "10px 14px", borderRadius: 12,
                fontSize: 14, lineHeight: 1.4,
                borderBottomLeftRadius: isFromOther ? 4 : 12,
                borderBottomRightRadius: isFromOther ? 12 : 4,
              }}>
                {m.body}
                <div style={{ fontSize: 10, color: isFromOther ? t.textMuted : `${t.accentText}99`, marginTop: 4, textAlign: "right" }}>
                  {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding: "12px 20px", borderTop: `1px solid ${t.border}`, display: "flex", gap: 8 }}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={__('typeMessage')}
            style={{
              flex: 1, padding: "10px 14px", borderRadius: 12,
              border: `1px solid ${t.border}`,
              background: t.bgInput, color: t.text,
              fontSize: 14, outline: "none",
            }}
          />
          <button onClick={send} disabled={sending || !text.trim()}
            style={{
              padding: "10px 20px", borderRadius: 12, border: "none",
              background: t.accent, color: t.accentText, cursor: "pointer",
              fontSize: 14, fontWeight: 600, opacity: sending || !text.trim() ? 0.6 : 1,
            }}>
            {sending ? __('sending') : __('send')}
          </button>
        </div>
      </div>
    </div>
  );
}
