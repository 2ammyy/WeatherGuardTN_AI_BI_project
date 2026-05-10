import React, { useState, useEffect } from 'react';
import { useTranslation } from '../contexts/LanguageContext';

const NewsSection = () => {
  const { tGovernorate } = useTranslation();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const response = await fetch('http://localhost:8001/api/news');
        const data = await response.json();
        
        if (data.success) {
          setNews(data.articles);
          console.log('Loaded', data.articles.length, 'news articles');
        } else {
          setError('Failed to load news');
        }
      } catch (err) {
        console.error('Error fetching news:', err);
        setError('Connection error');
      } finally {
        setLoading(false);
      }
    };
    
    fetchNews();
    // Refresh every 5 minutes
    const interval = setInterval(fetchNews, 300000);
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
      'green': 'rgba(34, 197, 94, 0.1)',
      'yellow': 'rgba(234, 179, 8, 0.1)',
      'orange': 'rgba(249, 115, 22, 0.1)',
      'red': 'rgba(239, 68, 68, 0.1)',
      'purple': 'rgba(168, 85, 247, 0.1)'
    };
    return colors[level?.toLowerCase()] || 'rgba(100, 116, 139, 0.1)';
  };

  const getRiskText = (level) => {
    const texts = {
      'green': 'Low Risk',
      'yellow': 'Moderate',
      'orange': 'High Risk',
      'red': 'Severe',
      'purple': 'Extreme'
    };
    return texts[level?.toLowerCase()] || 'Information';
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

  const categories = [
    { value: 'all', label: 'All', icon: '📰' },
    { value: 'green', label: 'Low Risk', icon: '🟢' },
    { value: 'yellow', label: 'Moderate', icon: '🟡' },
    { value: 'orange', label: 'High Risk', icon: '🟠' },
    { value: 'red', label: 'Severe', icon: '🔴' },
    { value: 'purple', label: 'Extreme', icon: '🟣' },
  ];

  const filteredNews = selectedCategory === 'all' 
    ? news 
    : news.filter(article => article.risk_level?.toLowerCase() === selectedCategory);

  if (loading) {
    return (
      <div style={{
        background: "linear-gradient(135deg, #0f172a 0%, #0a0f1c 100%)",
        borderRadius: 20,
        border: "1px solid rgba(29, 158, 117, 0.2)",
        padding: "2rem",
        textAlign: "center",
      }}>
        <style>
          {`
            @keyframes pulse {
              0%, 100% { opacity: 0.3; }
              50% { opacity: 0.6; }
            }
          `}
        </style>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{
            width: 48,
            height: 48,
            border: "3px solid rgba(29, 158, 117, 0.2)",
            borderTopColor: "#1D9E75",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }} />
          <div style={{ color: "#64748b", fontSize: 14 }}>Loading weather news...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        background: "linear-gradient(135deg, #0f172a 0%, #0a0f1c 100%)",
        borderRadius: 20,
        border: "1px solid rgba(239, 68, 68, 0.3)",
        padding: "2rem",
        textAlign: "center",
      }}>
        <div style={{ color: "#f87171", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <span>⚠️</span> {error}
        </div>
      </div>
    );
  }

  if (news.length === 0) {
    return (
      <div style={{
        background: "linear-gradient(135deg, #0f172a 0%, #0a0f1c 100%)",
        borderRadius: 20,
        border: "1px solid rgba(29, 158, 117, 0.2)",
        padding: "2rem",
        textAlign: "center",
      }}>
        <div style={{ color: "#64748b" }}>No news articles available</div>
      </div>
    );
  }

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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
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
              📰
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "white" }}>
                Weather News & Alerts
              </h2>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>
                Real-time weather updates and safety information
              </p>
            </div>
          </div>
          <div style={{
            background: "rgba(29, 158, 117, 0.1)",
            padding: "6px 12px",
            borderRadius: 20,
            fontSize: 12,
            color: "#1D9E75",
            fontWeight: 500,
          }}>
            {filteredNews.length} articles
          </div>
        </div>
      </div>

      {/* Category Filters */}
      <div style={{
        padding: "1rem 1.5rem",
        borderBottom: "1px solid #1e293b",
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
        background: "rgba(0, 0, 0, 0.2)",
      }}>
        {categories.map(cat => (
          <button
            key={cat.value}
            onClick={() => setSelectedCategory(cat.value)}
            style={{
              padding: "6px 14px",
              borderRadius: 20,
              border: `1px solid ${selectedCategory === cat.value ? '#1D9E75' : '#334155'}`,
              background: selectedCategory === cat.value ? 'rgba(29, 158, 117, 0.1)' : 'transparent',
              color: selectedCategory === cat.value ? '#1D9E75' : '#94a3b8',
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 500,
              transition: "all 0.2s",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = "translateY(-1px)";
              e.target.style.borderColor = "#1D9E75";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "translateY(0)";
              if (selectedCategory !== cat.value) {
                e.target.style.borderColor = "#334155";
              }
            }}
          >
            <span>{cat.icon}</span> {cat.label}
          </button>
        ))}
      </div>

      {/* News List */}
      <div style={{ padding: "1.5rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {filteredNews.map((article, index) => (
            <div
              key={article.id}
              style={{
                background: getRiskBgColor(article.risk_level),
              borderLeft: `3px solid ${getRiskColor(article.risk_level)}`,
              borderRadius: 12,
              padding: "1.25rem",
              transition: "all 0.2s",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateX(4px)";
              e.currentTarget.style.background = getRiskBgColor(article.risk_level).replace('0.1', '0.15');
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateX(0)";
              e.currentTarget.style.background = getRiskBgColor(article.risk_level);
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{
                  background: getRiskColor(article.risk_level),
                  color: "white",
                  padding: "4px 12px",
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}>
                  {getRiskIcon(article.risk_level)} {getRiskText(article.risk_level)}
                </span>
                <span style={{ fontSize: 11, color: "#64748b", display: "flex", alignItems: "center", gap: 4 }}>
                  <span>📌</span> {article.source || "WeatherGuard"}
                </span>
              </div>
              <span style={{ fontSize: 11, color: "#64748b", display: "flex", alignItems: "center", gap: 4 }}>
                <span>📅</span>
                {article.published_at ? new Date(article.published_at).toLocaleDateString('fr-TN', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }) : 'Date inconnue'}
              </span>
            </div>
            
            {/* Title */}
            <h3 style={{ 
              margin: "0 0 10px 0", 
              fontSize: 16, 
              fontWeight: 600,
              color: "#ffffff",
              lineHeight: 1.4,
            }}>
              {article.title}
            </h3>
            
            {/* Body */}
            <p style={{ 
              margin: 0, 
              color: "#94a3b8", 
              lineHeight: 1.6,
              fontSize: 13,
            }}>
              {article.body && article.body.length > 200 ? article.body.substring(0, 200) + '...' : (article.body || '')}
            </p>
            
            {/* Governorates Tags */}
            {article.governorates && article.governorates.length > 0 && (
              <div style={{ marginTop: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
                {article.governorates.slice(0, 3).map((gov, idx) => (
                  <span key={idx} style={{
                    background: "rgba(255,255,255,0.05)",
                    padding: "3px 10px",
                    borderRadius: 6,
                    fontSize: 10,
                    color: "#94a3b8",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}>
                    <span>📍</span> {tGovernorate(gov)}
                  </span>
                ))}
                {article.governorates.length > 3 && (
                  <span style={{ fontSize: 10, color: "#64748b", display: "flex", alignItems: "center" }}>
                    +{article.governorates.length - 3} more
                  </span>
                )}
              </div>
            )}

            {/* Read More Link */}
            <div style={{ marginTop: 12 }}>
              <span style={{
                fontSize: 11,
                color: "#1D9E75",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                transition: "gap 0.2s",
              }}
              onMouseEnter={(e) => e.currentTarget.style.gap = "8px"}
              onMouseLeave={(e) => e.currentTarget.style.gap = "4px"}
              >
                Read more →
              </span>
            </div>
          </div>
        ))}
        </div>

        {/* Footer */}
        <div style={{
          marginTop: 20,
          paddingTop: 16,
          borderTop: "1px solid #1e293b",
          textAlign: "center",
          fontSize: 11,
          color: "#64748b",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}>
          <span>🔄</span> Updates every 5 minutes
          <span>•</span>
          <span>🌍</span> Powered by WeatherGuard
        </div>
      </div>
    </div>
  );
};

export default NewsSection;