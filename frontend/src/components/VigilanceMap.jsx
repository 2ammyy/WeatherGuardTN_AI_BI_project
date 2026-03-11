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

  // Risk color mapping
  const getRiskColor = (riskLevel) => {
    const colors = {
      'GREEN': '#10b981',
      'YELLOW': '#f59e0b',
      'ORANGE': '#f97316',
      'RED': '#ef4444',
      'PURPLE': '#8b5cf6',
      'SAFE': '#10b981',
      'CAUTION': '#f59e0b',
      'DANGER': '#ef4444'
    };
    return colors[riskLevel] || '#94a3b8';
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

      // Add layer control
      const baseMaps = {
        "OpenStreetMap": L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'),
        "Satellite": googleSat
      };
      
      L.control.layers(baseMaps).addTo(mapInstance.current);
      
      // Get user location if available
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            setUserLocation([latitude, longitude]);
            
            // Add user marker
            L.marker([latitude, longitude], {
              icon: L.divIcon({
                className: 'user-location-marker',
                html: '<div style="background-color: #3b82f6; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3);"></div>',
                iconSize: [20, 20]
              })
            }).addTo(mapInstance.current)
              .bindPopup('You are here');
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
      
      // Create custom marker with risk color
      const marker = L.circleMarker([coords.lat, coords.lng], {
        radius: 10,
        fillColor: color,
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.9
      }).addTo(mapInstance.current);

      // Add popup with info
      marker.bindPopup(`
        <div style="font-family: Arial; min-width: 200px;">
          <h3 style="margin: 0 0 10px 0; color: #1e293b;">${city}</h3>
          ${cityData ? `
            <p><strong>Risk:</strong> <span style="color: ${color};">${riskLevel}</span></p>
            <p><strong>Confidence:</strong> ${cityData.confidence || 0}%</p>
            <p><strong>Weather:</strong><br>
              🌡️ ${cityData.weather?.temp_avg || 'N/A'}°C<br>
              💨 ${cityData.weather?.wind_speed || 'N/A'} km/h<br>
              💧 ${cityData.weather?.humidity || 'N/A'}%<br>
              🌧️ ${cityData.weather?.precipitation || 0} mm
            </p>
          ` : '<p>No forecast data</p>'}
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
            weight: 1,
            opacity: 0.8,
            fillOpacity: 0.6
          }).addTo(mapInstance.current);

          marker.bindPopup(`
            <div style="font-family: Arial;">
              <h4 style="margin: 0;">${city}</h4>
              <p style="margin: 5px 0 0 0; color: #64748b;">${coords.country}</p>
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
      
      if (properties.what?.includes('flood')) {
        icon = '🌊';
        color = '#3b82f6';
      } else if (properties.what?.includes('accident')) {
        icon = '🚗💥';
        color = '#ef4444';
      } else if (properties.what?.includes('storm')) {
        icon = '⛈️';
        color = '#8b5cf6';
      }

      const marker = L.marker([lat, lng], {
        icon: L.divIcon({
          className: 'hazard-marker',
          html: `<div style="background-color: ${color}; color: white; padding: 5px 10px; border-radius: 20px; font-size: 14px; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">
            ${icon} ${properties.what?.split('.')[1] || 'Hazard'}
          </div>`,
          iconSize: [100, 30]
        })
      }).addTo(mapInstance.current);

      marker.bindPopup(`
        <div style="font-family: Arial;">
          <h4 style="margin: 0;">${properties.what}</h4>
          <p style="margin: 5px 0 0 0;">${properties.description || 'No description'}</p>
          <small>Updated: ${new Date(properties.updated || Date.now()).toLocaleString()}</small>
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

  return (
    <div className="vigilance-map-container">
      <div ref={mapRef} style={{ height: '600px', width: '100%', borderRadius: '24px' }} />
      {userLocation && (
        <div className="user-location-badge">
          <i className="fas fa-location-dot"></i> Your location detected
        </div>
      )}
    </div>
  );
};

export default VigilanceMap;