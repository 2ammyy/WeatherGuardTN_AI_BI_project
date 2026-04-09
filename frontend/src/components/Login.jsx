import React, { useEffect, useState } from 'react';
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

const Login = ({ onLoginSuccess, onSwitchToSignup }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Google first-time profile completion
  const [googleToken, setGoogleToken] = useState(null);
  const [googleProfile, setGoogleProfile] = useState(null);
  const [showProfileCompletion, setShowProfileCompletion] = useState(false);
  const [profileData, setProfileData] = useState({ governorate: '', user_type: '' });

  // ==================== GOOGLE AUTH ====================
  useEffect(() => {
    /* global google */
    if (window.google) {
      google.accounts.id.initialize({
        client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID ||
          "932539718184-1rrvuua9t4907c8nkirk8n18cglm17hk.apps.googleusercontent.com",
        callback: handleGoogleResponse,
      });
      google.accounts.id.renderButton(
        document.getElementById("googleSignInDiv"),
        { theme: "outline", size: "large", width: "100%" }
      );
    }
  }, []);

  const handleGoogleResponse = async (response) => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.post(`${API_URL}/api/auth/google`, {
        token: response.credential,
      });
      const user = res.data;
      // New user — no profile yet → show completion form
      if (!user.governorate || !user.user_type) {
        setGoogleToken(response.credential);
        setGoogleProfile(user);
        setShowProfileCompletion(true);
      } else {
        onLoginSuccess(user);
      }
    } catch (err) {
      setError('Google sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileCompletion = async (e) => {
    e.preventDefault();
    if (!profileData.governorate) { setError('Please select your governorate.'); return; }
    if (!profileData.user_type) { setError('Please select your situation.'); return; }
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/auth/google`, {
        token: googleToken,
        governorate: profileData.governorate,
        user_type: profileData.user_type,
      });
      onLoginSuccess(res.data);
    } catch (err) {
      setError('Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ==================== EMAIL LOGIN ====================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await axios.post(`${API_URL}/api/auth/login`, { email, password });
      onLoginSuccess(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const selectStyle = {
    width: '100%', padding: '10px 12px', borderRadius: '8px',
    border: '1px solid #d1d5db', fontSize: '14px',
    background: 'white', cursor: 'pointer'
  };

  // ==================== PROFILE COMPLETION SCREEN (Google new users) ====================
  if (showProfileCompletion) {
    return (
      <div className="auth-card">
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          {googleProfile?.picture && (
            <img src={googleProfile.picture} alt="profile"
              style={{ width: 64, height: 64, borderRadius: '50%', marginBottom: 8 }} />
          )}
          <h2>👋 Welcome, {googleProfile?.name}!</h2>
          <p>One last step — tell us about yourself so we can personalize your alerts</p>
        </div>

        {error && (
          <div style={{
            background: '#fee2e2', color: '#dc2626', padding: '10px 14px',
            borderRadius: '8px', marginBottom: '12px', fontSize: '14px'
          }}>⚠️ {error}</div>
        )}

        <form onSubmit={handleProfileCompletion}>
          <div className="input-group">
            <label>📍 Your Governorate</label>
            <select value={profileData.governorate}
              onChange={(e) => setProfileData({ ...profileData, governorate: e.target.value })}
              required style={selectStyle}>
              <option value="">-- Select your governorate --</option>
              {GOVERNORATES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          <div className="input-group">
            <label>👤 Your Situation</label>
            <select value={profileData.user_type}
              onChange={(e) => setProfileData({ ...profileData, user_type: e.target.value })}
              required style={selectStyle}>
              <option value="">-- Select your situation --</option>
              {USER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <button type="submit" className="auth-btn" disabled={loading} style={{ marginTop: '8px' }}>
            {loading ? '⏳ Saving...' : '🚀 Enter Dashboard'}
          </button>
        </form>
      </div>
    );
  }

  // ==================== NORMAL LOGIN SCREEN ====================
  return (
    <div className="auth-card">
      <h2><i className="fas fa-sign-in-alt"></i> Login</h2>
      <p>Access WeatherGuardTN Dashboard</p>

      {error && (
        <div style={{
          background: '#fee2e2', color: '#dc2626', padding: '10px 14px',
          borderRadius: '8px', marginBottom: '12px', fontSize: '14px'
        }}>⚠️ {error}</div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <label>Email</label>
          <input type="email" value={email} placeholder="your@email.com"
            onChange={(e) => { setEmail(e.target.value); setError(''); }} required />
        </div>
        <div className="input-group">
          <label>Password</label>
          <input type="password" value={password} placeholder="Your password"
            onChange={(e) => { setPassword(e.target.value); setError(''); }} required />
        </div>
        <button type="submit" className="auth-btn" disabled={loading}>
          {loading ? '⏳ Signing in...' : 'Sign In'}
        </button>
      </form>

      <div className="separator"><span>OR</span></div>
      <div id="googleSignInDiv"></div>

      <p className="auth-footer">
        Don't have an account?{' '}
        <span onClick={onSwitchToSignup} style={{ cursor: 'pointer', color: '#2563eb', fontWeight: 600 }}>
          Sign Up
        </span>
      </p>
    </div>
  );
};

export default Login;