import { useState, useEffect } from "react";
import { usersAPI, postsAPI } from "../api/client";
import { useTheme } from "../../contexts/ThemeContext";

export default function UserProfilePage({ username, onBack, currentUser }) {
  const { t } = useTheme();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const loadProfile = async () => {
    setLoading(true);
    try {
      const p = await usersAPI.profile(username);
      setProfile(p);
      const postData = await postsAPI.list({ username, page: 1, size: 20 });
      setPosts(postData.items || []);
    } catch (e) {
      showToast(e.response?.data?.detail || "User not found");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProfile(); }, [username]);

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

  const handleMessage = () => {
    showToast("Messaging feature coming soon!");
  };

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
            <button onClick={handleMessage}
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
          </div>
        </div>
      </div>

      {/* User Posts */}
      <h3 style={{ color: t.text, fontSize: 16, marginBottom: 12 }}>Posts ({profile.posts_count})</h3>
      {posts.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: t.textMuted, background: t.bgCard, borderRadius: 12, border: `1px solid ${t.border}` }}>
          No posts yet.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {posts.map((post) => (
            <div key={post.id}
              style={{
                background: t.bgCard, border: `1px solid ${t.border}`,
                borderRadius: 12, padding: 16, cursor: "pointer",
              }}>
              <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 8, color: t.text }}>{post.title}</div>
              <div style={{ fontSize: 13, color: t.textSecondary, marginBottom: 8 }}>{post.body.substring(0, 150)}{post.body.length > 150 && "..."}</div>
              <div style={{ display: "flex", gap: 16, fontSize: 12, color: t.textMuted }}>
                <span>♥ {post.likes_count}</span>
                <span>🗨 {post.comments_count}</span>
                <span>↗ {post.shares_count}</span>
                <span>{new Date(post.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
