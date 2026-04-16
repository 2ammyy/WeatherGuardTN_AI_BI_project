// frontend/src/forum/components/ComposeModal.jsx
import { useState } from "react";
import { postsAPI } from "../api/client";

const CATEGORIES = [
  { value: "school_closure",  label: "School closure", icon: "🏫" },
  { value: "community_aid",   label: "Community aid", icon: "🤝" },
  { value: "infrastructure",  label: "Infrastructure", icon: "🏗" },
  { value: "weather_alert",   label: "Weather alert", icon: "⚠️" },
  { value: "other",           label: "Other", icon: "📝" },
];

const RISK_LEVELS = [
  { value: "green",  label: "Green – Safe", icon: "🟢", color: "#22c55e" },
  { value: "yellow", label: "Yellow – Be aware", icon: "🟡", color: "#eab308" },
  { value: "orange", label: "Orange – Be prepared", icon: "🟠", color: "#f97316" },
  { value: "red",    label: "Red – Take action", icon: "🔴", color: "#ef4444" },
  { value: "purple", label: "Purple – Emergency", icon: "🟣", color: "#a855f7" },
];

const GOVERNORATES = [
  "Tunis", "Ariana", "Ben Arous", "Manouba", "Nabeul", "Zaghouan", "Bizerte",
  "Béja", "Jendouba", "Le Kef", "Siliana", "Sousse", "Monastir", "Mahdia",
  "Sfax", "Kairouan", "Kasserine", "Sidi Bouzid", "Gabès", "Medenine",
  "Tataouine", "Gafsa", "Tozeur", "Kébili",
];

