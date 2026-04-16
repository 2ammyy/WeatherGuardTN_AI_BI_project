import React, { useState, useEffect } from 'react';

const NewsWidget = () => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadNews = async () => {
      try {
        const response = await fetch('http://localhost:8001/api/news');
        const data = await response.json();
        
        if (data.success && data.articles) {
          setNews(data.articles);
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
  }, []);

  const getRiskColor = (level) => {
    const colors = {
      'green': '#10b981',
      'yellow': '#f59e0b', 
      'orange': '#f97316',
      'red': '#ef4444',
      'purple': '#8b5cf6'
    };
    return colors[level?.toLowerCase()] || '#6b7280';
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', background: 'white', borderRadius: '8px' }}>
        <div>📰 Loading weather news...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', background: 'white', borderRadius: '8px', color: '#ef4444' }}>
        ⚠️ {error}
      </div>
    );
  }

  if (news.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', background: 'white', borderRadius: '8px', color: '#6b7280' }}>
        📭 No news articles available
      </div>
    );
  }

  return (
    <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
      <h3 style={{ margin: '0 0 16px 0', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>📰</span> Weather News & Alerts
        <span style={{ fontSize: '12px', background: '#e2e8f0', padding: '2px 8px', borderRadius: '20px' }}>
          {news.length} updates
        </span>
      </h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {news.map((article) => (
          <div
            key={article.id}
            style={{
              borderLeft: `4px solid ${getRiskColor(article.risk_level)}`,
              padding: '12px',
              background: '#f8fafc',
              borderRadius: '6px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{
                background: getRiskColor(article.risk_level),
                color: 'white',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 'bold'
              }}>
                {article.risk_level?.toUpperCase() || 'INFO'}
              </span>
              <span style={{ fontSize: '11px', color: '#64748b' }}>{article.source}</span>
            </div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#0f172a' }}>{article.title}</h4>
            <p style={{ margin: 0, fontSize: '13px', color: '#475569' }}>
              {article.body.length > 150 ? article.body.substring(0, 150) + '...' : article.body}
            </p>
            {article.governorates && article.governorates.length > 0 && (
              <div style={{ marginTop: '8px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {article.governorates.slice(0, 3).map((gov, i) => (
                  <span key={i} style={{ fontSize: '10px', color: '#64748b' }}>📍 {gov}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default NewsWidget;
