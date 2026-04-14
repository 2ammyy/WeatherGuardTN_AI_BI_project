// frontend/src/components/forum/ReactionBar.jsx
// Emoji reaction bar for news articles.
// Shows counts, highlights the user's own reaction, toggles on click.

import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";

const EMOJIS = ["👍", "🔥", "😮", "🙏", "😢"];

export default function ReactionBar({ articleId, initialCounts = {}, userEmoji = null }) {
  const { isLoggedIn, authFetch } = useAuth();
  const [counts, setCounts]       = useState(initialCounts);
  const [myEmoji, setMyEmoji]     = useState(userEmoji);
  const [loading, setLoading]     = useState(false);

  const handleReact = async (emoji) => {
    if (!isLoggedIn) {
      // Soft prompt — don't hard redirect
      alert("Sign in to react to articles.");
      return;
    }
    if (loading) return;
    setLoading(true);

    // Optimistic update
    const prev    = { ...counts };
    const prevMy  = myEmoji;
    const newCounts = { ...counts };

    if (myEmoji) newCounts[myEmoji] = Math.max(0, (newCounts[myEmoji] || 1) - 1);
    if (emoji !== myEmoji) {
      newCounts[emoji] = (newCounts[emoji] || 0) + 1;
      setMyEmoji(emoji);
    } else {
      setMyEmoji(null);
    }
    setCounts(newCounts);

    try {
      const res = await authFetch(`/api/forum/news/${articleId}/react`, {
        method: "POST",
        body: JSON.stringify({ emoji }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCounts(data.counts || {});
      setMyEmoji(data.user_emoji || null);
    } catch {
      // Revert on error
      setCounts(prev);
      setMyEmoji(prevMy);
    } finally {
      setLoading(false);
    }
  };

  const total = Object.values(counts).reduce((s, v) => s + v, 0);

  return (
    <div className="reaction-bar">
      <div className="reaction-buttons">
        {EMOJIS.map((emoji) => {
          const count = counts[emoji] || 0;
          const isActive = myEmoji === emoji;
          return (
            <button
              key={emoji}
              onClick={() => handleReact(emoji)}
              className={`reaction-btn ${isActive ? "active" : ""}`}
              title={isLoggedIn ? `React with ${emoji}` : "Sign in to react"}
              disabled={loading}
            >
              <span className="emoji">{emoji}</span>
              {count > 0 && <span className="count">{count}</span>}
            </button>
          );
        })}
      </div>
      {total > 0 && (
        <span className="reaction-total">{total} reaction{total !== 1 ? "s" : ""}</span>
      )}

      <style>{`
        .reaction-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          margin: 8px 0;
        }
        .reaction-buttons {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
        }
        .reaction-btn {
          display: flex;
          align-items: center;
          gap: 3px;
          padding: 4px 10px;
          border-radius: 20px;
          border: 1.5px solid #e0e0e0;
          background: #f5f5f5;
          cursor: pointer;
          font-size: 16px;
          transition: all 0.15s;
        }
        .reaction-btn:hover {
          background: #e8f4fd;
          border-color: #2196f3;
          transform: scale(1.05);
        }
        .reaction-btn.active {
          background: #e3f2fd;
          border-color: #1976d2;
          font-weight: 600;
        }
        .reaction-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .reaction-btn .emoji { font-size: 18px; }
        .reaction-btn .count { font-size: 12px; color: #555; }
        .reaction-total { font-size: 12px; color: #888; margin-left: 4px; }
      `}</style>
    </div>
  );
}