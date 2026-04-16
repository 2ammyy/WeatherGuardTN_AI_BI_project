import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const VigilanceMap = ({ 
  selectedCities = [], 
  forecastData = {}, 
  hazards = [],
  showNeighbors = true,
  onCityClick = () => {} 
}) => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);
  const [userLocation, setUserLocation] = useState(null);
  const [mapLayers, setMapLayers] = useState('streets');

  // Risk color mapping
  const getRiskColor = (riskLevel) => {
    const colors = {
      'GREEN': '#22c55e',
      'YELLOW': '#eab308',
      'ORANGE': '#f97316',
      'RED': '#ef4444',
      'PURPLE': '#a855f7',
      'SAFE': '#22c55e',
      'CAUTION': '#eab308',
      'DANGER': '#ef4444'
    };
    return colors[riskLevel] || '#64748b';
  };

  const getRiskLevelText = (riskLevel) => {
    const texts = {
      'GREEN': 'Safe',
      'YELLOW': 'Caution',
      'ORANGE': 'Warning',
      'RED': 'Alert',
      'PURPLE': 'Emergency'
    };
    return texts[riskLevel] || 'Unknown';
  };

  // City coordinates (Tunisia + Neighbors)
  const cityCoordinates = {
    // Tunisia (24 governorates)
    'Tunis': { lat: 36.8065, lng: 10.1815 },
    'Sfax': { lat: 34.7400, lng: 10.7600 },
    'Sousse': { lat: 35.8256, lng: 10.6411 },
    'Bizerte': { lat: 37.2744, lng: 9.8739 },
    'Jendouba': { lat: 36.5011, lng: 8.7803 },
    'Nabeul': { lat: 36.4561, lng: 10.7378 },
    'Gabes': { lat: 33.8815, lng: 10.0982 },
    'Medenine': { lat: 33.3549, lng: 10.5055 },
    'Kairouan': { lat: 35.6781, lng: 10.0963 },
    'Monastir': { lat: 35.7833, lng: 10.8333 },
    'Mahdia': { lat: 35.5047, lng: 11.0622 },
    'Gafsa': { lat: 34.4250, lng: 8.7842 },
    'Tozeur': { lat: 33.9197, lng: 8.1335 },
    'Kebili': { lat: 33.7044, lng: 8.9692 },
    'Tataouine': { lat: 32.9297, lng: 10.4518 },
    'Kasserine': { lat: 35.1676, lng: 8.8365 },
    'Beja': { lat: 36.7256, lng: 9.1817 },
    'Kef': { lat: 36.1741, lng: 8.7049 },
    'Siliana': { lat: 36.0849, lng: 9.3708 },
    'Zaghouan': { lat: 36.4029, lng: 10.1429 },
    'Ariana': { lat: 36.8667, lng: 10.2000 },
    'Ben Arous': { lat: 36.7533, lng: 10.2219 },
    'Manouba': { lat: 36.8081, lng: 10.0972 },
    
    // Neighbor Countries - Algeria
    'Algiers': { lat: 36.7538, lng: 3.0588, country: 'Algeria' },
    'Annaba': { lat: 36.9167, lng: 7.7667, country: 'Algeria' },
    'Constantine': { lat: 36.3650, lng: 6.6147, country: 'Algeria' },
    'Oran': { lat: 35.6971, lng: -0.6308, country: 'Algeria' },
    'Tébessa': { lat: 35.4000, lng: 8.1167, country: 'Algeria' },
    
    // Libya
    'Tripoli': { lat: 32.8872, lng: 13.1917, country: 'Libya' },
    'Benghazi': { lat: 32.1167, lng: 20.0667, country: 'Libya' },
    'Misrata': { lat: 32.3754, lng: 15.0925, country: 'Libya' },
    
    // Italy
    'Palermo': { lat: 38.1157, lng: 13.3615, country: 'Italy' },
    'Lampedusa': { lat: 35.5164, lng: 12.6081, country: 'Italy' },
    'Trapani': { lat: 38.0159, lng: 12.5103, country: 'Italy' },
    
    // Malta
    'Valletta': { lat: 35.8989, lng: 14.5146, country: 'Malta' },
    'Gozo': { lat: 36.0444, lng: 14.2433, country: 'Malta' }
  };

  // Initialize map
  useEffect(() => {
    if (!mapInstance.current && mapRef.current) {
      // Create map centered on Tunisia
      mapInstance.current = L.map(mapRef.current).setView([34.0, 9.0], 6);

      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(mapInstance.current);

      // Add Google Satellite layer as option
      const googleSat = L.tileLayer('http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: '© Google'
      });

      // Add dark map layer
      const darkMap = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '© CARTO',
        subdomains: 'abcd',
        maxZoom: 19
      });

      // Add layer control
      const baseMaps = {
        "🗺️ Streets": L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'),
        "🛰️ Satellite": googleSat,
        "🌙 Dark": darkMap
      };
      
      L.control.layers(baseMaps).addTo(mapInstance.current);
      
      // Add scale bar
      L.control.scale({ metric: true, imperial: false, position: 'bottomleft' }).addTo(mapInstance.current);
      
      // Get user location if available
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            setUserLocation([latitude, longitude]);
            
            // Add user marker with custom icon
            const userIcon = L.divIcon({
              className: 'user-location-marker',
              html: `<div style="
                background: linear-gradient(135deg, #3b82f6, #2563eb);
                width: 20px;
                height: 20px;
                border-radius: 50%;
                border: 3px solid white;
                box-shadow: 0 0 10px rgba(59,130,246,0.5);
                animation: pulse 1.5s ease-in-out infinite;
              "></div>`,
              iconSize: [20, 20]
            });
            
            L.marker([latitude, longitude], { icon: userIcon })
              .addTo(mapInstance.current)
              .bindPopup(`
                <div style="font-family: sans-serif; padding: 4px;">
                  <strong>📍 You are here</strong>
                  <p style="margin: 4px 0 0; font-size: 11px; color: #64748b;">Lat: ${latitude.toFixed(4)}<br>Lng: ${longitude.toFixed(4)}</p>
                </div>
              `);
          },
          (error) => console.log('Geolocation error:', error)
        );
      }
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  // Update markers when data changes
  useEffect(() => {
    if (!mapInstance.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add Tunisian city markers
    selectedCities.forEach(city => {
      const coords = cityCoordinates[city];
      if (!coords) return;

      const cityData = forecastData[city];
      const riskLevel = cityData?.risk_level || 'GREEN';
      const color = getRiskColor(riskLevel);
      const riskText = getRiskLevelText(riskLevel);
      
      // Create custom marker with risk color
      const marker = L.circleMarker([coords.lat, coords.lng], {
        radius: 12,
        fillColor: color,
        color: '#ffffff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.85
      }).addTo(mapInstance.current);

      // Add popup with info
      marker.bindPopup(`
        <div style="font-family: sans-serif; min-width: 240px; max-width: 280px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0;">
            <div style="width: 32px; height: 32px; border-radius: 50%; background: ${color}; display: flex; align-items: center; justify-content: center; font-size: 16px;">
              ⚠️
            </div>
            <div>
              <h3 style="margin: 0; color: #1e293b; font-size: 16px;">${city}</h3>
              <span style="font-size: 11px; color: ${color}; font-weight: 600;">${riskText} Risk</span>
            </div>
          </div>
          ${cityData ? `
            <div style="margin-bottom: 12px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                <span style="font-size: 12px; color: #64748b;">Risk Score</span>
                <span style="font-size: 14px; font-weight: 600; color: ${color};">${cityData.confidence || 0}%</span>
              </div>
              <div style="width: 100%; height: 4px; background: #e2e8f0; border-radius: 2px; overflow: hidden;">
                <div style="width: ${cityData.confidence || 0}%; height: 100%; background: ${color}; border-radius: 2px;"></div>
              </div>
            </div>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; font-size: 12px;">
              <div><span style="color: #64748b;">🌡️ Temp:</span> <strong>${cityData.weather?.temp_avg || 'N/A'}°C</strong></div>
              <div><span style="color: #64748b;">💨 Wind:</span> <strong>${cityData.weather?.wind_speed || 'N/A'} km/h</strong></div>
              <div><span style="color: #64748b;">💧 Humidity:</span> <strong>${cityData.weather?.humidity || 'N/A'}%</strong></div>
              <div><span style="color: #64748b;">🌧️ Rain:</span> <strong>${cityData.weather?.precipitation || 0} mm</strong></div>
            </div>
          ` : '<p style="color: #64748b; font-size: 12px;">No forecast data available</p>'}
          <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #e2e8f0;">
            <button onclick="window.dispatchEvent(new CustomEvent('cityClick', { detail: '${city}' }))" style="width: 100%; padding: 6px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 11px; font-weight: 500;">
              View Details →
            </button>
          </div>
        </div>
      `);

      marker.on('click', () => onCityClick(city));
      markersRef.current.push(marker);
    });

    // Add neighbor country markers if enabled
    if (showNeighbors) {
      Object.entries(cityCoordinates).forEach(([city, coords]) => {
        if (coords.country && !selectedCities.includes(city)) {
          const marker = L.circleMarker([coords.lat, coords.lng], {
            radius: 6,
            fillColor: '#94a3b8',
            color: '#fff',
            weight: 1.5,
            opacity: 0.8,
            fillOpacity: 0.5
          }).addTo(mapInstance.current);

          marker.bindPopup(`
            <div style="font-family: sans-serif; padding: 4px;">
              <strong style="color: #1e293b;">${city}</strong>
              <p style="margin: 4px 0 0; font-size: 11px; color: #64748b;">${coords.country}</p>
            </div>
          `);
          
          markersRef.current.push(marker);
        }
      });
    }

  }, [selectedCities, forecastData, showNeighbors, onCityClick]);

  // Add hazard markers
  useEffect(() => {
    if (!mapInstance.current || !hazards.length) return;

    hazards.forEach(hazard => {
      const { geometry, properties } = hazard;
      if (!geometry || geometry.type !== 'Point') return;

      const [lng, lat] = geometry.coordinates;
      
      // Choose icon based on hazard type
      let icon = '⚠️';
      let color = '#f59e0b';
      let label = 'Hazard';
      
      if (properties.what?.toLowerCase().includes('flood')) {
        icon = '🌊';
        color = '#3b82f6';
        label = 'Flood';
      } else if (properties.what?.toLowerCase().includes('accident')) {
        icon = '🚗💥';
        color = '#ef4444';
        label = 'Accident';
      } else if (properties.what?.toLowerCase().includes('storm')) {
        icon = '⛈️';
        color = '#8b5cf6';
        label = 'Storm';
      } else if (properties.what?.toLowerCase().includes('road')) {
        icon = '🚧';
        color = '#f97316';
        label = 'Road Work';
      }

      const hazardIcon = L.divIcon({
        className: 'hazard-marker',
        html: `<div style="
          background: ${color};
          color: white;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          display: flex;
          align-items: center;
          gap: 4px;
          white-space: nowrap;
        ">
          ${icon} ${label}
        </div>`,
        iconSize: [80, 28]
      });
      
      const marker = L.marker([lat, lng], { icon: hazardIcon }).addTo(mapInstance.current);

      marker.bindPopup(`
        <div style="font-family: sans-serif; max-width: 260px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
            <div style="width: 32px; height: 32px; border-radius: 50%; background: ${color}; display: flex; align-items: center; justify-content: center; font-size: 18px;">
              ${icon}
            </div>
            <div>
              <h4 style="margin: 0; color: #1e293b;">${properties.what || 'Hazard'}</h4>
              <span style="font-size: 10px; color: ${color};">Active Alert</span>
            </div>
          </div>
          <p style="margin: 0 0 8px; font-size: 12px; color: #475569;">${properties.description || 'No description available'}</p>
          <small style="color: #94a3b8; font-size: 10px;">🕐 Updated: ${new Date(properties.updated || Date.now()).toLocaleString()}</small>
        </div>
      `);

      markersRef.current.push(marker);
    });

  }, [hazards]);

  // Fit map to show all markers
  useEffect(() => {
    if (!mapInstance.current || markersRef.current.length === 0) return;
    
    const group = L.featureGroup(markersRef.current);
    mapInstance.current.fitBounds(group.getBounds().pad(0.1));
  }, [markersRef.current.length]);

  // Add CSS animations
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.2); opacity: 0.8; }
      }
      .leaflet-popup-content-wrapper {
        border-radius: 16px;
        box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);
      }
      .leaflet-popup-tip {
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      borderRadius: 20,
  overflow: 'hidden',
      border: '1px solid #1e293b',
      boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
      background: '#020617',
    }}>
      <div ref={mapRef} style={{ height: '600px', width: '100%' }} />
      
      {/* User location badge */}
      {userLocation && (
        <div style={{
          position: 'absolute',
          bottom: '20px',
          right: '20px',
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(8px)',
          padding: '8px 16px',
          borderRadius: 20,
          fontSize: 12,
          color: '#3b82f6',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          border: '1px solid rgba(59, 130, 246, 0.3)',
          zIndex: 1000,
          fontFamily: 'sans-serif',
        }}>
          <div style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#3b82f6',
            animation: 'pulse 1.5s ease-in-out infinite',
          }} />
          <span>📍 Your location detected</span>
        </div>
      )}

      {/* Map legend overlay */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        background: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(8px)',
        padding: '10px 14px',
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.1)',
        fontSize: 10,
        zIndex: 1000,
        fontFamily: 'sans-serif',
      }}>
        <div style={{ fontWeight: 600, color: 'white', marginBottom: 8, fontSize: 11 }}>
          Risk Levels
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#22c55e' }} />
            <span style={{ color: '#94a3b8' }}>Safe</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#eab308' }} />
            <span style={{ color: '#94a3b8' }}>Caution</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#f97316' }} />
            <span style={{ color: '#94a3b8' }}>Warning</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ef4444' }} />
            <span style={{ color: '#94a3b8' }}>Alert</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#a855f7' }} />
            <span style={{ color: '#94a3b8' }}>Emergency</span>
          </div>
        </div>
      </div>

      {/* Hazards count badge */}
      {hazards.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          background: 'rgba(239, 68, 68, 0.95)',
          backdropFilter: 'blur(8px)',
          padding: '6px 12px',
          borderRadius: 20,
          fontSize: 11,
          fontWeight: 600,
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          zIndex: 1000,
          fontFamily: 'sans-serif',
        }}>
          <span>⚠️</span> {hazards.length} Active Hazards
        </div>
      )}
    </div>
  );
};

export default VigilanceMap;