import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import './App.css';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { LanguageProvider, useTranslation } from './contexts/LanguageContext';

import VigilanceMap from './components/VigilanceMap';
import Login from './components/Login';
import Signup from './components/Signup';
import { fetchHazards } from './services/hazardService';
import Settings from './components/Settings';
import ForumPage from './forum/pages/ForumPage';
import NewsPage from './pages/NewsPage';
import RoutePage from './pages/RoutePage';
import UserProfilePage from './forum/pages/UserProfilePage';

const ICONS = {
  logo: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
      <circle cx="12" cy="12" r="5"/>
    </svg>
  ),
  calendar: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  map: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>
    </svg>
  ),
  users: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  news: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-8"/><path d="M10 6h8v4h-8V6Z"/>
    </svg>
  ),
  route: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12h4l3-9 4 18 3-9h4"/>
    </svg>
  ),
  settings: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  logout: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  check: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  droplet: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
    </svg>
  ),
  wind: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/><path d="M9.6 4.6A2 2 0 1 1 11 8H2"/><path d="M12.6 19.4A2 2 0 1 0 14 16H2"/>
    </svg>
  ),
  thermometer: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/>
    </svg>
  ),
  user: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  shield: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  x: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
};

function getWeatherIcon(code) {
  if (code >= 95) return '⛈️';
  if (code >= 80) return '🌧️';
  if (code >= 61) return '🌦️';
  if (code >= 50) return '🌧️';
  if (code >= 45) return '🌫️';
  if (code >= 10) return '⛅';
  return '☀️';
}

