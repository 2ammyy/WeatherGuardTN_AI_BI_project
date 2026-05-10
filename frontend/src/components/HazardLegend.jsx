import React, { useState } from 'react';

const HazardLegend = () => {
  const [isExpanded, setIsExpanded] = useState(true);

  const riskLevels = [
    { level: 'green', label: 'Safe', icon: '🟢', color: '#22c55e', description: 'Normal conditions' },
    { level: 'yellow', label: 'Caution', icon: '🟡', color: '#eab308', description: 'Be aware of conditions' },
    { level: 'orange', label: 'Warning', icon: '🟠', color: '#f97316', description: 'High risk, be prepared' },
    { level: 'red', label: 'Alert', icon: '🔴', color: '#ef4444', description: 'Severe conditions' },
    { level: 'purple', label: 'Emergency', icon: '🟣', color: '#a855f7', description: 'Take immediate action' },
  ];

  const hazardTypes = [
    { icon: '🌊', label: 'Flood hazard', color: '#3b82f6' },
    { icon: '🚗💥', label: 'Accident', color: '#f59e0b' },
    { icon: '⛈️', label: 'Storm', color: '#64748b' },
    { icon: '⚠️', label: 'Road work', color: '#f97316' },
    { icon: '🔥', label: 'Fire hazard', color: '#ef4444' },
    { icon: '🏔️', label: 'Landslide', color: '#8b5cf6' },
  ];

  return (
    <div style={{
      background: "linear-gradient(135deg, #0f172a 0%, #0a0f1c 100%)",
      borderRadius: 16,
      border: "1px solid rgba(29, 158, 117, 0.2)",
      overflow: "hidden",
      animation: "slideUp 0.3s ease-out",
    }}>
      <style>
        {`
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 0.6; }
            50% { opacity: 1; }
          }
        `}
      </style>

      {/* Header */}
      <div style={{
        padding: "1rem 1.25rem",
        borderBottom: "1px solid #1e293b",
        background: "rgba(11, 17, 32, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        cursor: "pointer",
      }}
      onClick={() => setIsExpanded(!isExpanded)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            background: "linear-gradient(135deg, #1D9E75 0%, #0f6e56 100%)",
            width: 32,
            height: 32,
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
          }}>
            🗺️
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "white" }}>
              Map Legend
            </h4>
            <p style={{ margin: "2px 0 0", fontSize: 10, color: "#64748b" }}>
              Risk levels & hazard types
            </p>
          </div>
        </div>
        <div style={{
          fontSize: 18,
          color: "#64748b",
          transition: "transform 0.2s",
          transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
        }}>
          ▼
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div style={{ padding: "1.25rem" }}>
          {/* Risk Levels Section */}
          <div style={{ marginBottom: 20 }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 12,
              paddingBottom: 8,
              borderBottom: "1px solid #1e293b",
            }}>
              <span style={{ fontSize: 14 }}>⚠️</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", letterSpacing: "0.5px" }}>
                RISK LEVELS
              </span>
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 10,
            }}>
              {riskLevels.map((risk) => (
                <div
                  key={risk.level}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 12px",
                    background: "rgba(255,255,255,0.03)",
                    borderRadius: 10,
                    transition: "all 0.2s",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                    e.currentTarget.style.transform = "translateX(2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                    e.currentTarget.style.transform = "translateX(0)";
                  }}
                >
                  <div style={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    background: risk.color,
                    boxShadow: `0 0 6px ${risk.color}`,
                    animation: risk.level === 'purple' ? "pulse 1.5s ease-in-out infinite" : "none",
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}>
                      <span>{risk.icon}</span> {risk.label}
                    </div>
                    <div style={{ fontSize: 9, color: "#64748b", marginTop: 2 }}>
                      {risk.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Hazard Types Section */}
          <div>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 12,
              paddingBottom: 8,
              borderBottom: "1px solid #1e293b",
            }}>
              <span style={{ fontSize: 14 }}>⚠️</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", letterSpacing: "0.5px" }}>
                HAZARD TYPES
              </span>
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
              gap: 8,
            }}>
              {hazardTypes.map((hazard, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 10px",
                    background: "rgba(255,255,255,0.03)",
                    borderRadius: 8,
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                  }}
                >
                  <span style={{ fontSize: 16 }}>{hazard.icon}</span>
                  <span style={{ fontSize: 11, color: "#cbd5e1" }}>{hazard.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Note */}
          <div style={{
            marginTop: 16,
            padding: "8px 12px",
            background: "rgba(29, 158, 117, 0.05)",
            borderRadius: 8,
            borderLeft: `2px solid #1D9E75`,
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 10,
              color: "#64748b",
            }}>
              <span>💡</span>
              <span>Click on any hazard marker on the map for detailed information</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HazardLegend;