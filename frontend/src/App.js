import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import './App.css';

// Import components
import VigilanceMap from './components/VigilanceMap';
import HazardLegend from './components/HazardLegend';
import RouteChecker from './components/RouteChecker';
import Login from './components/Login'; // Ensure these components exist
import Signup from './components/Signup'; // Ensure these components exist
import { fetchHazards } from './services/hazardService';

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

  // ==================== RISK CONFIGURATION ====================
  const riskLevels = {
    'GREEN': { color: '#10b981', light: '#d1fae5', emoji: '🟢', label: 'SAFE', description: 'Normal conditions' },
    'YELLOW': { color: '#f59e0b', light: '#fef3c7', emoji: '🟡', label: 'WATCH', description: 'Be aware' },
    'ORANGE': { color: '#f97316', light: '#ffedd5', emoji: '🟠', label: 'WARN', description: 'Prepare for disruptions' },
    'RED': { color: '#ef4444', light: '#fee2e2', emoji: '🔴', label: 'ALERT', description: 'Take action' },
    'PURPLE': { color: '#8b5cf6', light: '#ede9fe', emoji: '🟣', label: 'EVAC', description: 'Emergency response' }
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
        const response = await axios.get(`${apiUrl}/governorates`);
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
          const endpoint = isToday ? '/current-weather' : '/forecast-by-date';
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

  const getRiskColor = (riskLevel) => riskLevels[riskLevel]?.color || '#999';
  const getRiskEmoji = (riskLevel) => riskLevels[riskLevel]?.emoji || '❓';

  // ==================== CONDITIONAL RENDER (THE AUTH GATE) ====================
  
  // 1. Show Login or Signup if user is not authenticated
  if (!user) {
    return (
      <div className="auth-wrapper">
        {showSignup ? (
          <Signup 
            onSignupSuccess={() => setShowSignup(false)} 
            onSwitchToLogin={() => setShowSignup(false)}
          />
        ) : (
          <Login 
            onLoginSuccess={(userData) => setUser(userData)} 
            onSwitchToSignup={() => setShowSignup(true)}
          />
        )}
      </div>
    );
  }

  // 2. Show Dashboard only if user exists
  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <i className="fas fa-cloud-sun-rain"></i>
            <h1>WeatherGuard<span>TN</span></h1>
          </div>
          <div className="date-selector">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
          <div className="user-controls">
             <span className="user-name"><i className="fas fa-user"></i> {user.name || 'User'}</span>
             <button onClick={handleLogout} className="logout-btn">Logout</button>
             <div className={`api-status ${apiStatus}`}>
               {apiStatus === 'connected' ? '🟢 Live' : '🔴 Offline'}
             </div>
          </div>
        </div>
      </header>

      {error && <div className="error-banner"><strong>{error}</strong></div>}

      <div className="dashboard-grid">
        <div className="city-panel">
          <h3><i className="fas fa-map-marker-alt"></i> Governorates</h3>
          <div className="city-list">
            {governorates.map(city => (
              <button key={city} className={`city-btn ${selectedCities.includes(city) ? 'selected' : ''}`} onClick={() => toggleCity(city)}>
                <span className="city-name">{city}</span>
                {forecastData[city] && (
                  <span className="city-risk" style={{ backgroundColor: getRiskColor(forecastData[city].risk_level) }}>
                    {getRiskEmoji(forecastData[city].risk_level)}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="map-panel">
          <div className="map-header">
            <h3><i className="fas fa-map"></i> Vigilance Map</h3>
            <label className="neighbor-toggle">
              <input type="checkbox" checked={showNeighbors} onChange={(e) => setShowNeighbors(e.target.checked)} />
              Show Neighbors
            </label>
          </div>
          <VigilanceMap selectedCities={selectedCities} forecastData={forecastData} hazards={hazards} showNeighbors={showNeighbors} onCityClick={toggleCity} />
          <HazardLegend />
        </div>

        <div className="risk-panel">
          <h3><i className="fas fa-chart-line"></i> Risk Overview</h3>
          {loading ? (
            <div className="loading"><div className="spinner"></div><p>Loading forecasts...</p></div>
          ) : (
            <div className="risk-grid">
              {selectedCities.map(city => (
                <div key={city} className="risk-card">
                  {forecastData[city] ? (
                    <>
                      <div className="risk-card-header">
                        <h4>{city}</h4>
                        <span className="risk-badge" style={{ backgroundColor: getRiskColor(forecastData[city].risk_level) }}>
                          {forecastData[city].risk_level}
                        </span>
                      </div>
                      <div className="weather-icons">
                        <div className="weather-icon"><i className="fas fa-thermometer-half"></i><span>{forecastData[city].weather?.temp_avg || 'N/A'}°C</span></div>
                        <div className="weather-icon"><i className="fas fa-wind"></i><span>{forecastData[city].weather?.wind_speed || 'N/A'} km/h</span></div>
                      </div>
                    </>
                  ) : <p>No data for {city}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <RouteChecker hazards={hazards} />
      <footer className="footer"><p><i className="fas fa-heart"></i> Protecting lives · Model: 99.58% accuracy</p></footer>
    </div>
  );
}

export default App;