function MainApp() {
  const { theme, t, toggleTheme } = useTheme();
  const { t: __, dir } = useTranslation();
  const isDark = theme === 'dark';

  const [user, setUser] = useState(null);
  const [showSignup, setShowSignup] = useState(false);

  const [selectedCities, setSelectedCities] = useState(['Tunis', 'Sfax', 'Bizerte']);
  const [forecastData, setForecastData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [apiStatus, setApiStatus] = useState('checking');
  const [apiUrl, setApiUrl] = useState('');
  const [governorates, setGovernorates] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [hazards, setHazards] = useState([]);
  const [showNeighbors, setShowNeighbors] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showForum, setShowForum] = useState(false);
  const [showNews, setShowNews] = useState(false);
  const [showRoute, setShowRoute] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [profileUsername, setProfileUsername] = useState('');
  const [profileIsOwn, setProfileIsOwn] = useState(false);
  const [profilePrev, setProfilePrev] = useState(null);

  const handleProfileBack = () => {
    setShowProfile(false);
    setShowSettings(false);
    if (profilePrev === 'forum') setShowForum(true);
    else if (profilePrev === 'news') setShowNews(true);
    else if (profilePrev === 'route') setShowRoute(true);
  };

  const riskLevels = useMemo(() => ({
    'GREEN': { color: isDark ? '#22c55e' : '#16a34a', bg: isDark ? '#22c55e18' : '#16a34a12', border: isDark ? '#22c55e33' : '#16a34a30', label: 'Safe' },
    'YELLOW': { color: isDark ? '#eab308' : '#ca8a04', bg: isDark ? '#eab30818' : '#ca8a0412', border: isDark ? '#eab30833' : '#ca8a0430', label: 'Caution' },
    'ORANGE': { color: isDark ? '#f97316' : '#ea580c', bg: isDark ? '#f9731618' : '#ea580c12', border: isDark ? '#f9731633' : '#ea580c30', label: 'Warning' },
    'RED': { color: isDark ? '#ef4444' : '#dc2626', bg: isDark ? '#ef444418' : '#dc262612', border: isDark ? '#ef444433' : '#dc262630', label: 'Alert' },
    'PURPLE': { color: isDark ? '#a855f7' : '#9333ea', bg: isDark ? '#a855f718' : '#9333ea12', border: isDark ? '#a855f733' : '#9333ea30', label: 'Emergency' },
  }), [isDark]);

  const cityCoordinates = {
    'Tunis': { x: 45, y: 35, lat: 36.8065, lng: 10.1815 },
    'Sfax': { x: 52, y: 58, lat: 34.7400, lng: 10.7600 },
    'Sousse': { x: 48, y: 45, lat: 35.8256, lng: 10.6411 },
    'Bizerte': { x: 42, y: 18, lat: 37.2744, lng: 9.8739 },
    'Jendouba': { x: 28, y: 25, lat: 36.5011, lng: 8.7803 },
    'Nabeul': { x: 55, y: 40, lat: 36.4561, lng: 10.7378 },
    'Gabes': { x: 52, y: 68, lat: 33.8815, lng: 10.0982 },
    'Medenine': { x: 55, y: 78, lat: 33.3549, lng: 10.5055 },
    'Kairouan': { x: 42, y: 48, lat: 35.6781, lng: 10.0963 },
    'Monastir': { x: 50, y: 42, lat: 35.7833, lng: 10.8333 },
    'Mahdia': { x: 52, y: 50, lat: 35.5047, lng: 11.0622 },
    'Gafsa': { x: 32, y: 62, lat: 34.4250, lng: 8.7842 },
    'Tozeur': { x: 25, y: 58, lat: 33.9197, lng: 8.1335 },
    'Kebili': { x: 38, y: 72, lat: 33.7044, lng: 8.9692 },
    'Tataouine': { x: 48, y: 88, lat: 32.9297, lng: 10.4518 },
    'Kasserine': { x: 30, y: 48, lat: 35.1676, lng: 8.8365 },
    'Beja': { x: 35, y: 25, lat: 36.7256, lng: 9.1817 },
    'Kef': { x: 28, y: 32, lat: 36.1741, lng: 8.7049 },
    'Siliana': { x: 38, y: 38, lat: 36.0849, lng: 9.3708 },
    'Zaghouan': { x: 48, y: 32, lat: 36.4029, lng: 10.1429 },
    'Ariana': { x: 44, y: 30, lat: 36.8667, lng: 10.2000 },
    'Ben Arous': { x: 46, y: 32, lat: 36.7533, lng: 10.2219 },
    'Manouba': { x: 42, y: 30, lat: 36.8081, lng: 10.0972 },
  };

  const possibleUrls = useMemo(() => {
    const urls = ['http://localhost:8001', 'http://127.0.0.1:8001'];
    if (process.env.REACT_APP_API_URL) urls.unshift(process.env.REACT_APP_API_URL);
    return [...new Set(urls)];
  }, []);

  const findWorkingApiUrl = useCallback(async () => {
    for (const url of possibleUrls) {
      try {
        const response = await axios.get(`${url}/health`, { timeout: 2000 });
        if (response.status === 200) {
          setApiUrl(url);
          setApiStatus('connected');
          return url;
        }
      } catch (err) { console.log(`Connection failed for ${url}`); }
    }
    setApiStatus('disconnected');
    return null;
  }, [possibleUrls]);

  useEffect(() => { findWorkingApiUrl(); }, [findWorkingApiUrl]);

  useEffect(() => {
    const fetchGovernorates = async () => {
      if (!apiUrl) return;
      try {
        const response = await axios.get(`${apiUrl}/api/governorates`);
        setGovernorates(response.data.governorates || response.data);
      } catch (err) { setGovernorates(Object.keys(cityCoordinates)); }
    };
    fetchGovernorates();
  }, [apiUrl]);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchForecasts = async () => {
      if (!user || selectedCities.length === 0 || apiStatus !== 'connected' || !selectedDate) {
        if (!cancelled) setLoading(false);
        return;
      }
      if (!cancelled) setLoading(true);
      try {
        const response = await axios.post(`${apiUrl}/api/weather/batch`, { cities: selectedCities, date: selectedDate }, { timeout: 15000 });
        if (!cancelled) {
          setForecastData(response.data.forecasts || {});
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError('Could not load weather data');
          setForecastData({});
        }
      }
      if (!cancelled) setLoading(false);
    };
    fetchForecasts();
    return () => { cancelled = true; };
  }, [selectedCities, selectedDate, apiUrl, apiStatus, user]);

  useEffect(() => {
    const loadHazards = async () => {
      const hazardData = await fetchHazards(apiUrl);
      setHazards(hazardData);
    };
    loadHazards();
    const interval = setInterval(loadHazards, 300000);
    return () => clearInterval(interval);
  }, [apiUrl]);

  const toggleCity = (city) => {
    setSelectedCities(prev => prev.includes(city) ? prev.filter(c => c !== city) : [...prev, city]);
  };

  const handleLogout = () => {
    setUser(null);
    setShowSignup(false);
  };

  const goToMyProfile = async () => {
    if (showForum) setProfilePrev('forum');
    else if (showNews) setProfilePrev('news');
    else if (showRoute) setProfilePrev('route');
    else setProfilePrev(null);
    try {
      const token = localStorage.getItem("forum_access_token");
      if (!token) return;
      const res = await axios.get(`${apiUrl}/api/forum/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfileUsername(res.data.username);
      setProfileIsOwn(true);
      setShowProfile(true);
    } catch {}
  };

  const handleProfileClick = (username) => {
    if (!username) return;
    if (showForum) setProfilePrev('forum');
    else if (showNews) setProfilePrev('news');
    else if (showRoute) setProfilePrev('route');
    else setProfilePrev(null);
    setProfileUsername(username);
    setProfileIsOwn(false);
    setShowProfile(true);
  };

  const getRiskColor = (riskLevel) => riskLevels[riskLevel]?.color || '#64748b';

  if (!user) {
    return (
      <div dir={dir} style={{
        minHeight: '100vh',
        background: isDark ? 'linear-gradient(135deg, #020617 0%, #0f172a 100%)' : 'linear-gradient(135deg, #f0fdf4 0%, #f8fafc 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}>
        {showSignup ? (
          <Signup onSignupSuccess={() => setShowSignup(false)} onSwitchToLogin={() => setShowSignup(false)} />
        ) : (
          <Login
            onLoginSuccess={(userData) => { setUser(userData); if (userData.forum_token) { localStorage.setItem("forum_access_token", userData.forum_token); } }}
            onSwitchToSignup={() => setShowSignup(true)}
          />
        )}
      </div>
    );
  }

  if (showProfile) return (
    <>
      <UserProfilePage username={profileUsername} onBack={handleProfileBack} isOwn={profileIsOwn} onEditProfile={() => setShowSettings(true)} />
      {showSettings && (
        <div style={{
          position: 'fixed', inset: 0,
          background: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)', zIndex: 999, overflowY: 'auto',
          animation: 'fadeIn 0.2s ease-out',
        }}>
          <div style={{ position: 'relative', minHeight: '100vh' }}>
            <button onClick={() => setShowSettings(false)}
              style={{
                position: 'fixed', top: 16, right: 16, zIndex: 1000,
                background: t.bgCard, border: `1px solid ${t.border}`,
                borderRadius: '50%', width: 36, height: 36, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: t.textSecondary, boxShadow: t.shadowCard,
              }}
            >{ICONS.x}</button>
            <Settings user={user} onLogout={handleLogout}
              onUserUpdate={(updatedUser) => { setUser(updatedUser); setShowSettings(false); }} />
          </div>
        </div>
      )}
    </>
  );
  if (showForum) return <ForumPage onBack={() => setShowForum(false)} existingUser={user} onProfileClick={handleProfileClick} onMyProfile={goToMyProfile} />;
  if (showNews) return <NewsPage onBack={() => setShowNews(false)} />;
  if (showRoute) return <RoutePage onBack={() => setShowRoute(false)} hazards={hazards} />;

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

  const citiesByRisk = selectedCities.reduce((acc, city) => {
    const data = forecastData[city];
    if (!data?.risk_level) return acc;
    const rl = riskLevels[data.risk_level] || riskLevels.GREEN;
    if (!acc[rl.color]) acc[rl.color] = { ...rl, count: 0 };
    acc[rl.color].count++;
    return acc;
  }, {});
  const sortedRisks = Object.values(citiesByRisk).sort((a, b) => {
    const order = { 'Emergency': 0, 'Alert': 1, 'Warning': 2, 'Caution': 3, 'Safe': 4 };
    return (order[a.label] ?? 5) - (order[b.label] ?? 5);
  });

  const selectAll = () => setSelectedCities([...governorates]);
  const clearAll = () => setSelectedCities([]);

  return (
    <div dir={dir} style={{
      minHeight: '100vh',
      background: t.bg,
      color: t.text,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      transition: 'background 0.3s ease, color 0.3s ease',
    }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.6;transform:scale(1.2)} }
        @keyframes slideDown { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        * { box-sizing: border-box; }
        input[type="date"]::-webkit-calendar-picker-indicator { cursor: pointer; opacity: 0.6; }
        .gov-btn:hover { border-color: ${t.border} !important; background: ${t.bgHover} !important; }
        .gov-btn.active { border-color: ${t.accent} !important; background: ${t.accentBg} !important; }
        .nav-btn { transition: all 0.15s ease; }
        .nav-btn:hover { transform: translateY(-1px); }
        .weather-card { transition: all 0.15s ease; }
        .weather-card:hover { border-color: ${t.border} !important; box-shadow: 0 4px 12px rgba(0,0,0,${isDark ? '0.3' : '0.06'}) !important; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${t.scrollbar}; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: ${t.scrollbarHover}; }
      `}</style>

      {/* Header */}
      <header style={{
        background: t.bgHeader,
        borderBottom: `1px solid ${t.border}`,
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: t.shadow,
        transition: 'background 0.3s ease, border-color 0.3s ease',
      }}>
        <div style={{
          maxWidth: 1440,
          margin: '0 auto',
          padding: '0 24px',
          height: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              background: 'linear-gradient(135deg, #16a34a, #15803d)',
              width: 34,
              height: 34,
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
            }}>
              {ICONS.logo}
            </div>
            <div>
              <h1 style={{
                fontSize: 16,
                fontWeight: 700,
                margin: 0,
                lineHeight: 1.2,
                color: '#0f172a',
              }}>
                WeatherGuard<span style={{ color: '#16a34a' }}>TN</span>
              </h1>
              <p style={{ fontSize: 10, color: '#94a3b8', margin: 0, lineHeight: 1 }}>{__('appSubtitle')}</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              background: t.bgMuted,
              padding: '6px 12px',
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: t.textSecondary,
            }}>
              {ICONS.calendar}
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'inherit',
                  fontSize: 12,
                  fontWeight: 600,
                  outline: 'none',
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                }}
              />
            </div>

            <div style={{ width: 1, height: 24, background: t.border }} />

            {[
              { icon: ICONS.users, label: __('forum'), action: () => setShowForum(true), bg: t.accent, border: null, color: '#fff' },
              { icon: ICONS.news, label: __('news'), action: () => setShowNews(true), bg: 'transparent', border: t.border, color: t.textSecondary },
              { icon: ICONS.route, label: __('routes'), action: () => setShowRoute(true), bg: 'transparent', border: t.border, color: t.textSecondary },
            ].map(btn => (
              <button
                key={btn.label}
                onClick={btn.action}
                className="nav-btn"
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  background: btn.bg,
                  border: btn.border ? `1px solid ${btn.border}` : 'none',
                  color: btn.color || '#fff',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  fontFamily: 'inherit',
                }}
              >
                {btn.icon}
                {btn.label}
              </button>
            ))}

            <div style={{ width: 1, height: 24, background: t.border }} />

            <div onClick={goToMyProfile}
              style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 10px 4px 4px',
              background: t.bgTag,
              borderRadius: 20,
              border: `1px solid ${t.border}`,
              cursor: 'pointer',
            }}>
              <div style={{
                width: 26,
                height: 26,
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${t.accent}, ${isDark ? '#0f6e56' : '#15803d'})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
              }}>
                {ICONS.user}
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: t.textSecondary }}>{(user?.display_name || user?.username || 'User')}</span>
            </div>

            <button
              onClick={toggleTheme}
              className="nav-btn"
              style={{
                padding: '6px 10px',
                borderRadius: 8,
                background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                border: `1px solid ${t.border}`,
                color: t.textSecondary,
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontFamily: 'inherit',
              }}
              title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
            >
              {isDark ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              )}
            </button>

            <button
              onClick={handleLogout}
              className="nav-btn"
              style={{
                padding: '6px 10px',
                borderRadius: 8,
                background: 'transparent',
                border: `1px solid ${t.dangerBorder}`,
                color: t.danger,
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontFamily: 'inherit',
              }}
            >
              {ICONS.logout}
            </button>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              borderRadius: 20,
              background: apiStatus === 'connected' ? t.accentBg : t.dangerBg,
              border: `1px solid ${apiStatus === 'connected' ? t.accentBorder : t.dangerBorder}`,
            }}>
              <div style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: apiStatus === 'connected' ? t.accent : t.danger,
                animation: apiStatus === 'connected' ? 'pulse 1.5s ease-in-out infinite' : 'none',
              }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: apiStatus === 'connected' ? t.accent : t.danger, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {apiStatus === 'connected' ? 'Live' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div style={{
          background: t.dangerBg,
          border: `1px solid ${t.dangerBorder}`,
          color: t.danger,
          padding: '10px 20px',
          textAlign: 'center',
          fontSize: 13,
          fontWeight: 500,
          animation: 'slideDown 0.3s ease-out',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          {error}
        </div>
      )}

      {/* Status Bar */}
      <div style={{
        maxWidth: 1440,
        margin: '0 auto',
        padding: '16px 24px 0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: t.text }}>Vigilance Dashboard</h2>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: t.textMuted }}>{dateStr} · {timeStr}</p>
        </div>
        {sortedRisks.length > 0 && (
          <div style={{ display: 'flex', gap: 8 }}>
            {sortedRisks.map(risk => (
              <div key={risk.color} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: risk.bg,
                border: `1px solid ${risk.border}`,
                borderRadius: 8,
                padding: '5px 12px',
              }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: risk.color }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: risk.color }}>{risk.count} {risk.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dashboard Grid */}
      <div style={{
        maxWidth: 1440,
        margin: '0 auto',
        padding: '16px 24px 24px',
        display: 'grid',
        gridTemplateColumns: '260px 1fr 340px',
        gap: 16,
        alignItems: 'start',
      }}>
        {/* Sidebar */}
        <div style={{
          background: t.bgCard,
          borderRadius: 14,
          border: `1px solid ${t.border}`,
          overflow: 'hidden',
          position: 'sticky',
          top: 76,
          transition: 'background 0.3s ease, border-color 0.3s ease',
        }}>
          <div style={{
            padding: '14px 16px',
            borderBottom: `1px solid ${t.borderLight}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: t.accentBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: t.accent,
              }}>
                {ICONS.shield}
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: t.text }}>Governorates</span>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={selectAll} style={{ fontSize: 10, color: t.accent, background: t.accentBg, border: `1px solid ${t.accentBorder}`, borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}>All</button>
              <button onClick={clearAll} style={{ fontSize: 10, color: t.textMuted, background: t.bgTag, border: `1px solid ${t.border}`, borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}>None</button>
            </div>
          </div>

          <div style={{ padding: '8px 10px', maxHeight: 520, overflowY: 'auto' }}>
            {governorates.map(city => {
              const isSelected = selectedCities.includes(city);
              const data = forecastData[city];
              const risk = data?.risk_level ? riskLevels[data.risk_level] : null;
              return (
                <button
                  key={city}
                  onClick={() => toggleCity(city)}
                  className={`gov-btn ${isSelected ? 'active' : ''}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: `1px solid ${isSelected ? t.accent + '40' : 'transparent'}`,
                    background: 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    marginBottom: 2,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {isSelected && (
                      <div style={{ color: t.accent }}>{ICONS.check}</div>
                    )}
                    <span style={{ fontSize: 12, fontWeight: 500, color: isSelected ? t.text : t.textSecondary }}>{city}</span>
                  </div>
                  {risk && (
                    <div style={{
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      background: risk.color,
                      border: `2px solid ${t.bgCard}`,
                      boxShadow: `0 0 0 1px ${risk.color}40`,
                    }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Map */}
        <div style={{
          background: t.bgCard,
          borderRadius: 14,
          border: `1px solid ${t.border}`,
          overflow: 'hidden',
          transition: 'background 0.3s ease, border-color 0.3s ease',
        }}>
          <div style={{
            padding: '12px 16px',
            borderBottom: `1px solid ${t.borderLight}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ color: t.textSecondary }}>{ICONS.map}</div>
              <span style={{ fontSize: 13, fontWeight: 700, color: t.text }}>Vigilance Map</span>
              <span style={{ fontSize: 10, color: t.textMuted, fontWeight: 500 }}>· {selectedCities.length} cities</span>
            </div>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11,
              color: t.textMuted,
              cursor: 'pointer',
              fontWeight: 500,
            }}>
              <input
                type="checkbox"
                checked={showNeighbors}
                onChange={(e) => setShowNeighbors(e.target.checked)}
                style={{ accentColor: '#16a34a', width: 14, height: 14, cursor: 'pointer' }}
              />
              Neighbors
            </label>
          </div>
          <VigilanceMap
            selectedCities={selectedCities}
            forecastData={forecastData}
            hazards={hazards}
            showNeighbors={showNeighbors}
            onCityClick={toggleCity}
          />
        </div>

        {/* Weather Cards */}
        <div style={{
          position: 'sticky',
          top: 76,
        }}>
          <div style={{
            background: t.bgCard,
            borderRadius: 14,
            border: `1px solid ${t.border}`,
            overflow: 'hidden',
            transition: 'background 0.3s ease, border-color 0.3s ease',
          }}>
            <div style={{
              padding: '14px 16px',
              borderBottom: `1px solid ${t.borderLight}`,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <div style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: isDark ? 'rgba(59,130,246,0.15)' : '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#3b82f6',
              }}>
                {ICONS.thermometer}
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: t.text }}>Weather Details</span>
              <span style={{ fontSize: 10, color: t.textMuted, fontWeight: 500, marginLeft: 'auto' }}>{selectedCities.length} locations</span>
            </div>

            <div style={{ padding: '8px 12px', maxHeight: 620, overflowY: 'auto' }}>
              {selectedCities.map(city => {
                const data = forecastData[city];
                const hasData = data && data.risk_level;
                const risk = hasData ? riskLevels[data.risk_level] : null;
                const weather = hasData ? (data.weather || {}) : {};

                return (
                  <div
                    key={city}
                    className="weather-card"
                    style={{
                      padding: 12,
                      borderRadius: 10,
                      border: `1px solid ${risk ? risk.border : t.border}`,
                      background: risk ? risk.bg : t.bgCard,
                      marginBottom: 6,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 20 }}>{hasData ? getWeatherIcon(weather.weather_code) : '—'}</span>
                        <div>
                          <span style={{ fontSize: 13, fontWeight: 700, color: t.text }}>{city}</span>
                          {hasData && <div style={{ fontSize: 10, color: t.textMuted, fontWeight: 500 }}>{weather.temp_max}° / {weather.temp_min}°</div>}
                        </div>
                      </div>
                      {risk && (
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: 9,
                          fontWeight: 700,
                          background: risk.color,
                          color: '#fff',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                        }}>
                          {risk.label}
                        </span>
                      )}
                    </div>

                    {hasData ? (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                        <div style={{ background: t.bgCard, borderRadius: 8, padding: '6px 8px', textAlign: 'center', border: `1px solid ${t.borderLight}` }}>
                          <div style={{ fontSize: 9, color: t.textMuted, fontWeight: 600, textTransform: 'uppercase' }}>Temp</div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: t.text }}>{weather.temp_avg}°</div>
                        </div>
                        <div style={{ background: t.bgCard, borderRadius: 8, padding: '6px 8px', textAlign: 'center', border: `1px solid ${t.borderLight}` }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, fontSize: 9, color: t.textMuted, fontWeight: 600, textTransform: 'uppercase' }}>{ICONS.wind} Wind</div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: t.text }}>{weather.wind_speed}</div>
                        </div>
                        <div style={{ background: t.bgCard, borderRadius: 8, padding: '6px 8px', textAlign: 'center', border: `1px solid ${t.borderLight}` }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, fontSize: 9, color: t.textMuted, fontWeight: 600, textTransform: 'uppercase' }}>{ICONS.droplet} Rain</div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: t.text }}>{weather.precipitation}</div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '12px 0', color: t.textMuted, fontSize: 11 }}>Loading...</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer style={{
        background: t.bgCard,
        borderTop: `1px solid ${t.border}`,
        padding: '14px 24px',
        textAlign: 'center',
        transition: 'background 0.3s ease, border-color 0.3s ease',
      }}>
        <p style={{ margin: 0, fontSize: 11, color: t.textMuted }}>
          WeatherGuardTN · Powered by Open-Meteo API · AI Risk Assessment
        </p>
      </footer>
    </div>
  );
}

function AppWrapper() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <MainApp />
      </ThemeProvider>
    </LanguageProvider>
  );
}

export default AppWrapper;
