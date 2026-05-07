import React, { useState } from 'react';
import axios from 'axios';
import { useTheme } from '../contexts/ThemeContext';

const GOVERNORATES = [
  "Ariana", "Béja", "Ben Arous", "Bizerte", "Gabès", "Gafsa",
  "Jendouba", "Kairouan", "Kasserine", "Kébili", "Le Kef", "Mahdia",
  "La Manouba", "Médenine", "Monastir", "Nabeul", "Sfax", "Sidi Bouzid",
  "Siliana", "Sousse", "Tataouine", "Tozeur", "Tunis", "Zaghouan"
];

const USER_TYPES = [
  { value: "student_parent", label: "🎓 Student / Parent", icon: "🎓" },
  { value: "delivery_driver", label: "🛵 Delivery Driver", icon: "🛵" },
  { value: "fisherman", label: "🎣 Fisherman / Mariner", icon: "🎣" },
  { value: "general_population", label: "👤 General Population", icon: "👤" },
  { value: "government", label: "🏛️ Government / Civil Protection", icon: "🏛️" },
  { value: "ngo", label: "🤝 NGO / Local Association", icon: "🤝" },
];

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8001';

// ──────────────────────────────────────────────────────────────────────────────
// DELETE CONFIRMATION MODAL
// ──────────────────────────────────────────────────────────────────────────────
const DeleteModal = ({ user, onConfirm, onCancel }) => {
  const { t } = useTheme();
  const [typed, setTyped] = useState('');
  const expected = user?.email || '';
  const matches = typed === expected;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.8)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: 20,
      animation: 'fadeIn 0.2s ease-out',
    }}>
      <style>
        {`
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        `}
      </style>

      <div style={{
        background: t.bgCard,
        borderRadius: 24,
        border: `1px solid ${t.dangerBorder}`,
        padding: 32,
        maxWidth: 480,
        width: '100%',
        boxShadow: t.shadowModal,
        animation: 'slideUp 0.3s ease-out',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{
            fontSize: 48,
            marginBottom: 8,
            background: t.dangerBg,
            width: 80,
            height: 80,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            ⚠️
          </div>
          <h2 style={{ color: t.danger, margin: 0, fontSize: 22, fontWeight: 700 }}>
            Delete Account
          </h2>
          <p style={{ color: t.textMuted, fontSize: 13, marginTop: 8 }}>
            This action is permanent and cannot be undone
          </p>
        </div>

        <div style={{
          background: t.dangerBg,
          border: `1px solid ${t.dangerBorder}`,
          borderRadius: 12,
          padding: '12px 16px',
          marginBottom: 20,
          fontSize: 13,
          color: t.danger,
        }}>
          <strong>⚠️ Warning:</strong> All your data, preferences, and history will be permanently deleted.
        </div>

        <p style={{ fontSize: 13, color: t.textMuted, marginBottom: 8 }}>
          To confirm, type your email address below:
        </p>
        <code style={{
          display: 'block',
          background: t.bgMuted,
          padding: '8px 12px',
          borderRadius: 8,
          marginBottom: 12,
          fontSize: 12,
          color: t.accent,
          fontFamily: 'monospace',
        }}>
          {expected}
        </code>
        <input
          type="text"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder="Type your email to confirm"
          style={{
            width: '100%',
            padding: '12px 14px',
            borderRadius: 12,
            border: `2px solid ${matches && typed ? t.danger : t.border}`,
            background: t.bgInput,
            fontSize: 14,
            color: t.text,
            marginBottom: 20,
            boxSizing: 'border-box',
            outline: 'none',
            transition: 'all 0.2s',
          }}
          onFocus={(e) => e.target.style.borderColor = matches ? t.danger : t.accent}
          onBlur={(e) => e.target.style.borderColor = matches ? t.danger : t.border}
        />
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '12px 0',
              borderRadius: 12,
              border: `1px solid ${t.border}`,
              background: 'transparent',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
              color: t.textMuted,
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.target.style.background = t.bgHover;
              e.target.style.borderColor = t.textMuted;
              e.target.style.color = t.text;
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'transparent';
              e.target.style.borderColor = t.border;
              e.target.style.color = t.textMuted;
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!matches}
            style={{
              flex: 1,
              padding: '12px 0',
              borderRadius: 12,
              border: 'none',
              background: matches ? t.danger : t.bgMuted,
              color: matches ? 'white' : t.textMuted,
              cursor: matches ? 'pointer' : 'not-allowed',
              fontSize: 14,
              fontWeight: 700,
              transition: 'all 0.2s',
              opacity: matches ? 1 : 0.5,
            }}
            onMouseEnter={(e) => {
              if (matches) {
                e.target.style.background = '#dc2626';
                e.target.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseLeave={(e) => {
              if (matches) {
                e.target.style.background = t.danger;
                e.target.style.transform = 'translateY(0)';
              }
            }}
          >
            🗑️ Delete My Account
          </button>
        </div>
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// MAIN SETTINGS COMPONENT
// ──────────────────────────────────────────────────────────────────────────────
const Settings = ({ user, onLogout, onUserUpdate }) => {
  const { theme, t, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('profile');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    governorate: user?.governorate || '',
    user_type: user?.user_type || '',
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState(null);

  // Preferences (saved locally for now)
  const [language, setLanguage] = useState(localStorage.getItem('language') || 'en');
  const [prefMsg, setPrefMsg] = useState(null);

  const [deleteLoading, setDeleteLoading] = useState(false);

  // ────────────────────────────────────────────────────────────────────────────
  // Profile Update
  // ────────────────────────────────────────────────────────────────────────────
  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMsg(null);
    try {
      const res = await axios.put(`${API_URL}/api/auth/update`, {
        email: user.email,
        name: profileForm.name,
        governorate: profileForm.governorate,
        user_type: profileForm.user_type,
      });
      onUserUpdate({ ...user, ...res.data });
      setProfileMsg({ type: 'success', text: '✅ Profile updated successfully!' });
      setTimeout(() => setProfileMsg(null), 3000);
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.response?.data?.detail || 'Update failed.' });
    } finally {
      setProfileLoading(false);
    }
  };

  // ────────────────────────────────────────────────────────────────────────────
  // Preferences Save
  // ────────────────────────────────────────────────────────────────────────────
  const handlePrefSave = () => {
    localStorage.setItem('language', language);
    setPrefMsg({ type: 'success', text: '✅ Preferences saved!' });
    setTimeout(() => setPrefMsg(null), 3000);
  };

  // ────────────────────────────────────────────────────────────────────────────
  // Account Delete
  // ────────────────────────────────────────────────────────────────────────────
  const handleDeleteConfirm = async () => {
    setDeleteLoading(true);
    try {
      await axios.delete(`${API_URL}/api/auth/delete`, {
        data: { email: user.email }
      });
      onLogout();
    } catch (err) {
      setShowDeleteModal(false);
      setProfileMsg({ type: 'error', text: 'Failed to delete account. Please try again.' });
    } finally {
      setDeleteLoading(false);
    }
  };

  const msgBox = (msg) => msg && (
    <div style={{
      padding: '12px 16px',
      borderRadius: 12,
      marginBottom: 20,
      fontSize: 13,
      background: msg.type === 'success' ? t.accentBg : t.dangerBg,
      color: msg.type === 'success' ? t.accent : t.danger,
      border: `1px solid ${msg.type === 'success' ? t.accentBorder : t.dangerBorder}`,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
    }}>
      <span>{msg.type === 'success' ? '✅' : '⚠️'}</span>
      {msg.text}
    </div>
  );

  return (
    <>
      {showDeleteModal && (
        <DeleteModal
          user={user}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}

      <style>
        {`
          @keyframes slideIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
          .settings-container {
            max-width: 720px;
            margin: 0 auto;
            padding: 32px 20px 80px;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          }
          .settings-container * { box-sizing: border-box; }
          .tab-btn {
            padding: 10px 20px;
            border-radius: 10px;
            border: none;
            cursor: pointer;
            font-weight: 600;
            font-size: 13px;
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
          }
          .tab-btn:hover { transform: translateY(-1px); }
          .input-field {
            width: 100%;
            padding: 14px 16px;
            border-radius: 12px;
            font-size: 14px;
            box-sizing: border-box;
            outline: none;
            transition: all 0.2s;
            font-family: inherit;
          }
          .input-field:focus {
            box-shadow: 0 0 0 3px ${t.accent}20;
          }
          .select-field {
            width: 100%;
            padding: 14px 16px;
            border-radius: 12px;
            font-size: 14px;
            box-sizing: border-box;
            outline: none;
            transition: all 0.2s;
            font-family: inherit;
            cursor: pointer;
            appearance: none;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right 14px center;
          }
          .pref-card {
            padding: 20px;
            border-radius: 16px;
            border: 1px solid;
            transition: all 0.2s;
          }
          .pref-card:hover { transform: translateY(-1px); }
          .pref-option {
            padding: 14px;
            border-radius: 12px;
            cursor: pointer;
            text-align: center;
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            border: 2px solid;
          }
          .pref-option:hover { transform: scale(1.02); }
          .pref-option.selected {
            transform: scale(1.02);
          }
          .save-btn {
            width: 100%;
            padding: 14px 0;
            border-radius: 12px;
            border: none;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            font-family: inherit;
          }
          .save-btn:hover { transform: translateY(-2px); }
          .save-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
          .section-card {
            border-radius: 20px;
            border: 1px solid;
            overflow: hidden;
            animation: slideIn 0.3s ease-out;
          }
          .section-header {
            padding: 20px 24px;
            border-bottom: 1px solid;
            display: flex;
            align-items: center;
            gap: 14px;
          }
          .section-body {
            padding: 24px;
          }
          .divider {
            height: 1px;
            margin: 20px 0;
          }
          .field-group { margin-bottom: 20px; }
          .field-group:last-child { margin-bottom: 0; }
          .field-label {
            font-size: 12px;
            font-weight: 600;
            display: block;
            margin-bottom: 8px;
          }
          .field-hint {
            font-size: 11px;
            margin-top: 6px;
            display: block;
          }
        `}
      </style>

      <div className="settings-container">
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            background: `linear-gradient(135deg, ${t.accent}, ${t.isDark ? '#0f6e56' : '#15803d'})`,
            width: 64,
            height: 64,
            borderRadius: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 28,
            margin: '0 auto 16px',
            boxShadow: `0 8px 32px ${t.accent}30`,
          }}>
            ⚙️
          </div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: t.text, letterSpacing: '-0.5px' }}>
            Settings
          </h1>
          <p style={{ color: t.textMuted, margin: '8px 0 0', fontSize: 14 }}>
            Manage your profile, preferences, and account
          </p>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: 4,
          marginBottom: 28,
          background: t.bgCard,
          padding: 4,
          borderRadius: 14,
          border: `1px solid ${t.border}`,
          boxShadow: t.shadow,
        }}>
          {[
            { id: 'profile', icon: '👤', label: 'Profile' },
            { id: 'preferences', icon: '🎨', label: 'Preferences' },
            { id: 'danger', icon: '⚠️', label: 'Account' },
          ].map(tab => (
            <button
              key={tab.id}
              className="tab-btn"
              style={{
                flex: 1,
                background: activeTab === tab.id ? t.accent : 'transparent',
                color: activeTab === tab.id ? '#fff' : t.textMuted,
              }}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* ──────────────────────────────────────────────────────────────── */}
        {/* PROFILE TAB */}
        {/* ──────────────────────────────────────────────────────────────── */}
        {activeTab === 'profile' && (
          <div className="section-card" style={{ background: t.bgCard, borderColor: t.border }}>
            {/* Profile header with gradient */}
            <div className="section-header" style={{
              background: `linear-gradient(135deg, ${t.accent}15, ${t.accentBg})`,
              borderBottomColor: t.border,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: `linear-gradient(135deg, ${t.accent}, ${t.isDark ? '#0f6e56' : '#15803d'})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, flexShrink: 0,
              }}>
                👤
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: t.text }}>Profile Information</h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: t.textMuted }}>Update your personal details</p>
              </div>
            </div>

            <div className="section-body">
              {/* Avatar section */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28, padding: '16px 20px', background: t.bgMuted, borderRadius: 16, border: `1px solid ${t.border}` }}>
                {user?.picture ? (
                  <img src={user.picture} alt="avatar"
                    style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: `3px solid ${t.accent}`, padding: 2 }} />
                ) : (
                  <div style={{
                    width: 64, height: 64, borderRadius: '50%',
                    background: `linear-gradient(135deg, ${t.accent}, ${t.isDark ? '#0f6e56' : '#15803d'})`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 28, color: 'white', fontWeight: 700
                  }}>
                    {user?.name?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
                <div>
                  <div style={{ fontWeight: 700, fontSize: 18, color: t.text }}>{user?.name}</div>
                  <div style={{ color: t.textMuted, fontSize: 13, marginTop: 2 }}>{user?.email}</div>
                  <span style={{
                    fontSize: 10,
                    marginTop: 6,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    color: t.accent,
                    background: t.accentBg,
                    padding: '3px 10px',
                    borderRadius: 8,
                    border: `1px solid ${t.accentBorder}`,
                  }}>
                    {user?.google_id ? '🔗 Google' : '📧 Email'}
                  </span>
                </div>
              </div>

              {msgBox(profileMsg)}

              <form onSubmit={handleProfileSave}>
                <div className="field-group">
                  <label className="field-label" style={{ color: t.textMuted }}>
                    👤 Full Name
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    style={{ background: t.bgInput, color: t.text, border: `1px solid ${t.border}` }}
                    onFocus={(e) => { e.target.style.borderColor = t.accent; }}
                    onBlur={(e) => { e.target.style.borderColor = t.border; }}
                    required
                  />
                </div>

                <div className="field-group">
                  <label className="field-label" style={{ color: t.textMuted }}>
                    📧 Email
                  </label>
                  <input
                    type="email"
                    className="input-field"
                    value={user?.email}
                    disabled
                    style={{ background: t.bgMuted, color: t.textMuted, cursor: 'not-allowed', border: `1px solid ${t.border}` }}
                  />
                  <span className="field-hint" style={{ color: t.textMuted }}>
                    Email cannot be changed
                  </span>
                </div>

                <div className="divider" style={{ background: t.border }} />

                <div className="field-group">
                  <label className="field-label" style={{ color: t.textMuted }}>
                    📍 Governorate
                  </label>
                  <select
                    className="select-field"
                    value={profileForm.governorate}
                    onChange={(e) => setProfileForm({ ...profileForm, governorate: e.target.value })}
                    style={{ background: t.bgInput, color: t.text, border: `1px solid ${t.border}` }}
                    onFocus={(e) => { e.target.style.borderColor = t.accent; }}
                    onBlur={(e) => { e.target.style.borderColor = t.border; }}
                  >
                    <option value="">-- Select --</option>
                    {GOVERNORATES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>

                <div className="field-group">
                  <label className="field-label" style={{ color: t.textMuted }}>
                    👥 Your Situation
                  </label>
                  <select
                    className="select-field"
                    value={profileForm.user_type}
                    onChange={(e) => setProfileForm({ ...profileForm, user_type: e.target.value })}
                    style={{ background: t.bgInput, color: t.text, border: `1px solid ${t.border}` }}
                    onFocus={(e) => { e.target.style.borderColor = t.accent; }}
                    onBlur={(e) => { e.target.style.borderColor = t.border; }}
                  >
                    <option value="">-- Select --</option>
                    {USER_TYPES.map(ut => (
                      <option key={ut.value} value={ut.value}>
                        {ut.icon} {ut.label}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  className="save-btn"
                  disabled={profileLoading}
                  style={{
                    marginTop: 8,
                    background: `linear-gradient(135deg, ${t.accent}, ${t.isDark ? '#0f6e56' : '#15803d'})`,
                    color: 'white',
                    boxShadow: `0 4px 12px ${t.accent}30`,
                  }}
                >
                  {profileLoading ? '⏳ Saving...' : '💾 Save Changes'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ──────────────────────────────────────────────────────────────── */}
        {/* PREFERENCES TAB */}
        {/* ──────────────────────────────────────────────────────────────── */}
        {activeTab === 'preferences' && (
          <div className="section-card" style={{ background: t.bgCard, borderColor: t.border }}>
            <div className="section-header" style={{ borderBottomColor: t.border }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: t.accentBg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, flexShrink: 0,
              }}>
                🎨
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: t.text }}>Display & Language</h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: t.textMuted }}>Customize your experience</p>
              </div>
            </div>

            <div className="section-body">
              {msgBox(prefMsg)}

              {/* Theme */}
              <div className="field-group">
                <label className="field-label" style={{ color: t.textMuted, fontSize: 13, marginBottom: 12 }}>
                  🌓 Appearance
                </label>
                <div style={{ display: 'flex', gap: 12 }}>
                  {[
                    { value: 'light', label: '☀️', name: 'Light', desc: 'Clean & bright' },
                    { value: 'dark', label: '🌙', name: 'Dark', desc: 'Easy on eyes' },
                  ].map(opt => (
                    <div
                      key={opt.value}
                      className={`pref-option ${theme === opt.value ? 'selected' : ''}`}
                      onClick={() => { if (theme !== opt.value) toggleTheme(); }}
                      style={{
                        flex: 1,
                        padding: '18px 14px',
                        background: theme === opt.value ? t.accentBg : t.bgMuted,
                        borderColor: theme === opt.value ? t.accent : t.border,
                      }}
                    >
                      <div style={{ fontSize: 24, marginBottom: 6 }}>{opt.label}</div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: theme === opt.value ? t.accent : t.text }}>
                        {opt.name}
                      </div>
                      <div style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>
                        {opt.desc}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="divider" style={{ background: t.border }} />

              {/* Language */}
              <div className="field-group">
                <label className="field-label" style={{ color: t.textMuted, fontSize: 13, marginBottom: 12 }}>
                  🌍 Language
                </label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[
                    { value: 'en', label: '🇬🇧', name: 'English' },
                    { value: 'fr', label: '🇫🇷', name: 'Français' },
                    { value: 'ar', label: '🇹🇳', name: 'العربية' },
                  ].map(opt => (
                    <div
                      key={opt.value}
                      className={`pref-option ${language === opt.value ? 'selected' : ''}`}
                      onClick={() => setLanguage(opt.value)}
                      style={{
                        flex: 1,
                        padding: '14px 10px',
                        background: language === opt.value ? t.accentBg : t.bgMuted,
                        borderColor: language === opt.value ? t.accent : t.border,
                      }}
                    >
                      <div style={{ fontSize: 20, marginBottom: 4 }}>{opt.label}</div>
                      <div style={{ fontWeight: 700, fontSize: 12, color: language === opt.value ? t.accent : t.text }}>
                        {opt.name}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                className="save-btn"
                onClick={handlePrefSave}
                style={{
                  marginTop: 8,
                  background: `linear-gradient(135deg, ${t.accent}, ${t.isDark ? '#0f6e56' : '#15803d'})`,
                  color: 'white',
                  boxShadow: `0 4px 12px ${t.accent}30`,
                }}
              >
                💾 Save Preferences
              </button>
            </div>
          </div>
        )}

        {/* ──────────────────────────────────────────────────────────────── */}
        {/* DANGER ZONE TAB */}
        {/* ──────────────────────────────────────────────────────────────── */}
        {activeTab === 'danger' && (
          <div className="section-card" style={{ background: t.bgCard, borderColor: t.dangerBorder }}>
            <div className="section-header" style={{
              borderBottomColor: t.dangerBorder,
              background: `${t.dangerBg}`,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: t.dangerBg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, flexShrink: 0,
              }}>
                ⚠️
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: t.danger }}>Delete Account</h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: t.textMuted }}>Irreversible actions — proceed with caution</p>
              </div>
            </div>

            <div className="section-body">
              {/* Account info */}
              <div style={{ padding: '16px 20px', background: t.bgMuted, borderRadius: 16, border: `1px solid ${t.border}`, marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  {user?.picture ? (
                    <img src={user.picture} alt="avatar" style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{
                      width: 48, height: 48, borderRadius: '50%',
                      background: `linear-gradient(135deg, ${t.accent}40, ${t.accent}20)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 20, fontWeight: 700, color: t.accent,
                    }}>
                      {user?.name?.[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: t.text }}>{user?.name}</div>
                    <div style={{ fontSize: 12, color: t.textMuted }}>{user?.email}</div>
                  </div>
                </div>
              </div>

              {/* Delete account card */}
              <div style={{
                border: `1px solid ${t.dangerBorder}`,
                borderRadius: 16,
                padding: 24,
                background: t.dangerBg,
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 20 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: `${t.danger}15`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22, flexShrink: 0,
                  }}>
                    🗑️
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: t.text, marginBottom: 6 }}>
                      Delete Account
                    </div>
                    <div style={{ fontSize: 13, color: t.textMuted, lineHeight: 1.6 }}>
                      Once deleted, your account and all associated data will be <span style={{ fontWeight: 600, color: t.danger }}>permanently removed</span>. This action cannot be undone.
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  style={{
                    padding: '12px 24px',
                    borderRadius: 12,
                    border: `1px solid ${t.danger}`,
                    background: t.danger,
                    color: 'white',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontFamily: 'inherit',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                  onMouseEnter={e => {
                    e.target.style.background = '#dc2626';
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = `0 4px 12px rgba(239, 68, 68, 0.3)`;
                  }}
                  onMouseLeave={e => {
                    e.target.style.background = t.danger;
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  Delete My Account
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Settings;