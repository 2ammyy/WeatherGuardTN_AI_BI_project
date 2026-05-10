// frontend/src/App.jsx
import React, { useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
import { Shield, Activity, MessageSquare, Sun, Wind, Droplets, Map, AlertTriangle, Bell } from 'lucide-react';
import ForumPage from './forum/pages/ForumPage';
import 'leaflet/dist/leaflet.css';

const cities = [
  { id: 1, name: "Tunis", lat: 36.8, lng: 10.1, danger: 85, temp: 32, wind: 15, humidity: 65, risk: "High" },
  { id: 2, name: "Sousse", lat: 35.8, lng: 10.6, danger: 35, temp: 28, wind: 10, humidity: 55, risk: "Low" },
  { id: 3, name: "Kairouan", lat: 35.6, lng: 10.1, danger: 65, temp: 34, wind: 20, humidity: 45, risk: "Medium" },
  { id: 4, name: "Tataouine", lat: 32.9, lng: 10.4, danger: 95, temp: 38, wind: 25, humidity: 30, risk: "Critical" },
  { id: 5, name: "Sfax", lat: 34.7, lng: 10.8, danger: 45, temp: 30, wind: 12, humidity: 60, risk: "Medium" },
  { id: 6, name: "Bizerte", lat: 37.3, lng: 9.9, danger: 55, temp: 27, wind: 18, humidity: 70, risk: "Medium" },
  { id: 7, name: "Gabès", lat: 33.9, lng: 10.1, danger: 75, temp: 35, wind: 22, humidity: 50, risk: "High" },
  { id: 8, name: "Nabeul", lat: 36.5, lng: 10.7, danger: 40, temp: 29, wind: 14, humidity: 62, risk: "Medium" },
];

const getRiskColor = (danger) => {
  if (danger >= 80) return { fill: '#ef4444', border: '#f87171', text: '#fca5a5', label: 'CRITICAL' };
  if (danger >= 60) return { fill: '#f97316', border: '#fb923c', text: '#fdba74', label: 'HIGH' };
  if (danger >= 40) return { fill: '#eab308', border: '#fbbf24', text: '#fde047', label: 'MODERATE' };
  return { fill: '#22c55e', border: '#4ade80', text: '#86efac', label: 'LOW' };
};

const getRiskIcon = (danger) => {
  if (danger >= 80) return '🔴';
  if (danger >= 60) return '🟠';
  if (danger >= 40) return '🟡';
  return '🟢';
};

export default function App() {
  const [active, setActive] = useState(null);
  const [showForum, setShowForum] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [hoveredCity, setHoveredCity] = useState(null);

  // ── If forum is open, render it full-screen ───────────────────────────────
  if (showForum) {
    return <ForumPage onBack={() => setShowForum(false)} />;
  }

  // ── Main dashboard ────────────────────────────────────────────────────────
  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      width: '100vw',
      background: '#020617',
      color: 'white',
      overflow: 'hidden',
      fontFamily: 'sans-serif',
    }}>
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(1.05); }
          }
          @keyframes slideIn {
            from { opacity: 0; transform: translateX(20px); }
            to { opacity: 1; transform: translateX(0); }
          }
          .leaflet-container {
            background: #020617;
          }
          .leaflet-popup-content-wrapper {
            background: rgba(15, 23, 42, 0.95);
            backdropFilter: blur(10px);
            border: 1px solid rgba(29, 158, 117, 0.3);
            border-radius: 16px;
            color: white;
          }
          .leaflet-popup-tip {
            background: rgba(15, 23, 42, 0.95);
          }
        `}
      </style>

      {/* Sidebar */}
      <aside style={{
        width: '320px',
        background: 'linear-gradient(180deg, #0f172a 0%, #0a0f1c 100%)',
        borderRight: '1px solid #1e293b',
        padding: '24px 20px',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
      }}>
        {/* Logo */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '32px',
          padding: '8px 12px',
          background: 'rgba(29, 158, 117, 0.1)',
          borderRadius: 16,
          border: '1px solid rgba(29, 158, 117, 0.2)',
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #1D9E75 0%, #0f6e56 100%)',
            padding: '10px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Shield size={24} />
          </div>
          <div>
            <h1 style={{
              fontSize: '18px',
              fontWeight: '800',
              margin: 0,
              background: 'linear-gradient(135deg, #fff 0%, #9FE1CB 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              WeatherGuard.TN
            </h1>
            <p style={{ fontSize: '10px', color: '#64748b', margin: '2px 0 0' }}>
              AI-Powered Weather Intelligence
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          marginBottom: '24px',
        }}>
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            borderRadius: 12,
            padding: '12px',
            textAlign: 'center',
            border: '1px solid #1e293b',
          }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>⚠️</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#ef4444' }}>{cities.filter(c => c.danger >= 60).length}</div>
            <div style={{ fontSize: 10, color: '#64748b' }}>Active Alerts</div>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            borderRadius: 12,
            padding: '12px',
            textAlign: 'center',
            border: '1px solid #1e293b',
          }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>📍</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#1D9E75' }}>{cities.length}</div>
            <div style={{ fontSize: 10, color: '#64748b' }}>Cities Monitored</div>
          </div>
        </div>

        {/* Active Alerts Section */}
        <div style={{ flex: 1, marginBottom: 20 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: '16px',
            paddingBottom: '8px',
            borderBottom: '1px solid #1e293b',
          }}>
            <AlertTriangle size={14} color="#ef4444" />
            <p style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', letterSpacing: '1px', margin: 0 }}>
              REAL-TIME ALERTS
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {cities.filter(c => c.danger >= 60).map(c => {
              const risk = getRiskColor(c.danger);
              return (
                <div
                  key={c.id}
                  style={{
                    padding: '14px',
                    borderRadius: '12px',
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${risk.border}40`,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateX(4px)';
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateX(0)';
                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                  }}
                  onClick={() => {
                    setActive(c);
                    const mapElement = document.querySelector('.leaflet-container');
                    if (mapElement && mapElement._leaflet_map) {
                      mapElement._leaflet_map.setView([c.lat, c.lng], 10);
                    }
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 16 }}>{getRiskIcon(c.danger)}</span>
                      <span style={{ fontWeight: '600', fontSize: 13 }}>{c.name}</span>
                    </div>
                    <span style={{ color: risk.fill, fontWeight: 'bold', fontSize: '13px' }}>{c.danger}%</span>
                  </div>
                  <div style={{
                    height: '3px',
                    width: '100%',
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '2px',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${c.danger}%`,
                      background: risk.fill,
                      borderRadius: '2px',
                      transition: 'width 0.5s ease-out',
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* All Cities Summary */}
        <div style={{ marginBottom: 20 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: '12px',
            paddingBottom: '8px',
            borderBottom: '1px solid #1e293b',
          }}>
            <Map size={14} color="#1D9E75" />
            <p style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', letterSpacing: '1px', margin: 0 }}>
              ALL GOVERNORATES
            </p>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {cities.map(c => {
              const risk = getRiskColor(c.danger);
              return (
                <div
                  key={c.id}
                  style={{
                    flex: '1 1 auto',
                    minWidth: '80px',
                    padding: '8px 10px',
                    borderRadius: '10px',
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${risk.border}40`,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    textAlign: 'center',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                  }}
                  onClick={() => {
                    setActive(c);
                    const mapElement = document.querySelector('.leaflet-container');
                    if (mapElement && mapElement._leaflet_map) {
                      mapElement._leaflet_map.setView([c.lat, c.lng], 10);
                    }
                  }}
                >
                  <div style={{ fontSize: 16, marginBottom: 4 }}>{getRiskIcon(c.danger)}</div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: 'white' }}>{c.name}</div>
                  <div style={{ fontSize: 10, color: risk.fill }}>{c.danger}%</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            onClick={() => setShowForum(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              padding: '12px 16px',
              borderRadius: 12,
              background: 'linear-gradient(135deg, #1D9E75 0%, #0f6e56 100%)',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              fontFamily: 'sans-serif',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
          >
            <MessageSquare size={18} />
            Community Forum
          </button>

          <button
            onClick={() => setShowNotifications(!showNotifications)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              padding: '12px 16px',
              borderRadius: 12,
              background: 'transparent',
              border: '1px solid #334155',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
              fontFamily: 'sans-serif',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.target.style.borderColor = '#1D9E75';
              e.target.style.color = '#1D9E75';
            }}
            onMouseLeave={(e) => {
              e.target.style.borderColor = '#334155';
              e.target.style.color = '#94a3b8';
            }}
          >
            <Bell size={18} />
            Notifications
          </button>
        </div>

        {/* System Status */}
        <div style={{
          marginTop: '20px',
          padding: '12px',
          borderRadius: 12,
          background: 'rgba(29, 158, 117, 0.05)',
          border: '1px solid rgba(29, 158, 117, 0.1)',
          textAlign: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 6 }}>
            <div style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#22c55e',
              animation: 'pulse 1.5s ease-in-out infinite',
            }} />
            <span style={{ fontSize: 9, color: '#4ade80' }}>System Online</span>
          </div>
          <div style={{ fontSize: 8, color: '#64748b' }}>
            ML Model • 99.58% Accuracy
          </div>
        </div>
      </aside>

      {/* Map */}
      <main style={{ flex: 1, position: 'relative' }}>
        <MapContainer
          center={[34.5, 9.5]}
          zoom={7}
          zoomControl={true}
          style={{ height: '100%', width: '100%' }}
          whenCreated={(map) => {
            map._leaflet_map = map;
          }}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; CARTO'
          />
          
          {cities.map(city => {
            const risk = getRiskColor(city.danger);
            return (
              <CircleMarker
                key={city.id}
                center={[city.lat, city.lng]}
                radius={city.danger / 5 + 8}
                pathOptions={{
                  fillColor: risk.fill,
                  color: risk.border,
                  weight: 2,
                  fillOpacity: 0.7,
                }}
                eventHandlers={{
                  mouseover: (e) => {
                    e.target.setStyle({ fillOpacity: 0.9, weight: 3 });
                    setHoveredCity(city);
                  },
                  mouseout: (e) => {
                    e.target.setStyle({ fillOpacity: 0.7, weight: 2 });
                    setHoveredCity(null);
                  },
                  click: () => setActive(city),
                }}
              >
                <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent={false}>
                  <div style={{
                    padding: '6px 12px',
                    fontFamily: 'sans-serif',
                    fontWeight: 'bold',
                    fontSize: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}>
                    <span>{getRiskIcon(city.danger)}</span>
                    <span>{city.name}</span>
                    <span style={{ color: risk.fill }}>{city.danger}%</span>
                  </div>
                </Tooltip>
              </CircleMarker>
            );
          })}
        </MapContainer>

        {/* Floating Status Card */}
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          zIndex: 1000,
          pointerEvents: 'none',
        }}>
          <div style={{
            background: 'rgba(15, 23, 42, 0.9)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(29, 158, 117, 0.2)',
            padding: '12px 20px',
            borderRadius: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}>
            <div style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#22c55e',
              animation: 'pulse 1.5s ease-in-out infinite',
            }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Activity size={14} color="#10b981" />
              <span style={{ fontSize: 11, color: '#94a3b8' }}>Real-time data stream</span>
            </div>
            <div style={{ width: 1, height: 20, background: '#1e293b' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 11, color: '#1D9E75' }}>🟢 Active</span>
            </div>
          </div>
        </div>

        {/* Hover Card */}
        {hoveredCity && !active && (
          <div style={{
            position: 'absolute',
            top: '100px',
            right: '20px',
            zIndex: 1000,
            width: '260px',
            background: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(29, 158, 117, 0.3)',
            padding: '16px',
            borderRadius: 16,
            animation: 'slideIn 0.2s ease-out',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 24 }}>{getRiskIcon(hoveredCity.danger)}</span>
              <div>
                <h4 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{hoveredCity.name}</h4>
                <span style={{ fontSize: 10, color: getRiskColor(hoveredCity.danger).fill }}>
                  {getRiskColor(hoveredCity.danger).label} RISK
                </span>
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: '#64748b' }}>Risk Score</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: getRiskColor(hoveredCity.danger).fill }}>
                  {hoveredCity.danger}%
                </span>
              </div>
              <div style={{
                height: 4,
                background: '#1e293b',
                borderRadius: 2,
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${hoveredCity.danger}%`,
                  height: '100%',
                  background: getRiskColor(hoveredCity.danger).fill,
                  transition: 'width 0.3s',
                }} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div style={{ textAlign: 'center' }}>
                <Sun size={14} color="#eab308" style={{ marginBottom: 2 }} />
                <div style={{ fontSize: 11, fontWeight: 600 }}>{hoveredCity.temp}°C</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <Wind size={14} color="#60a5fa" style={{ marginBottom: 2 }} />
                <div style={{ fontSize: 11, fontWeight: 600 }}>{hoveredCity.wind} km/h</div>
              </div>
            </div>
          </div>
        )}

        {/* Active City Details Card */}
        {active && (
          <div style={{
            position: 'absolute',
            bottom: '30px',
            right: '30px',
            zIndex: 1000,
            width: '320px',
            background: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(20px)',
            border: `1px solid ${getRiskColor(active.danger).border}`,
            padding: '20px',
            borderRadius: 20,
            animation: 'fadeIn 0.3s ease-out',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'start',
              marginBottom: 16,
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 28 }}>{getRiskIcon(active.danger)}</span>
                  <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{active.name}</h3>
                </div>
                <p style={{ color: getRiskColor(active.danger).fill, fontSize: 10, fontWeight: 'bold', letterSpacing: '1px', margin: 0 }}>
                  {getRiskColor(active.danger).label} RISK LEVEL
                </p>
              </div>
              <button
                onClick={() => setActive(null)}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: 8,
                  width: 28,
                  height: 28,
                  cursor: 'pointer',
                  color: '#94a3b8',
                  fontSize: 16,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#ef4444';
                  e.target.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'rgba(255,255,255,0.1)';
                  e.target.style.color = '#94a3b8';
                }}
              >
                ×
              </button>
            </div>

            {/* Risk Score */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ color: '#64748b', fontSize: 12 }}>Risk Level</span>
                <span style={{ fontWeight: 'bold', fontSize: 18, color: getRiskColor(active.danger).fill }}>
                  {active.danger}%
                </span>
              </div>
              <div style={{
                height: '8px',
                width: '100%',
                background: '#1e293b',
                borderRadius: '4px',
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${active.danger}%`,
                  background: getRiskColor(active.danger).fill,
                  transition: 'width 0.5s ease-out',
                }} />
              </div>
            </div>

            {/* Weather Details */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 12,
              marginBottom: 16,
              padding: '12px',
              background: 'rgba(0,0,0,0.3)',
              borderRadius: 12,
            }}>
              <div style={{ textAlign: 'center' }}>
                <Sun size={18} color="#eab308" style={{ marginBottom: 4 }} />
                <div style={{ fontSize: 10, color: '#64748b' }}>Temp</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{active.temp}°C</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <Wind size={18} color="#60a5fa" style={{ marginBottom: 4 }} />
                <div style={{ fontSize: 10, color: '#64748b' }}>Wind</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{active.wind} km/h</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <Droplets size={18} color="#3b82f6" style={{ marginBottom: 4 }} />
                <div style={{ fontSize: 10, color: '#64748b' }}>Humidity</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{active.humidity}%</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button style={{
                flex: 1,
                padding: '10px',
                borderRadius: 10,
                background: 'linear-gradient(135deg, #1D9E75 0%, #0f6e56 100%)',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => e.target.style.transform = 'translateY(-1px)'}
              onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
              >
                View Details
              </button>
              <button style={{
                flex: 1,
                padding: '10px',
                borderRadius: 10,
                background: 'transparent',
                border: '1px solid #334155',
                color: '#94a3b8',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 500,
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.target.style.borderColor = '#1D9E75';
                e.target.style.color = '#1D9E75';
              }}
              onMouseLeave={(e) => {
                e.target.style.borderColor = '#334155';
                e.target.style.color = '#94a3b8';
              }}
              >
                Share Alert
              </button>
            </div>

            {/* Timestamp */}
            <div style={{
              marginTop: 12,
              textAlign: 'center',
              fontSize: 9,
              color: '#64748b',
            }}>
              Last updated: {new Date().toLocaleTimeString()}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}