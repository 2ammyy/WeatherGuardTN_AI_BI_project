import React, { useState, useRef, useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const GOVERNORATES = [
  { name: 'Tunis', lat: 36.8065, lng: 10.1815 },
  { name: 'Ariana', lat: 36.8625, lng: 10.1956 },
  { name: 'Ben Arous', lat: 36.7459, lng: 10.2214 },
  { name: 'Manouba', lat: 36.8081, lng: 10.0972 },
  { name: 'Sfax', lat: 34.7400, lng: 10.7600 },
  { name: 'Sousse', lat: 35.8256, lng: 10.6411 },
  { name: 'Bizerte', lat: 37.2744, lng: 9.8739 },
  { name: 'Nabeul', lat: 36.4561, lng: 10.7378 },
  { name: 'Monastir', lat: 35.7833, lng: 10.8333 },
  { name: 'Mahdia', lat: 35.5047, lng: 11.0622 },
  { name: 'Kairouan', lat: 35.6781, lng: 10.0963 },
  { name: 'Jendouba', lat: 36.5011, lng: 8.7803 },
  { name: 'Gafsa', lat: 34.4250, lng: 8.7842 },
  { name: 'Gabès', lat: 33.8815, lng: 10.0982 },
  { name: 'Medenine', lat: 33.3549, lng: 10.5055 },
  { name: 'Tataouine', lat: 32.9297, lng: 10.4518 },
  { name: 'Tozeur', lat: 33.9197, lng: 8.1335 },
  { name: 'Kébili', lat: 33.7044, lng: 8.9692 },
  { name: 'Béja', lat: 36.7256, lng: 9.1817 },
  { name: 'Le Kef', lat: 36.1741, lng: 8.7049 },
  { name: 'Siliana', lat: 36.0849, lng: 9.3708 },
  { name: 'Zaghouan', lat: 36.4029, lng: 10.1429 },
  { name: 'Kasserine', lat: 35.1676, lng: 8.8365 },
];

const HAZARD_RADIUS_KM = 20;

const RoutePage = ({ onBack, hazards = [] }) => {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [checking, setChecking] = useState(false);
  const [routeSafety, setRouteSafety] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [originCoords, setOriginCoords] = useState(null);
  const [destCoords, setDestCoords] = useState(null);
  const [routeError, setRouteError] = useState(null);
  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const routeLayer = useRef(null);

  const haversineKm = (lat1, lng1, lat2, lng2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const resolveCity = (name) => {
    const match = GOVERNORATES.find((g) => g.name.toLowerCase() === name.toLowerCase().trim());
    if (match) return { lat: match.lat, lng: match.lng, name: match.name };
    return null;
  };

  const geocode = async (query) => {
    try {
      const res = await fetch(`/api/tmaps/geocode?q=${encodeURIComponent(query)}`);
      if (!res.ok) return null;
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const r = data.results[0];
        return { lat: r.lat, lng: r.lng, name: query };
      }
    } catch {
      return null;
    }
    return null;
  };

  const getRoute = async (o, d) => {
    const res = await fetch('/api/tmaps/route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origin: o, destination: d }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Route calculation failed');
    }
    return res.json();
  };

  const checkRoute = async () => {
    if (!origin.trim() || !destination.trim()) return;

    setChecking(true);
    setRouteSafety(null);
    setRouteInfo(null);
    setRouteError(null);
    setOriginCoords(null);
    setDestCoords(null);

    try {
      let oCoords = resolveCity(origin);
      let dCoords = resolveCity(destination);

      if (!oCoords) {
        oCoords = await geocode(origin);
        if (!oCoords) throw new Error(`Could not find: ${origin}`);
      }
      if (!dCoords) {
        dCoords = await geocode(destination);
        if (!dCoords) throw new Error(`Could not find: ${destination}`);
      }

      setOriginCoords(oCoords);
      setDestCoords(dCoords);

      const route = await getRoute(oCoords.name, dCoords.name);
      const routeCoords = route.coordinates;

      if (!routeCoords || routeCoords.length === 0) throw new Error('No route geometry returned');

      setRouteInfo({
        distance_km: route.distance_km,
        duration_min: route.duration_min,
      });

      const nearbyHazards = [];
      for (const h of hazards) {
        const hLat = h.geometry?.coordinates?.[1] || h.latitude;
        const hLng = h.geometry?.coordinates?.[0] || h.longitude;
        if (!hLat || !hLng) continue;

        let minDist = Infinity;
        for (let i = 0; i < routeCoords.length; i += 5) {
          const dist = haversineKm(hLat, hLng, routeCoords[i][1], routeCoords[i][0]);
          if (dist < minDist) minDist = dist;
        }

        if (minDist <= HAZARD_RADIUS_KM) {
          nearbyHazards.push({
            name: h.properties?.what || h.properties?.title || h.type || 'Unknown hazard',
            severity: h.properties?.severity || h.severity || 'medium',
            distance: minDist.toFixed(1),
          });
        }
      }

      let safetyScore = 100;
      for (const h of nearbyHazards) {
        if (h.severity === 'high' || h.severity === 4 || h.severity === 5) safetyScore -= 25;
        else if (h.severity === 'medium' || h.severity === 2 || h.severity === 3) safetyScore -= 15;
        else safetyScore -= 8;
      }
      safetyScore = Math.max(0, Math.min(100, safetyScore));

      let message, level;
      if (safetyScore >= 80) { message = 'Route is safe'; level = 'safe'; }
      else if (safetyScore >= 60) { message = 'Proceed with caution'; level = 'caution'; }
      else if (safetyScore >= 40) { message = 'Route is risky'; level = 'risky'; }
      else { message = 'Route may be dangerous'; level = 'dangerous'; }

      setRouteSafety({
        score: safetyScore,
        level,
        message,
        hazards: nearbyHazards,
        origin: oCoords.name,
        destination: dCoords.name,
      });
    } catch (err) {
      setRouteError(err.message);
    } finally {
      setChecking(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#eab308';
    if (score >= 40) return '#f97316';
    return '#ef4444';
  };

  const getLevelConfig = (level) => {
    switch (level) {
      case 'safe': return { bg: 'rgba(34, 197, 94, 0.1)', border: 'rgba(34, 197, 94, 0.3)', color: '#4ade80', icon: '✅' };
      case 'caution': return { bg: 'rgba(234, 179, 8, 0.1)', border: 'rgba(234, 179, 8, 0.3)', color: '#fbbf24', icon: '⚠' };
      case 'risky': return { bg: 'rgba(249, 115, 22, 0.1)', border: 'rgba(249, 115, 22, 0.3)', color: '#fb923c', icon: '⚠' };
      case 'dangerous': return { bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.3)', color: '#f87171', icon: '🚫' };
      default: return { bg: 'rgba(100, 116, 139, 0.1)', border: 'rgba(100, 116, 139, 0.3)', color: '#94a3b8', icon: '❓' };
    }
  };

  useEffect(() => {
    if (!routeSafety || !originCoords || !destCoords || !routeInfo) return;

    if (!mapRef.current) return;

    if (!leafletMap.current) {
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      leafletMap.current = L.map(mapRef.current).setView([34, 9.5], 7);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 18,
      }).addTo(leafletMap.current);
    }

    const map = leafletMap.current;

    if (routeLayer.current) {
      routeLayer.current.forEach((layer) => map.removeLayer(layer));
    }
    routeLayer.current = [];

    const startIcon = L.divIcon({
      html: '<div style="background:#22c55e;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>',
      iconSize: [16, 16],
      className: '',
    });
    const endIcon = L.divIcon({
      html: '<div style="background:#ef4444;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>',
      iconSize: [16, 16],
      className: '',
    });

    const startMarker = L.marker([originCoords.lat, originCoords.lng], { icon: startIcon })
      .bindPopup(`<b>From:</b> ${originCoords.name}`)
      .addTo(map);
    const endMarker = L.marker([destCoords.lat, destCoords.lng], { icon: endIcon })
      .bindPopup(`<b>To:</b> ${destCoords.name}`)
      .addTo(map);
    routeLayer.current.push(startMarker, endMarker);

    getRoute(originCoords.name, destCoords.name).then((route) => {
      if (route.coordinates && route.coordinates.length > 0) {
        const latlngs = route.coordinates.map((c) => [c[1], c[0]]);
        const polyline = L.polyline(latlngs, {
          color: getScoreColor(routeSafety.score),
          weight: 5,
          opacity: 0.85,
        }).addTo(map);
        routeLayer.current.push(polyline);

        hazards.forEach((h) => {
          const hLat = h.geometry?.coordinates?.[1] || h.latitude;
          const hLng = h.geometry?.coordinates?.[0] || h.longitude;
          if (hLat && hLng) {
            const hazardIcon = L.divIcon({
              html: '<div style="background:#ef4444;width:12px;height:12px;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)"></div>',
              iconSize: [12, 12],
              className: '',
            });
            L.marker([hLat, hLng], { icon: hazardIcon })
              .bindPopup(`<b>${h.properties?.what || h.properties?.title || h.type || 'Hazard'}</b>`)
              .addTo(map);
          }
        });

        map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
      }
    });

    map.invalidateSize();
  }, [routeSafety, originCoords, destCoords, routeInfo, hazards]);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#020617',
      color: 'white',
      fontFamily: 'sans-serif',
    }}>
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
          gap: 16,
        }}>
          <button
            onClick={onBack}
            style={{
              background: 'transparent',
              border: '1px solid #334155',
              borderRadius: 8,
              color: '#94a3b8',
              padding: '6px 12px',
              cursor: 'pointer',
              fontSize: 13,
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.target.style.borderColor = '#1D9E75'; e.target.style.color = '#1D9E75'; }}
            onMouseLeave={(e) => { e.target.style.borderColor = '#334155'; e.target.style.color = '#94a3b8'; }}
          >
            ← Back
          </button>
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
              🛣
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
                Route Safety Check
              </h1>
              <p style={{ fontSize: 10, color: '#64748b', margin: 0 }}>Check hazards along your route</p>
            </div>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px' }}>
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #0a0f1c 100%)',
          borderRadius: 20,
          border: '1px solid rgba(29, 158, 117, 0.2)',
          overflow: 'hidden',
        }}>
          <style>{`
            @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            .leaflet-container { background: #0f172a !important; }
          `}</style>

          {/* Header */}
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #1e293b', background: 'rgba(11, 17, 32, 0.5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                background: 'linear-gradient(135deg, #1D9E75 0%, #0f6e56 100%)',
                width: 40, height: 40, borderRadius: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
              }}>
                🗺
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Route Safety Checker</h3>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>Powered by OSRM + OpenStreetMap</p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: '1.5rem' }}>
            {/* Inputs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#94a3b8', marginBottom: 6 }}>
                  🟢 From
                </label>
                <input
                  type="text"
                  value={origin}
                  onChange={(e) => { setOrigin(e.target.value); setRouteSafety(null); }}
                  placeholder="City (e.g., Tunis, Sfax)"
                  list="tunisia-cities"
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #334155', background: '#1e293b', fontSize: 14, color: 'white', outline: 'none', boxSizing: 'border-box', transition: 'all 0.2s' }}
                  onFocus={(e) => e.target.style.borderColor = '#1D9E75'}
                  onBlur={(e) => e.target.style.borderColor = '#334155'}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#94a3b8', marginBottom: 6 }}>
                  🔴 To
                </label>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => { setDestination(e.target.value); setRouteSafety(null); }}
                  placeholder="City (e.g., Sousse, Bizerte)"
                  list="tunisia-cities"
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #334155', background: '#1e293b', fontSize: 14, color: 'white', outline: 'none', boxSizing: 'border-box', transition: 'all 0.2s' }}
                  onFocus={(e) => e.target.style.borderColor = '#1D9E75'}
                  onBlur={(e) => e.target.style.borderColor = '#334155'}
                />
              </div>

              <datalist id="tunisia-cities">
                {GOVERNORATES.map((g) => <option key={g.name} value={g.name} />)}
              </datalist>

              <button
                onClick={checkRoute}
                disabled={checking || !origin || !destination}
                style={{
                  width: '100%', padding: '12px', borderRadius: 12,
                  background: 'linear-gradient(135deg, #1D9E75 0%, #0f6e56 100%)',
                  color: 'white', border: 'none', cursor: checking || !origin || !destination ? 'not-allowed' : 'pointer',
                  fontSize: 14, fontWeight: 600, fontFamily: 'sans-serif',
                  transition: 'all 0.2s',
                  opacity: checking || !origin || !destination ? 0.5 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
                onMouseEnter={(e) => { if (!checking && origin && destination) e.target.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={(e) => { if (!checking && origin && destination) e.target.style.transform = 'translateY(0)'; }}
              >
                {checking ? (
                  <>
                    <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    Calculating route...
                  </>
                ) : (
                  <>🚗 Check Route Safety</>
                )}
              </button>
            </div>

            {/* Error */}
            {routeError && (
              <div style={{ marginTop: 20, padding: '12px 16px', borderRadius: 12, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                <div style={{ color: '#f87171', fontSize: 13, fontWeight: 600 }}>⚠ Error</div>
                <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>{routeError}</div>
              </div>
            )}

            {/* Results */}
            {routeSafety && (
              <div style={{ marginTop: 24 }}>
                {/* Route Info Bar */}
                {routeInfo && (
                  <div style={{ display: 'flex', gap: 16, marginBottom: 16, padding: '12px 16px', background: '#1e293b', borderRadius: 12, border: '1px solid #334155' }}>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>DISTANCE</div>
                      <div style={{ fontSize: 18, fontWeight: 700 }}>{routeInfo.distance_km} km</div>
                    </div>
                    <div style={{ width: 1, background: '#334155' }} />
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>DURATION</div>
                      <div style={{ fontSize: 18, fontWeight: 700 }}>{routeInfo.duration_min} min</div>
                    </div>
                    <div style={{ width: 1, background: '#334155' }} />
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>ROUTE</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8' }}>{routeSafety.origin} → {routeSafety.destination}</div>
                    </div>
                  </div>
                )}

                {/* Score + Status */}
                <div style={{ padding: '1.25rem', borderRadius: 16, background: getLevelConfig(routeSafety.level).bg, border: `1px solid ${getLevelConfig(routeSafety.level).border}`, animation: 'slideUp 0.3s ease-out' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 16 }}>
                    <div style={{ position: 'relative', width: 80, height: 80 }}>
                      <svg style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                        <circle cx="40" cy="40" r="36" fill="none" stroke="#1e293b" strokeWidth="6" />
                        <circle cx="40" cy="40" r="36" fill="none" stroke={getScoreColor(routeSafety.score)} strokeWidth="6" strokeDasharray={`${routeSafety.score * 2.26} 226`} strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.5s ease-out' }} />
                      </svg>
                      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                        <div style={{ fontSize: 20, fontWeight: 700 }}>{routeSafety.score}%</div>
                        <div style={{ fontSize: 10, color: '#64748b' }}>Safety</div>
                      </div>
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: getLevelConfig(routeSafety.level).color, marginBottom: 4 }}>
                        {getLevelConfig(routeSafety.level).icon} {routeSafety.message}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        Based on routing data + real-time hazard reports
                      </div>
                    </div>
                  </div>

                  {/* Hazards */}
                  {routeSafety.hazards.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, fontSize: 13, fontWeight: 500, color: '#f87171' }}>
                        ⚠ Hazards within {HAZARD_RADIUS_KM}km of route ({routeSafety.hazards.length})
                      </div>
                      <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {routeSafety.hazards.map((h, i) => (
                          <li key={i} style={{ color: '#94a3b8', fontSize: 13, padding: '8px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>{h.name}</span>
                            <span style={{ fontSize: 11, color: '#64748b', marginLeft: 12 }}>{h.distance} km</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {routeSafety.hazards.length === 0 && (
                    <div style={{ padding: '8px 12px', background: 'rgba(34, 197, 94, 0.1)', borderRadius: 8, fontSize: 12, color: '#4ade80', display: 'flex', alignItems: 'center', gap: 8 }}>
                      ✅ No hazards detected near this route
                    </div>
                  )}

                  {routeSafety.level === 'dangerous' && (
                    <div style={{ marginTop: 12, padding: '10px 12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 10, fontSize: 12, color: '#f87171', display: 'flex', alignItems: 'center', gap: 8 }}>
                      💡 Consider postponing non-essential travel or finding an alternative route
                    </div>
                  )}
                  {routeSafety.level === 'risky' && (
                    <div style={{ marginTop: 12, padding: '10px 12px', background: 'rgba(249, 115, 22, 0.1)', borderRadius: 10, fontSize: 12, color: '#fb923c', display: 'flex', alignItems: 'center', gap: 8 }}>
                      💡 Drive carefully and stay alert for weather conditions
                    </div>
                  )}
                </div>

                {/* Map */}
                <div style={{ marginTop: 16, borderRadius: 12, overflow: 'hidden', border: '1px solid #334155', height: 400 }}>
                  <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoutePage;
