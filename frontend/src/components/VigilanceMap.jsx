import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTheme } from '../contexts/ThemeContext';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const TUNISIA_CITIES = {
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
};

const RISK_CONFIG = {
  'GREEN':  { color: '#16a34a', glow: 'rgba(22,163,74,0.3)',  label: 'Safe',    icon: '✓' },
  'YELLOW': { color: '#ca8a04', glow: 'rgba(202,138,4,0.3)',  label: 'Caution', icon: '!' },
  'ORANGE': { color: '#ea580c', glow: 'rgba(234,88,12,0.3)', label: 'Warning', icon: '⚠' },
  'RED':    { color: '#dc2626', glow: 'rgba(220,38,38,0.3)',  label: 'Alert',   icon: '✕' },
  'PURPLE': { color: '#9333ea', glow: 'rgba(147,51,234,0.3)', label: 'Emergency', icon: '☠' },
};

const HAZARD_ICONS = {
  'rain':     { icon: '🌊', label: 'Heavy Rain' },
  'thunderstorm': { icon: '⛈️', label: 'Thunderstorm' },
  'earthquake':   { icon: '🔴', label: 'Earthquake' },
  'wind':     { icon: '💨', label: 'Strong Wind' },
  'flood':    { icon: '🌊', label: 'Flood Risk' },
  'weather':  { icon: '🌦️', label: 'Weather Alert' },
  'disaster': { icon: '⚠️', label: 'Disaster' },
  'default':  { icon: '⚠️', label: 'Hazard' },
};

function getHazardType(hazard) {
  const what = (hazard.properties?.what || '').toLowerCase();
  const hType = hazard.type || '';
  if (what.includes('earthquake') || what.includes('sism') || what.includes('secous')) return 'earthquake';
  if (what.includes('thunderstorm') || what.includes('orage') || what.includes('storm')) return 'thunderstorm';
  if (what.includes('flood') || what.includes('inond')) return 'flood';
  if (what.includes('rain') || what.includes('pluie') || what.includes('précipitation')) return 'rain';
  if (what.includes('wind') || what.includes('vent')) return 'wind';
  if (hType === 'earthquake') return 'earthquake';
  if (hType === 'flood') return 'flood';
  if (hType === 'wind') return 'wind';
  if (hType === 'weather' || hType === 'thunderstorm') return hType;
  return 'default';
}

function getHazardColor(severity) {
  const map = { 1: '#16a34a', 2: '#ca8a04', 3: '#ea580c', 4: '#dc2626', 5: '#9333ea' };
  return map[severity] || '#64748b';
}

function riskFromForecast(forecastData) {
  const rl = (forecastData?.risk_level || 'GREEN').toUpperCase();
  return RISK_CONFIG[rl] || RISK_CONFIG.GREEN;
}

const GlassPanel = ({ children, style = {} }) => {
  const { t } = useTheme();
  return (
    <div style={{
      background: t.mapOverlay,
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderRadius: 16,
      border: `1px solid ${t.border}`,
      boxShadow: t.shadowCard,
      padding: 16,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      ...style,
    }}>
      {children}
    </div>
  );
};

