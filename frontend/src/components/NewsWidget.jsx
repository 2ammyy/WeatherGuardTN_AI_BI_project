import React, { useState, useEffect } from 'react';

const NewsWidget = () => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    const loadNews = async () => {
      try {
        const response = await fetch('http://localhost:8001/api/news');
        const data = await response.json();
        
        if (data.success && data.articles) {
          setNews(data.articles.slice(0, 5)); // Show only latest 5 in widget
          console.log('✅ News loaded:', data.articles.length, 'articles');
        } else {
          setError('No news available');
        }
      } catch (err) {
        console.error('News fetch error:', err);
        setError('Could not load news');
      } finally {
        setLoading(false);
      }
    };
    
    loadNews();
    // Refresh every 5 minutes
    const interval = setInterval(loadNews, 300000);
    return () => clearInterval(interval);
  }, []);

  const getRiskColor = (level) => {
    const colors = {
      'green': '#22c55e',
      'yellow': '#eab308', 
      'orange': '#f97316',
      'red': '#ef4444',
      'purple': '#a855f7'
    };
    return colors[level?.toLowerCase()] || '#64748b';
  };

  const getRiskBgColor = (level) => {
    const colors = {
      'green': 'rgba(34, 197, 94, 0.08)',
      'yellow': 'rgba(234, 179, 8, 0.08)',
      'orange': 'rgba(249, 115, 22, 0.08)',
      'red': 'rgba(239, 68, 68, 0.08)',
      'purple': 'rgba(168, 85, 247, 0.08)'
    };
    return colors[level?.toLowerCase()] || 'rgba(100, 116, 139, 0.08)';
  };

  const getRiskIcon = (level) => {
    const icons = {
      'green': '🟢',
      'yellow': '🟡',
      'orange': '🟠',
      'red': '🔴',
      'purple': '🟣'
    };
    return icons[level?.toLowerCase()] || '📰';
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (loading) {
    return (
      <div style={{
        background: "linear-gradient(135deg, #0f172a 0%, #0a0f1c 100%)",
        borderRadius: 16,
        border: "1px solid rgba(29, 158, 117, 0.2)",
        padding: "1.25rem",
      }}>
        <style>
          {`
            @keyframes pulse {
              0%, 100% { opacity: 0.3; }
              50% { opacity: 0.6; }
            }
          `}
        </style>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 32,
            height: 32,
            border: "2px solid rgba(29, 158, 117, 0.2)",
            borderTopColor: "#1D9E75",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }} />
          <div style={{ color: "#64748b", fontSize: 13 }}>Loading news...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        background: "linear-gradient(135deg, #0f172a 0%, #0a0f1c 100%)",
        borderRadius: 16,
        border: "1px solid rgba(239, 68, 68, 0.3)",
        padding: "1.25rem",
      }}>
        <div style={{ color: "#f87171", display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
          <span>⚠️</span> {error}
        </div>
      </div>
    );
  }

  if (news.length === 0) {
    return (
      <div style={{
        background: "linear-gradient(135deg, #0f172a 0%, #0a0f1c 100%)",
        borderRadius: 16,
        border: "1px solid rgba(29, 158, 117, 0.2)",
        padding: "1.25rem",
      }}>
        <div style={{ color: "#64748b", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
          <span>📭</span> No news available
        </div>
      </div>
    );
  }

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
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
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
      }}>
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
            📰
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "white" }}>
              Weather News & Alerts
            </h3>
            <p style={{ margin: "2px 0 0", fontSize: 10, color: "#64748b" }}>
              Latest updates
            </p>
          </div>
        </div>
        <span style={{
          background: "rgba(29, 158, 117, 0.1)",
          padding: "2px 8px",
          borderRadius: 12,
          fontSize: 10,
          color: "#1D9E75",
          fontWeight: 500,
        }}>
          {news.length} updates
        </span>
      </div>

      {/* News List */}
      <div style={{ padding: "0.75rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {news.map((article) => {
            const isExpanded = expandedId === article.id;
            const bodyText = article.body || "";
            const shouldTruncate = bodyText.length > 100 && !isExpanded;
            const displayText = shouldTruncate ? bodyText.substring(0, 100) + '...' : bodyText;
            
            return (
              <div
                key={article.id}
                style={{
                  background: getRiskBgColor(article.risk_level),
                  borderLeft: `3px solid ${getRiskColor(article.risk_level)}`,
                  borderRadius: 10,
                  padding: "0.875rem",
                  transition: "all 0.2s",
                  cursor: "pointer",
                }}
                onClick={() => toggleExpand(article.id)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = getRiskBgColor(article.risk_level).replace('0.08', '0.12');
                  e.currentTarget.style.transform = "translateX(2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = getRiskBgColor(article.risk_level);
                  e.currentTarget.style.transform = "translateX(0)";
                }}
              >
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 6 }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{
                      background: getRiskColor(article.risk_level),
                      color: "white",
                      padding: "2px 8px",
                      borderRadius: 12,
                      fontSize: 9,
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: 3,
                    }}>
                      {getRiskIcon(article.risk_level)} {article.risk_level?.toUpperCase() || 'INFO'}
                    </span>
                    <span style={{ fontSize: 9, color: "#64748b", display: "flex", alignItems: "center", gap: 3 }}>
                      <span>📌</span> {article.source || "WeatherGuard"}
                    </span>
                  </div>
                  <span style={{ fontSize: 9, color: "#64748b", display: "flex", alignItems: "center", gap: 3 }}>
                    <span>🕐</span>
                    {article.published_at ? new Date(article.published_at).toLocaleTimeString('fr-TN', {
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : 'N/A'}
                  </span>
                </div>
                
                {/* Title */}
                <h4 style={{ 
                  margin: "0 0 6px 0", 
                  fontSize: 13, 
                  fontWeight: 600,
                  color: "#ffffff",
                  lineHeight: 1.4,
                }}>
                  {article.title}
                </h4>
                
                {/* Body */}
                <p style={{ 
                  margin: 0, 
                  color: "#94a3b8", 
                  lineHeight: 1.5,
                  fontSize: 11,
                }}>
                  {displayText}
                </p>
                
                {/* Governorates Tags */}
                {article.governorates && article.governorates.length > 0 && (
                  <div style={{ marginTop: 8, display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {article.governorates.slice(0, 3).map((gov, idx) => (
                      <span key={idx} style={{
                        background: "rgba(255,255,255,0.03)",
                        padding: "2px 6px",
                        borderRadius: 4,
                        fontSize: 8,
                        color: "#64748b",
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                      }}>
                        <span>📍</span> {gov}
                      </span>
                    ))}
                    {article.governorates.length > 3 && (
                      <span style={{ fontSize: 8, color: "#64748b", display: "flex", alignItems: "center" }}>
                        +{article.governorates.length - 3}
                      </span>
                    )}
                  </div>
                )}

                {/* Expand/Collapse Indicator */}
                {bodyText.length > 100 && (
                  <div style={{ marginTop: 6 }}>
                    <span style={{
                      fontSize: 9,
                      color: "#1D9E75",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 3,
                    }}>
                      {isExpanded ? "Show less ↑" : "Read more →"}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: "0.6rem 1rem",
        borderTop: "1px solid #1e293b",
        background: "rgba(0, 0, 0, 0.2)",
        textAlign: "center",
      }}>
        <div style={{
          fontSize: 9,
          color: "#64748b",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}>
          <span>🔄 Auto-refresh every 5 min</span>
          <span>•</span>
          <span>🌍 WeatherGuard</span>
        </div>
      </div>
    </div>
  );
};

export default NewsWidget;