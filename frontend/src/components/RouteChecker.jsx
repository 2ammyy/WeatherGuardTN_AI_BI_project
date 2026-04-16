import React, { useState } from 'react';
import axios from 'axios';

const RouteChecker = ({ hazards = [] }) => {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [checking, setChecking] = useState(false);
  const [routeSafety, setRouteSafety] = useState(null);

  const checkRoute = async () => {
    if (!origin || !destination) return;
    
    setChecking(true);
    
    // Simulate route check (in production, use OSRM or Google Directions)
    setTimeout(() => {
      // Check if any hazards are near the route
      const nearbyHazards = hazards.filter(h => {
        // Simplified check - in reality you'd calculate distance from route
        return Math.random() > 0.5;
      });

      const safetyScore = 100 - (nearbyHazards.length * 15);
      
      setRouteSafety({
        safe: safetyScore > 70,
        score: safetyScore,
        hazards: nearbyHazards.slice(0, 3),
        message: safetyScore > 70 
          ? '✅ Route is passable with caution'
          : '⚠️ Route may be dangerous - consider postponing travel'
      });
      
      setChecking(false);
    }, 1500);
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#eab308';
    if (score >= 40) return '#f97316';
    return '#ef4444';
  };

  const getScoreText = (score) => {
    if (score >= 80) return 'Safe';
    if (score >= 60) return 'Caution';
    if (score >= 40) return 'Risky';
    return 'Dangerous';
  };

  return (
    <div style={{
      background: "linear-gradient(135deg, #0f172a 0%, #0a0f1c 100%)",
      borderRadius: 20,
      border: "1px solid rgba(29, 158, 117, 0.2)",
      overflow: "hidden",
      animation: "slideUp 0.3s ease-out",
    }}>
      <style>
        {`
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>

      {/* Header */}
      <div style={{
        padding: "1.25rem 1.5rem",
        borderBottom: "1px solid #1e293b",
        background: "rgba(11, 17, 32, 0.5)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            background: "linear-gradient(135deg, #1D9E75 0%, #0f6e56 100%)",
            width: 40,
            height: 40,
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
          }}>
            🗺️
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "white" }}>Route Safety Checker</h3>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>Check if your journey is safe</p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "1.5rem" }}>
        {/* Inputs */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{
              display: "block",
              fontSize: 12,
              fontWeight: 500,
              color: "#94a3b8",
              marginBottom: 6,
              letterSpacing: "0.3px",
            }}>
              <span style={{ marginRight: 4 }}>📍</span> From
            </label>
            <input 
              type="text" 
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              placeholder="City or address"
              list="cities"
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 12,
                border: "1px solid #334155",
                background: "#1e293b",
                fontSize: 14,
                color: "white",
                outline: "none",
                transition: "all 0.2s",
                boxSizing: "border-box",
              }}
              onFocus={(e) => e.target.style.borderColor = "#1D9E75"}
              onBlur={(e) => e.target.style.borderColor = "#334155"}
            />
          </div>

          <div style={{ position: "relative" }}>
            <label style={{
              display: "block",
              fontSize: 12,
              fontWeight: 500,
              color: "#94a3b8",
              marginBottom: 6,
              letterSpacing: "0.3px",
            }}>
              <span style={{ marginRight: 4 }}>🏁</span> To
            </label>
            <input 
              type="text" 
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="City or address"
              list="cities"
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 12,
                border: "1px solid #334155",
                background: "#1e293b",
                fontSize: 14,
                color: "white",
                outline: "none",
                transition: "all 0.2s",
                boxSizing: "border-box",
              }}
              onFocus={(e) => e.target.style.borderColor = "#1D9E75"}
              onBlur={(e) => e.target.style.borderColor = "#334155"}
            />
            {origin && destination && (
              <div style={{
                position: "absolute",
                right: 12,
                bottom: 12,
                fontSize: 20,
                color: "#64748b",
              }}>
                →
              </div>
            )}
          </div>

          <datalist id="cities">
            {["Tunis", "Sfax", "Sousse", "Bizerte", "Jendouba", "Ariana", "Ben Arous", "Nabeul", "Monastir", "Mahdia", "Kairouan", "Gafsa"].map(city => (
              <option key={city} value={city} />
            ))}
          </datalist>

          <button 
            onClick={checkRoute} 
            disabled={checking || !origin || !destination}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: 12,
              background: "linear-gradient(135deg, #1D9E75 0%, #0f6e56 100%)",
              color: "white",
              border: "none",
              cursor: checking || !origin || !destination ? "not-allowed" : "pointer",
              fontSize: 14,
              fontWeight: 600,
              fontFamily: "sans-serif",
              transition: "all 0.2s",
              opacity: checking || !origin || !destination ? 0.5 : 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
            onMouseEnter={(e) => {
              if (!checking && origin && destination) {
                e.target.style.transform = "translateY(-1px)";
              }
            }}
            onMouseLeave={(e) => {
              if (!checking && origin && destination) {
                e.target.style.transform = "translateY(0)";
              }
            }}
          >
            {checking ? (
              <>
                <div style={{
                  width: 16,
                  height: 16,
                  border: "2px solid rgba(255,255,255,0.3)",
                  borderTopColor: "white",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }} />
                Checking route...
              </>
            ) : (
              <>
                🚗 Check Route Safety
              </>
            )}
          </button>
        </div>

        {/* Results */}
        {routeSafety && (
          <div style={{
            marginTop: 24,
            padding: "1.25rem",
            borderRadius: 16,
            background: routeSafety.safe 
              ? "rgba(34, 197, 94, 0.1)" 
              : "rgba(239, 68, 68, 0.1)",
            border: `1px solid ${routeSafety.safe ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
            animation: "slideUp 0.3s ease-out",
          }}>
            {/* Score Circle */}
            <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 16 }}>
              <div style={{ position: "relative", width: 80, height: 80 }}>
                <svg style={{ transform: "rotate(-90deg)", width: "100%", height: "100%" }}>
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    fill="none"
                    stroke="#1e293b"
                    strokeWidth="6"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    fill="none"
                    stroke={getScoreColor(routeSafety.score)}
                    strokeWidth="6"
                    strokeDasharray={`${routeSafety.score * 2.26} 226`}
                    strokeLinecap="round"
                    style={{ transition: "stroke-dasharray 0.5s ease-out" }}
                  />
                </svg>
                <div style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  textAlign: "center",
                }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "white" }}>
                    {routeSafety.score}%
                  </div>
                  <div style={{ fontSize: 10, color: "#64748b" }}>
                    {getScoreText(routeSafety.score)}
                  </div>
                </div>
              </div>

              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: routeSafety.safe ? "#4ade80" : "#f87171",
                  marginBottom: 4,
                }}>
                  {routeSafety.message}
                </div>
                <div style={{ fontSize: 12, color: "#64748b" }}>
                  Based on current hazard data
                </div>
              </div>
            </div>

            {/* Hazards */}
            {routeSafety.hazards && routeSafety.hazards.length > 0 && (
              <div>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 12,
                  fontSize: 13,
                  fontWeight: 500,
                  color: "#f87171",
                }}>
                  <span>⚠️</span> Hazards on route
                </div>
                <ul style={{
                  margin: 0,
                  paddingLeft: 20,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}>
                  {routeSafety.hazards.map((h, i) => (
                    <li key={i} style={{
                      color: "#94a3b8",
                      fontSize: 13,
                      padding: "6px 10px",
                      background: "rgba(0,0,0,0.2)",
                      borderRadius: 8,
                    }}>
                      {h.properties?.what || 'Unknown hazard'}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Safety Tips */}
            {!routeSafety.safe && (
              <div style={{
                marginTop: 16,
                padding: "10px 12px",
                background: "rgba(239, 68, 68, 0.1)",
                borderRadius: 10,
                fontSize: 12,
                color: "#f87171",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}>
                <span>💡</span>
                Consider postponing non-essential travel or finding an alternative route
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RouteChecker;