const VigilanceMap = ({
  selectedCities = [],
  forecastData = {},
  hazards = [],
  showNeighbors = true,
  onCityClick = () => {}
}) => {
  const { t } = useTheme();
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);
  const pulseCirclesRef = useRef([]);
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    if (!mapInstance.current && mapRef.current) {
      mapInstance.current = L.map(mapRef.current, {
        center: [34.5, 9.2],
        zoom: 7,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap © CARTO',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(mapInstance.current);

      L.control.zoom({ position: 'topright' }).addTo(mapInstance.current);

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
          () => {}
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

  useEffect(() => {
    if (!mapInstance.current) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    pulseCirclesRef.current.forEach(c => c.remove());
    pulseCirclesRef.current = [];

    selectedCities.forEach(city => {
      const coords = TUNISIA_CITIES[city];
      if (!coords) return;

      const rc = riskFromForecast(forecastData[city]);
      const fd = forecastData[city]?.weather;
      const conf = forecastData[city]?.confidence || 0;

      const pulse = L.circleMarker([coords.lat, coords.lng], {
        radius: 22,
        fillColor: rc.color,
        color: rc.color,
        weight: 1,
        fillOpacity: 0.12,
        opacity: 0.25,
        className: 'risk-pulse',
      }).addTo(mapInstance.current);
      pulseCirclesRef.current.push(pulse);

      const marker = L.circleMarker([coords.lat, coords.lng], {
        radius: 9,
        fillColor: rc.color,
        color: '#fff',
        weight: 2.5,
        fillOpacity: 1,
      }).addTo(mapInstance.current);

      const weatherCode = fd?.weather_code ?? 0;
      const weatherIcon = weatherCode >= 95 ? '⛈️' : weatherCode >= 80 ? '🌧️' : weatherCode >= 61 ? '🌦️' : weatherCode >= 50 ? '🌧️' : weatherCode >= 10 ? '⛅' : '☀️';

      const popupHtml = `
        <div style="font-family:'Inter',sans-serif;min-width:240px;">
          <div style="background:${rc.color};margin:-12px -12px 12px;padding:12px;border-radius:12px 12px 0 0;display:flex;align-items:center;gap:10px;">
            <div style="width:36px;height:36px;border-radius:10px;background:rgba(255,255,255,0.25);display:flex;align-items:center;justify-content:center;font-size:16px;color:#fff;font-weight:700;">${rc.icon}</div>
            <div>
              <div style="color:rgba(255,255,255,0.8);font-size:10px;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Risk Level</div>
              <div style="color:#fff;font-size:15px;font-weight:700;">${city} — ${rc.label}</div>
            </div>
          </div>
          ${fd ? `
          <div style="text-align:center;margin-bottom:12px;">
            <div style="font-size:28px;margin-bottom:2px;">${weatherIcon}</div>
            <div style="font-size:22px;font-weight:700;color:#0f172a;">${fd.temp_avg ?? '--'}°C</div>
            <div style="font-size:11px;color:#64748b;">H: ${fd.temp_max ?? '--'}°  L: ${fd.temp_min ?? '--'}°</div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px;">
            <div style="background:#f8fafc;padding:8px;border-radius:10px;text-align:center;"><div style="font-size:9px;color:#94a3b8;text-transform:uppercase;font-weight:600;">Wind</div><div style="font-size:13px;font-weight:700;color:#0f172a;margin-top:2px;">${fd.wind_speed ?? '--'} <span style="font-size:9px;font-weight:500;">km/h</span></div></div>
            <div style="background:#f8fafc;padding:8px;border-radius:10px;text-align:center;"><div style="font-size:9px;color:#94a3b8;text-transform:uppercase;font-weight:600;">Humidity</div><div style="font-size:13px;font-weight:700;color:#0f172a;margin-top:2px;">${fd.humidity ?? '--'}<span style="font-size:9px;font-weight:500;">%</span></div></div>
            <div style="background:#f8fafc;padding:8px;border-radius:10px;text-align:center;"><div style="font-size:9px;color:#94a3b8;text-transform:uppercase;font-weight:600;">Rain</div><div style="font-size:13px;font-weight:700;color:#0f172a;margin-top:2px;">${fd.precipitation ?? 0} <span style="font-size:9px;font-weight:500;">mm</span></div></div>
          </div>
          <div>
            <div style="display:flex;justify-content:space-between;font-size:10px;color:#64748b;margin-bottom:4px;font-weight:500;"><span>AI Confidence</span><span style="color:${rc.color};font-weight:700;">${conf}%</span></div>
            <div style="height:6px;background:#f1f5f9;border-radius:3px;overflow:hidden;"><div style="height:100%;width:${conf}%;background:${rc.color};border-radius:3px;transition:width 0.5s ease;"></div></div>
          </div>` : '<p style="color:#64748b;font-size:11px;text-align:center;padding:16px 0;">No forecast data</p>'}
        </div>`;

      marker.bindPopup(popupHtml, { maxWidth: 280, closeButton: false, className: 'modern-popup' });
      marker.on('click', () => onCityClick(city));
      markersRef.current.push(marker);
    });

    if (showNeighbors) {
      Object.entries(TUNISIA_CITIES).forEach(([city, coords]) => {
        if (coords.country && !selectedCities.includes(city)) {
          const marker = L.circleMarker([coords.lat, coords.lng], {
            radius: 5,
            fillColor: '#94a3b8',
            color: '#cbd5e1',
            weight: 1,
            fillOpacity: 0.5,
          }).addTo(mapInstance.current);
          marker.bindTooltip(`${city}`, { permanent: false, direction: 'top', className: 'neighbor-tooltip' });
          markersRef.current.push(marker);
        }
      });
    }
  }, [selectedCities, forecastData, showNeighbors, onCityClick]);

  useEffect(() => {
    if (!mapInstance.current || !hazards.length) return;

    hazards.forEach(hazard => {
      const geom = hazard.geometry;
      if (!geom) return;
      const [lng, lat] = geom.type === 'Point' ? geom.coordinates : [0, 0];
      if (lat === 0 && lng === 0) return;

      const hType = getHazardType(hazard);
      const hi = HAZARD_ICONS[hType] || HAZARD_ICONS.default;
      const color = getHazardColor(hazard.severity);

      const icon = L.divIcon({
        className: 'hazard-marker',
        html: `<div style="background:${color};border:2px solid #fff;border-radius:20px;padding:3px 10px;display:flex;align-items:center;gap:4px;font-size:10px;font-weight:700;color:#fff;box-shadow:0 2px 8px ${color}50;white-space:nowrap;">${hi.icon} ${hi.label}</div>`,
        iconSize: [100, 24],
        iconAnchor: [50, 12],
      });

      const marker = L.marker([lat, lng], { icon, zIndexOffset: 1000 }).addTo(mapInstance.current);
      marker.bindPopup(`
        <div style="font-family:'Inter',sans-serif;min-width:200px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <div style="width:28px;height:28px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;font-size:14px;">${hi.icon}</div>
            <div><h4 style="margin:0;color:#1e293b;font-size:13px;">${hazard.properties?.what || hi.label}</h4>
            <span style="font-size:10px;color:${color};font-weight:600;">Severity: ${hazard.severity}/5 · ${hazard.source || ''}</span></div>
          </div>
        </div>`, { maxWidth: 280, closeButton: false });
      markersRef.current.push(marker);
    });
  }, [hazards]);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes riskPulse { 0%,100%{r:22;opacity:0.12} 50%{r:32;opacity:0.04} }
      .risk-pulse circle { animation: riskPulse 2.5s ease-in-out infinite; }
      .modern-popup .leaflet-popup-content-wrapper { border-radius:16px !important; box-shadow:0 12px 40px rgba(0,0,0,0.12) !important; padding:0 !important; border:none !important; overflow:hidden !important; }
      .modern-popup .leaflet-popup-content { margin:0 !important; min-width:240px !important; }
      .modern-popup .leaflet-popup-tip { box-shadow:0 4px 12px rgba(0,0,0,0.08) !important; }
      .modern-popup .leaflet-popup-close-button { display:none !important; }
      .neighbor-tooltip { font-size:10px !important; background:rgba(255,255,255,0.95) !important; border:1px solid #e2e8f0 !important; border-radius:6px !important; padding:3px 8px !important; box-shadow:0 2px 8px rgba(0,0,0,0.06) !important; }
      .leaflet-control-zoom a { background:#fff !important; color:#334155 !important; border-color:#e2e8f0 !important; }
      .leaflet-control-zoom a:hover { background:#f8fafc !important; }
      .leaflet-control-attribution { display:none !important; }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const citiesByRisk = selectedCities.reduce((acc, city) => {
    const rc = riskFromForecast(forecastData[city]);
    if (!acc[rc.color]) acc[rc.color] = { label: rc.label, color: rc.color, count: 0, cities: [] };
    acc[rc.color].count++;
    acc[rc.color].cities.push(city);
    return acc;
  }, {});

  const sortedRisks = Object.values(citiesByRisk).sort((a, b) => {
    const order = { 'Emergency': 0, 'Alert': 1, 'Warning': 2, 'Caution': 3, 'Safe': 4 };
    return (order[a.label] ?? 5) - (order[b.label] ?? 5);
  });

  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

  return (
    <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
      <div ref={mapRef} style={{ height: '620px', width: '100%' }} />

      <div style={{
        position: 'absolute', top: 12, left: 12, right: 12, zIndex: 1000,
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12,
        pointerEvents: 'none',
      }}>
        <GlassPanel style={{ pointerEvents: 'auto', padding: '14px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 16 }}>🗺️</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Weather Vigilance</div>
              <div style={{ fontSize: 10, color: '#64748b', fontWeight: 500 }}>{timeStr} · Updated live</div>
            </div>
          </div>

          {sortedRisks.length > 0 ? (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {sortedRisks.map(risk => (
                <div key={risk.color} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: risk.color + '10', borderRadius: 10, padding: '6px 10px',
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: risk.color }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: risk.color }}>{risk.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 11, color: '#94a3b8' }}>Select governorates to view risk levels</div>
          )}
        </GlassPanel>

        <GlassPanel style={{ pointerEvents: 'auto', padding: '10px 14px' }}>
          <div style={{ display: 'flex', gap: 16 }}>
            {[
              { label: 'Safe', color: '#16a34a' },
              { label: 'Caution', color: '#ca8a04' },
              { label: 'Warning', color: '#ea580c' },
              { label: 'Alert', color: '#dc2626' },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: s.color }} />
                <span style={{ fontSize: 9, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}>{s.label}</span>
              </div>
            ))}
          </div>
        </GlassPanel>
      </div>

      {userLocation && (
        <div style={{
          position: 'absolute', bottom: 16, left: 16, zIndex: 1000,
        }}>
          <GlassPanel style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6', animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: 11, color: '#475569', fontWeight: 500 }}>📍 Location active</span>
          </GlassPanel>
        </div>
      )}
    </div>
  );
};

export default VigilanceMap;
