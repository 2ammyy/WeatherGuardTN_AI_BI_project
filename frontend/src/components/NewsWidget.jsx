import React, { useState, useEffect } from 'react';
import { useTranslation } from '../contexts/LanguageContext';

const CATEGORY_LABELS = {
  weather: 'Météo',
  climate_change: 'Climat',
  infrastructure: 'Infrastructure',
  school_closure: 'Fermeture école',
  risk: 'Risques',
  alert: 'Alerte',
  meteo: 'Météo',
};

const CATEGORY_ICONS = {
  weather: '🌤',
  climate_change: '🌍',
  infrastructure: '🏗',
  school_closure: '🏫',
  risk: '⚠',
  alert: '🚨',
  meteo: '🌦',
};

const CATEGORY_COLORS = {
  weather: '#06b6d4',
  climate_change: '#14b8a6',
  infrastructure: '#f59e0b',
  school_closure: '#8b5cf6',
  risk: '#ef4444',
  alert: '#dc2626',
  meteo: '#3b82f6',
};

const stripHtml = (html) => {
  if (!html) return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
};

const getDisplayBody = (rawBody) => {
  const cleaned = stripHtml(rawBody);
  const creditPatterns = [
    /est apparu en premier sur.*$/,
    /Business News.*$/,
    /Consultez.*pour les derni/,
    /^La météo du.*$/,
  ];
  let lines = cleaned.split('\n').map(l => l.trim()).filter(Boolean);
  let filtered = lines.filter(line => {
    return !creditPatterns.some(p => p.test(line));
  });
  return filtered.join(' ');
};

const getRiskColor = (level) => {
  const colors = {
    green: '#22c55e',
    yellow: '#eab308',
    orange: '#f97316',
    red: '#ef4444',
    purple: '#a855f7',
  };
  return colors[level?.toLowerCase()] || '#64748b';
};

const getRiskBg = (level) => {
  const colors = {
    green: 'rgba(34, 197, 94, 0.06)',
    yellow: 'rgba(234, 179, 8, 0.06)',
    orange: 'rgba(249, 115, 22, 0.08)',
    red: 'rgba(239, 68, 68, 0.1)',
    purple: 'rgba(168, 85, 247, 0.1)',
  };
  return colors[level?.toLowerCase()] || 'rgba(100, 116, 139, 0.06)';
};

const timeAgo = (dateStr) => {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffH = Math.floor(diffMs / 3600000);
  const diffD = Math.floor(diffMs / 86400000);
  if (diffH < 1) return "À l'instant";
  if (diffH < 24) return `Il y a ${diffH}h`;
  if (diffD < 7) return `Il y a ${diffD}j`;
  return date.toLocaleDateString('fr-TN', { day: '2-digit', month: 'short' });
};

