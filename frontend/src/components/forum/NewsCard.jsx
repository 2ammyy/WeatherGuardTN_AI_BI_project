// frontend/src/components/forum/NewsCard.jsx
// Full news article card with risk badge, reactions, share, and comment toggle.

import { useState } from "react";
import ReactionBar from "./ReactionBar";
import CommentSection from "./CommentSection";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../contexts/ThemeContext";
import { useTranslation } from "../../contexts/LanguageContext";

const RISK_CONFIG = {
  green:  { label: "Safe",    color: "#2e7d32", bg: "#e8f5e9", emoji: "🟢" },
  yellow: { label: "Watch",   color: "#f57f17", bg: "#fff9c4", emoji: "🟡" },
  orange: { label: "Alert",   color: "#e65100", bg: "#fff3e0", emoji: "🟠" },
  red:    { label: "Danger",  color: "#b71c1c", bg: "#ffebee", emoji: "🔴" },
  purple: { label: "Extreme", color: "#6a1b9a", bg: "#f3e5f5", emoji: "🟣" },
};

const SOURCE_LABEL = {
  businessnews: "BusinessNews TN",
  mosaiquefm:   "Mosaïque FM",
  jawharafm:    "Jawharafm",
};

export default function NewsCard({ article }) {
  const { isLoggedIn, authFetch } = useAuth();
  const { t } = useTheme();
  const { tGovernorate } = useTranslation();
  const [showComments, setShowComments] = useState(false);
  const [shareCount, setShareCount]     = useState(article.shares_count || 0);
  const [shareDone, setShareDone]       = useState(false);

  const risk   = RISK_CONFIG[article.risk_level] || RISK_CONFIG.green;
  const source = SOURCE_LABEL[article.source_name] || article.source_name;

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return new Intl.DateTimeFormat("fr-TN", {
      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
    }).format(new Date(dateStr));
  };

  const handleShare = async () => {
    if (!isLoggedIn) {
      // Copy URL to clipboard without requiring login
      navigator.clipboard?.writeText(article.source_url).catch(() => {});
      setShareDone(true);
      return;
    }
    try {
      await authFetch(`/api/forum/news/${article.id}/share`, { method: "POST" });
      setShareCount((n) => n + 1);
      navigator.clipboard?.writeText(article.source_url).catch(() => {});
      setShareDone(true);
      setTimeout(() => setShareDone(false), 2000);
    } catch (_) {}
  };

  return (
    <article className="news-card" style={{ borderLeft: `4px solid ${risk.color}` }}>
      {/* Header */}
      <div className="card-header">
        <div className="card-meta">
          <span className="risk-badge" style={{ background: risk.bg, color: risk.color }}>
            {risk.emoji} {risk.label}
          </span>
          <span className="source-tag">{source}</span>
          {article.category && article.category !== "meteo" && (
            <span className="category-tag">{article.category}</span>
          )}
        </div>
        {article.governorates?.length > 0 && (
          <div className="govs">
            📍 {article.governorates.slice(0, 3).map(g => tGovernorate(g)).join(", ")}
            {article.governorates.length > 3 && ` +${article.governorates.length - 3}`}
          </div>
        )}
      </div>

      {/* Title */}
      <a
        href={article.source_url}
        target="_blank"
        rel="noopener noreferrer"
        className="card-title"
      >
        {article.title}
      </a>

      {/* Body preview */}
      {article.body && (
        <p className="card-body">{article.body.slice(0, 220)}{article.body.length > 220 ? "…" : ""}</p>
      )}

      {/* Timestamp */}
      <div className="card-time">
        🕒 {formatDate(article.published_at || article.scraped_at)}
      </div>

      {/* Reactions */}
      <ReactionBar
        articleId={article.id}
        initialCounts={article._reaction_counts || {}}
        userEmoji={article.user_reaction || null}
      />

      {/* Action bar */}
      <div className="card-actions">
        <button
          className="action-pill"
          onClick={() => setShowComments((v) => !v)}
        >
          💬 {article.comments_count || 0} Comment{article.comments_count !== 1 ? "s" : ""}
        </button>

        <button
          className={`action-pill ${shareDone ? "share-done" : ""}`}
          onClick={handleShare}
        >
          {shareDone ? "✅ Copied!" : `🔗 Share${shareCount > 0 ? ` (${shareCount})` : ""}`}
        </button>

        <a
          href={article.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="action-pill link-pill"
        >
          🔗 Read full
        </a>
      </div>

      {/* Comments */}
      {showComments && (
        <div className="card-comments">
          <CommentSection articleId={article.id} initialCount={article.comments_count} />
        </div>
      )}

      <style>{`
        .news-card {
          background: ${t.bgCard}; border-radius: 12px; padding: 16px 20px;
          box-shadow: ${t.shadowCard}; margin-bottom: 16px;
          transition: box-shadow 0.2s;
        }
        .news-card:hover { box-shadow: ${t.shadowModal}; }
        .card-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
        .card-meta { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
        .risk-badge { font-size: 12px; font-weight: 700; padding: 2px 10px; border-radius: 12px; }
        .source-tag { font-size: 11px; color: ${t.textMuted}; background: ${t.bgMuted}; padding: 2px 8px; border-radius: 10px; }
        .category-tag { font-size: 11px; color: ${t.accent}; background: ${t.accentBg}; padding: 2px 8px; border-radius: 10px; text-transform: capitalize; }
        .govs { font-size: 12px; color: ${t.textMuted}; }
        .card-title {
          display: block; font-size: 16px; font-weight: 700; color: ${t.text};
          text-decoration: none; margin-bottom: 8px; line-height: 1.4;
          transition: color 0.15s;
        }
        .card-title:hover { color: ${t.accent}; }
        .card-body { font-size: 13px; color: ${t.textSecondary}; line-height: 1.6; margin: 0 0 8px; }
        .card-time { font-size: 11px; color: ${t.textDisabled}; margin-bottom: 8px; }
        .card-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; border-top: 1px solid ${t.borderLight}; padding-top: 10px; }
        .action-pill {
          padding: 5px 12px; border-radius: 20px; border: 1px solid ${t.border};
          background: ${t.bgMuted}; cursor: pointer; font-size: 13px; color: ${t.textSecondary};
          text-decoration: none; transition: all 0.15s; display: inline-flex; align-items: center; gap: 4px;
        }
        .action-pill:hover { background: ${t.accentBg}; border-color: ${t.accentBorder}; color: ${t.accent}; }
        .action-pill.share-done { background: ${t.accentBg}; border-color: ${t.accentBorder}; color: ${t.accent}; }
        .link-pill { color: ${t.accent}; }
        .card-comments { margin-top: 12px; border-top: 1px solid ${t.borderLight}; padding-top: 12px; }
      `}</style>
    </article>
  );
}