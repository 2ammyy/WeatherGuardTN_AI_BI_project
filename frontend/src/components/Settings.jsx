import React, { useState } from 'react';
import axios from 'axios';

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

      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #0a0f1c 100%)',
        borderRadius: 24,
        border: '1px solid rgba(239, 68, 68, 0.3)',
        padding: 32,
        maxWidth: 480,
        width: '100%',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
        animation: 'slideUp 0.3s ease-out',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{
            fontSize: 48,
            marginBottom: 8,
            background: 'rgba(239, 68, 68, 0.1)',
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
          <h2 style={{ color: '#f87171', margin: 0, fontSize: 22, fontWeight: 700 }}>
            Delete Account
          </h2>
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 8 }}>
            This action is permanent and cannot be undone
          </p>
        </div>

        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: 12,
          padding: '12px 16px',
          marginBottom: 20,
          fontSize: 13,
          color: '#f87171',
        }}>
          <strong>⚠️ Warning:</strong> All your data, preferences, and history will be permanently deleted.
        </div>

        <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 8 }}>
          To confirm, type your email address below:
        </p>
        <code style={{
          display: 'block',
          background: '#1e293b',
          padding: '8px 12px',
          borderRadius: 8,
          marginBottom: 12,
          fontSize: 12,
          color: '#1D9E75',
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
            border: `2px solid ${matches && typed ? '#ef4444' : '#334155'}`,
            background: '#1e293b',
            fontSize: 14,
            color: 'white',
            marginBottom: 20,
            boxSizing: 'border-box',
            outline: 'none',
            transition: 'all 0.2s',
          }}
          onFocus={(e) => e.target.style.borderColor = matches ? '#ef4444' : '#1D9E75'}
          onBlur={(e) => e.target.style.borderColor = matches ? '#ef4444' : '#334155'}
        />
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '12px 0',
              borderRadius: 12,
              border: '1px solid #334155',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
              color: '#94a3b8',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(255,255,255,0.05)';
              e.target.style.borderColor = '#475569';
              e.target.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'transparent';
              e.target.style.borderColor = '#334155';
              e.target.style.color = '#94a3b8';
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
              background: matches ? '#ef4444' : '#7f1d1d',
              color: 'white',
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
                e.target.style.background = '#ef4444';
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
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
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
    localStorage.setItem('theme', theme);
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

  // ────────────────────────────────────────────────────────────────────────────
  // Styles
  // ────────────────────────────────────────────────────────────────────────────
  const tabStyle = (tab) => ({
    padding: '10px 20px',
    borderRadius: 10,
    border: 'none',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 13,
    transition: 'all 0.2s',
    background: activeTab === tab ? 'linear-gradient(135deg, #1D9E75 0%, #0f6e56 100%)' : 'transparent',
    color: activeTab === tab ? 'white' : '#94a3b8',
  });

  const inputStyle = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 12,
    border: '1px solid #334155',
    background: '#1e293b',
    fontSize: 14,
    color: 'white',
    boxSizing: 'border-box',
    outline: 'none',
    transition: 'all 0.2s',
    marginTop: 4,
  };

  const selectStyle = { ...inputStyle, background: '#1e293b', cursor: 'pointer' };

  const msgBox = (msg) => msg && (
    <div style={{
      padding: '12px 16px',
      borderRadius: 12,
      marginBottom: 20,
      fontSize: 13,
      background: msg.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
      color: msg.type === 'success' ? '#4ade80' : '#f87171',
      border: `1px solid ${msg.type === 'success' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
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

      <div style={{
        maxWidth: 640,
        margin: '40px auto',
        padding: '0 20px',
      }}>
        {/* Header */}
        <div style={{ marginBottom: 28, textAlign: 'center' }}>
          <div style={{
            background: 'linear-gradient(135deg, #1D9E75 0%, #0f6e56 100%)',
            width: 56,
            height: 56,
            borderRadius: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 28,
            margin: '0 auto 12px',
          }}>
            ⚙️
          </div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'white' }}>
            Account Settings
          </h1>
          <p style={{ color: '#64748b', margin: '8px 0 0', fontSize: 13 }}>
            Manage your profile and preferences
          </p>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: 4,
          marginBottom: 24,
          background: '#0f172a',
          padding: 4,
          borderRadius: 12,
          border: '1px solid #1e293b',
        }}>
          <button style={tabStyle('profile')} onClick={() => setActiveTab('profile')}>
            👤 Profile
          </button>
          <button style={tabStyle('preferences')} onClick={() => setActiveTab('preferences')}>
            🎨 Preferences
          </button>
          <button style={tabStyle('danger')} onClick={() => setActiveTab('danger')}>
            ⚠️ Danger Zone
          </button>
        </div>

        {/* ──────────────────────────────────────────────────────────────────────── */}
        {/* PROFILE TAB */}
        {/* ──────────────────────────────────────────────────────────────────────── */}
        {activeTab === 'profile' && (
          <div style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #0a0f1c 100%)',
            borderRadius: 20,
            border: '1px solid rgba(29, 158, 117, 0.2)',
            padding: 28,
          }}>
            {/* Avatar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28 }}>
              {user?.picture ? (
                <img src={user.picture} alt="avatar"
                  style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '2px solid #1D9E75', padding: 2 }} />
              ) : (
                <div style={{
                  width: 80, height: 80, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #1D9E75 0%, #0f6e56 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 32, color: 'white', fontWeight: 700
                }}>
                  {user?.name?.[0]?.toUpperCase() || '?'}
                </div>
              )}
              <div>
                <div style={{ fontWeight: 700, fontSize: 20, color: 'white' }}>{user?.name}</div>
                <div style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>{user?.email}</div>
                <span style={{
                  fontSize: 10,
                  marginTop: 6,
                  display: 'inline-block',
                  color: '#1D9E75',
                  background: 'rgba(29, 158, 117, 0.1)',
                  padding: '3px 10px',
                  borderRadius: 12,
                }}>
                  {user?.google_id ? '🔗 Google Account' : '📧 Email Account'}
                </span>
              </div>
            </div>

            {msgBox(profileMsg)}

            <form onSubmit={handleProfileSave}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: '#94a3b8', marginBottom: 6, display: 'block' }}>
                  👤 Full Name
                </label>
                <input
                  type="text"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  style={inputStyle}
                  onFocus={(e) => e.target.style.borderColor = '#1D9E75'}
                  onBlur={(e) => e.target.style.borderColor = '#334155'}
                  required
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: '#94a3b8', marginBottom: 6, display: 'block' }}>
                  📧 Email
                </label>
                <input
                  type="email"
                  value={user?.email}
                  disabled
                  style={{ ...inputStyle, background: '#0f172a', color: '#64748b', cursor: 'not-allowed' }}
                />
                <span style={{ fontSize: 11, color: '#64748b', marginTop: 4, display: 'block' }}>
                  Email cannot be changed
                </span>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: '#94a3b8', marginBottom: 6, display: 'block' }}>
                  📍 Governorate
                </label>
                <select
                  value={profileForm.governorate}
                  onChange={(e) => setProfileForm({ ...profileForm, governorate: e.target.value })}
                  style={selectStyle}
                  onFocus={(e) => e.target.style.borderColor = '#1D9E75'}
                  onBlur={(e) => e.target.style.borderColor = '#334155'}
                >
                  <option value="" style={{ color: '#94a3b8' }}>-- Select --</option>
                  {GOVERNORATES.map(g => <option key={g} value={g} style={{ color: 'white' }}>{g}</option>)}
                </select>
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: '#94a3b8', marginBottom: 6, display: 'block' }}>
                  👥 Your Situation
                </label>
                <select
                  value={profileForm.user_type}
                  onChange={(e) => setProfileForm({ ...profileForm, user_type: e.target.value })}
                  style={selectStyle}
                  onFocus={(e) => e.target.style.borderColor = '#1D9E75'}
                  onBlur={(e) => e.target.style.borderColor = '#334155'}
                >
                  <option value="" style={{ color: '#94a3b8' }}>-- Select --</option>
                  {USER_TYPES.map(t => (
                    <option key={t.value} value={t.value} style={{ color: 'white' }}>
                      {t.icon} {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={profileLoading}
                style={{
                  width: '100%',
                  padding: '12px 0',
                  borderRadius: 12,
                  border: 'none',
                  background: 'linear-gradient(135deg, #1D9E75 0%, #0f6e56 100%)',
                  color: 'white',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: profileLoading ? 'not-allowed' : 'pointer',
                  opacity: profileLoading ? 0.6 : 1,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (!profileLoading) e.target.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  if (!profileLoading) e.target.style.transform = 'translateY(0)';
                }}
              >
                {profileLoading ? '⏳ Saving...' : '💾 Save Changes'}
              </button>
            </form>
          </div>
        )}

        {/* ──────────────────────────────────────────────────────────────────────── */}
        {/* PREFERENCES TAB */}
        {/* ──────────────────────────────────────────────────────────────────────── */}
        {activeTab === 'preferences' && (
          <div style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #0a0f1c 100%)',
            borderRadius: 20,
            border: '1px solid rgba(29, 158, 117, 0.2)',
            padding: 28,
          }}>
            <h3 style={{ margin: '0 0 20px', color: 'white', fontSize: 18, fontWeight: 600 }}>
              🎨 Display Preferences
            </h3>

            {msgBox(prefMsg)}

            {/* Theme */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#94a3b8', display: 'block', marginBottom: 12 }}>
                🌓 Theme
              </label>
              <div style={{ display: 'flex', gap: 12 }}>
                {[
                  { value: 'light', label: '☀️ Light', bg: '#ffffff', color: '#1f2937' },
                  { value: 'dark', label: '🌙 Dark', bg: '#1e293b', color: 'white' },
                ].map(opt => (
                  <div
                    key={opt.value}
                    onClick={() => setTheme(opt.value)}
                    style={{
                      flex: 1,
                      padding: '16px',
                      borderRadius: 12,
                      cursor: 'pointer',
                      border: `2px solid ${theme === opt.value ? '#1D9E75' : '#334155'}`,
                      background: opt.bg,
                      textAlign: 'center',
                      color: opt.color,
                      fontWeight: theme === opt.value ? 700 : 400,
                      transition: 'all 0.2s',
                    }}
                  >
                    {opt.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Language */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#94a3b8', display: 'block', marginBottom: 12 }}>
                🌍 Language
              </label>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {[
                  { value: 'en', label: '🇬🇧 English' },
                  { value: 'fr', label: '🇫🇷 Français' },
                  { value: 'ar', label: '🇹🇳 العربية' },
                ].map(opt => (
                  <div
                    key={opt.value}
                    onClick={() => setLanguage(opt.value)}
                    style={{
                      flex: 1,
                      minWidth: 100,
                      padding: '12px 8px',
                      borderRadius: 12,
                      cursor: 'pointer',
                      textAlign: 'center',
                      border: `2px solid ${language === opt.value ? '#1D9E75' : '#334155'}`,
                      background: language === opt.value ? 'rgba(29, 158, 117, 0.1)' : 'transparent',
                      fontWeight: language === opt.value ? 700 : 400,
                      color: language === opt.value ? '#1D9E75' : '#94a3b8',
                      transition: 'all 0.2s',
                    }}
                  >
                    {opt.label}
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handlePrefSave}
              style={{
                width: '100%',
                padding: '12px 0',
                borderRadius: 12,
                border: 'none',
                background: 'linear-gradient(135deg, #1D9E75 0%, #0f6e56 100%)',
                color: 'white',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => e.target.style.transform = 'translateY(-1px)'}
              onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
            >
              💾 Save Preferences
            </button>
          </div>
        )}

        {/* ──────────────────────────────────────────────────────────────────────── */}
        {/* DANGER ZONE TAB */}
        {/* ──────────────────────────────────────────────────────────────────────── */}
        {activeTab === 'danger' && (
          <div style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #0a0f1c 100%)',
            borderRadius: 20,
            border: '1px solid rgba(239, 68, 68, 0.3)',
            padding: 28,
          }}>
            <h3 style={{ margin: '0 0 8px', color: '#f87171', fontSize: 18, fontWeight: 600 }}>
              ⚠️ Danger Zone
            </h3>
            <p style={{ color: '#64748b', fontSize: 13, marginBottom: 24 }}>
              These actions are irreversible. Please proceed with caution.
            </p>

            <div style={{
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 16,
              padding: 20,
              background: 'rgba(239, 68, 68, 0.05)',
            }}>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'white' }}>
                  🗑️ Delete this account
                </div>
                <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 8, lineHeight: 1.5 }}>
                  Once deleted, your account and all associated data will be permanently removed.
                  This action <strong style={{ color: '#f87171' }}>cannot be undone</strong>.
                </div>
              </div>
              <button
                onClick={() => setShowDeleteModal(true)}
                style={{
                  padding: '10px 20px',
                  borderRadius: 10,
                  border: '1px solid #ef4444',
                  background: 'transparent',
                  color: '#ef4444',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => {
                  e.target.style.background = '#ef4444';
                  e.target.style.color = 'white';
                  e.target.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={e => {
                  e.target.style.background = 'transparent';
                  e.target.style.color = '#ef4444';
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                Delete Account
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Settings;