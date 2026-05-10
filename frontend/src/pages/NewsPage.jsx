import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
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

const RISK_COLORS = {
  green: '#22c55e',
  yellow: '#eab308',
  orange: '#f97316',
  red: '#ef4444',
  purple: '#a855f7',
};

const RISK_BG = {
  green: 'rgba(34, 197, 94, 0.06)',
  yellow: 'rgba(234, 179, 8, 0.06)',
  orange: 'rgba(249, 115, 22, 0.08)',
  red: 'rgba(239, 68, 68, 0.1)',
  purple: 'rgba(168, 85, 247, 0.1)',
};

const stripHtml = (html) => {
  if (!html) return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
};

const getDisplayBody = (rawBody) => {
  if (!rawBody) return '';
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
  const { t } = useTheme();
  const { tGovernorate } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  if (!article) return null;

  const catColor = CATEGORY_COLORS[article.category] || '#64748b';
  const catIcon = CATEGORY_ICONS[article.category] || '📰';
  const catLabel = CATEGORY_LABELS[article.category] || article.category || 'Info';
  const riskColor = RISK_COLORS[article.risk_level] || '#64748b';
  const riskBg = RISK_BG[article.risk_level] || 'rgba(100, 116, 139, 0.06)';

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
        background: t.bgCard,
        border: `1px solid ${riskColor}22`,
        borderLeft: `4px solid ${riskColor}`,
        borderRadius: 12,
        overflow: 'hidden',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = `${riskColor}44`;
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = t.shadowCard;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = `${riskColor}22`;
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={{
        padding: '10px 14px',
        background: riskBg,
        borderBottom: `1px solid ${t.border}`,
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
          }}>
            {article.risk_level}
          </span>
        </div>
        <span style={{ fontSize: 10, color: t.textMuted, fontWeight: 500 }}>
          {shortTime}
        </span>
      </div>

      <div style={{ padding: '12px 14px' }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: 14, fontWeight: 700, color: t.text, lineHeight: 1.45 }}>
          {article.title}
        </h4>

        <div style={{ fontSize: 10, color: t.textMuted, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{
            background: t.bgMuted,
            padding: '1px 6px',
            borderRadius: 4,
            fontSize: 9,
            fontWeight: 600,
          }}>
            {article.source}
          </span>
        </div>

        {hasBody && (
          <p style={{ margin: '0 0 10px 0', color: t.textSecondary, lineHeight: 1.6, fontSize: 12, whiteSpace: 'pre-wrap' }}>
            {displayBody}
          </p>
        )}

        {governorates.length > 0 && (
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
            {governorates.slice(0, 5).map((gov, i) => (
              <span key={i} style={{
                background: `${t.textMuted}10`,
                border: `1px solid ${t.border}`,
                padding: '2px 7px',
                borderRadius: 5,
                fontSize: 9,
                color: t.textMuted,
                fontWeight: 500,
              }}>
                📍 {tGovernorate(gov)}
              </span>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {hasBody && fullBody.length > 200 && (
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
              style={{
                background: 'none',
                border: 'none',
                color: t.accent,
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                padding: '4px 0',
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
                background: t.accentBg,
                border: `1px solid ${t.accent}33`,
                borderRadius: 6,
                padding: '4px 10px',
                color: t.accent,
                fontSize: 11,
                fontWeight: 600,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
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

const NewsPage = ({ onBack }) => {
  const { t } = useTheme();
  const { t: __, dir } = useTranslation();
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
<<<<<<< HEAD
      const response = await fetch('http://localhost:8001/api/news/relevant');
=======
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8001'}/api/news/relevant`);
>>>>>>> b73e6ba7dde6de6d15f8f3743fa6cd795efb87fd
      const data = await response.json();
      if (data.success && data.articles && data.articles.length > 0) {
        setNews(data.articles);
        setError(null);
      } else {
        setError(__('noNews'));
      }
    } catch (err) {
      console.error('News fetch error:', err);
      setError(__('newsLoadError'));
    } finally {
      setLoading(false);
    }
  };

  const filteredNews = filter === 'all'
    ? news
    : news.filter((a) => a.category === filter);

  const categories = [
    { key: 'all', label: __('allNews'), icon: '📋' },
    { key: 'risk', label: __('riskNews'), icon: '⚠' },
    { key: 'school_closure', label: __('schools'), icon: '🏫' },
    { key: 'infrastructure', label: __('infrastructure'), icon: '🏗' },
    { key: 'weather', label: __('weatherNews'), icon: '🌤' },
    { key: 'climate_change', label: __('climate'), icon: '🌍' },
  ];

  const categoriesPresent = categories.filter(
    (c) => c.key === 'all' || news.some((a) => a.category === c.key)
  );

  return (
    <div dir={dir} style={{
      minHeight: '100vh',
      background: t.bg,
      color: t.text,
    }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <header style={{
        background: t.navbarBg,
        backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${t.border}`,
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '0 24px',
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={onBack}
              style={{
                background: 'transparent',
                border: `1px solid ${t.border}`,
                borderRadius: 10,
                padding: '6px 14px',
                color: t.textMuted,
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              ← {__('backToDashboard')}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                background: `linear-gradient(135deg, ${t.accent}, ${t.isDark ? '#0f6e56' : '#15803d'})`,
                width: 36,
                height: 36,
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
              }}>
                📰
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{__('newsTitle')}</h1>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: t.textMuted }}>
                  Météo • Climat • Infrastructure • Écoles • Risques
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px' }}>
        {loading ? (
          <div style={{
            background: t.bgCard,
            borderRadius: 16,
            border: `1px solid ${t.accent}33`,
            padding: '3rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
          }}>
            <div style={{
              width: 28, height: 28,
              border: `2px solid ${t.border}`,
              borderTopColor: t.accent,
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }} />
            <span style={{ color: t.textMuted, fontSize: 14 }}>{__('loadingNews')}</span>
          </div>
        ) : error ? (
          <div style={{
            background: t.bgCard,
            borderRadius: 16,
            border: `1px solid ${t.dangerBorder}`,
            padding: '3rem',
            color: t.dangerText,
            fontSize: 14,
            textAlign: 'center',
          }}>
            ⚠️ {error}
          </div>
        ) : (
          <>
            {/* Filter tabs */}
            <div style={{
              display: 'flex',
              gap: 8,
              marginBottom: 20,
              overflowX: 'auto',
              paddingBottom: 4,
            }}>
              {categoriesPresent.map((cat) => {
                const isActive = filter === cat.key;
                const count = cat.key === 'all' ? news.length : news.filter(a => a.category === cat.key).length;
                return (
                  <button
                    key={cat.key}
                    onClick={() => setFilter(cat.key)}
                    style={{
                      background: isActive ? t.accentBg : `${t.bgMuted}80`,
                      border: isActive ? `1px solid ${t.accent}50` : `1px solid ${t.border}`,
                      borderRadius: 8,
                      padding: '6px 14px',
                      fontSize: 11,
                      color: isActive ? t.accent : t.textMuted,
                      fontWeight: isActive ? 700 : 500,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      transition: 'all 0.2s',
                    }}
                  >
                    <span style={{ fontSize: 13 }}>{cat.icon}</span>
                    <span>{cat.label}</span>
                    <span style={{
                      background: isActive ? `${t.accent}33` : t.bgMuted,
                      padding: '1px 6px',
                      borderRadius: 10,
                      fontSize: 10,
                      fontWeight: 700,
                    }}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Articles grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
              gap: 16,
            }}>
              {filteredNews.map((article) => (
                <NewsCard key={article.id} article={article} />
              ))}
            </div>

            {filteredNews.length === 0 && (
              <div style={{
                textAlign: 'center',
                padding: '4rem 1rem',
                color: t.textDisabled,
              }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{__('noNewsInCategory')}</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default NewsPage;
