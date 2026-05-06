// BUILD v2026-05-04-12-25-no-bom
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import './App.css';

// Import components
import VigilanceMap from './components/VigilanceMap';
import HazardLegend from './components/HazardLegend';
import RouteChecker from './components/RouteChecker';
import Login from './components/Login'; 
import Signup from './components/Signup'; 
import { fetchHazards } from './services/hazardService';
import Settings from './components/Settings';
import ForumPage from './forum/pages/ForumPage';
import NewsPage from './pages/NewsPage';

function App() {
  // ==================== AUTH STATE ====================
  const [user, setUser] = useState(null);
  const [showSignup, setShowSignup] = useState(false);

  // ==================== WEATHER STATE VARIABLES ====================
  const [selectedCities, setSelectedCities] = useState(['Tunis', 'Sfax', 'Bizerte']);
  const [forecastData, setForecastData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [apiStatus, setApiStatus] = useState('checking');
  const [apiUrl, setApiUrl] = useState('');
  const [governorates, setGovernorates] = useState([]);
  const [hoveredCity, setHoveredCity] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [hazards, setHazards] = useState([]);
  const [showNeighbors, setShowNeighbors] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showForum, setShowForum] = useState(false);
  const [showNews, setShowNews] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // ==================== RISK CONFIGURATION ====================
  const riskLevels = {
    'GREEN': { color: '#22c55e', light: '#22c55e20', emoji: '??', label: 'SAFE', description: 'Normal conditions' },
    'YELLOW': { color: '#eab308', light: '#eab30820', emoji: '??', label: 'WATCH', description: 'Be aware' },
    'ORANGE': { color: '#f97316', light: '#f9731620', emoji: '??', label: 'WARN', description: 'Prepare for disruptions' },
    'RED': { color: '#ef4444', light: '#ef444420', emoji: '??', label: 'ALERT', description: 'Take action' },
    'PURPLE': { color: '#a855f7', light: '#a855f720', emoji: '??', label: 'EVAC', description: 'Emergency response' }
  };

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
    'Manouba': { x: 42, y: 30, lat: 36.8081, lng: 10.0972 }
  };

  // ==================== API CONNECTION ====================
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

  // ==================== EFFECTS ====================
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
    const fetchForecasts = async () => {
      if (!user || selectedCities.length === 0 || apiStatus !== 'connected' || !selectedDate) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const forecasts = {};
      const failed = [];
      const todayStr = new Date().toISOString().split('T')[0];
      const isToday = selectedDate === todayStr;

      for (const city of selectedCities) {
        try {
          const endpoint = isToday ? '/api/current-weather' : '/api/forecast-by-date';
          const response = await axios.post(`${apiUrl}${endpoint}`, { date: selectedDate, city: city }, { timeout: 5000 });
          if (response.data) forecasts[city] = response.data;
        } catch (err) { failed.push(city); }
      }
      setForecastData(forecasts);
      setLoading(false);
      setError(failed.length > 0 ? `Could not load: ${failed.join(', ')}` : null);
    };
    fetchForecasts();
  }, [selectedCities, selectedDate, apiUrl, apiStatus, user]);

  useEffect(() => {
    const loadHazards = async () => {
      const hazardData = await fetchHazards();
      setHazards(hazardData);
    };
    loadHazards();
    const interval = setInterval(loadHazards, 300000);
    return () => clearInterval(interval);
  }, []);

  // ==================== HANDLERS ====================
  const toggleCity = (city) => {
    setSelectedCities(prev => prev.includes(city) ? prev.filter(c => c !== city) : [...prev, city]);
  };

  const handleLogout = () => {
    setUser(null);
    setShowSignup(false);
  };

  const getRiskColor = (riskLevel) => riskLevels[riskLevel]?.color || '#64748b';
  const getRiskEmoji = (riskLevel) => riskLevels[riskLevel]?.emoji || '?';

  // ==================== CONDITIONAL RENDER ====================
  
  if (!user) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #020617 0%, #0f172a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}>
        {showSignup ? (
          <Signup 
            onSignupSuccess={() => setShowSignup(false)} 
            onSwitchToLogin={() => setShowSignup(false)}
          />
        ) : (
          <Login 
            onLoginSuccess={(userData) => { setUser(userData); if(userData.forum_token){ localStorage.setItem("forum_access_token", userData.forum_token); } }} 
            onSwitchToSignup={() => setShowSignup(true)}
          />
        )}
      </div>
    );
  }

  if (showForum) return <ForumPage onBack={() => setShowForum(false)} existingUser={user} />;
  if (showNews) return <NewsPage onBack={() => setShowNews(false)} />;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#020617',
      color: 'white',
      fontFamily: 'sans-serif',
    }}>
      <style>
        {`
          @keyframes slideDown {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `}
      </style>

      {/* Header */}
      <header style={{
        background: 'rgba(11, 17, 32, 0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #1e293b',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{
          maxWidth: 1400,
          margin: '0 auto',
          padding: '0 24px',
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              background: 'linear-gradient(135deg, #1D9E75 0%, #0f6e56 100%)',
              width: 36,
              height: 36,
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
            }}>
              ???
            </div>
            <div>
              <h1 style={{
                fontSize: 18,
                fontWeight: 700,
                margin: 0,
                background: 'linear-gradient(135deg, #fff 0%, #9FE1CB 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                WeatherGuard<span style={{ color: '#1D9E75', background: 'none', WebkitTextFillColor: '#1D9E75' }}>TN</span>
              </h1>
              <p style={{ fontSize: 10, color: '#64748b', margin: 0 }}>AI-Powered Weather Intelligence</p>
            </div>
          </div>

          {/* Date Selector */}
          <div style={{
            background: '#1e293b',
            padding: '6px 12px',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <span style={{ fontSize: 14 }}>??</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'white',
                fontSize: 13,
                outline: 'none',
                cursor: 'pointer',
              }}
            />
          </div>

          {/* User Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => setShowForum(true)}
              style={{
                padding: '6px 14px',
                borderRadius: 10,
                background: 'linear-gradient(135deg, #1D9E75 0%, #0f6e56 100%)',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => e.target.style.transform = 'translateY(-1px)'}
              onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
            >
              <span>💬</span> Forum
            </button>

            <button
              onClick={() => setShowNews(true)}
              style={{
                padding: '6px 14px',
                borderRadius: 10,
                background: 'rgba(6, 182, 212, 0.1)',
                border: '1px solid rgba(6, 182, 212, 0.3)',
                color: '#06b6d4',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(6, 182, 212, 0.2)';
                e.target.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(6, 182, 212, 0.1)';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              <span>📰</span> Actualités
            </button>

            <button
              onClick={() => setShowSettings(true)}
              style={{
                padding: '6px 14px',
                borderRadius: 10,
                background: 'transparent',
                border: '1px solid #334155',
                color: '#94a3b8',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 500,
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.target.style.borderColor = '#1D9E75';
                e.target.style.color = '#1D9E75';
              }}
              onMouseLeave={(e) => {
                e.target.style.borderColor = '#334155';
                e.target.style.color = '#94a3b8';
              }}
            >
              ?? Settings
            </button>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 8px',
              background: '#1e293b',
              borderRadius: 20,
            }}>
              <div style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #1D9E75 0%, #0f6e56 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
              }}>
                ??
              </div>
              <span style={{ fontSize: 13, color: 'white' }}>{user.name || 'User'}</span>
            </div>

            <button
              onClick={handleLogout}
              style={{
                padding: '6px 14px',
                borderRadius: 10,
                background: 'transparent',
                border: '1px solid #ef4444',
                color: '#ef4444',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 500,
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#ef4444';
                e.target.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent';
                e.target.style.color = '#ef4444';
              }}
            >
              Logout
            </button>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              borderRadius: 20,
              background: apiStatus === 'connected' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${apiStatus === 'connected' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            }}>
              <div style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: apiStatus === 'connected' ? '#22c55e' : '#ef4444',
                animation: apiStatus === 'connected' ? 'pulse 1.5s ease-in-out infinite' : 'none',
              }} />
              <span style={{ fontSize: 11, color: apiStatus === 'connected' ? '#4ade80' : '#f87171' }}>
                {apiStatus === 'connected' ? 'Live' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#f87171',
          padding: '12px 20px',
          textAlign: 'center',
          fontSize: 13,
          animation: 'slideDown 0.3s ease-out',
        }}>
          <strong>?? {error}</strong>
        </div>
      )}

      {/* Dashboard Grid */}
      <div style={{
        maxWidth: 1400,
        margin: '0 auto',
        padding: '24px',
        display: 'grid',
        gridTemplateColumns: '280px 1fr 320px',
        gap: 20,
      }}>
        {/* City Panel */}
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #0a0f1c 100%)',
          borderRadius: 16,
          border: '1px solid #1e293b',
          padding: '20px',
          height: 'fit-content',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <span style={{ fontSize: 20 }}>??</span>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Governorates</h3>
          </div>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            maxHeight: 500,
            overflowY: 'auto',
          }}>
            {governorates.map(city => (
              <button
                key={city}
                onClick={() => toggleCity(city)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: `1px solid ${selectedCities.includes(city) ? '#1D9E75' : '#1e293b'}`,
                  background: selectedCities.includes(city) ? 'rgba(29, 158, 117, 0.1)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (!selectedCities.includes(city)) {
                    e.currentTarget.style.borderColor = '#334155';
                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!selectedCities.includes(city)) {
                    e.currentTarget.style.borderColor = '#1e293b';
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <span style={{ fontSize: 13, color: 'white' }}>{city}</span>
                {forecastData[city] && (
                  <span style={{
                    display: 'inline-block',
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: getRiskColor(forecastData[city].risk_level),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                  }}>
                    {getRiskEmoji(forecastData[city].risk_level)}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Map Panel */}
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #0a0f1c 100%)',
          borderRadius: 16,
          border: '1px solid #1e293b',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>???</span>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Vigilance Map</h3>
            </div>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 12,
              color: '#94a3b8',
              cursor: 'pointer',
            }}>
              <input
                type="checkbox"
                checked={showNeighbors}
                onChange={(e) => setShowNeighbors(e.target.checked)}
                style={{
                  width: 16,
                  height: 16,
                  cursor: 'pointer',
                  accentColor: '#1D9E75',
                }}
              />
              Show Neighbors
            </label>
          </div>
          <VigilanceMap
            selectedCities={selectedCities}
            forecastData={forecastData}
            hazards={hazards}
            showNeighbors={showNeighbors}
            onCityClick={toggleCity}
          />
          <HazardLegend />
        </div>

        {/* Risk Overview */}
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #0a0f1c 100%)',
          borderRadius: 16,
          border: '1px solid #1e293b',
          padding: '20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Meteo & Risques</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {selectedCities.map(city => {
              const data = forecastData[city];
              const hasData = data && data.risk_level;
              const risk = hasData ? data.risk_level : 'UNKNOWN';
              const riskConfig = riskLevels[risk] || { color: '#64748b', light: '#64748b10', emoji: '?', label: 'N/A', description: 'No data' };
              const weather = hasData ? (data.weather || {}) : {};

              return (
                <div
                  key={city}
                  style={{
                    padding: '14px',
                    borderRadius: 12,
                    background: hasData ? riskConfig.light : 'rgba(100, 116, 139, 0.08)',
                    border: `2px solid ${hasData ? riskConfig.color + '50' : '#334155'}`,
                    position: 'relative',
                    zIndex: 1,
                    marginBottom: '8px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>
                      {city}
                    </h4>
                    {hasData && (
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: 8,
                        fontSize: 10,
                        fontWeight: 700,
                        background: riskConfig.color,
                        color: 'white',
                      }}>
                        {riskConfig.label}
                      </span>
                    )}
                  </div>

                  {hasData ? (
                    <div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 8px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 4 }}>TEMP</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc' }}>
                            {weather.temp_avg || 'N/A'} C
                          </div>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 8px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 4 }}>WIND</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc' }}>
                            {weather.wind_speed || 'N/A'} km/h
                          </div>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 8px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 4 }}>HUMIDITY</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc' }}>
                            {weather.humidity || 'N/A'}%
                          </div>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 8px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 4 }}>RAIN</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc' }}>
                            {weather.precipitation || 'N/A'} mm
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '12px 0', color: '#64748b', fontSize: 11 }}>
                      No data available
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Route Checker */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 24px 24px' }}>
        <RouteChecker hazards={hazards} />
      </div>

      {/* Footer */}
      <footer style={{
        background: '#0b1120',
        borderTop: '1px solid #1e293b',
        padding: '20px',
        textAlign: 'center',
      }}>
        <p style={{ margin: 0, fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <span>??</span> Protecting lives � Model: 99.58% accuracy
        </p>
      </footer>

      {/* Settings Modal */}
      {showSettings && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(4px)',
          zIndex: 999,
          overflowY: 'auto',
          animation: 'fadeIn 0.2s ease-out',
        }}>
          <div style={{ position: 'relative', minHeight: '100vh' }}>
            <button
              onClick={() => setShowSettings(false)}
              style={{
                position: 'fixed',
                top: 20,
                right: 20,
                zIndex: 1000,
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '50%',
                width: 40,
                height: 40,
                fontSize: 20,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#94a3b8',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#ef4444';
                e.target.style.color = 'white';
                e.target.style.borderColor = '#ef4444';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#1e293b';
                e.target.style.color = '#94a3b8';
                e.target.style.borderColor = '#334155';
              }}
            >
              �
            </button>
            <Settings
              user={user}
              onLogout={handleLogout}
              onUserUpdate={(updatedUser) => { setUser(updatedUser); setShowSettings(false); }}
            />
          </div>
        </div>
      )}

      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.6; transform: scale(1.2); }
          }
        `}
      </style>
    </div>
  );
}

export default App;
// REBUILD TRIGGER 2026-05-04 12:22:00
