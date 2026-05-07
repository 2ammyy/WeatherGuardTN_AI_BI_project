import { useState, useEffect } from "react";
import { usersAPI, activityAPI } from "../api/client";
import { useTheme } from "../../contexts/ThemeContext";
import ConversationModal from "../components/ConversationModal";

export default function UserProfilePage({ username, onBack, currentUser, isOwn }) {
  const { t } = useTheme();
  const [profile, setProfile] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [showConversation, setShowConversation] = useState(false);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    if (!username) return;
    const loadData = async () => {
      setLoading(true);
      try {
        const [p, acts] = await Promise.all([
          usersAPI.profile(username),
          activityAPI.list(username),
        ]);
        setProfile(p);
        setActivity(acts || []);
      } catch (e) {
        showToast(e.response?.data?.detail || "User not found");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [username]);

  const handleFollow = async () => {
    if (!profile) return;
    setActionLoading(true);
    try {
      if (profile.is_following) {
        await usersAPI.unfollow(profile.username);
        setProfile({ ...profile, is_following: false, followers_count: profile.followers_count - 1 });
      } else {
        await usersAPI.follow(profile.username);
        setProfile({ ...profile, is_following: true, followers_count: profile.followers_count + 1 });
      }
    } catch (e) {
      showToast(e.response?.data?.detail || "Error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleBlock = async () => {
    if (!profile) return;
    if (!window.confirm(`Block ${profile.username}? You won't see their content.`)) return;
    setActionLoading(true);
    try {
      if (profile.is_blocked) {
        await usersAPI.unblock(profile.username);
        setProfile({ ...profile, is_blocked: false });
      } else {
        await usersAPI.block(profile.username);
        setProfile({ ...profile, is_blocked: true, is_following: false });
      }
    } catch (e) {
      showToast(e.response?.data?.detail || "Error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReport = async () => {
    if (!profile) return;
    const reason = prompt("Why are you reporting this user? (optional)");
    try {
      await usersAPI.report(profile.username, reason);
      showToast("Report submitted!");
    } catch (e) {
      showToast(e.response?.data?.detail || "Error");
    }
  };

  if (!username) return <div style={{ padding: 40, textAlign: "center", color: t.textMuted }}>No user specified</div>;
  if (loading) return <div style={{ padding: 40, textAlign: "center", color: t.textMuted }}>Loading...</div>;
  if (!profile) return <div style={{ padding: 40, textAlign: "center", color: t.textMuted }}>User not found</div>;

  const initials = (profile.display_name || profile.username).charAt(0).toUpperCase();
  const colors = ["#9FE1CB", "#B5D4F4", "#FAC775", "#F5C4B3", "#F4C0D1", "#CECBF6"];
  const avatarBg = colors[profile.username.charCodeAt(0) % colors.length];

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 20 }}>
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 1000,
          background: t.accent, color: "#fff", padding: "10px 20px",
          borderRadius: 8, fontSize: 13,
        }}>{toast}</div>
      )}

      {showConversation && (
        <ConversationModal
          otherUser={{ id: profile.id, username: profile.username, display_name: profile.display_name }}
          onClose={() => setShowConversation(false)}
        />
      )}

      <button onClick={onBack}
        style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${t.border}`, background: t.bgCard, cursor: "pointer", fontSize: 13, color: t.text, marginBottom: 16 }}>
        ← Back
      </button>

      {/* Profile Header */}
      <div style={{
        background: t.bgCard, border: `1px solid ${t.border}`,
        borderRadius: 16, padding: 24, marginBottom: 20,
      }}>
        <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{
            width: 80, height: 80, borderRadius: "50%", background: avatarBg,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28, fontWeight: 600, color: "#333", flexShrink: 0,
          }}>
            {initials}
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 24, color: t.text }}>{profile.display_name || profile.username}</h1>
            <div style={{ fontSize: 14, color: t.textMuted, marginBottom: 8 }}>@{profile.username}</div>
            {profile.bio && <p style={{ margin: "8px 0", fontSize: 14, color: t.textSecondary }}>{profile.bio}</p>}
            <div style={{ display: "flex", gap: 16, fontSize: 13, color: t.textMuted, flexWrap: "wrap" }}>
              <span><strong style={{ color: t.text }}>{profile.posts_count}</strong> posts</span>
              <span><strong style={{ color: t.text }}>{profile.followers_count}</strong> followers</span>
              <span><strong style={{ color: t.text }}>{profile.following_count}</strong> following</span>
              {profile.governorate && <span>📍 {profile.governorate}</span>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {isOwn ? (
              <button
                style={{ padding: "8px 20px", borderRadius: 8, border: `1px solid ${t.border}`, background: t.bgCard, cursor: "pointer", fontSize: 13, color: t.text }}>
                ✏ Edit Profile
              </button>
            ) : (
              <>
                {profile.is_following ? (
                  <button onClick={handleFollow} disabled={actionLoading}
                    style={{ padding: "8px 20px", borderRadius: 8, border: `1px solid ${t.border}`, background: t.bgCard, cursor: "pointer", fontSize: 13, color: t.text }}>
                    ✓ Following
                  </button>
                ) : (
                  <button onClick={handleFollow} disabled={actionLoading}
                    style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: t.accent, color: t.accentText, cursor: "pointer", fontSize: 13 }}>
                    + Follow
                  </button>
                )}
                <button onClick={() => setShowConversation(true)}
                  style={{ padding: "8px 20px", borderRadius: 8, border: `1px solid ${t.border}`, background: t.bgCard, cursor: "pointer", fontSize: 13, color: t.text }}>
                  ✉ Message
                </button>
                <button onClick={handleBlock} disabled={actionLoading}
                  style={{ padding: "8px 20px", borderRadius: 8, border: `1px solid ${profile.is_blocked ? t.danger : t.border}`, background: t.bgCard, cursor: "pointer", fontSize: 13, color: t.text }}>
                  {profile.is_blocked ? "Unblock" : "Block"}
                </button>
                <button onClick={handleReport}
                  style={{ padding: "8px 20px", borderRadius: 8, border: `1px solid ${t.border}`, background: t.bgCard, cursor: "pointer", fontSize: 13, color: t.textMuted }}>
                  ⚑ Report
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Activity Feed */}
      <h3 style={{ color: t.text, fontSize: 16, marginBottom: 12 }}>Activity</h3>
      {activity.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: t.textMuted, background: t.bgCard, borderRadius: 12, border: `1px solid ${t.border}` }}>
          No activity yet.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {activity.map((item, i) => (
            <div key={`${item.type}-${item.post?.id || item.comment?.id || i}`}
              style={{
                background: t.bgCard, border: `1px solid ${t.border}`,
                borderRadius: 12, padding: 16,
              }}>
              {item.type === "post" && item.post ? (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <span style={{ fontSize: 16 }}>📝</span>
                    <span style={{ fontSize: 12, color: t.textMuted }}>Posted</span>
                    <span style={{ fontSize: 11, color: t.textMuted }}>{new Date(item.created_at).toLocaleDateString()}</span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 6, color: t.text }}>{item.post.title}</div>
                  <div style={{ fontSize: 13, color: t.textSecondary, marginBottom: 6 }}>{item.post.body.substring(0, 200)}{item.post.body.length > 200 && "..."}</div>
                  <div style={{ display: "flex", gap: 16, fontSize: 12, color: t.textMuted }}>
                    <span>♥ {item.post.likes_count}</span>
                    <span>🗨 {item.post.comments_count}</span>
                    <span>↗ {item.post.shares_count}</span>
                  </div>
                </div>
              ) : item.type === "comment" && item.comment ? (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <span style={{ fontSize: 16 }}>💬</span>
                    <span style={{ fontSize: 12, color: t.textMuted }}>Commented on</span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 300 }}>
                      {item.comment.post_title || "a post"}
                    </span>
                    <span style={{ fontSize: 11, color: t.textMuted }}>{new Date(item.created_at).toLocaleDateString()}</span>
                  </div>
                  <div style={{ fontSize: 13, color: t.textSecondary }}>{item.comment.body.substring(0, 300)}{item.comment.body.length > 300 && "..."}</div>
                  <div style={{ fontSize: 12, color: t.textMuted, marginTop: 4 }}>♥ {item.comment.likes_count}</div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
