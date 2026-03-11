import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  // State
  const [selectedCities, setSelectedCities] = useState(['Tunis', 'Sfax', 'Bizerte']);
  const [forecastData, setForecastData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [apiStatus, setApiStatus] = useState('checking');
  const [apiUrl, setApiUrl] = useState('');
  const [governorates, setGovernorates] = useState([]);
  const [hoveredCity, setHoveredCity] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const API_URL = 'http://localhost:8001';

  // Risk level configuration
  const riskLevels = {
    'GREEN': { color: '#10b981', light: '#d1fae5', emoji: '🟢', label: 'SAFE', description: 'Normal conditions' },
    'YELLOW': { color: '#f59e0b', light: '#fef3c7', emoji: '🟡', label: 'WATCH', description: 'Be aware' },
    'ORANGE': { color: '#f97316', light: '#ffedd5', emoji: '🟠', label: 'WARN', description: 'Prepare for disruptions' },
    'RED': { color: '#ef4444', light: '#fee2e2', emoji: '🔴', label: 'ALERT', description: 'Take action' },
    'PURPLE': { color: '#8b5cf6', light: '#ede9fe', emoji: '🟣', label: 'EVAC', description: 'Emergency response' }
  };

  // Cities with coordinates for map (simplified)
  const cityCoordinates = {
    'Tunis': { x: 45, y: 35 },
    'Sfax': { x: 52, y: 58 },
    'Sousse': { x: 48, y: 45 },
    'Bizerte': { x: 42, y: 18 },
    'Jendouba': { x: 28, y: 25 },
    'Nabeul': { x: 55, y: 40 },
    'Gabes': { x: 52, y: 68 },
    'Medenine': { x: 55, y: 78 },
    'Kairouan': { x: 42, y: 48 },
    'Monastir': { x: 50, y: 42 },
    'Mahdia': { x: 52, y: 50 },
    'Gafsa': { x: 32, y: 62 },
    'Tozeur': { x: 25, y: 58 },
    'Kebili': { x: 38, y: 72 },
    'Tataouine': { x: 48, y: 88 },
    'Kasserine': { x: 30, y: 48 },
    'Beja': { x: 35, y: 25 },
    'Kef': { x: 28, y: 32 },
    'Siliana': { x: 38, y: 38 },
    'Zaghouan': { x: 48, y: 32 },
    'Ariana': { x: 44, y: 30 },
    'Ben Arous': { x: 46, y: 32 },
    'Manouba': { x: 42, y: 30 }
  };

  // URLs for API connection
  const possibleUrls = useMemo(() => {
    const envUrl = process.env.REACT_APP_API_URL;
    const urls = [];
    if (envUrl) urls.push(envUrl);
    urls.push(
      'http://localhost:8001',
      'http://127.0.0.1:8001',
      'http://localhost:8000',
      'http://127.0.0.1:8000'
    );
    return [...new Set(urls)];
  }, []);

  // Find working API URL
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

  // Fetch governorates
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

  // Fetch forecasts for selected cities
  useEffect(() => {
    const fetchForecasts = async () => {
      if (selectedCities.length === 0 || apiStatus !== 'connected') return;
      
      setLoading(true);
      const forecasts = {};
      let hasError = false;
      
      for (const city of selectedCities) {
        try {
          const response = await axios.post(`${apiUrl}/forecast-by-date`, {
            date: selectedDate,
            city: city
          });
          forecasts[city] = response.data;
        } catch (err) {
          console.error(`Error fetching ${city}:`, err);
          hasError = true;
        }
      }
      
      setForecastData(forecasts);
      setLoading(false);
      
      if (hasError) {
        setError('Some forecasts could not be loaded');
      } else {
        setError(null);
      }
    };

    fetchForecasts();
  }, [selectedCities, selectedDate, apiUrl, apiStatus]);

  // Initial API connection
  useEffect(() => {
    findWorkingApiUrl();
  }, [findWorkingApiUrl]);

  const toggleCity = (city) => {
    setSelectedCities(prev => 
      prev.includes(city) ? prev.filter(c => c !== city) : [...prev, city]
    );
  };

  const getRiskColor = (riskLevel) => riskLevels[riskLevel]?.color || '#999';
  const getRiskEmoji = (riskLevel) => riskLevels[riskLevel]?.emoji || '❓';

  // Generate map SVG with risk colors
  const renderMap = () => {
    return (
      <svg viewBox="0 0 100 100" className="tunisia-map">
        {/* Tunisia simplified outline */}
        <polygon
          points="20,10 40,5 60,8 75,15 80,25 85,35 80,50 70,65 60,80 45,90 30,95 15,90 10,75 12,60 15,40 18,25 20,10"
          fill="#f0f0f0"
          stroke="#333"
          strokeWidth="0.5"
        />
        
        {/* City dots with risk colors */}
        {Object.entries(cityCoordinates).map(([city, coords]) => {
          const isSelected = selectedCities.includes(city);
          const cityData = forecastData[city];
          const riskLevel = cityData?.risk_level || 'GREEN';
          const isHovered = hoveredCity === city;
          
          return (
            <g key={city}>
              <circle
                cx={coords.x}
                cy={coords.y}
                r={isHovered ? 4 : isSelected ? 3 : 2}
                fill={getRiskColor(riskLevel)}
                stroke="white"
                strokeWidth={isSelected ? 2 : 1}
                opacity={isSelected ? 1 : 0.6}
                onMouseEnter={() => setHoveredCity(city)}
                onMouseLeave={() => setHoveredCity(null)}
                onClick={() => toggleCity(city)}
                style={{ cursor: 'pointer', transition: 'all 0.2s' }}
              />
              {isHovered && (
                <text
                  x={coords.x + 5}
                  y={coords.y - 5}
                  fontSize="2"
                  fill="black"
                >
                  {city}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    );
  };

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
              min={new Date().toISOString().split('T')[0]}
              max={new Date(Date.now() + 5*24*60*60*1000).toISOString().split('T')[0]}
            />
          </div>
          <div className={`api-status ${apiStatus}`}>
            {apiStatus === 'connected' ? '🟢 Live' : '🔴 Offline'}
          </div>
        </div>
      </header>

      {/* Error Message */}
      {error && (
        <div className="error-banner">
          <i className="fas fa-exclamation-triangle"></i>
          {error}
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
          <h3><i className="fas fa-map"></i> Vigilance Map</h3>
          <div className="map-container">
            {renderMap()}
            <div className="map-legend">
              {Object.entries(riskLevels).map(([level, data]) => (
                <div key={level} className="legend-item">
                  <span className="legend-dot" style={{ backgroundColor: data.color }}></span>
                  <span>{level} - {data.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Risk Grid */}
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
                  <div className="risk-card-header">
                    <h4>{city}</h4>
                    {forecastData[city] && (
                      <span 
                        className="risk-badge"
                        style={{ backgroundColor: getRiskColor(forecastData[city].risk_level) }}
                      >
                        {forecastData[city].risk_level}
                      </span>
                    )}
                  </div>
                  
                  {forecastData[city] ? (
                    <>
                      <div className="weather-icons">
                        <div className="weather-icon" title="Temperature">
                          <i className="fas fa-thermometer-half"></i>
                          <span>{forecastData[city].weather?.temp_avg || 'N/A'}°C</span>
                        </div>
                        <div className="weather-icon" title="Wind Speed">
                          <i className="fas fa-wind"></i>
                          <span>{forecastData[city].weather?.wind_speed || 'N/A'} km/h</span>
                        </div>
                        <div className="weather-icon" title="Humidity">
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
                          ></div>
                        </div>
                        <span className="prob-text">{forecastData[city].confidence || 0}% confidence</span>
                      </div>
                    </>
                  ) : (
                    <div className="no-data">No forecast available</div>
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

      {/* Action Recommendations Grid */}
      <div className="actions-grid">
        <h2><i className="fas fa-clipboard-list"></i> Early Warning Actions</h2>
        <div className="action-cards">
          {['students', 'delivery', 'fishermen', 'civil'].map(persona => (
            <div key={persona} className="action-card">
              <div className="action-icon">
                {persona === 'students' && '🎓'}
                {persona === 'delivery' && '📦'}
                {persona === 'fishermen' && '⚓'}
                {persona === 'civil' && '🚒'}
              </div>
              <h4>
                {persona === 'students' && 'Students & Parents'}
                {persona === 'delivery' && 'Delivery Workers'}
                {persona === 'fishermen' && 'Fishermen'}
                {persona === 'civil' && 'Civil Protection'}
              </h4>
              <ul>
                {selectedCities.slice(0, 3).map(city => {
                  const risk = forecastData[city]?.risk_level || 'GREEN';
                  return (
                    <li key={city}>
                      <span className="action-city">{city}:</span>
                      <span className="action-risk" style={{ color: getRiskColor(risk) }}>
                        {getRiskEmoji(risk)} {
                          risk === 'GREEN' ? 'Normal' :
                          risk === 'YELLOW' ? 'Caution' :
                          risk === 'ORANGE' ? 'Prepare' :
                          risk === 'RED' ? 'Take action' :
                          risk === 'PURPLE' ? 'Emergency' : 'Unknown'
                        }
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="footer">
        <p>
          <i className="fas fa-heart"></i> Protecting lives · Model: 99.58% accuracy · Data: OpenWeatherMap
        </p>
      </footer>
    </div>
  );
}

export default App;