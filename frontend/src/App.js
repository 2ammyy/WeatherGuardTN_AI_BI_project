import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import './App.css';

// Import components
import VigilanceMap from './components/VigilanceMap';
import HazardLegend from './components/HazardLegend';
import RouteChecker from './components/RouteChecker';
import { fetchHazards } from './services/hazardService';

function App() {
  // ==================== STATE VARIABLES ====================
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

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8001';

  // ==================== RISK CONFIGURATION ====================
  const riskLevels = {
    'GREEN': { color: '#10b981', light: '#d1fae5', emoji: '🟢', label: 'SAFE', description: 'Normal conditions' },
    'YELLOW': { color: '#f59e0b', light: '#fef3c7', emoji: '🟡', label: 'WATCH', description: 'Be aware' },
    'ORANGE': { color: '#f97316', light: '#ffedd5', emoji: '🟠', label: 'WARN', description: 'Prepare for disruptions' },
    'RED': { color: '#ef4444', light: '#fee2e2', emoji: '🔴', label: 'ALERT', description: 'Take action' },
    'PURPLE': { color: '#8b5cf6', light: '#ede9fe', emoji: '🟣', label: 'EVAC', description: 'Emergency response' }
  };

  // ==================== CITY COORDINATES ====================
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
    const envUrl = process.env.REACT_APP_API_URL;
    const urls = [];
    if (envUrl) urls.push(envUrl);
    urls.push('http://localhost:8001', 'http://127.0.0.1:8001');
    return [...new Set(urls)];
  }, []);

  const findWorkingApiUrl = useCallback(async () => {
    for (const url of possibleUrls) {
      try {
        const response = await axios.get(`${url}/health`, { timeout: 3000 });
        if (response.status === 200) {
          setApiUrl(url);
          setApiStatus('connected');
          console.log(`✅ Connected to ${url}`);
          return url;
        }
      } catch (err) {
        console.log(`❌ Failed to connect to ${url}`);
      }
    }
    setApiStatus('disconnected');
    return null;
  }, [possibleUrls]);

  // ==================== DATA FETCHING ====================
  useEffect(() => {
    findWorkingApiUrl();
  }, [findWorkingApiUrl]);

  useEffect(() => {
    const fetchGovernorates = async () => {
      if (!apiUrl) return;
      try {
        const response = await axios.get(`${apiUrl}/governorates`);
        setGovernorates(response.data.governorates || response.data);
      } catch (err) {
        console.error('Error fetching governorates:', err);
        setGovernorates(Object.keys(cityCoordinates));
      }
    };
    fetchGovernorates();
  }, [apiUrl]);

  // Set initial date
  useEffect(() => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  setSelectedDate(`${year}-${month}-${day}`);
  console.log('📅 Today is:', `${year}-${month}-${day}`);
}, []);

  // Fetch forecasts - NO FAKE DATA, ONLY REAL API CALLS
  useEffect(() => {
    const fetchForecasts = async () => {
      if (selectedCities.length === 0 || apiStatus !== 'connected' || !selectedDate) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      const forecasts = {};
      const failed = [];
      
      for (const city of selectedCities) {
        try {
          console.log(`📡 Fetching REAL data for ${city}...`);
          const response = await axios.post(`${apiUrl}/forecast-by-date`, {
            date: selectedDate,
            city: city
          }, { timeout: 5000 });
          
          if (response.data) {
            forecasts[city] = response.data;
            console.log(`✅ ${city}: ${response.data.risk_level}`);
          }
        } catch (err) {
          console.error(`❌ Failed to fetch ${city}:`, err.message);
          failed.push(city);
        }
      }
      
      setForecastData(forecasts);
      setLoading(false);
      
      if (failed.length > 0) {
        setError(`❌ Cannot load data for: ${failed.join(', ')}. Check console for details.`);
      } else {
        setError(null);
      }
    };

    fetchForecasts();
  }, [selectedCities, selectedDate, apiUrl, apiStatus]);

  // Fetch hazards
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
    setSelectedCities(prev => 
      prev.includes(city) ? prev.filter(c => c !== city) : [...prev, city]
    );
  };

  const handleCityClick = (city) => {
    toggleCity(city);
  };

  const getRiskColor = (riskLevel) => riskLevels[riskLevel]?.color || '#999';
  const getRiskEmoji = (riskLevel) => riskLevels[riskLevel]?.emoji || '❓';

  // ==================== RENDER ====================
  return (
    <div className="app">
      {/* Header */}
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
              min={selectedDate}
              max={new Date(Date.now() + 5*24*60*60*1000).toISOString().split('T')[0]}
            />
          </div>
          <div className={`api-status ${apiStatus}`}>
            {apiStatus === 'connected' ? '🟢 Live' : '🔴 Offline'}
          </div>
        </div>
      </header>

      {/* Error Message - Shows REAL errors */}
      {error && (
        <div className="error-banner" style={{
          background: '#fee2e2',
          color: '#991b1b',
          padding: '1rem',
          margin: '1rem',
          borderRadius: '8px',
          border: '2px solid #ef4444'
        }}>
          <strong><i className="fas fa-exclamation-triangle"></i> {error}</strong>
          <p style={{marginTop: '0.5rem', fontSize: '0.9rem'}}>
            Make sure your backend is running and try again.
          </p>
        </div>
      )}

      {/* Main Dashboard Grid */}
      <div className="dashboard-grid">
        {/* Left Column - City Selector */}
        <div className="city-panel">
          <h3><i className="fas fa-map-marker-alt"></i> Governorates</h3>
          <div className="city-list">
            {governorates.map(city => (
              <button
                key={city}
                className={`city-btn ${selectedCities.includes(city) ? 'selected' : ''}`}
                onClick={() => toggleCity(city)}
              >
                <span className="city-name">{city}</span>
                {forecastData[city] && (
                  <span 
                    className="city-risk"
                    style={{ backgroundColor: getRiskColor(forecastData[city].risk_level) }}
                  >
                    {getRiskEmoji(forecastData[city].risk_level)}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Center - Vigilance Map */}
        <div className="map-panel">
          <div className="map-header">
            <h3><i className="fas fa-map"></i> Vigilance Map</h3>
            <label className="neighbor-toggle">
              <input 
                type="checkbox" 
                checked={showNeighbors}
                onChange={(e) => setShowNeighbors(e.target.checked)}
              />
              Show Neighbors
            </label>
          </div>
          
          <VigilanceMap 
            selectedCities={selectedCities}
            forecastData={forecastData}
            hazards={hazards}
            showNeighbors={showNeighbors}
            onCityClick={handleCityClick}
          />
          
          <HazardLegend />
        </div>

        {/* Right Column - Risk Grid - Shows ONLY real data */}
        <div className="risk-panel">
          <h3><i className="fas fa-chart-line"></i> Risk Overview</h3>
          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
              <p>Loading forecasts...</p>
            </div>
          ) : (
            <div className="risk-grid">
              {selectedCities.map(city => (
                <div key={city} className="risk-card">
                  {forecastData[city] ? (
                    <>
                      <div className="risk-card-header">
                        <h4>{city}</h4>
                        <span 
                          className="risk-badge"
                          style={{ backgroundColor: getRiskColor(forecastData[city].risk_level) }}
                        >
                          {forecastData[city].risk_level}
                        </span>
                      </div>
                      
                      <div className="weather-icons">
                        <div className="weather-icon">
                          <i className="fas fa-thermometer-half"></i>
                          <span>{forecastData[city].weather?.temp_avg || 'N/A'}°C</span>
                        </div>
                        <div className="weather-icon">
                          <i className="fas fa-wind"></i>
                          <span>{forecastData[city].weather?.wind_speed || 'N/A'} km/h</span>
                        </div>
                        <div className="weather-icon">
                          <i className="fas fa-tint"></i>
                          <span>{forecastData[city].weather?.humidity || 'N/A'}%</span>
                        </div>
                      </div>
                      
                      <div className="risk-probability">
                        <div className="prob-bar">
                          <div 
                            className="prob-fill"
                            style={{ 
                              width: `${forecastData[city].confidence || 0}%`,
                              backgroundColor: getRiskColor(forecastData[city].risk_level)
                            }}
                          />
                        </div>
                        <span className="prob-text">{forecastData[city].confidence || 0}% confidence</span>
                      </div>
                    </>
                  ) : (
                    <div className="no-data" style={{
                      padding: '2rem',
                      textAlign: 'center',
                      color: '#666'
                    }}>
                      <i className="fas fa-cloud-rain" style={{fontSize: '2rem', marginBottom: '1rem'}}></i>
                      <p>No forecast data available for {city}</p>
                    </div>
                  )}
                </div>
              ))}
              
              {selectedCities.length === 0 && (
                <div className="empty-state">
                  <i className="fas fa-hand-pointer"></i>
                  <p>Select governorates to view risks</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <RouteChecker hazards={hazards} />

      {/* Footer */}
      <footer className="footer">
        <p>
          <i className="fas fa-heart"></i> Protecting lives · Model: 99.58% accuracy
        </p>
      </footer>
    </div>
  );
}

export default App;