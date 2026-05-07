import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useTranslation } from '../contexts/LanguageContext';

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

const Login = ({ onLoginSuccess, onSwitchToSignup }) => {
  const { t: __ } = useTranslation();
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
  const googleBtnRef = React.useRef(null);
  const googleInitializedRef = React.useRef(false);
  const googlePromptShownRef = React.useRef(false);

  const handleGoogleResponse = async (response) => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.post(`${API_URL}/api/auth/google`, {
        token: response.credential,
      });
      const user = res.data;
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

  useEffect(() => {
    let cancelled = false;

    const initGoogle = () => {
      if (cancelled || googleInitializedRef.current) return;
      if (!window.google || !googleBtnRef.current) {
        return false;
      }
      googleInitializedRef.current = true;

      try {
        window.google.accounts.id.initialize({
          client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID ||
            "932539718184-1rrvuua9t4907c8nkirk8n18cglm17hk.apps.googleusercontent.com",
          callback: handleGoogleResponse,
          auto_select: false,
        });

        const tryRender = () => {
          if (!googleBtnRef.current || googleBtnRef.current.querySelector('div')) return;
          const width = googleBtnRef.current.offsetWidth || 360;
          window.google.accounts.id.renderButton(
            googleBtnRef.current,
            { theme: "outline", size: "large", width: String(width), text: "signin_with" }
          );
        };

        tryRender();
        setTimeout(tryRender, 500);
        setTimeout(tryRender, 1500);

        if (!googlePromptShownRef.current) {
          googlePromptShownRef.current = true;
          try { window.google.accounts.id.prompt(); } catch (e) {}
        }
        return true;
      } catch (e) {
        console.error('Google button error:', e);
        return false;
      }
    };

    if (!initGoogle()) {
      let attempts = 0;
      const timer = setInterval(() => {
        attempts++;
        if (initGoogle() || attempts > 50) {
          clearInterval(timer);
        }
      }, 300);
      return () => { clearInterval(timer); cancelled = true; };
    }

    return () => { cancelled = true; };
  }, []);

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

  const inputStyle = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 12,
    border: '1px solid #334155',
    background: '#1e293b',
    fontSize: 14,
    color: 'white',
    outline: 'none',
    transition: 'all 0.2s',
    boxSizing: 'border-box',
  };

  const selectStyle = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 12,
    border: '1px solid #334155',
    background: '#1e293b',
    fontSize: 14,
    color: 'white',
    cursor: 'pointer',
    outline: 'none',
    transition: 'all 0.2s',
  };

  const labelStyle = {
    display: 'block',
    fontSize: 12,
    fontWeight: 500,
    color: '#94a3b8',
    marginBottom: 6,
    letterSpacing: '0.3px',
  };

  // ==================== PROFILE COMPLETION SCREEN (Google new users) ====================
  if (showProfileCompletion) {
    return (
      <div style={{
        background: "linear-gradient(135deg, #0f172a 0%, #0a0f1c 100%)",
        borderRadius: 24,
        border: "1px solid rgba(29, 158, 117, 0.2)",
        padding: "2rem",
        maxWidth: 480,
        margin: "0 auto",
        animation: "slideUp 0.3s ease-out",
      }}>
        <style>
          {`
            @keyframes slideUp {
              from { opacity: 0; transform: translateY(20px); }
              to { opacity: 1; transform: translateY(0); }
            }
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}
        </style>

        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          {googleProfile?.picture && (
            <img 
              src={googleProfile.picture} 
              alt="profile"
              style={{ 
                width: 80, 
                height: 80, 
                borderRadius: '50%', 
                marginBottom: 12,
                border: '2px solid #1D9E75',
                padding: 2,
              }} 
            />
          )}
          <h2 style={{ fontSize: 20, fontWeight: 600, color: 'white', marginBottom: 8 }}>
            👋 {__('welcome')}, {googleProfile?.name}!
          </h2>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
            {__('profileCompletionPrompt')}
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            padding: '12px 16px',
            borderRadius: 12,
            marginBottom: 16,
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <span>⚠️</span> {error}
          </div>
        )}

        <form onSubmit={handleProfileCompletion}>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>
              <span style={{ marginRight: 4 }}>📍</span> {__('yourGovernorate')}
            </label>
            <select
              value={profileData.governorate}
              onChange={(e) => setProfileData({ ...profileData, governorate: e.target.value })}
              required
              style={selectStyle}
              onFocus={(e) => e.target.style.borderColor = '#1D9E75'}
              onBlur={(e) => e.target.style.borderColor = '#334155'}
            >
              <option value="" style={{ color: '#94a3b8' }}>{__('selectGovernorate')}</option>
              {GOVERNORATES.map(g => <option key={g} value={g} style={{ color: 'white' }}>{g}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>
              <span style={{ marginRight: 4 }}>👤</span> {__('yourSituation')}
            </label>
            <select
              value={profileData.user_type}
              onChange={(e) => setProfileData({ ...profileData, user_type: e.target.value })}
              required
              style={selectStyle}
              onFocus={(e) => e.target.style.borderColor = '#1D9E75'}
              onBlur={(e) => e.target.style.borderColor = '#334155'}
            >
              <option value="" style={{ color: '#94a3b8' }}>{__('selectSituation')}</option>
              {USER_TYPES.map(t => (
                <option key={t.value} value={t.value} style={{ color: 'white' }}>
                  {t.icon} {t.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: 12,
              background: 'linear-gradient(135deg, #1D9E75 0%, #0f6e56 100%)',
              color: 'white',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: 14,
              fontWeight: 600,
              transition: 'all 0.2s',
              opacity: loading ? 0.6 : 1,
            }}
            onMouseEnter={(e) => { if (!loading) e.target.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={(e) => { if (!loading) e.target.style.transform = 'translateY(0)'; }}
          >
            {loading ? '⏳ ' + __('saving') : '🚀 ' + __('enterDashboard')}
          </button>
        </form>
      </div>
    );
  }

  // ==================== NORMAL LOGIN SCREEN ====================
  return (
    <div style={{
      background: "linear-gradient(135deg, #0f172a 0%, #0a0f1c 100%)",
      borderRadius: 24,
      border: "1px solid rgba(29, 158, 117, 0.2)",
      padding: "2rem",
      maxWidth: 480,
      margin: "0 auto",
      animation: "slideUp 0.3s ease-out",
    }}>
      <style>
        {`
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>

      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{
          background: "linear-gradient(135deg, #1D9E75 0%, #0f6e56 100%)",
          width: 56,
          height: 56,
          borderRadius: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 28,
          margin: '0 auto 12px',
        }}>
          🌦️
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 600, color: 'white', marginBottom: 8 }}>
          {__('loginTitle')}
        </h2>
        <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
          {__('loginSubtitle')}
        </p>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#f87171',
          padding: '12px 16px',
          borderRadius: 12,
          marginBottom: 20,
          fontSize: 13,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span>⚠️</span> {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>
            <span style={{ marginRight: 4 }}>📧</span> {__('email')}
          </label>
          <input
            type="email"
            value={email}
            placeholder="your@email.com"
            autoComplete="email"
            onChange={(e) => { setEmail(e.target.value); setError(''); }}
            required
            style={inputStyle}
            onFocus={(e) => e.target.style.borderColor = '#1D9E75'}
            onBlur={(e) => e.target.style.borderColor = '#334155'}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>
            <span style={{ marginRight: 4 }}>🔒</span> {__('password')}
          </label>
          <input
            type="password"
            value={password}
            placeholder={__('yourPassword')}
            autoComplete="current-password"
            onChange={(e) => { setPassword(e.target.value); setError(''); }}
            required
            style={inputStyle}
            onFocus={(e) => e.target.style.borderColor = '#1D9E75'}
            onBlur={(e) => e.target.style.borderColor = '#334155'}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: 12,
            background: 'linear-gradient(135deg, #1D9E75 0%, #0f6e56 100%)',
            color: 'white',
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: 14,
            fontWeight: 600,
            transition: 'all 0.2s',
            opacity: loading ? 0.6 : 1,
            marginBottom: 16,
          }}
          onMouseEnter={(e) => { if (!loading) e.target.style.transform = 'translateY(-1px)'; }}
          onMouseLeave={(e) => { if (!loading) e.target.style.transform = 'translateY(0)'; }}
        >
          {loading ? '⏳ ' + __('signingIn') : __('signIn')}
        </button>
      </form>

      <div style={{
        textAlign: 'center',
        position: 'relative',
        marginBottom: 16,
      }}>
        <div style={{
          borderTop: '1px solid #1e293b',
          position: 'relative',
        }}>
          <span style={{
            position: 'relative',
            top: '-10px',
            background: '#0f172a',
            padding: '0 12px',
            fontSize: 11,
            color: '#64748b',
          }}>
            {__('or')}
          </span>
        </div>
      </div>

      <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div id="googleSignInDiv" ref={googleBtnRef} style={{ minHeight: 40 }}></div>
        <button
          type="button"
          onClick={() => {
            if (window.google && window.google.accounts) {
              try { window.google.accounts.id.prompt(); } catch (e) {}
            }
          }}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: 12,
            border: '1px solid #334155',
            background: 'transparent',
            color: '#e2e8f0',
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => { e.target.style.borderColor = '#1D9E75'; e.target.style.background = 'rgba(29,158,117,0.05)'; }}
          onMouseLeave={(e) => { e.target.style.borderColor = '#334155'; e.target.style.background = 'transparent'; }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {__('continueWithGoogle')}
        </button>
      </div>

      <p style={{
        textAlign: 'center',
        fontSize: 13,
        color: '#64748b',
        margin: 0,
      }}>
        {__('noAccount')}{' '}
        <span
          onClick={onSwitchToSignup}
          style={{
            cursor: 'pointer',
            color: '#1D9E75',
            fontWeight: 600,
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => e.target.style.color = '#4ade80'}
          onMouseLeave={(e) => e.target.style.color = '#1D9E75'}
        >
          {__('signUp')}
        </span>
      </p>
    </div>
  );
};

export default Login;