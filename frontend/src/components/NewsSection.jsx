import React, { useState, useEffect } from 'react';

const NewsSection = () => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
      'green': '#10b981',
      'yellow': '#f59e0b',
      'orange': '#f97316',
      'red': '#ef4444',
      'purple': '#8b5cf6'
    };
    return colors[level?.toLowerCase()] || '#6b7280';
  };

  const getRiskText = (level) => {
    const texts = {
      'green': 'Low Risk',
      'yellow': 'Moderate',
      'orange': 'High Risk',
      'red': 'Severe',
      'purple': 'Extreme'
    };
    return texts[level?.toLowerCase()] || 'Info';
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ color: '#666' }}>Loading weather news...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#ef4444' }}>
        ⚠️ {error}
      </div>
    );
  }

  if (news.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
        No news articles available
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
      <h2 style={{ 
        color: '#1e293b', 
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        <span>📰</span> Weather News & Alerts
        <span style={{ 
          fontSize: '14px', 
          background: '#e2e8f0', 
          padding: '2px 8px', 
          borderRadius: '20px',
          fontWeight: 'normal'
        }}>
          {news.length} articles
        </span>
      </h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {news.map((article) => (
          <div
            key={article.id}
            style={{
              borderLeft: `4px solid ${getRiskColor(article.risk_level)}`,
              background: 'white',
              borderRadius: '8px',
              padding: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              transition: 'transform 0.2s, box-shadow 0.2s',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{
                  background: getRiskColor(article.risk_level),
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  {getRiskText(article.risk_level)}
                </span>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  {article.source}
                </span>
              </div>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                {article.published_at ? new Date(article.published_at).toLocaleDateString('fr-TN', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric'
                }) : 'Date inconnue'}
              </span>
            </div>
            
            <h3 style={{ 
              margin: '0 0 12px 0', 
              fontSize: '18px', 
              fontWeight: '600',
              color: '#0f172a'
            }}>
              {article.title}
            </h3>
            
            <p style={{ 
              margin: 0, 
              color: '#475569', 
              lineHeight: '1.5',
              fontSize: '14px'
            }}>
              {article.body.length > 200 ? article.body.substring(0, 200) + '...' : article.body}
            </p>
            
            {article.governorates && article.governorates.length > 0 && (
              <div style={{ marginTop: '12px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {article.governorates.slice(0, 3).map((gov, idx) => (
                  <span key={idx} style={{
                    background: '#f1f5f9',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    color: '#475569'
                  }}>
                    {gov}
                  </span>
                ))}
                {article.governorates.length > 3 && (
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    +{article.governorates.length - 3} more
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default NewsSection;
