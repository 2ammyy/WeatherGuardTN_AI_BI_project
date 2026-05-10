import React, { useState, useEffect } from 'react';
import axios from 'axios';

const WeatherNews = () => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
<<<<<<< HEAD
        const response = await axios.get('http://localhost:8001/api/news');
=======
        const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:8001'}/api/news`);
>>>>>>> b73e6ba7dde6de6d15f8f3743fa6cd795efb87fd
        if (response.data.success) {
          setNews(response.data.articles);
        }
      } catch (error) {
        console.error('Error fetching news:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchNews();
  }, []);

  const getRiskColor = (level) => {
    const colors = { green: '#4caf50', yellow: '#ffc107', orange: '#ff9800', red: '#f44336', purple: '#9c27b0' };
    return colors[level?.toLowerCase()] || '#757575';
  };

  if (loading) return <div style={{padding: '20px', textAlign: 'center'}}>Loading news...</div>;
  if (news.length === 0) return <div style={{padding: '20px', textAlign: 'center'}}>No news available</div>;

  return (
    <div style={{padding: '20px', maxWidth: '800px', margin: '0 auto'}}>
      <h2>📰 Weather News & Alerts</h2>
      {news.map(article => (
        <div key={article.id} style={{
          border: `2px solid ${getRiskColor(article.risk_level)}`,
          borderRadius: '8px',
          padding: '15px',
          marginBottom: '15px',
          background: '#fff',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '10px'}}>
            <span style={{
              background: getRiskColor(article.risk_level),
              color: 'white',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              {article.risk_level?.toUpperCase()}
            </span>
            <span style={{color: '#666', fontSize: '12px'}}>{article.source}</span>
          </div>
          <h3 style={{margin: '0 0 10px 0', fontSize: '18px'}}>{article.title}</h3>
          <p style={{color: '#555', lineHeight: '1.5', marginBottom: '10px'}}>{article.body}</p>
          <div style={{fontSize: '12px', color: '#999'}}>
            {article.published_at ? new Date(article.published_at).toLocaleDateString('fr-TN') : 'Date inconnue'}
          </div>
        </div>
      ))}
    </div>
  );
};

export default WeatherNews;