export default function ComposeModal({ onClose, onPublished }) {
  const [form, setForm] = useState({
    title: "", body: "", category: "", risk_level: "green", governorate: "", image_url: "",
  });
  const [aiStatus, setAiStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const check = async () => {
    if (!form.title || !form.body || !form.category) {
      setError("Please fill in title, content, and category before checking.");
      return;
    }
    setError(null);
    setAiStatus("checking");
    try {
      const result = await postsAPI.check(form);
      setAiStatus(result);
    } catch {
      setAiStatus({ approved: false, reason: "Moderation service error. Please retry." });
    }
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const post = await postsAPI.create(form);
      onPublished?.(post);
      onClose();
    } catch (e) {
      const detail = e.response?.data?.detail;
      if (typeof detail === "object") {
        setAiStatus({ approved: false, reason: detail.ai_reason });
        setError(detail.message);
      } else {
        setError(detail ?? "Error creating post");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const getRiskIcon = (level) => {
    const risk = RISK_LEVELS.find(r => r.value === level);
    return risk ? risk.icon : "⚪";
  };

  const fieldStyle = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid #334155",
    background: "#1e293b",
    fontFamily: "sans-serif",
    fontSize: 14,
    color: "white",
    boxSizing: "border-box",
    transition: "all 0.2s",
    outline: "none",
  };

  const labelStyle = {
    display: "block",
    fontSize: 12,
    fontWeight: 500,
    color: "#94a3b8",
    marginBottom: 6,
    letterSpacing: "0.3px",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.8)",
        backdropFilter: "blur(4px)",
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "fadeIn 0.2s ease-out",
      }}
      onClick={onClose}
    >
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
        `}
      </style>

      <div
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #0a0f1c 100%)",
          borderRadius: 24,
          border: "1px solid rgba(29, 158, 117, 0.2)",
          width: 600,
          maxWidth: "95vw",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
          animation: "slideUp 0.3s ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid #1e293b",
            display: "flex",
            alignItems: "center",
            background: "rgba(11, 17, 32, 0.5)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
            <div
              style={{
                background: "linear-gradient(135deg, #1D9E75 0%, #0f6e56 100%)",
                width: 36,
                height: 36,
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
              }}
            >
              ✏️
            </div>
            <div>
              <span style={{ fontSize: 16, fontWeight: 600, color: "white" }}>Create a post</span>
              <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>Share information with your community</p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "none",
              borderRadius: 10,
              cursor: "pointer",
              fontSize: 20,
              color: "#94a3b8",
              lineHeight: 1,
              padding: "6px 12px",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => { e.target.style.background = "rgba(255,255,255,0.1)"; e.target.style.color = "#fff"; }}
            onMouseLeave={(e) => { e.target.style.background = "rgba(255,255,255,0.05)"; e.target.style.color = "#94a3b8"; }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "1.5rem" }}>
          {/* Category */}
          <div style={{ marginBottom: "1.25rem" }}>
            <label style={labelStyle}>
              <span style={{ marginRight: 4 }}>📂</span> Category <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <select
              value={form.category}
              onChange={set("category")}
              style={fieldStyle}
              onFocus={(e) => e.target.style.borderColor = "#1D9E75"}
              onBlur={(e) => e.target.style.borderColor = "#334155"}
            >
              <option value="" style={{ color: "#94a3b8" }}>Select a category…</option>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value} style={{ color: "white" }}>
                  {c.icon} {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div style={{ marginBottom: "1.25rem" }}>
            <label style={labelStyle}>
              <span style={{ marginRight: 4 }}>📌</span> Title <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              value={form.title}
              onChange={set("title")}
              placeholder="Clear, descriptive title…"
              style={fieldStyle}
              onFocus={(e) => e.target.style.borderColor = "#1D9E75"}
              onBlur={(e) => e.target.style.borderColor = "#334155"}
            />
          </div>

          {/* Body */}
          <div style={{ marginBottom: "1.25rem" }}>
            <label style={labelStyle}>
              <span style={{ marginRight: 4 }}>💬</span> Content <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <textarea
              value={form.body}
              onChange={set("body")}
              placeholder="Describe what's happening…"
              style={{ ...fieldStyle, height: 120, resize: "vertical", fontFamily: "sans-serif" }}
              onFocus={(e) => e.target.style.borderColor = "#1D9E75"}
              onBlur={(e) => e.target.style.borderColor = "#334155"}
            />
          </div>

          {/* Row: risk + governorate */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: "1.25rem" }}>
            <div>
              <label style={labelStyle}>
                <span style={{ marginRight: 4 }}>⚠️</span> Risk level
              </label>
              <select
                value={form.risk_level}
                onChange={set("risk_level")}
                style={{ ...fieldStyle, borderLeft: `3px solid ${RISK_LEVELS.find(r => r.value === form.risk_level)?.color || "#64748b"}` }}
                onFocus={(e) => e.target.style.borderColor = "#1D9E75"}
                onBlur={(e) => e.target.style.borderColor = "#334155"}
              >
                {RISK_LEVELS.map((r) => (
                  <option key={r.value} value={r.value} style={{ color: "white" }}>
                    {r.icon} {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>
                <span style={{ marginRight: 4 }}>📍</span> Governorate
              </label>
              <select
                value={form.governorate}
                onChange={set("governorate")}
                style={fieldStyle}
                onFocus={(e) => e.target.style.borderColor = "#1D9E75"}
                onBlur={(e) => e.target.style.borderColor = "#334155"}
              >
                <option value="" style={{ color: "#94a3b8" }}>All governorates</option>
                {GOVERNORATES.map((g) => (
                  <option key={g} value={g} style={{ color: "white" }}>{g}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Image URL */}
          <div style={{ marginBottom: "1.25rem" }}>
            <label style={labelStyle}>
              <span style={{ marginRight: 4 }}>🖼️</span> Image URL (optional)
            </label>
            <input
              value={form.image_url}
              onChange={set("image_url")}
              placeholder="https://example.com/image.jpg"
              style={fieldStyle}
              onFocus={(e) => e.target.style.borderColor = "#1D9E75"}
              onBlur={(e) => e.target.style.borderColor = "#334155"}
            />
          </div>

          {/* AI status */}
          {aiStatus && aiStatus !== "checking" && (
            <div
              style={{
                padding: "12px 16px",
                borderRadius: 12,
                fontSize: 13,
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
                background: aiStatus.approved ? "rgba(29, 158, 117, 0.1)" : "rgba(239, 68, 68, 0.1)",
                border: `1px solid ${aiStatus.approved ? "rgba(29, 158, 117, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                marginBottom: 16,
              }}
            >
              <span style={{ fontSize: 18 }}>
                {aiStatus.approved ? "✅" : "❌"}
              </span>
              <div>
                <div style={{ fontWeight: 600, color: aiStatus.approved ? "#4ade80" : "#f87171", marginBottom: 4 }}>
                  {aiStatus.approved ? "Approved by AI moderation" : "Not approved"}
                </div>
                <div style={{ color: "#94a3b8", fontSize: 12 }}>
                  {aiStatus.reason}
                </div>
              </div>
            </div>
          )}

          {aiStatus === "checking" && (
            <div
              style={{
                padding: "12px 16px",
                borderRadius: 12,
                fontSize: 13,
                background: "rgba(59, 130, 246, 0.1)",
                border: "1px solid rgba(59, 130, 246, 0.3)",
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div style={{ width: 20, height: 20, border: "2px solid #3b82f6", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              <span style={{ color: "#60a5fa" }}>AI is reviewing your post for relevance…</span>
            </div>
          )}

          {error && (
            <div
              style={{
                padding: "12px 16px",
                borderRadius: 12,
                fontSize: 13,
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                color: "#f87171",
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span>⚠️</span> {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "1rem 1.5rem",
            borderTop: "1px solid #1e293b",
            display: "flex",
            gap: 12,
            justifyContent: "flex-end",
            background: "rgba(11, 17, 32, 0.3)",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "10px 20px",
              borderRadius: 12,
              border: "1px solid #334155",
              background: "transparent",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 500,
              fontFamily: "sans-serif",
              color: "#94a3b8",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => { e.target.style.background = "rgba(255,255,255,0.05)"; e.target.style.borderColor = "#475569"; e.target.style.color = "#fff"; }}
            onMouseLeave={(e) => { e.target.style.background = "transparent"; e.target.style.borderColor = "#334155"; e.target.style.color = "#94a3b8"; }}
          >
            Cancel
          </button>

          <button
            onClick={check}
            disabled={aiStatus === "checking"}
            style={{
              padding: "10px 20px",
              borderRadius: 12,
              border: "1px solid #1D9E75",
              background: "transparent",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 500,
              fontFamily: "sans-serif",
              color: "#1D9E75",
              transition: "all 0.2s",
              opacity: aiStatus === "checking" ? 0.5 : 1,
            }}
            onMouseEnter={(e) => { if (aiStatus !== "checking") { e.target.style.background = "rgba(29, 158, 117, 0.1)"; e.target.style.transform = "translateY(-1px)"; } }}
            onMouseLeave={(e) => { if (aiStatus !== "checking") { e.target.style.background = "transparent"; e.target.style.transform = "translateY(0)"; } }}
          >
            🤖 Check with AI
          </button>

          <button
            onClick={submit}
            disabled={submitting || !aiStatus || aiStatus === "checking" || !aiStatus.approved}
            style={{
              padding: "10px 24px",
              borderRadius: 12,
              background: "linear-gradient(135deg, #1D9E75 0%, #0f6e56 100%)",
              color: "white",
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "sans-serif",
              transition: "all 0.2s",
              opacity: (submitting || !aiStatus || aiStatus === "checking" || !aiStatus.approved) ? 0.5 : 1,
            }}
            onMouseEnter={(e) => { if (!submitting && aiStatus && aiStatus !== "checking" && aiStatus.approved) e.target.style.transform = "translateY(-1px)"; }}
            onMouseLeave={(e) => { if (!submitting && aiStatus && aiStatus !== "checking" && aiStatus.approved) e.target.style.transform = "translateY(0)"; }}
          >
            {submitting ? "Publishing…" : "📮 Publish"}
          </button>
        </div>
      </div>

      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}