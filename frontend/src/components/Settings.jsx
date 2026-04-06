import React, { useState } from 'react';
import axios from 'axios';

const GOVERNORATES = [
  "Ariana", "Béja", "Ben Arous", "Bizerte", "Gabès", "Gafsa",
  "Jendouba", "Kairouan", "Kasserine", "Kébili", "Le Kef", "Mahdia",
  "La Manouba", "Médenine", "Monastir", "Nabeul", "Sfax", "Sidi Bouzid",
  "Siliana", "Sousse", "Tataouine", "Tozeur", "Tunis", "Zaghouan"
];

const USER_TYPES = [
  { value: "student_parent", label: "🎓 Student / Parent" },
  { value: "delivery_driver", label: "🛵 Delivery Driver" },
  { value: "fisherman", label: "🎣 Fisherman / Mariner" },
  { value: "general_population", label: "👤 General Population" },
  { value: "government", label: "🏛️ Government / Civil Protection / Authority" },
  { value: "ngo", label: "🤝 NGO / Local Association" },
];

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8001';

// ─── DELETE CONFIRMATION MODAL ───────────────────────────────────────────────
const DeleteModal = ({ user, onConfirm, onCancel }) => {
  const [typed, setTyped] = useState('');
  const expected = user?.email || '';
  const matches = typed === expected;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 20
    }}>
      <div style={{
        background: 'white', borderRadius: 16, padding: 32,
        maxWidth: 480, width: '100%', boxShadow: '0 25px 50px rgba(0,0,0,0.3)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>⚠️</div>
          <h2 style={{ color: '#dc2626', margin: 0 }}>Delete Account</h2>
        </div>

        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca',
          borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: 14
        }}>
          <strong>This action is permanent and cannot be undone.</strong>
          <br />All your data, preferences, and history will be deleted.
        </div>

        <p style={{ fontSize: 14, color: '#374151', marginBottom: 8 }}>
          To confirm, type your email address below:
        </p>
        <code style={{
          display: 'block', background: '#f3f4f6', padding: '6px 12px',
          borderRadius: 6, marginBottom: 12, fontSize: 13, color: '#1f2937'
        }}>
          {expected}
        </code>
        <input
          type="text"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder="Type your email to confirm"
          style={{
            width: '100%', padding: '10px 12px', borderRadius: 8,
            border: `2px solid ${matches && typed ? '#dc2626' : '#d1d5db'}`,
            fontSize: 14, marginBottom: 20, boxSizing: 'border-box',
            outline: 'none'
          }}
        />
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid #d1d5db',
              background: 'white', cursor: 'pointer', fontSize: 14, fontWeight: 600
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!matches}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 8, border: 'none',
              background: matches ? '#dc2626' : '#fca5a5',
              color: 'white', cursor: matches ? 'pointer' : 'not-allowed',
              fontSize: 14, fontWeight: 700, transition: 'background 0.2s'
            }}
          >
            🗑️ Delete My Account
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── MAIN SETTINGS COMPONENT ─────────────────────────────────────────────────
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

  // ── Profile Update ──────────────────────────────────────────────────────────
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
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.response?.data?.detail || 'Update failed.' });
    } finally {
      setProfileLoading(false);
    }
  };

  // ── Preferences Save ───────────────────────────────────────────────────────
  const handlePrefSave = () => {
    localStorage.setItem('theme', theme);
    localStorage.setItem('language', language);
    setPrefMsg({ type: 'success', text: '✅ Preferences saved! (will be applied on next update)' });
    setTimeout(() => setPrefMsg(null), 3000);
  };

  // ── Account Delete ─────────────────────────────────────────────────────────
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

  // ── Styles ─────────────────────────────────────────────────────────────────
  const tabStyle = (tab) => ({
    padding: '10px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
    fontWeight: 600, fontSize: 14, transition: 'all 0.2s',
    background: activeTab === tab ? '#2563eb' : 'transparent',
    color: activeTab === tab ? 'white' : '#6b7280',
  });

  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: 8,
    border: '1px solid #d1d5db', fontSize: 14, boxSizing: 'border-box',
    outline: 'none', marginTop: 4
  };

  const selectStyle = { ...inputStyle, background: 'white', cursor: 'pointer' };

  const msgBox = (msg) => msg && (
    <div style={{
      padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14,
      background: msg.type === 'success' ? '#f0fdf4' : '#fef2f2',
      color: msg.type === 'success' ? '#16a34a' : '#dc2626',
      border: `1px solid ${msg.type === 'success' ? '#86efac' : '#fecaca'}`
    }}>
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
        maxWidth: 640, margin: '40px auto', padding: '0 20px'
      }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#1f2937' }}>
            ⚙️ Account Settings
          </h1>
          <p style={{ color: '#6b7280', margin: '4px 0 0' }}>
            Manage your profile and preferences
          </p>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', gap: 4, marginBottom: 24,
          background: '#f3f4f6', padding: 4, borderRadius: 10
        }}>
          <button style={tabStyle('profile')} onClick={() => setActiveTab('profile')}>
            👤 Profile
          </button>
          <button style={tabStyle('preferences')} onClick={() => setActiveTab('preferences')}>
            🎨 Preferences
          </button>
          <button style={tabStyle('danger')} onClick={() => setActiveTab('danger')}>
            🗑️ Danger Zone
          </button>
        </div>

        {/* ── PROFILE TAB ── */}
        {activeTab === 'profile' && (
          <div style={{
            background: 'white', borderRadius: 16, padding: 28,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            {/* Avatar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
              {user?.picture ? (
                <img src={user.picture} alt="avatar"
                  style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <div style={{
                  width: 64, height: 64, borderRadius: '50%', background: '#2563eb',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 24, color: 'white', fontWeight: 700
                }}>
                  {user?.name?.[0]?.toUpperCase() || '?'}
                </div>
              )}
              <div>
                <div style={{ fontWeight: 700, fontSize: 18 }}>{user?.name}</div>
                <div style={{ color: '#6b7280', fontSize: 14 }}>{user?.email}</div>
                <div style={{
                  fontSize: 12, marginTop: 4, color: '#2563eb',
                  background: '#eff6ff', padding: '2px 8px', borderRadius: 20, display: 'inline-block'
                }}>
                  {user?.google_id ? '🔗 Google Account' : '📧 Email Account'}
                </div>
              </div>
            </div>

            {msgBox(profileMsg)}

            <form onSubmit={handleProfileSave}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>Full Name</label>
                <input
                  type="text"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  style={inputStyle}
                  required
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>Email</label>
                <input type="email" value={user?.email} disabled
                  style={{ ...inputStyle, background: '#f9fafb', color: '#9ca3af', cursor: 'not-allowed' }} />
                <span style={{ fontSize: 12, color: '#9ca3af' }}>Email cannot be changed</span>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>📍 Governorate</label>
                <select
                  value={profileForm.governorate}
                  onChange={(e) => setProfileForm({ ...profileForm, governorate: e.target.value })}
                  style={selectStyle}
                >
                  <option value="">-- Select --</option>
                  {GOVERNORATES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>👤 Your Situation</label>
                <select
                  value={profileForm.user_type}
                  onChange={(e) => setProfileForm({ ...profileForm, user_type: e.target.value })}
                  style={selectStyle}
                >
                  <option value="">-- Select --</option>
                  {USER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              <button type="submit" disabled={profileLoading} style={{
                width: '100%', padding: '12px 0', borderRadius: 8, border: 'none',
                background: '#2563eb', color: 'white', fontSize: 15,
                fontWeight: 700, cursor: profileLoading ? 'not-allowed' : 'pointer'
              }}>
                {profileLoading ? '⏳ Saving...' : '💾 Save Changes'}
              </button>
            </form>
          </div>
        )}

        {/* ── PREFERENCES TAB ── */}
        {activeTab === 'preferences' && (
          <div style={{
            background: 'white', borderRadius: 16, padding: 28,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ margin: '0 0 20px', color: '#1f2937' }}>🎨 Display Preferences</h3>

            {msgBox(prefMsg)}

            <div style={{
              background: '#fefce8', border: '1px solid #fde047',
              borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 13, color: '#854d0e'
            }}>
              🚧 Theme and language features are coming soon. Your selection will be saved and applied in the next update.
            </div>

            {/* Theme */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 14, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 12 }}>
                🌗 Theme
              </label>
              <div style={{ display: 'flex', gap: 12 }}>
                {[
                  { value: 'light', label: '☀️ Light', bg: '#ffffff', border: '#d1d5db' },
                  { value: 'dark', label: '🌙 Dark', bg: '#1f2937', border: '#374151' },
                ].map(opt => (
                  <div
                    key={opt.value}
                    onClick={() => setTheme(opt.value)}
                    style={{
                      flex: 1, padding: '16px', borderRadius: 10, cursor: 'pointer',
                      border: `2px solid ${theme === opt.value ? '#2563eb' : opt.border}`,
                      background: opt.bg, textAlign: 'center',
                      color: opt.value === 'dark' ? 'white' : '#1f2937',
                      fontWeight: theme === opt.value ? 700 : 400,
                      transition: 'border 0.2s'
                    }}
                  >
                    {opt.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Language */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 14, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 12 }}>
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
                      flex: 1, minWidth: 100, padding: '12px 8px', borderRadius: 10,
                      cursor: 'pointer', textAlign: 'center',
                      border: `2px solid ${language === opt.value ? '#2563eb' : '#d1d5db'}`,
                      background: language === opt.value ? '#eff6ff' : 'white',
                      fontWeight: language === opt.value ? 700 : 400,
                      color: language === opt.value ? '#2563eb' : '#374151',
                      transition: 'all 0.2s'
                    }}
                  >
                    {opt.label}
                  </div>
                ))}
              </div>
            </div>

            <button onClick={handlePrefSave} style={{
              width: '100%', padding: '12px 0', borderRadius: 8, border: 'none',
              background: '#2563eb', color: 'white', fontSize: 15,
              fontWeight: 700, cursor: 'pointer'
            }}>
              💾 Save Preferences
            </button>
          </div>
        )}

        {/* ── DANGER ZONE TAB ── */}
        {activeTab === 'danger' && (
          <div style={{
            background: 'white', borderRadius: 16, padding: 28,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: '1px solid #fecaca'
          }}>
            <h3 style={{ margin: '0 0 8px', color: '#dc2626' }}>⚠️ Danger Zone</h3>
            <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 24 }}>
              These actions are irreversible. Please proceed with caution.
            </p>

            <div style={{
              border: '1px solid #fecaca', borderRadius: 12, padding: 20
            }}>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#1f2937' }}>
                  🗑️ Delete this account
                </div>
                <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
                  Once deleted, your account and all associated data will be permanently removed.
                  This action <strong>cannot be undone</strong>.
                </div>
              </div>
              <button
                onClick={() => setShowDeleteModal(true)}
                style={{
                  padding: '10px 20px', borderRadius: 8,
                  border: '1px solid #dc2626', background: 'white',
                  color: '#dc2626', fontWeight: 700, fontSize: 14,
                  cursor: 'pointer', transition: 'all 0.2s'
                }}
                onMouseEnter={e => { e.target.style.background = '#dc2626'; e.target.style.color = 'white'; }}
                onMouseLeave={e => { e.target.style.background = 'white'; e.target.style.color = '#dc2626'; }}
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