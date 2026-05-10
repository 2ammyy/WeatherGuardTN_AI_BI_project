// frontend/src/components/forum/CommentSection.jsx
// Threaded comment section with likes and nested replies.

import { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useTranslation } from "../../contexts/LanguageContext";
import CommentForm from "./CommentForm";

function CommentItem({ comment, articleId, depth = 0 }) {
  const { isLoggedIn, authFetch, user } = useAuth();
  const { tGovernorate } = useTranslation();
  const [showReply, setShowReply]       = useState(false);
  const [likes, setLikes]               = useState(comment.likes_count || 0);
  const [liked, setLiked]               = useState(false);
  const [replies, setReplies]           = useState(comment.replies || []);
  const [deleted, setDeleted]           = useState(false);

  if (deleted) return null;

  const handleLike = async () => {
    if (!isLoggedIn) return;
    const res  = await authFetch(`/api/forum/news/${articleId}/comments/${comment.id}/like`, { method: "POST" });
    const data = await res.json();
    setLiked(data.liked);
    setLikes((l) => l + (data.liked ? 1 : -1));
  };

  const handleDelete = async () => {
    if (!confirm("Delete this comment?")) return;
    await authFetch(`/api/forum/news/${articleId}/comments/${comment.id}`, { method: "DELETE" });
    setDeleted(true);
  };

  const handleReplySuccess = (newComment) => {
    setReplies((r) => [...r, newComment]);
    setShowReply(false);
  };

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr);
    const m = Math.floor(diff / 60000);
    if (m < 1)  return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  return (
    <div className={`comment-item depth-${Math.min(depth, 2)}`}>
      <div className="comment-avatar">
        {comment.author?.avatar_url
          ? <img src={comment.author.avatar_url} alt="" />
          : <div className="avatar-placeholder">{(comment.author?.display_name || comment.author?.username || "?")[0].toUpperCase()}</div>
        }
      </div>
      <div className="comment-body-wrap">
        <div className="comment-header">
          <strong className="comment-author">{comment.author?.display_name || comment.author?.username}</strong>
          {comment.author?.governorate && (
            <span className="comment-gov">📍 {tGovernorate(comment.author.governorate)}</span>
          )}
          {comment.author?.occupation && comment.author.occupation !== "general" && (
            <span className="comment-occ">{comment.author.occupation}</span>
          )}
          <span className="comment-time">{timeAgo(comment.created_at)}</span>
        </div>

        <p className="comment-text">{comment.body}</p>

        <div className="comment-actions">
          {isLoggedIn && (
            <button onClick={handleLike} className={`action-btn ${liked ? "liked" : ""}`}>
              👍 {likes > 0 ? likes : "Like"}
            </button>
          )}
          {depth < 2 && (
            <button onClick={() => setShowReply((v) => !v)} className="action-btn">
              💬 Reply
            </button>
          )}
          {user?.id === comment.author?.id && (
            <button onClick={handleDelete} className="action-btn delete-btn">🗑️ Delete</button>
          )}
        </div>

        {showReply && (
          <CommentForm
            articleId={articleId}
            parentId={comment.id}
            onSuccess={handleReplySuccess}
            onCancel={() => setShowReply(false)}
          />
        )}

        {replies.length > 0 && (
          <div className="replies">
            {replies.map((r) => (
              <CommentItem key={r.id} comment={r} articleId={articleId} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>

      <style>{`
        .comment-item { display: flex; gap: 10px; margin: 12px 0; }
        .comment-item.depth-1 { margin-left: 32px; }
        .comment-item.depth-2 { margin-left: 64px; }
        .comment-avatar img, .avatar-placeholder {
          width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0;
        }
        .avatar-placeholder {
          background: #1976d2; color: #fff; display: flex;
          align-items: center; justify-content: center; font-weight: 700; font-size: 16px;
        }
        .comment-body-wrap { flex: 1; }
        .comment-header { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 4px; }
        .comment-author { font-size: 14px; }
        .comment-gov { font-size: 11px; color: #888; }
        .comment-occ {
          font-size: 10px; background: #e3f2fd; color: #1976d2;
          padding: 1px 6px; border-radius: 10px;
        }
        .comment-time { font-size: 11px; color: #bbb; margin-left: auto; }
        .comment-text { margin: 0 0 8px; font-size: 14px; color: #333; line-height: 1.5; }
        .comment-actions { display: flex; gap: 8px; }
        .action-btn {
          background: none; border: none; cursor: pointer; font-size: 12px;
          color: #888; padding: 2px 6px; border-radius: 4px; transition: all 0.15s;
        }
        .action-btn:hover { background: #f0f0f0; color: #333; }
        .action-btn.liked { color: #1976d2; font-weight: 600; }
        .action-btn.delete-btn:hover { color: #d32f2f; background: #fce4ec; }
        .replies { margin-top: 8px; border-left: 2px solid #e0e0e0; padding-left: 8px; }
      `}</style>
    </div>
  );
}


export default function CommentSection({ articleId, initialCount = 0 }) {
  const [comments, setComments]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [count, setCount]         = useState(initialCount);

  useEffect(() => {
<<<<<<< HEAD
    fetch(`${process.env.REACT_APP_API_URL || "http://localhost:8000"}/api/forum/news/${articleId}/comments`)
=======
    fetch(`${process.env.REACT_APP_API_URL || "http://localhost:8001"}/api/forum/news/${articleId}/comments`)
>>>>>>> b73e6ba7dde6de6d15f8f3743fa6cd795efb87fd
      .then((r) => r.json())
      .then((data) => { setComments(data); setCount(data.length); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [articleId]);

  const handleNewComment = (comment) => {
    setComments((c) => [...c, comment]);
    setCount((n) => n + 1);
  };

  return (
    <div className="comment-section">
      <h3 className="section-title">💬 Comments ({count})</h3>
      <CommentForm articleId={articleId} onSuccess={handleNewComment} />
      <div className="comment-list">
        {loading && <p className="loading-text">Loading comments…</p>}
        {!loading && comments.length === 0 && (
          <p className="empty-text">No comments yet. Be the first to share local conditions!</p>
        )}
        {comments.map((c) => (
          <CommentItem key={c.id} comment={c} articleId={articleId} />
        ))}
      </div>
      <style>{`
        .comment-section { margin-top: 20px; }
        .section-title { font-size: 16px; font-weight: 700; margin-bottom: 12px; color: #333; }
        .loading-text, .empty-text { color: #aaa; font-size: 14px; text-align: center; padding: 20px 0; }
      `}</style>
    </div>
  );
}