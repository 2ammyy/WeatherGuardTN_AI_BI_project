import { LayoutDashboard, Map as MapIcon, History, AlertTriangle, Settings, Bell, Users, FileText } from 'lucide-react';
import { useState } from 'react';

export default function Sidebar({ activePage = 'map', onPageChange }) {
  const [hoveredItem, setHoveredItem] = useState(null);

  const menuItems = [
    { id: 'map', icon: <MapIcon size={20}/>, label: "Real-time Map", description: "Live hazard tracking" },
    { id: 'history', icon: <History size={20}/>, label: "Historical Trends", description: "Past weather patterns" },
    { id: 'stats', icon: <LayoutDashboard size={20}/>, label: "Model Stats", description: "ML model performance" },
    { id: 'alerts', icon: <AlertTriangle size={20}/>, label: "Emergency Alerts", description: "Critical notifications" },
    { id: 'forum', icon: <FileText size={20}/>, label: "Community Forum", description: "Share updates" },
    { id: 'notifications', icon: <Bell size={20}/>, label: "Notifications", description: "Your alerts" },
    { id: 'settings', icon: <Settings size={20}/>, label: "Settings", description: "Account preferences" },
  ];

  return (
    <div style={{
      width: 280,
      height: '100vh',
      background: 'linear-gradient(180deg, #0f172a 0%, #0a0f1c 100%)',
      borderRight: '1px solid #1e293b',
      display: 'flex',
      flexDirection: 'column',
      position: 'sticky',
      top: 0,
      left: 0,
      zIndex: 50,
    }}>
      <style>
        {`
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateX(-10px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
        `}
      </style>

      {/* Logo Section */}
      <div style={{
        padding: '1.75rem 1.5rem',
        borderBottom: '1px solid #1e293b',
        marginBottom: '1.5rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            background: 'linear-gradient(135deg, #1D9E75 0%, #0f6e56 100%)',
            width: 40,
            height: 40,
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
          }}>
            🌦️
          </div>
          <div>
            <h1 style={{
              fontSize: 18,
              fontWeight: 700,
              background: 'linear-gradient(135deg, #fff 0%, #9FE1CB 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              margin: 0,
            }}>
              WeatherGuard TN
            </h1>
            <p style={{
              fontSize: 10,
              color: '#64748b',
              margin: '2px 0 0',
              letterSpacing: '0.3px',
            }}>
              AI-Powered Weather Intelligence
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav style={{
        flex: 1,
        padding: '0 1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}>
        {menuItems.map((item) => {
          const isActive = activePage === item.id;
          const isHovered = hoveredItem === item.id;
          
          return (
            <div
              key={item.id}
              onClick={() => onPageChange?.(item.id)}
              onMouseEnter={() => setHoveredItem(item.id)}
              onMouseLeave={() => setHoveredItem(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 14px',
                borderRadius: 12,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: isActive 
                  ? 'linear-gradient(135deg, rgba(29, 158, 117, 0.15) 0%, rgba(15, 110, 86, 0.1) 100%)'
                  : 'transparent',
                border: isActive 
                  ? '1px solid rgba(29, 158, 117, 0.3)'
                  : '1px solid transparent',
                transform: isHovered && !isActive ? 'translateX(4px)' : 'translateX(0)',
              }}
            >
              <div style={{
                color: isActive ? '#1D9E75' : (isHovered ? '#9FE1CB' : '#64748b'),
                transition: 'color 0.2s',
                display: 'flex',
                alignItems: 'center',
              }}>
                {item.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? 'white' : (isHovered ? '#cbd5e1' : '#94a3b8'),
                  transition: 'color 0.2s',
                }}>
                  {item.label}
                </div>
                {isActive && (
                  <div style={{
                    fontSize: 10,
                    color: '#64748b',
                    marginTop: 2,
                    animation: 'slideIn 0.2s ease-out',
                  }}>
                    {item.description}
                  </div>
                )}
              </div>
              {isActive && (
                <div style={{
                  width: 4,
                  height: 4,
                  background: '#1D9E75',
                  borderRadius: '50%',
                  boxShadow: '0 0 6px #1D9E75',
                }} />
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer Section */}
      <div style={{
        padding: '1.5rem',
        borderTop: '1px solid #1e293b',
        marginTop: 'auto',
      }}>
        <div style={{
          background: 'rgba(29, 158, 117, 0.05)',
          borderRadius: 12,
          padding: '12px',
          border: '1px solid rgba(29, 158, 117, 0.1)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 14 }}>🤖</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#1D9E75' }}>ML Model Status</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#22c55e',
              boxShadow: '0 0 4px #22c55e',
            }} />
            <span style={{ fontSize: 10, color: '#64748b' }}>Active • Real-time predictions</span>
          </div>
          <div style={{
            marginTop: 8,
            height: 2,
            background: '#1e293b',
            borderRadius: 1,
            overflow: 'hidden',
          }}>
            <div style={{
              width: '94%',
              height: '100%',
              background: 'linear-gradient(90deg, #1D9E75, #4ade80)',
              borderRadius: 1,
            }} />
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 6,
            fontSize: 8,
            color: '#64748b',
          }}>
            <span>Accuracy: 94%</span>
            <span>Uptime: 99.9%</span>
          </div>
        </div>

        {/* Version Info */}
        <div style={{
          marginTop: 12,
          textAlign: 'center',
          fontSize: 9,
          color: '#475569',
        }}>
          WeatherGuard TN v2.0.0
        </div>
      </div>
    </div>
  );
}