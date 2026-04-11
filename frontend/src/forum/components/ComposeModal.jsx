// frontend/src/forum/components/ComposeModal.jsx
import { useState } from "react";
import { postsAPI } from "../api/client";

const CATEGORIES = [
  { value: "school_closure",  label: "School closure" },
  { value: "community_aid",   label: "Community aid" },
  { value: "infrastructure",  label: "Infrastructure" },
  { value: "weather_alert",   label: "Weather alert" },
  { value: "other",           label: "Other" },
];

const RISK_LEVELS = [
  { value: "green",  label: "🟢 Green – Safe" },
  { value: "yellow", label: "🟡 Yellow – Be aware" },
  { value: "orange", label: "🟠 Orange – Be prepared" },
  { value: "red",    label: "🔴 Red – Take action" },
  { value: "purple", label: "🟣 Purple – Emergency" },
];

const GOVERNORATES = [
  "Tunis","Ariana","Ben Arous","Manouba","Nabeul","Zaghouan","Bizerte",
  "Béja","Jendouba","Le Kef","Siliana","Sousse","Monastir","Mahdia",
  "Sfax","Kairouan","Kasserine","Sidi Bouzid","Gabès","Medenine",
  "Tataouine","Gafsa","Tozeur","Kébili",
];

export default function ComposeModal({ onClose, onPublished }) {
  const [form, setForm] = useState({
    title:"", body:"", category:"", risk_level:"green", governorate:"", image_url:"",
  });
  const [aiStatus, setAiStatus] = useState(null); // null | "checking" | {approved, reason}
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
    } finally { setSubmitting(false); }
  };

  const fieldStyle = {
    width: "100%", padding: "9px 12px", borderRadius: 8,
    border: "0.5px solid var(--color-border-secondary)",
    background: "var(--color-background-secondary)",
    fontFamily: "var(--font-sans)", fontSize: 14,
    color: "var(--color-text-primary)", boxSizing: "border-box",
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{
        background:"var(--color-background-primary)",
        borderRadius:"var(--border-radius-lg)",
        border:"0.5px solid var(--color-border-secondary)",
        width:580, maxWidth:"95vw",
        maxHeight:"90vh", overflowY:"auto",
      }}>
        {/* Header */}
        <div style={{ padding:"1rem 1.25rem", borderBottom:"0.5px solid var(--color-border-tertiary)", display:"flex", alignItems:"center" }}>
          <span style={{ flex:1, fontSize:15, fontWeight:500 }}>Create a post</span>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", fontSize:20, color:"var(--color-text-secondary)", lineHeight:1 }}>×</button>
        </div>

        {/* Body */}
        <div style={{ padding:"1.25rem" }}>
          {/* Category */}
          <div style={{ marginBottom:"1rem" }}>
            <label style={{ display:"block", fontSize:12, fontWeight:500, color:"var(--color-text-secondary)", marginBottom:5 }}>Category *</label>
            <select value={form.category} onChange={set("category")} style={fieldStyle}>
              <option value="">Select a category…</option>
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          {/* Title */}
          <div style={{ marginBottom:"1rem" }}>
            <label style={{ display:"block", fontSize:12, fontWeight:500, color:"var(--color-text-secondary)", marginBottom:5 }}>Title *</label>
            <input value={form.title} onChange={set("title")} placeholder="Clear, descriptive title…" style={fieldStyle} />
          </div>
          {/* Body */}
          <div style={{ marginBottom:"1rem" }}>
            <label style={{ display:"block", fontSize:12, fontWeight:500, color:"var(--color-text-secondary)", marginBottom:5 }}>Content *</label>
            <textarea value={form.body} onChange={set("body")} placeholder="Describe what's happening…" style={{ ...fieldStyle, height:110, resize:"none" }} />
          </div>
          {/* Row: risk + governorate */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:"1rem" }}>
            <div>
              <label style={{ display:"block", fontSize:12, fontWeight:500, color:"var(--color-text-secondary)", marginBottom:5 }}>Risk level</label>
              <select value={form.risk_level} onChange={set("risk_level")} style={fieldStyle}>
                {RISK_LEVELS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display:"block", fontSize:12, fontWeight:500, color:"var(--color-text-secondary)", marginBottom:5 }}>Governorate</label>
              <select value={form.governorate} onChange={set("governorate")} style={fieldStyle}>
                <option value="">All governorates</option>
                {GOVERNORATES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>
          {/* Image URL */}
          <div style={{ marginBottom:"1rem" }}>
            <label style={{ display:"block", fontSize:12, fontWeight:500, color:"var(--color-text-secondary)", marginBottom:5 }}>Image URL (optional)</label>
            <input value={form.image_url} onChange={set("image_url")} placeholder="https://…" style={fieldStyle} />
          </div>

          {/* AI status */}
          {aiStatus && aiStatus !== "checking" && (
            <div style={{
              padding:"10px 14px", borderRadius:8, fontSize:13,
              display:"flex", gap:8, alignItems:"flex-start",
              background: aiStatus.approved ? "#E1F5EE" : "#FCEBEB",
              border: `0.5px solid ${aiStatus.approved ? "#9FE1CB" : "#F7C1C1"}`,
              color: aiStatus.approved ? "#0F6E56" : "#A32D2D",
              marginBottom: 12,
            }}>
              <span style={{ fontWeight:500 }}>{aiStatus.approved ? "✓ Approved" : "✗ Not approved"}</span>
              — {aiStatus.reason}
            </div>
          )}
          {aiStatus === "checking" && (
            <div style={{ padding:"10px 14px", borderRadius:8, fontSize:13, background:"var(--color-background-secondary)", border:"0.5px solid var(--color-border-tertiary)", color:"var(--color-text-secondary)", marginBottom:12 }}>
              AI is reviewing your post for relevance…
            </div>
          )}
          {error && (
            <div style={{ padding:"10px 14px", borderRadius:8, fontSize:13, background:"#FCEBEB", border:"0.5px solid #F7C1C1", color:"#A32D2D", marginBottom:12 }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:"0.75rem 1.25rem", borderTop:"0.5px solid var(--color-border-tertiary)", display:"flex", gap:8, justifyContent:"flex-end" }}>
          <button onClick={onClose} style={{ padding:"8px 16px", borderRadius:8, border:"0.5px solid var(--color-border-secondary)", background:"transparent", cursor:"pointer", fontSize:14, fontFamily:"var(--font-sans)", color:"var(--color-text-primary)" }}>
            Cancel
          </button>
          <button onClick={check} disabled={aiStatus === "checking"}
            style={{ padding:"8px 16px", borderRadius:8, border:"0.5px solid var(--color-border-secondary)", background:"transparent", cursor:"pointer", fontSize:14, fontFamily:"var(--font-sans)", color:"var(--color-text-primary)" }}>
            Check with AI
          </button>
          <button
            onClick={submit}
            disabled={submitting || !aiStatus || aiStatus === "checking" || !aiStatus.approved}
            style={{
              padding:"8px 20px", borderRadius:8, background:"#1D9E75", color:"white",
              border:"none", cursor:"pointer", fontSize:14, fontFamily:"var(--font-sans)", fontWeight:500,
              opacity: (submitting || !aiStatus || aiStatus === "checking" || !aiStatus.approved) ? 0.4 : 1,
            }}>
            {submitting ? "Publishing…" : "Publish"}
          </button>
        </div>
      </div>
    </div>
  );
}