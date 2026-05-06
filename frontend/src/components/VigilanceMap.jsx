import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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
  'Tebessa': { lat: 35.4000, lng: 8.1167, country: 'Algeria' },
  'Tripoli': { lat: 32.8872, lng: 13.1917, country: 'Libya' },
};

const RISK_CONFIG = {
  'GREEN':  { color: '#22c55e', glow: 'rgba(34,197,94,0.4)',  label: 'Safe',    icon: '✓' },
  'YELLOW': { color: '#eab308', glow: 'rgba(234,179,8,0.4)',  label: 'Caution', icon: '!' },
  'ORANGE': { color: '#f97316', glow: 'rgba(249,115,22,0.4)', label: 'Warning', icon: '⚠' },
  'RED':    { color: '#ef4444', glow: 'rgba(239,68,68,0.4)',  label: 'Alert',   icon: '✕' },
  'PURPLE': { color: '#a855f7', glow: 'rgba(168,85,247,0.4)', label: 'Emergency', icon: '☠' },
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
  const map = { 1: '#22c55e', 2: '#eab308', 3: '#f97316', 4: '#ef4444', 5: '#a855f7' };
  return map[severity] || '#94a3b8';
}

function riskFromForecast(forecastData) {
  const rl = (forecastData?.risk_level || 'GREEN').toUpperCase();
  return RISK_CONFIG[rl] || RISK_CONFIG.GREEN;
}

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
  const pulseCirclesRef = useRef([]);
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    if (!mapInstance.current && mapRef.current) {
      mapInstance.current = L.map(mapRef.current, {
        center: [34.0, 9.0],
        zoom: 7,
        zoomControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(mapInstance.current);

      L.control.zoom({ position: 'topright' }).addTo(mapInstance.current);
      L.control.scale({ metric: true, imperial: false, position: 'bottomleft' }).addTo(mapInstance.current);

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

      const marker = L.circleMarker([coords.lat, coords.lng], {
        radius: 10,
        fillColor: rc.color,
        color: '#fff',
        weight: 2,
        fillOpacity: 0.9,
      }).addTo(mapInstance.current);

      const pulse = L.circleMarker([coords.lat, coords.lng], {
        radius: 20,
        fillColor: rc.color,
        color: rc.color,
        weight: 1,
        fillOpacity: 0.15,
        opacity: 0.3,
        className: 'risk-pulse',
      }).addTo(mapInstance.current);
      pulseCirclesRef.current.push(pulse);

      const popupHtml = `
        <div style="font-family: 'Inter',sans-serif; min-width: 220px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid #e2e8f0;">
            <div style="width:32px;height:32px;border-radius:50%;background:${rc.color};display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px;font-weight:700;">${rc.icon}</div>
            <div><h3 style="margin:0;color:#1e293b;font-size:15px;">${city}</h3><span style="font-size:10px;color:${rc.color};font-weight:700;text-transform:uppercase;">${rc.label}</span></div>
          </div>
          ${fd ? `
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px;margin-bottom:10px;">
            <div style="background:#f1f5f9;padding:6px 8px;border-radius:6px;text-align:center;"><div style="font-size:9px;color:#64748b;text-transform:uppercase;">Temp</div><div style="font-weight:700;color:#0f172a;">${fd.temp_avg ?? '--'}°C</div></div>
            <div style="background:#f1f5f9;padding:6px 8px;border-radius:6px;text-align:center;"><div style="font-size:9px;color:#64748b;text-transform:uppercase;">Wind</div><div style="font-weight:700;color:#0f172a;">${fd.wind_speed ?? '--'} km/h</div></div>
            <div style="background:#f1f5f9;padding:6px 8px;border-radius:6px;text-align:center;"><div style="font-size:9px;color:#64748b;text-transform:uppercase;">Humidity</div><div style="font-weight:700;color:#0f172a;">${fd.humidity ?? '--'}%</div></div>
            <div style="background:#f1f5f9;padding:6px 8px;border-radius:6px;text-align:center;"><div style="font-size:9px;color:#64748b;text-transform:uppercase;">Rain</div><div style="font-weight:700;color:#0f172a;">${fd.precipitation ?? 0} mm</div></div>
          </div>
          <div style="margin-bottom:8px;">
            <div style="display:flex;justify-content:space-between;font-size:10px;color:#64748b;margin-bottom:3px;"><span>Confidence</span><span style="font-weight:600;color:${rc.color};">${conf}%</span></div>
            <div style="height:4px;background:#e2e8f0;border-radius:2px;overflow:hidden;"><div style="height:100%;width:${conf}%;background:${rc.color};border-radius:2px;"></div></div>
          </div>` : '<p style="color:#64748b;font-size:11px;">No forecast data</p>'}
        </div>`;

      marker.bindPopup(popupHtml, { maxWidth: 260, closeButton: false });
      marker.on('click', () => onCityClick(city));
      markersRef.current.push(marker);
    });

    if (showNeighbors) {
      Object.entries(TUNISIA_CITIES).forEach(([city, coords]) => {
        if (coords.country && !selectedCities.includes(city)) {
          const marker = L.circleMarker([coords.lat, coords.lng], {
            radius: 5,
            fillColor: '#64748b',
            color: '#94a3b8',
            weight: 1,
            fillOpacity: 0.4,
          }).addTo(mapInstance.current);
          marker.bindTooltip(`${city} (${coords.country})`, { permanent: false, direction: 'top', className: 'neighbor-tooltip' });
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
        html: `
          <div style="position:relative;">
            <div style="width:12px;height:12px;border-radius:50%;background:${color};position:absolute;top:-4px;right:-4px;border:2px solid #0f172a;"></div>
            <div style="background:${color}22;border:1px solid ${color}66;border-radius:20px;padding:4px 10px;display:flex;align-items:center;gap:4px;font-size:11px;font-weight:600;color:#1e293b;backdrop-filter:blur(4px);white-space:nowrap;box-shadow:0 2px 8px ${color}33;">
              ${hi.icon} ${hi.label}
            </div>
          </div>`,
        iconSize: [120, 28],
        iconAnchor: [60, 14],
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
      @keyframes riskPulse { 0%,100%{r:20;opacity:0.15} 50%{r:30;opacity:0.05} }
      .risk-pulse circle { animation: riskPulse 2s ease-in-out infinite; }
      .hazard-marker { transition: transform 0.15s; }
      .hazard-marker:hover { transform: scale(1.05); }
      .leaflet-popup-content-wrapper { border-radius:12px !important; box-shadow:0 8px 24px rgba(0,0,0,0.15) !important; padding:0 !important; border:1px solid #e2e8f0 !important; }
      .leaflet-popup-content { margin:12px !important; font-size:13px !important; }
      .leaflet-popup-tip { box-shadow:0 2px 4px rgba(0,0,0,0.06) !important; }
      .leaflet-popup-close-button { display:none !important; }
      .neighbor-tooltip { font-size:10px !important; color:#94a3b8 !important; background:rgba(255,255,255,0.95) !important; border:1px solid #e2e8f0 !important; border-radius:4px !important; padding:2px 6px !important; color:#475569 !important; }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const activeHazards = hazards.filter(h => h.severity >= 3);
  const citiesByRisk = selectedCities.reduce((acc, city) => {
    const rc = riskFromForecast(forecastData[city]);
    if (!acc[rc.label]) acc[rc.label] = { color: rc.color, count: 0, cities: [] };
    acc[rc.label].count++;
    acc[rc.label].cities.push(city);
    return acc;
  }, {});

  return (
    <div style={{ position: 'relative', borderRadius: 0, overflow: 'hidden' }}>
      <div ref={mapRef} style={{ height: '620px', width: '100%' }} />

      <div style={{
        position: 'absolute', top: 12, left: 12, zIndex: 1000,
        background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)',
        borderRadius: 14, padding: '12px 16px', border: '1px solid rgba(0,0,0,0.08)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        minWidth: 180, fontFamily: "'Inter',sans-serif",
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
          Risk Overview
        </div>
        {Object.entries(citiesByRisk).map(([label, data]) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: data.color }} />
              <span style={{ fontSize: 12, color: '#1e293b' }}>{label}</span>
            </div>
            <span style={{
              fontSize: 10, fontWeight: 700, background: data.color + '18', color: data.color,
              padding: '2px 8px', borderRadius: 10,
            }}>{data.count}</span>
          </div>
        ))}
        {Object.keys(citiesByRisk).length === 0 && (
          <div style={{ fontSize: 11, color: '#94a3b8' }}>No cities selected</div>
        )}
      </div>

      {hazards.length > 0 && (
        <div style={{
          position: 'absolute', top: 12, right: 12, zIndex: 1000,
          background: activeHazards.length > 0 ? 'rgba(239,68,68,0.9)' : 'rgba(34,197,94,0.9)',
          backdropFilter: 'blur(12px)', borderRadius: 14, padding: '8px 14px',
          display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'Inter',sans-serif",
        }}>
          <span style={{ fontSize: 14 }}>{activeHazards.length > 0 ? '⚠️' : '✓'}</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#fff' }}>
            {activeHazards.length > 0 ? `${activeHazards.length} Active Alert${activeHazards.length > 1 ? 's' : ''}` : 'All Clear'}
          </span>
        </div>
      )}

      <div style={{
        position: 'absolute', bottom: 32, right: 12, zIndex: 1000,
        background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)',
        borderRadius: 12, padding: '10px 14px', border: '1px solid rgba(0,0,0,0.08)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        fontFamily: "'Inter',sans-serif",
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
          Severity Scale
        </div>
        {[
          { label: 'Minor', color: '#22c55e' },
          { label: 'Moderate', color: '#eab308' },
          { label: 'Severe', color: '#f97316' },
          { label: 'Extreme', color: '#ef4444' },
          { label: 'Catastrophic', color: '#a855f7' },
        ].map(s => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{ width: 14, height: 4, borderRadius: 2, background: s.color }} />
            <span style={{ fontSize: 10, color: '#64748b' }}>{s.label}</span>
          </div>
        ))}
      </div>

      {userLocation && (
        <div style={{
          position: 'absolute', bottom: 32, left: 12, zIndex: 1000,
          background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)',
          borderRadius: 12, padding: '6px 12px', border: '1px solid rgba(59,130,246,0.2)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'Inter',sans-serif",
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6' }} />
          <span style={{ fontSize: 10, color: '#64748b' }}>📍 Location detected</span>
        </div>
      )}
    </div>
  );
};

export default VigilanceMap;
