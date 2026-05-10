// frontend/src/components/forum/CommentForm.jsx
// Comment submission form with AI moderation feedback.

import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";

export default function CommentForm({ articleId, parentId = null, onSuccess, onCancel }) {
  const { isLoggedIn, authFetch } = useAuth();
  const [body, setBody]           = useState("");
  const [status, setStatus]       = useState("idle"); // idle | loading | rejected | error
  const [rejectionReason, setRejectionReason] = useState("");

  if (!isLoggedIn) {
    return (
      <div className="comment-signin-prompt">
        <span>💬</span>
        <p>
          <a href="/login">Sign in</a> to leave a comment.
        </p>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!body.trim() || body.length < 3) return;

    setStatus("loading");
    setRejectionReason("");

    try {
      const res = await authFetch(`/api/forum/news/${articleId}/comments`, {
        method: "POST",
        body: JSON.stringify({ body: body.trim(), parent_id: parentId || undefined }),
      });

      if (res.status === 422) {
        const data = await res.json();
        setRejectionReason(data.detail || "Comment not approved by moderation.");
        setStatus("rejected");
        return;
      }

      if (!res.ok) throw new Error("Server error");

      const comment = await res.json();
      setBody("");
      setStatus("idle");
      onSuccess?.(comment);
    } catch {
      setStatus("error");
    }
  };

  return (
    <form className="comment-form" onSubmit={handleSubmit}>
      <textarea
        value={body}
        onChange={(e) => { setBody(e.target.value); setStatus("idle"); }}
        placeholder={parentId ? "Write a reply…" : "Share your experience or local conditions…"}
        rows={3}
        maxLength={2000}
        disabled={status === "loading"}
        className="comment-textarea"
      />

      <div className="comment-form-footer">
        <span className="char-count">{body.length}/2000</span>
        <div className="comment-form-actions">
          {onCancel && (
            <button type="button" className="btn-cancel" onClick={onCancel}>
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="btn-submit"
            disabled={status === "loading" || body.trim().length < 3}
          >
            {status === "loading" ? "Checking…" : "Post Comment"}
          </button>
        </div>
      </div>

      {status === "rejected" && (
        <div className="moderation-notice">
          <span>🚫</span>
          <div>
            <strong>Comment not published</strong>
            <p>{rejectionReason}</p>
          </div>
        </div>
      )}
      {status === "error" && (
        <div className="moderation-notice error">
          <span>⚠️</span>
          <p>Something went wrong. Please try again.</p>
        </div>
      )}

      <style>{`
        .comment-form { display: flex; flex-direction: column; gap: 8px; margin: 12px 0; }
        .comment-textarea {
          width: 100%; padding: 10px 14px; border: 1.5px solid #ddd;
          border-radius: 8px; font-size: 14px; resize: vertical;
          font-family: inherit; transition: border-color 0.2s;
        }
        .comment-textarea:focus { outline: none; border-color: #1976d2; }
        .comment-form-footer { display: flex; justify-content: space-between; align-items: center; }
        .char-count { font-size: 12px; color: #aaa; }
        .comment-form-actions { display: flex; gap: 8px; }
        .btn-cancel { padding: 6px 14px; border: 1px solid #ddd; border-radius: 6px; background: #fff; cursor: pointer; }
        .btn-submit {
          padding: 6px 16px; background: #1976d2; color: #fff; border: none;
          border-radius: 6px; cursor: pointer; font-weight: 600; transition: background 0.2s;
        }
        .btn-submit:disabled { background: #90caf9; cursor: not-allowed; }
        .moderation-notice {
          display: flex; gap: 10px; align-items: flex-start;
          background: #fff3e0; border: 1px solid #ffb74d;
          border-radius: 8px; padding: 10px 14px; font-size: 13px;
        }
        .moderation-notice.error { background: #fce4ec; border-color: #ef9a9a; }
        .moderation-notice strong { display: block; margin-bottom: 2px; }
        .moderation-notice p { margin: 0; color: #555; }
        .comment-signin-prompt {
          display: flex; align-items: center; gap: 8px;
          padding: 10px 14px; background: #f5f5f5; border-radius: 8px;
          font-size: 14px; color: #666;
        }
        .comment-signin-prompt a { color: #1976d2; }
      `}</style>
    </form>
  );
}