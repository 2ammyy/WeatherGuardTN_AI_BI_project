import React, { useState, useRef, useEffect } from 'react';
import { tmapsAPI } from '../services/tmaps';
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

const RouteChecker = ({ hazards = [] }) => {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [originCoords, setOriginCoords] = useState(null);
  const [destCoords, setDestCoords] = useState(null);
  const [checking, setChecking] = useState(false);
  const [routeSafety, setRouteSafety] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [tmapsError, setTmapsError] = useState(null);
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

  const checkRoute = async () => {
    if (!origin || !destination) return;

    setChecking(true);
    setRouteSafety(null);
    setRouteInfo(null);
    setTmapsError(null);

    try {
      let oCoords = resolveCity(origin);
      let dCoords = resolveCity(destination);

      if (!oCoords) {
        const geo = await tmapsAPI.geocode(origin);
        if (!geo) throw new Error(`Could not find location: ${origin}`);
        oCoords = { lat: geo.lat, lng: geo.lng, name: geo.name };
      }

      if (!dCoords) {
        const geo = await tmapsAPI.geocode(destination);
        if (!geo) throw new Error(`Could not find location: ${destination}`);
        dCoords = { lat: geo.lat, lng: geo.lng, name: geo.name };
      }

      setOriginCoords(oCoords);
      setDestCoords(dCoords);

      const route = await tmapsAPI.route(oCoords.name, dCoords.name);

      const routeCoords = route.coordinates;
      const distanceKm = route.distance_km;
      const durationMin = route.duration_min;

      if (!routeCoords || routeCoords.length === 0) throw new Error('No route geometry returned by TMAPS');

      setRouteInfo({
        distance_km: distanceKm,
        duration_min: durationMin,
        instructions: route.instructions.slice(0, 5),
      });

      const nearbyHazards = [];

      for (const h of hazards) {
        const hLat = h.geometry?.coordinates?.[1];
        const hLng = h.geometry?.coordinates?.[0];
        if (!hLat || !hLng) continue;

        let nearRoute = false;
        for (let i = 0; i < routeCoords.length; i += 10) {
          const dist = haversineKm(hLat, hLng, routeCoords[i][1], routeCoords[i][0]);
          if (dist <= HAZARD_RADIUS_KM) {
            nearRoute = true;
            break;
          }
        }

        if (nearRoute) {
          nearbyHazards.push({
            name: h.properties?.what || h.properties?.title || 'Unknown hazard',
            severity: h.properties?.severity || 'medium',
            distance: Math.min(...routeCoords.map((c) => haversineKm(hLat, hLng, c[1], c[0]))).toFixed(1),
          });
        }
      }

      let safetyScore = 100;
      for (const h of nearbyHazards) {
        if (h.severity === 'high') safetyScore -= 25;
        else if (h.severity === 'medium') safetyScore -= 15;
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
      console.error('Route check error:', err);
      if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        setTmapsError('Could not connect to TMAPS. Please ensure the API key is configured in VITE_TMAPS_API_KEY environment variable.');
      } else {
        setTmapsError(err.message);
      }
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
      case 'caution': return { bg: 'rgba(234, 179, 8, 0.1)', border: 'rgba(234, 179, 8, 0.3)', color: '#fbbf24', icon: '⚠️' };
      case 'risky': return { bg: 'rgba(249, 115, 22, 0.1)', border: 'rgba(249, 115, 22, 0.3)', color: '#fb923c', icon: '⚠️' };
      case 'dangerous': return { bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.3)', color: '#f87171', icon: '🚫' };
      default: return { bg: 'rgba(100, 116, 139, 0.1)', border: 'rgba(100, 116, 139, 0.3)', color: '#94a3b8', icon: '❓' };
    }
  };

  useEffect(() => {
    if (!routeSafety || !originCoords || !destCoords || !routeInfo) return;

    const initMap = async () => {
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
          attribution: '© OpenStreetMap | © TMAPS',
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

      tmapsAPI.route(originCoords.name, destCoords.name).then((route) => {
        if (route.coordinates.length > 0) {
          const latlngs = route.coordinates.map((c) => [c[1], c[0]]);
          const polyline = L.polyline(latlngs, {
            color: getScoreColor(routeSafety.score),
            weight: 4,
            opacity: 0.8,
          }).addTo(map);
          routeLayer.current.push(polyline);
          map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
        }
      });
    };

    setTimeout(initMap, 100);
  }, [routeSafety, originCoords, destCoords, routeInfo]);

  return (
    <div style={{
      background: "linear-gradient(135deg, #0f172a 0%, #0a0f1c 100%)",
      borderRadius: 20,
      border: "1px solid rgba(29, 158, 117, 0.2)",
      overflow: "hidden",
      animation: "slideUp 0.3s ease-out",
    }}>
      <style>{`
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      {/* Header */}
      <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #1e293b", background: "rgba(11, 17, 32, 0.5)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ background: "linear-gradient(135deg, #1D9E75 0%, #0f6e56 100%)", width: 40, height: 40, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
            🗺️
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "white" }}>Route Safety Checker</h3>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>Powered by TMAPS — Real routing data for Tunisia</p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "1.5rem" }}>
        {/* Inputs */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#94a3b8", marginBottom: 6, letterSpacing: "0.3px" }}>
              <span style={{ marginRight: 4 }}>🟢</span> From
            </label>
            <input
              type="text"
              value={origin}
              onChange={(e) => { setOrigin(e.target.value); setOriginCoords(null); }}
              placeholder="City or address (e.g., Tunis, Sfax)"
              list="tunisia-cities"
              style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: "1px solid #334155", background: "#1e293b", fontSize: 14, color: "white", outline: "none", transition: "all 0.2s", boxSizing: "border-box" }}
              onFocus={(e) => e.target.style.borderColor = "#1D9E75"}
              onBlur={(e) => e.target.style.borderColor = "#334155"}
            />
          </div>

          <div style={{ position: "relative" }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#94a3b8", marginBottom: 6, letterSpacing: "0.3px" }}>
              <span style={{ marginRight: 4 }}>🔴</span> To
            </label>
            <input
              type="text"
              value={destination}
              onChange={(e) => { setDestination(e.target.value); setDestCoords(null); }}
              placeholder="City or address (e.g., Sousse, Bizerte)"
              list="tunisia-cities"
              style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: "1px solid #334155", background: "#1e293b", fontSize: 14, color: "white", outline: "none", transition: "all 0.2s", boxSizing: "border-box" }}
              onFocus={(e) => e.target.style.borderColor = "#1D9E75"}
              onBlur={(e) => e.target.style.borderColor = "#334155"}
            />
          </div>

          <datalist id="tunisia-cities">
            {GOVERNORATES.map((g) => <option key={g.name} value={g.name} />)}
          </datalist>

          <button
            onClick={checkRoute}
            disabled={checking || !origin || !destination}
            style={{ width: "100%", padding: "12px", borderRadius: 12, background: "linear-gradient(135deg, #1D9E75 0%, #0f6e56 100%)", color: "white", border: "none", cursor: checking || !origin || !destination ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 600, fontFamily: "sans-serif", transition: "all 0.2s", opacity: checking || !origin || !destination ? 0.5 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            onMouseEnter={(e) => { if (!checking && origin && destination) e.target.style.transform = "translateY(-1px)"; }}
            onMouseLeave={(e) => { if (!checking && origin && destination) e.target.style.transform = "translateY(0)"; }}
          >
            {checking ? (
              <>
                <div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                Calculating route via TMAPS...
              </>
            ) : (
              <>🚗 Check Route Safety</>
            )}
          </button>
        </div>

        {/* TMAPS Error */}
        {tmapsError && (
          <div style={{ marginTop: 20, padding: "12px 16px", borderRadius: 12, background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)" }}>
            <div style={{ color: "#f87171", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>⚠️ TMAPS Connection Error</div>
            <div style={{ color: "#94a3b8", fontSize: 12, lineHeight: 1.6 }}>{tmapsError}</div>
            <div style={{ color: "#64748b", fontSize: 11, marginTop: 8 }}>
              Get a free API key at <a href="https://www.tmaps.tn" target="_blank" rel="noopener noreferrer" style={{ color: "#1D9E75" }}>tmaps.tn</a> and set <code style={{ background: "#1e293b", padding: "1px 5px", borderRadius: 4 }}>VITE_TMAPS_API_KEY</code> in your <code style={{ background: "#1e293b", padding: "1px 5px", borderRadius: 4 }}>.env</code> file.
            </div>
          </div>
        )}

        {/* Results */}
        {routeSafety && (
          <div style={{ marginTop: 24 }}>
            {/* Route Info Bar */}
            {routeInfo && (
              <div style={{ display: "flex", gap: 16, marginBottom: 16, padding: "12px 16px", background: "#1e293b", borderRadius: 12, border: "1px solid #334155" }}>
                <div style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>DISTANCE</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "white" }}>{routeInfo.distance_km} km</div>
                </div>
                <div style={{ width: 1, background: "#334155" }} />
                <div style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>DURATION</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "white" }}>{routeInfo.duration_min} min</div>
                </div>
                <div style={{ width: 1, background: "#334155" }} />
                <div style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>ROUTE</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8" }}>{routeSafety.origin} → {routeSafety.destination}</div>
                </div>
              </div>
            )}

            {/* Score + Status */}
            <div style={{ padding: "1.25rem", borderRadius: 16, background: getLevelConfig(routeSafety.level).bg, border: `1px solid ${getLevelConfig(routeSafety.level).border}`, animation: "slideUp 0.3s ease-out" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 16 }}>
                <div style={{ position: "relative", width: 80, height: 80 }}>
                  <svg style={{ transform: "rotate(-90deg)", width: "100%", height: "100%" }}>
                    <circle cx="40" cy="40" r="36" fill="none" stroke="#1e293b" strokeWidth="6" />
                    <circle cx="40" cy="40" r="36" fill="none" stroke={getScoreColor(routeSafety.score)} strokeWidth="6" strokeDasharray={`${routeSafety.score * 2.26} 226`} strokeLinecap="round" style={{ transition: "stroke-dasharray 0.5s ease-out" }} />
                  </svg>
                  <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center" }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "white" }}>{routeSafety.score}%</div>
                    <div style={{ fontSize: 10, color: "#64748b" }}>Safety</div>
                  </div>
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: getLevelConfig(routeSafety.level).color, marginBottom: 4 }}>
                    {getLevelConfig(routeSafety.level).icon} {routeSafety.message}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>
                    Based on TMAPS routing data + real-time hazard reports
                  </div>
                </div>
              </div>

              {/* Hazards */}
              {routeSafety.hazards.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, fontSize: 13, fontWeight: 500, color: "#f87171" }}>
                    <span>⚠️</span> Hazards within {HAZARD_RADIUS_KM}km of route ({routeSafety.hazards.length})
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8 }}>
                    {routeSafety.hazards.map((h, i) => (
                      <li key={i} style={{ color: "#94a3b8", fontSize: 13, padding: "8px 12px", background: "rgba(0,0,0,0.2)", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span>{h.name}</span>
                        <span style={{ fontSize: 11, color: "#64748b", marginLeft: 12 }}>{h.distance} km away</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {routeSafety.hazards.length === 0 && (
                <div style={{ padding: "8px 12px", background: "rgba(34, 197, 94, 0.1)", borderRadius: 8, fontSize: 12, color: "#4ade80", display: "flex", alignItems: "center", gap: 8 }}>
                  <span>✅</span> No hazards detected near this route
                </div>
              )}

              {/* Tips for risky routes */}
              {routeSafety.level === 'dangerous' && (
                <div style={{ marginTop: 12, padding: "10px 12px", background: "rgba(239, 68, 68, 0.1)", borderRadius: 10, fontSize: 12, color: "#f87171", display: "flex", alignItems: "center", gap: 8 }}>
                  <span>💡</span>
                  Consider postponing non-essential travel or finding an alternative route
                </div>
              )}
              {routeSafety.level === 'risky' && (
                <div style={{ marginTop: 12, padding: "10px 12px", background: "rgba(249, 115, 22, 0.1)", borderRadius: 10, fontSize: 12, color: "#fb923c", display: "flex", alignItems: "center", gap: 8 }}>
                  <span>💡</span>
                  Drive carefully and stay alert for weather conditions
                </div>
              )}
            </div>

            {/* Map */}
            <div style={{ marginTop: 16, borderRadius: 12, overflow: "hidden", border: "1px solid #334155", height: 300 }}>
              <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RouteChecker;
