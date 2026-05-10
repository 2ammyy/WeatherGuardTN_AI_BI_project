import { MapContainer, TileLayer, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { tunisiaRegions } from '../data/mockData';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

// --- Fix for Leaflet Default Icons (Important for Vite) ---
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;
// ----------------------------------------------------------

export default function MapDisplay() {
  const [hoveredCity, setHoveredCity] = useState(null);

  const getRiskColor = (score) => {
    if (score >= 80) return { fill: '#ef4444', border: '#f87171', text: 'CRITICAL', bg: 'rgba(239, 68, 68, 0.2)' };
    if (score >= 60) return { fill: '#f97316', border: '#fb923c', text: 'HIGH', bg: 'rgba(249, 115, 22, 0.2)' };
    if (score >= 40) return { fill: '#eab308', border: '#fbbf24', text: 'MODERATE', bg: 'rgba(234, 179, 8, 0.2)' };
    return { fill: '#22c55e', border: '#4ade80', text: 'STABLE', bg: 'rgba(34, 197, 94, 0.2)' };
  };

  const getRiskLevelText = (score) => {
    if (score >= 80) return 'CRITICAL';
    if (score >= 60) return 'HIGH';
    if (score >= 40) return 'MODERATE';
    return 'STABLE';
  };

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '600px',
      borderRadius: 20,
      overflow: 'hidden',
      border: '1px solid #1e293b',
      boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
      background: '#020617',
    }}>
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 0.6; }
            50% { opacity: 1; }
          }
          .leaflet-container {
            background: #020617;
          }
          .leaflet-control-attribution {
            background: rgba(0,0,0,0.5) !important;
            color: #64748b !important;
            font-size: 9px !important;
          }
          .leaflet-control-attribution a {
            color: #1D9E75 !important;
          }
        `}
      </style>

      <MapContainer 
        center={[34.5, 9.5]} // Centered on Tunisia
        zoom={6.5} 
        style={{ height: '100%', width: '100%', zIndex: 0 }}
        scrollWheelZoom={false}
        zoomControl={true}
      >
        {/* Using a dark themed map layer */}
        <TileLayer 
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; CARTO'
        />
        
        {/* CircleMarkers for each city */}
        {tunisiaRegions.map((city) => {
          const riskColor = getRiskColor(city.dangerScore);
          return (
            <CircleMarker 
              key={city.id} 
              center={[city.lat, city.lng]}
              radius={Math.max(8, city.dangerScore / 6)} // Size based on danger, min 8px
              pathOptions={{
                fillColor: riskColor.fill,
                color: riskColor.border,
                weight: 2,
                fillOpacity: 0.6
              }}
              eventHandlers={{
                mouseover: (e) => {
                  e.target.setStyle({ fillOpacity: 0.9, weight: 4 });
                  setHoveredCity(city);
                },
                mouseout: (e) => {
                  e.target.setStyle({ fillOpacity: 0.6, weight: 2 });
                  setHoveredCity(null);
                },
              }}
            />
          );
        })}
      </MapContainer>

      {/* The Smooth Hover Card (Danger Summary) */}
      <AnimatePresence>
        {hoveredCity && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.9, x: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              zIndex: 1000,
              width: '320px',
              background: 'rgba(15, 23, 42, 0.95)',
              backdropFilter: 'blur(12px)',
              padding: '1.5rem',
              borderRadius: 20,
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 24 }}>📍</span>
                  <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'white' }}>
                    {hoveredCity.name}
                  </h2>
                </div>
                <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>
                  {hoveredCity.governorate || 'Tunisia'}
                </p>
              </div>
              <span style={{
                padding: '4px 12px',
                borderRadius: 20,
                fontSize: 10,
                fontWeight: 700,
                background: getRiskColor(hoveredCity.dangerScore).bg,
                color: getRiskColor(hoveredCity.dangerScore).border,
                border: `1px solid ${getRiskColor(hoveredCity.dangerScore).border}`,
              }}>
                {getRiskLevelText(hoveredCity.dangerScore)}
              </span>
            </div>
            
            {/* Danger Score */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>⚠️</span> Danger Level
                </span>
                <span style={{ fontSize: 20, fontWeight: 700, color: 'white', fontFamily: 'monospace' }}>
                  {hoveredCity.dangerScore}%
                </span>
              </div>
              
              {/* Progress Bar */}
              <div style={{
                width: '100%',
                background: '#1e293b',
                height: 6,
                borderRadius: 3,
                overflow: 'hidden',
              }}>
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${hoveredCity.dangerScore}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  style={{
                    height: '100%',
                    background: getRiskColor(hoveredCity.dangerScore).fill,
                    borderRadius: 3,
                  }}
                />
              </div>
            </div>

            {/* Risk Info */}
            <div style={{
              background: 'rgba(0,0,0,0.3)',
              borderRadius: 12,
              padding: '12px',
              marginBottom: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 14 }}>🏷️</span>
                <span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Primary Risk
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: 'white', fontWeight: 500 }}>
                {hoveredCity.risk || 'Weather related hazards'}
              </p>
            </div>

            {/* Footer Stats */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              paddingTop: 12,
              borderTop: '1px solid rgba(255,255,255,0.05)',
            }}>
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 4 }}>
                  <span style={{ fontSize: 14 }}>🌡️</span>
                  <p style={{ fontSize: 10, color: '#64748b', margin: 0 }}>Temperature</p>
                </div>
                <p style={{ fontSize: 16, fontWeight: 700, color: 'white', margin: 0 }}>
                  {hoveredCity.temp || '--'}°C
                </p>
              </div>
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 4 }}>
                  <span style={{ fontSize: 14 }}>💧</span>
                  <p style={{ fontSize: 10, color: '#64748b', margin: 0 }}>Humidity</p>
                </div>
                <p style={{ fontSize: 16, fontWeight: 700, color: 'white', margin: 0 }}>
                  {hoveredCity.humidity || '--'}%
                </p>
              </div>
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 4 }}>
                  <span style={{ fontSize: 14 }}>🌬️</span>
                  <p style={{ fontSize: 10, color: '#64748b', margin: 0 }}>Wind</p>
                </div>
                <p style={{ fontSize: 16, fontWeight: 700, color: 'white', margin: 0 }}>
                  {hoveredCity.wind || '--'} km/h
                </p>
              </div>
            </div>

            {/* ML Model Badge */}
            <div style={{
              marginTop: 12,
              textAlign: 'center',
              padding: '6px 10px',
              background: 'rgba(29, 158, 117, 0.1)',
              borderRadius: 8,
            }}>
              <p style={{ margin: 0, fontSize: 9, color: '#1D9E75', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <span>🤖</span> Powered by MLflow Risk Prediction Model
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Map Legend Overlay */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        zIndex: 1000,
        background: 'rgba(15, 23, 42, 0.9)',
        backdropFilter: 'blur(8px)',
        padding: '10px 14px',
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.1)',
        fontSize: 10,
        display: 'flex',
        gap: 12,
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ef4444' }} />
          <span style={{ color: '#94a3b8' }}>Critical (80-100%)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#f97316' }} />
          <span style={{ color: '#94a3b8' }}>High (60-79%)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#eab308' }} />
          <span style={{ color: '#94a3b8' }}>Moderate (40-59%)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#22c55e' }} />
          <span style={{ color: '#94a3b8' }}>Stable (0-39%)</span>
        </div>
      </div>
    </div>
  );
}