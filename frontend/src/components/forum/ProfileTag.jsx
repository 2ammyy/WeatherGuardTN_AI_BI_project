// frontend/src/components/forum/ProfileTag.jsx
// Displays a user's occupation + governorate badge.
// Also shows a setup prompt if the user hasn't set their profile yet.

import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useTranslation } from "../../contexts/LanguageContext";

const OCCUPATION_CONFIG = {
  fisherman: { label: "Fisherman", emoji: "⚓", color: "#0288d1", bg: "#e1f5fe" },
  delivery:  { label: "Delivery",  emoji: "🛵", color: "#f57c00", bg: "#fff3e0" },
  student:   { label: "Student",   emoji: "🎓", color: "#7b1fa2", bg: "#f3e5f5" },
  farmer:    { label: "Farmer",    emoji: "🌾", color: "#388e3c", bg: "#e8f5e9" },
  authority: { label: "Authority", emoji: "🏛️", color: "#c62828", bg: "#ffebee" },
  general:   { label: "General",   emoji: "👤", color: "#546e7a", bg: "#eceff1" },
};

const TUNISIAN_GOVERNORATES = [
  "Tunis","Ariana","Ben Arous","Manouba","Nabeul","Zaghouan","Bizerte",
  "Béja","Jendouba","Le Kef","Siliana","Sousse","Monastir","Mahdia",
  "Sfax","Kairouan","Kasserine","Sidi Bouzid","Gabès","Médenine",
  "Tataouine","Gafsa","Tozeur","Kébili",
];

export function ProfileTag({ user, compact = false }) {
  const { tGovernorate } = useTranslation();
  const cfg = OCCUPATION_CONFIG[user?.occupation] || OCCUPATION_CONFIG.general;
  const gov = user?.governorate;

  if (compact) {
    return (
      <span className="profile-tag-compact" style={{ background: cfg.bg, color: cfg.color }}>
        {cfg.emoji} {cfg.label}{gov ? ` · ${tGovernorate(gov)}` : ""}
        <style>{`
          .profile-tag-compact {
            display: inline-flex; align-items: center; gap: 4px;
            font-size: 11px; font-weight: 600; padding: 2px 8px;
            border-radius: 12px;
          }
        `}</style>
      </span>
    );
  }

  return (
    <div className="profile-tag-full" style={{ borderLeft: `3px solid ${cfg.color}`, background: cfg.bg }}>
      <span className="pt-emoji">{cfg.emoji}</span>
      <div className="pt-info">
        <span className="pt-occ" style={{ color: cfg.color }}>{cfg.label}</span>
        {gov && <span className="pt-gov">📍 {tGovernorate(gov)}</span>}
      </div>
      <style>{`
        .profile-tag-full {
          display: inline-flex; align-items: center; gap: 10px;
          padding: 6px 14px; border-radius: 0 10px 10px 0;
          font-size: 13px;
        }
        .pt-emoji { font-size: 20px; }
        .pt-info { display: flex; flex-direction: column; }
        .pt-occ { font-weight: 700; font-size: 13px; }
        .pt-gov { font-size: 11px; color: #888; margin-top: 1px; }
      `}</style>
    </div>
  );
}


// ─── Profile Setup Modal ──────────────────────────────────────────────────
export function ProfileSetupPrompt() {
  const { user, authFetch } = useAuth();
  const { tGovernorate } = useTranslation();
  const [open, setOpen]       = useState(!user?.occupation || user.occupation === "general");
  const [occupation, setOcc]  = useState(user?.occupation || "general");
  const [governorate, setGov] = useState(user?.governorate || "");
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);

  if (!open || saved) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await authFetch("/api/forum/profile", {
        method: "PATCH",
        body: JSON.stringify({ occupation, governorate: governorate || undefined }),
      });
      setSaved(true);
      setOpen(false);
    } catch (_) {
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="profile-setup-banner">
      <div className="psb-content">
        <div className="psb-text">
          <strong>🎯 Personalise your news feed</strong>
          <p>Tell us your profile to receive relevant weather alerts.</p>
        </div>
        <div className="psb-fields">
          <select value={occupation} onChange={(e) => setOcc(e.target.value)} className="psb-select">
            {Object.entries(OCCUPATION_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.emoji} {cfg.label}</option>
            ))}
          </select>
          <select value={governorate} onChange={(e) => setGov(e.target.value)} className="psb-select">
            <option value="">All governorates</option>
            {TUNISIAN_GOVERNORATES.map((g) => <option key={g} value={g}>{tGovernorate(g)}</option>)}
          </select>
          <button onClick={handleSave} disabled={saving} className="psb-save">
            {saving ? "Saving…" : "Save"}
          </button>
          <button onClick={() => setOpen(false)} className="psb-dismiss">✕</button>
        </div>
      </div>
      <style>{`
        .profile-setup-banner {
          background: linear-gradient(135deg, #e3f2fd, #fce4ec);
          border: 1px solid #90caf9; border-radius: 12px;
          padding: 14px 18px; margin-bottom: 20px;
        }
        .psb-content { display: flex; flex-direction: column; gap: 10px; }
        .psb-text strong { font-size: 15px; }
        .psb-text p { margin: 2px 0 0; font-size: 13px; color: #555; }
        .psb-fields { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
        .psb-select {
          padding: 6px 10px; border: 1.5px solid #90caf9; border-radius: 8px;
          font-size: 13px; background: #fff; cursor: pointer;
        }
        .psb-save {
          padding: 6px 16px; background: #1976d2; color: #fff;
          border: none; border-radius: 8px; cursor: pointer; font-weight: 600;
        }
        .psb-save:disabled { opacity: 0.6; cursor: not-allowed; }
        .psb-dismiss {
          background: none; border: none; cursor: pointer; color: #aaa; font-size: 18px;
        }
      `}</style>
    </div>
  );
}