const NewsCard = ({ article }) => {
  const [expanded, setExpanded] = useState(false);

  if (!article) return null;

  const catColor = CATEGORY_COLORS[article.category] || '#64748b';
  const catIcon = CATEGORY_ICONS[article.category] || '📰';
  const catLabel = CATEGORY_LABELS[article.category] || article.category || 'Info';
  const riskColor = getRiskColor(article.risk_level);
  const riskBg = getRiskBg(article.risk_level);

  const fullBody = getDisplayBody(article.body || '');
  const hasBody = fullBody && fullBody.length > 30;
  const shouldTruncate = hasBody && fullBody.length > 200 && !expanded;
  const displayBody = shouldTruncate ? fullBody.substring(0, 200) + '...' : fullBody;

  const sourceUrl = article.source_url || '';
  const hasLink = sourceUrl && sourceUrl !== 'https://www.jawharafm.net/ar/';

  const shortTime = timeAgo(article.published_at);

  const governorates = Array.isArray(article.governorates) ? article.governorates : [];

  return (
    <div
      style={{
        background: '#0f172a',
        border: `1px solid ${riskColor}22`,
        borderLeft: `4px solid ${riskColor}`,
        borderRadius: 12,
        overflow: 'hidden',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = `${riskColor}44`;
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = `0 8px 25px -5px ${riskColor}15`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = `${riskColor}22`;
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Top bar */}
      <div style={{
        padding: '10px 14px',
        background: riskBg,
        borderBottom: '1px solid #1e293b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{
            background: catColor,
            color: '#fff',
            padding: '3px 8px',
            borderRadius: 6,
            fontSize: 10,
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            letterSpacing: '0.02em',
          }}>
            {catIcon} {catLabel}
          </span>
          <span style={{
            background: `${riskColor}20`,
            color: riskColor,
            padding: '3px 7px',
            borderRadius: 5,
            fontSize: 9,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            {article.risk_level}
          </span>
        </div>
        <span style={{ fontSize: 10, color: '#64748b', fontWeight: 500 }}>
          {shortTime}
        </span>
      </div>

      {/* Content */}
      <div style={{ padding: '12px 14px' }}>
        {/* Title */}
        <h4 style={{
          margin: '0 0 8px 0',
          fontSize: 13,
          fontWeight: 700,
          color: '#f1f5f9',
          lineHeight: 1.45,
        }}>
          {article.title}
        </h4>

        {/* Source badge */}
        <div style={{
          fontSize: 10,
          color: '#475569',
          marginBottom: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 5,
        }}>
          <span style={{
            background: '#1e293b',
            padding: '1px 6px',
            borderRadius: 4,
            fontSize: 9,
            fontWeight: 600,
          }}>
            {article.source}
          </span>
        </div>

        {/* Body text */}
        {hasBody && (
          <p style={{
            margin: '0 0 10px 0',
            color: '#94a3b8',
            lineHeight: 1.6,
            fontSize: 11.5,
            whiteSpace: 'pre-wrap',
          }}>
            {displayBody}
          </p>
        )}

        {/* No details fallback */}
        {!hasBody && hasLink && (
          <div style={{
            margin: '0 0 10px 0',
            padding: '8px 10px',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid #1e293b',
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            <span style={{ fontSize: 14 }}>🔗</span>
            <span style={{ fontSize: 10, color: '#64748b' }}>Détails disponibles sur la source</span>
          </div>
        )}

        {/* Governorates */}
        {governorates.length > 0 && (
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
            {governorates.slice(0, 5).map((gov, i) => (
              <span key={i} style={{
                background: 'rgba(100, 116, 139, 0.1)',
                border: '1px solid rgba(100, 116, 139, 0.15)',
                padding: '2px 7px',
                borderRadius: 5,
                fontSize: 9,
                color: '#94a3b8',
                fontWeight: 500,
              }}>
                📍 {tGovernorate(gov)}
              </span>
            ))}
            {article.governorates.length > 5 && (
              <span style={{ fontSize: 9, color: '#64748b', alignSelf: 'center' }}>
                +{article.governorates.length - 5}
              </span>
            )}
          </div>
        )}

        {/* Actions row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {hasBody && fullBody.length > 200 && (
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
              style={{
                background: 'none',
                border: 'none',
                color: '#1D9E75',
                fontSize: 10,
                fontWeight: 600,
                cursor: 'pointer',
                padding: '4px 0',
                display: 'flex',
                alignItems: 'center',
                gap: 3,
              }}
            >
              {expanded ? '▲ Réduire' : '▼ Lire la suite'}
            </button>
          )}
          {hasLink && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'rgba(29, 158, 117, 0.1)',
                border: '1px solid rgba(29, 158, 117, 0.2)',
                borderRadius: 6,
                padding: '4px 10px',
                color: '#1D9E75',
                fontSize: 10,
                fontWeight: 600,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(29, 158, 117, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(29, 158, 117, 0.1)';
              }}
            >
              Lire sur la source ↗
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

const NewsWidget = () => {
  const { tGovernorate } = useTranslation();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadNews();
    const interval = setInterval(loadNews, 300000);
    return () => clearInterval(interval);
  }, []);

  const loadNews = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8001'}/api/news/relevant`);
      const data = await response.json();
      if (data.success && data.articles && data.articles.length > 0) {
        console.log('Loaded', data.articles.length, 'articles:', data.articles.map(a => ({ id: a.id, title: a.title?.substring(0, 30), bodyLen: a.body?.length })));
        setNews(data.articles);
        setError(null);
      } else {
        setError('Aucune actualité disponible');
      }
    } catch (err) {
      console.error('News fetch error:', err);
      setError('Impossible de charger les actualités');
    } finally {
      setLoading(false);
    }
  };

  const filteredNews = filter === 'all'
    ? news
    : news.filter((a) => a.category === filter);

  const categories = [
    { key: 'all', label: 'Tout', icon: '📋' },
    { key: 'risk', label: 'Risques', icon: '⚠' },
    { key: 'school_closure', label: 'Écoles', icon: '🏫' },
    { key: 'infrastructure', label: 'Infrastructure', icon: '🏗' },
    { key: 'weather', label: 'Météo', icon: '🌤' },
    { key: 'climate_change', label: 'Climat', icon: '🌍' },
  ];

  const categoriesPresent = categories.filter(
    (c) => c.key === 'all' || news.some((a) => a.category === c.key)
  );

  if (loading) {
    return (
      <div style={{
        background: '#0f172a',
        borderRadius: 16,
        border: '1px solid rgba(29, 158, 117, 0.2)',
        padding: '1.5rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 28, height: 28,
            border: '2px solid #1e293b',
            borderTopColor: '#1D9E75',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <span style={{ color: '#64748b', fontSize: 13 }}>Chargement des actualités...</span>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        background: '#0f172a',
        borderRadius: 16,
        border: '1px solid rgba(239, 68, 68, 0.2)',
        padding: '1.25rem',
        color: '#f87171',
        fontSize: 13,
        textAlign: 'center',
      }}>
        ⚠️ {error}
      </div>
    );
  }

  return (
    <div style={{
      background: '#0f172a',
      borderRadius: 16,
      border: '1px solid rgba(29, 158, 117, 0.15)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '1.25rem 1.25rem 0.75rem',
        borderBottom: '1px solid #1e293b',
        background: 'linear-gradient(180deg, rgba(29, 158, 117, 0.05) 0%, transparent 100%)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              background: 'linear-gradient(135deg, #1D9E75 0%, #0f6e56 100%)',
              width: 36, height: 36, borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18,
              boxShadow: '0 4px 12px rgba(29, 158, 117, 0.25)',
            }}>
              📰
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>
                Actualités & Alertes
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: 10, color: '#64748b' }}>
                Météo • Infrastructure • Fermeture d'écoles • Alertes
              </p>
            </div>
          </div>
          <span style={{
            background: 'rgba(29, 158, 117, 0.1)',
            border: '1px solid rgba(29, 158, 117, 0.2)',
            padding: '3px 10px', borderRadius: 20,
            fontSize: 10, color: '#1D9E75', fontWeight: 600,
          }}>
            {filteredNews.length} article{filteredNews.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
          {categoriesPresent.map((cat) => {
            const isActive = filter === cat.key;
            const count = cat.key === 'all' ? news.length : news.filter(a => a.category === cat.key).length;
            return (
              <button
                key={cat.key}
                onClick={() => setFilter(cat.key)}
                style={{
                  background: isActive ? 'rgba(29, 158, 117, 0.15)' : 'rgba(30, 41, 59, 0.5)',
                  border: isActive ? '1px solid rgba(29, 158, 117, 0.3)' : '1px solid #1e293b',
                  borderRadius: 8,
                  padding: '5px 12px',
                  fontSize: 10,
                  color: isActive ? '#1D9E75' : '#64748b',
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  transition: 'all 0.2s',
                }}
              >
                <span style={{ fontSize: 12 }}>{cat.icon}</span>
                <span>{cat.label}</span>
                <span style={{
                  background: isActive ? 'rgba(29, 158, 117, 0.2)' : '#1e293b',
                  padding: '1px 5px',
                  borderRadius: 10,
                  fontSize: 9,
                  fontWeight: 700,
                }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Articles list */}
      <div style={{
        padding: '0.75rem',
        maxHeight: 600,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}>
        {filteredNews.map((article) => (
          <NewsCard key={article.id} article={article} />
        ))}

        {filteredNews.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '3rem 1rem',
            color: '#475569',
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>Aucune actualité dans cette catégorie</div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '0.6rem 1rem',
        borderTop: '1px solid #1e293b',
        background: 'rgba(0, 0, 0, 0.15)',
        textAlign: 'center',
      }}>
        <span style={{ fontSize: 9, color: '#475569' }}>
          🔄 Auto-refresh 5 min • Données scrapées en temps réel
        </span>
      </div>
    </div>
  );
};

export default NewsWidget;
