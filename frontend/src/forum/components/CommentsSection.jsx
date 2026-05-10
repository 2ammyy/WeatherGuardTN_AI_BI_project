// frontend/src/forum/components/CommentsSection.jsx
import { useState, useEffect, useRef } from "react";
import { commentsAPI } from "../api/client";
import { useTheme } from "../../contexts/ThemeContext";
import { useTranslation } from "../../contexts/LanguageContext";

function CommentBubble({ comment, postId, onReply, depth = 0, user }) {
  const { t } = useTheme();
  const { t: __ } = useTranslation();
  const [liked,  setLiked]  = useState(comment.is_liked ?? false);
  const [likes,  setLikes]  = useState(comment.likes_count ?? 0);
  const [showRep, setShowRep] = useState(false);

  const handleLike = async () => {
    try {
      if (liked) { await commentsAPI.unlike(comment.id); setLikes((l) => l - 1); }
      else        { await commentsAPI.like(comment.id);  setLikes((l) => l + 1); }
      setLiked((l) => !l);
    } catch { /* ignore */ }
  };

  const name = comment.author?.display_name ?? comment.author?.username ?? "?";
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const colors = ["#9FE1CB", "#B5D4F4", "#FAC775", "#F5C4B3", "#F4C0D1", "#CECBF6"];
  const avatarBg = colors[name.charCodeAt(0) % colors.length];

  return (
    <div style={{ marginBottom: 10, marginLeft: depth * 28 }}>
      <div style={{ display:"flex", gap:8, alignItems:"flex-start" }}>
        <div style={{
          width:28, height:28, borderRadius:"50%", background:avatarBg,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:11, fontWeight:500, flexShrink:0, color:"#333",
        }}>
          {initials}
        </div>
        <div style={{ flex:1 }}>
          <div style={{
            background: t.bgCard,
            border: `1px solid ${t.border}`,
            borderRadius:8, padding:"8px 12px",
          }}>
            <div style={{ fontSize:12, fontWeight:500, marginBottom:3, color: t.text }}>
              {comment.author?.display_name ?? comment.author?.username}
            </div>
            <div style={{ fontSize:13, color: t.textSecondary, lineHeight:1.55 }}>
              {comment.body}
            </div>
          </div>
          <div style={{ display:"flex", gap:12, marginTop:4, paddingLeft:4 }}>
            <button onClick={handleLike} style={{ fontSize:12, color: liked ? t.danger : t.textMuted, background:"transparent", border:"none", cursor:"pointer", padding:0 }}>
              {liked ? "♥" : "♡"} {likes}
            </button>
            {depth < 2 && (
              <button onClick={() => setShowRep((s) => !s)} style={{ fontSize:12, color: t.textMuted, background:"transparent", border:"none", cursor:"pointer", padding:0 }}>
                {__('reply')}
              </button>
            )}
            <span style={{ fontSize:11, color: t.textMuted }}>
              {new Date(comment.created_at).toLocaleDateString("fr-TN", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" })}
            </span>
          </div>
          {showRep && (
            <CommentInput postId={postId} parentId={comment.id} onSuccess={() => setShowRep(false)} small />
          )}
        </div>
      </div>
      {comment.replies?.map((r) => (
        <CommentBubble key={r.id} comment={r} postId={postId} onReply={onReply} depth={depth + 1} user={user} />
      ))}
    </div>
  );
}

function CommentInput({ postId, parentId = null, onSuccess, small = false, user }) {
  const { t } = useTheme();
  const { t: __ } = useTranslation();
  const [body,    setBody]    = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const ref = useRef();

  const submit = async () => {
    if (!body.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await commentsAPI.create(postId, { body, parent_id: parentId ?? undefined });
      setBody("");
      onSuccess?.();
    } catch (e) {
      const detail = e.response?.data?.detail;
      if (typeof detail === "object") setError(detail.ai_reason ?? __('commentNotApproved'));
      else setError(detail ?? __('errorPostingComment'));
    } finally { setLoading(false); }
  };

  return (
    <div style={{ marginTop: small ? 6 : 10 }}>
      <div style={{ display:"flex", gap:8 }}>
        <input
          ref={ref}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder={small ? __('writeReply') : __('writeComment')}
          style={{
            flex:1, padding:"8px 12px", borderRadius:8,
            border: `1px solid ${t.border}`,
            background: t.bgInput,
            fontSize:13, color: t.text,
          }}
        />
        <button onClick={submit} disabled={loading || !body.trim()}
          style={{
            padding:"8px 14px", background: t.accent, color: t.accentText,
            border:"none", borderRadius:8, cursor:"pointer", fontSize:13,
            opacity: loading ? 0.6 : 1,
          }}>
          {loading ? "…" : __('send')}
        </button>
      </div>
      {error && (
        <div style={{ marginTop:6, padding:"8px 12px", background: t.dangerBg, color: t.dangerText, borderRadius:8, fontSize:12, border:`1px solid ${t.dangerBorder || t.dangerBg}` }}>
          ⚠ {error}
        </div>
      )}
    </div>
  );
}

export default function CommentsSection({ postId, user }) {
  const { t } = useTheme();
  const { t: __ } = useTranslation();
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
    <div style={{ borderTop: `1px solid ${t.border}`, padding:"0.75rem 1.25rem", background: t.bgMuted }}>
      <div style={{ fontSize:13, fontWeight:500, marginBottom:10, color: t.text }}>
        {data.total} {__('commentCount').replace('{n}', data.total)}
      </div>
      {loading ? (
        <div style={{ fontSize:13, color: t.textMuted }}>{__('loading')}…</div>
      ) : data.items.length === 0 ? (
        <div style={{ fontSize:13, color: t.textMuted, marginBottom:10 }}>{__('noComments')}</div>
      ) : (
        data.items.map((c) => (
          <CommentBubble key={c.id} comment={c} postId={postId} user={user} />
        ))
      )}
      <CommentInput postId={postId} onSuccess={() => setRefresh((r) => r + 1)} user={user} />
    </div>
  );
}
