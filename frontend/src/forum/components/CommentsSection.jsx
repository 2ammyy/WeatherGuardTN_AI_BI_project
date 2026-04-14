// frontend/src/forum/components/CommentsSection.jsx
import { useState, useEffect, useRef } from "react";
import { commentsAPI } from "../api/client";
import { useAuth } from "../../hooks/useAuth";

function CommentBubble({ comment, postId, onReply, depth = 0 }) {
  const { user } = useAuth();
  const [liked,  setLiked]  = useState(comment.is_liked ?? false);
  const [likes,  setLikes]  = useState(comment.likes_count ?? 0);
  const [showRep, setShowRep] = useState(false);

  const handleLike = async () => {
    if (!user) return;
    try {
      if (liked) { await commentsAPI.unlike(comment.id); setLikes((l) => l - 1); }
      else        { await commentsAPI.like(comment.id);  setLikes((l) => l + 1); }
      setLiked((l) => !l);
    } catch { /* ignore */ }
  };

  return (
    <div style={{ marginBottom: 10, marginLeft: depth * 28 }}>
      <div style={{ display:"flex", gap:8, alignItems:"flex-start" }}>
        <div style={{
          width:28, height:28, borderRadius:"50%", background:"#B5D4F4",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:11, fontWeight:500, flexShrink:0, color:"#185FA5",
        }}>
          {(comment.author?.display_name ?? comment.author?.username ?? "?")
            .split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
        </div>
        <div style={{ flex:1 }}>
          <div style={{
            background:"var(--color-background-primary)",
            border:"0.5px solid var(--color-border-tertiary)",
            borderRadius:8, padding:"8px 12px",
          }}>
            <div style={{ fontSize:12, fontWeight:500, marginBottom:3 }}>
              {comment.author?.display_name ?? comment.author?.username}
            </div>
            <div style={{ fontSize:13, color:"var(--color-text-secondary)", lineHeight:1.55 }}>
              {comment.body}
            </div>
          </div>
          <div style={{ display:"flex", gap:12, marginTop:4, paddingLeft:4 }}>
            <button onClick={handleLike} style={{ fontSize:12, color: liked ? "#D85A30" : "var(--color-text-tertiary)", background:"transparent", border:"none", cursor:"pointer", padding:0, fontFamily:"var(--font-sans)" }}>
              {liked ? "♥" : "♡"} {likes}
            </button>
            {depth < 2 && (
              <button onClick={() => setShowRep((s) => !s)} style={{ fontSize:12, color:"var(--color-text-tertiary)", background:"transparent", border:"none", cursor:"pointer", padding:0, fontFamily:"var(--font-sans)" }}>
                Reply
              </button>
            )}
            <span style={{ fontSize:11, color:"var(--color-text-tertiary)" }}>
              {new Date(comment.created_at).toLocaleDateString("fr-TN", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" })}
            </span>
          </div>
          {showRep && (
            <CommentInput postId={postId} parentId={comment.id} onSuccess={() => setShowRep(false)} small />
          )}
        </div>
      </div>
      {comment.replies?.map((r) => (
        <CommentBubble key={r.id} comment={r} postId={postId} onReply={onReply} depth={depth + 1} />
      ))}
    </div>
  );
}

function CommentInput({ postId, parentId = null, onSuccess, small = false }) {
  const { user } = useAuth();
  const [body,    setBody]    = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const ref = useRef();

  const submit = async () => {
    if (!body.trim() || !user) return;
    setLoading(true);
    setError(null);
    try {
      await commentsAPI.create(postId, { body, parent_id: parentId ?? undefined });
      setBody("");
      onSuccess?.();
    } catch (e) {
      const detail = e.response?.data?.detail;
      if (typeof detail === "object") setError(detail.ai_reason ?? "Comment not approved by AI moderation.");
      else setError(detail ?? "Error posting comment");
    } finally { setLoading(false); }
  };

  if (!user) return (
    <div style={{ fontSize:13, color:"var(--color-text-tertiary)", padding:"8px 0" }}>
      Sign in to leave a comment.
    </div>
  );

  return (
    <div style={{ marginTop: small ? 6 : 10 }}>
      <div style={{ display:"flex", gap:8 }}>
        <input
          ref={ref}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder={small ? "Write a reply…" : "Write a comment…"}
          style={{
            flex:1, padding:"8px 12px", borderRadius:8,
            border:"0.5px solid var(--color-border-secondary)",
            background:"var(--color-background-primary)",
            fontSize:13, fontFamily:"var(--font-sans)", color:"var(--color-text-primary)",
          }}
        />
        <button onClick={submit} disabled={loading || !body.trim()}
          style={{
            padding:"8px 14px", background:"#1D9E75", color:"white",
            border:"none", borderRadius:8, cursor:"pointer", fontSize:13,
            fontFamily:"var(--font-sans)", opacity: loading ? 0.6 : 1,
          }}>
          {loading ? "…" : "Send"}
        </button>
      </div>
      {error && (
        <div style={{ marginTop:6, padding:"8px 12px", background:"#FCEBEB", color:"#A32D2D", borderRadius:8, fontSize:12, border:"0.5px solid #F7C1C1" }}>
          ⚠ {error}
        </div>
      )}
    </div>
  );
}

export default function CommentsSection({ postId }) {
  const [data,    setData]    = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    setLoading(true);
    commentsAPI.list(postId)
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [postId, refresh]);

  return (
    <div style={{ borderTop:"0.5px solid var(--color-border-tertiary)", padding:"0.75rem 1.25rem", background:"var(--color-background-secondary)" }}>
      <div style={{ fontSize:13, fontWeight:500, marginBottom:10 }}>
        {data.total} comment{data.total !== 1 ? "s" : ""}
      </div>
      {loading ? (
        <div style={{ fontSize:13, color:"var(--color-text-tertiary)" }}>Loading…</div>
      ) : data.items.length === 0 ? (
        <div style={{ fontSize:13, color:"var(--color-text-tertiary)", marginBottom:10 }}>No comments yet. Be the first!</div>
      ) : (
        data.items.map((c) => (
          <CommentBubble key={c.id} comment={c} postId={postId} />
        ))
      )}
      <CommentInput postId={postId} onSuccess={() => setRefresh((r) => r + 1)} />
    </div>
  );
}