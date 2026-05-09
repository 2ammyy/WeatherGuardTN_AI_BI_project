import { useState, useEffect } from "react";
import { usersAPI, activityAPI } from "../api/client";
import { useTheme } from "../../contexts/ThemeContext";
import { useTranslation } from "../../contexts/LanguageContext";
import ConversationModal from "../components/ConversationModal";
import UserListModal from "../components/UserListModal";

export default function UserProfilePage({ username, onBack, isOwn, onEditProfile }) {
  const { t } = useTheme();
  const { t: __, dir, tGovernorate } = useTranslation();
  const [profile, setProfile] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [showConversation, setShowConversation] = useState(false);
  const [listModal, setListModal] = useState(null);
  const [activeTab, setActiveTab] = useState("all");

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

  if (!username) return <div style={{ padding: 40, textAlign: "center", color: t.textMuted }}>{__('noUser')}</div>;
  if (loading) return <div style={{ padding: 40, textAlign: "center", color: t.textMuted }}>{__('loadingProfile')}</div>;
  if (!profile) return <div style={{ padding: 40, textAlign: "center", color: t.textMuted }}>{__('noUser')}</div>;

  const initials = (profile.display_name || profile.username).charAt(0).toUpperCase();
  const colors = ["#9FE1CB", "#B5D4F4", "#FAC775", "#F5C4B3", "#F4C0D1", "#CECBF6"];
  const avatarBg = colors[profile.username.charCodeAt(0) % colors.length];

  const ACTIVITY_ICONS = {
    post: "📝",
    comment: "💬",
    like: "♥",
    share: "↗",
    follow: "👤",
  };

  const ACTIVITY_LABELS = {
    post: __('posted'),
    comment: __('commented'),
    like: __('likedPost'),
    share: __('sharedPost'),
    follow: __('followed'),
  };

  const TABS = [
    { key: "all", label: "All", icon: "📋" },
    { key: "post", label: "Posts", icon: "📝" },
    { key: "comment", label: "Comments", icon: "💬" },
    { key: "like", label: "Likes", icon: "♥" },
    { key: "share", label: "Shares", icon: "↗" },
    { key: "follow", label: "Follows", icon: "👤" },
  ];

  const counts = {};
  activity.forEach((a) => { counts[a.type] = (counts[a.type] || 0) + 1; });
  counts.all = activity.length;

  const filtered = activeTab === "all" ? activity : activity.filter((a) => a.type === activeTab);

  return (
    <div dir={dir} style={{ maxWidth: 800, margin: "0 auto", padding: 20 }}>
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

      {listModal && (
        <UserListModal
          username={profile.username}
          type={listModal}
          onClose={() => setListModal(null)}
          onNavigateToProfile={(u) => { setListModal(null); /* re-trigger load */ }}
        />
      )}

      <button onClick={onBack}
        style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${t.border}`, background: t.bgCard, cursor: "pointer", fontSize: 13, color: t.text, marginBottom: 16 }}>
        ← {__('back')}
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
              <span onClick={() => setListModal("followers")} style={{ cursor: "pointer" }} onMouseEnter={(e) => e.target.style.color = t.accent} onMouseLeave={(e) => e.target.style.color = t.textMuted}>
                <strong style={{ color: t.text }}>{profile.followers_count}</strong> {__('followers')}
              </span>
              <span onClick={() => setListModal("following")} style={{ cursor: "pointer" }} onMouseEnter={(e) => e.target.style.color = t.accent} onMouseLeave={(e) => e.target.style.color = t.textMuted}>
                <strong style={{ color: t.text }}>{profile.following_count}</strong> {__('following')}
              </span>
              {profile.governorate && <span>📍 {tGovernorate(profile.governorate)}</span>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {isOwn ? (
              <button onClick={onEditProfile}
                style={{ padding: "8px 20px", borderRadius: 8, border: `1px solid ${t.border}`, background: t.bgCard, cursor: "pointer", fontSize: 13, color: t.text }}>
                ✏ {__('editProfile')}
              </button>
            ) : (
              <>
                {profile.is_following ? (
                  <button onClick={handleFollow} disabled={actionLoading}
                    style={{ padding: "8px 20px", borderRadius: 8, border: `1px solid ${t.border}`, background: t.bgCard, cursor: "pointer", fontSize: 13, color: t.text }}>
                    {__('followingBtn')}
                  </button>
                ) : (
                  <button onClick={handleFollow} disabled={actionLoading}
                    style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: t.accent, color: t.accentText, cursor: "pointer", fontSize: 13 }}>
                    {__('followBtn')}
                  </button>
                )}
                <button onClick={() => setShowConversation(true)}
                  style={{ padding: "8px 20px", borderRadius: 8, border: `1px solid ${t.border}`, background: t.bgCard, cursor: "pointer", fontSize: 13, color: t.text }}>
                  {__('message')}
                </button>
                <button onClick={handleBlock} disabled={actionLoading}
                  style={{ padding: "8px 20px", borderRadius: 8, border: `1px solid ${profile.is_blocked ? t.danger : t.border}`, background: t.bgCard, cursor: "pointer", fontSize: 13, color: t.text }}>
                  {profile.is_blocked ? __('unblock') : __('block')}
                </button>
                <button onClick={handleReport}
                  style={{ padding: "8px 20px", borderRadius: 8, border: `1px solid ${t.border}`, background: t.bgCard, cursor: "pointer", fontSize: 13, color: t.textMuted }}>
                  {__('report')}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Activity Feed */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <h3 style={{ color: t.text, fontSize: 16, margin: 0 }}>Activity</h3>
        <span style={{ fontSize: 12, color: t.textMuted }}>{activity.length} items</span>
      </div>

      {/* Filter Tabs */}
      <div style={{
        display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap",
        background: t.bgCard, padding: "8px 12px", borderRadius: 14, border: `1px solid ${t.border}`,
      }}>
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              style={{
                padding: "6px 14px", borderRadius: 10, border: active ? `1px solid ${t.accent}` : "none",
                background: active ? t.accentBg : "transparent", cursor: "pointer",
                fontSize: 12, fontWeight: active ? 600 : 400, color: active ? t.accent : t.textMuted,
                display: "flex", alignItems: "center", gap: 5, fontFamily: "inherit", transition: "all 0.15s",
              }}>
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {counts[tab.key] > 0 && (
                <span style={{
                  fontSize: 10, background: active ? t.accent : t.bgMuted,
                  color: active ? t.accentText : t.textMuted,
                  borderRadius: 8, padding: "1px 6px", marginLeft: 2,
                }}>{counts[tab.key]}</span>
              )}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: t.textMuted, background: t.bgCard, borderRadius: 12, border: `1px solid ${t.border}` }}>
          {activeTab === "all" ? __('noActivity') : `No ${__(activeTab)}`}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((item, i) => (
            <div key={`${item.type}-${item.post?.id || item.comment?.id || item.target_user?.id || i}`}
              style={{
                background: t.bgCard, border: `1px solid ${t.border}`,
                borderRadius: 12, padding: 16,
              }}>
              {/* Header line */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <span style={{ fontSize: 16 }}>{ACTIVITY_ICONS[item.type] || "•"}</span>
                <span style={{ fontSize: 12, color: t.textMuted }}>{ACTIVITY_LABELS[item.type] || item.type}</span>
                {item.post_title && (
                  <span style={{ fontSize: 12, fontWeight: 500, color: t.textSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 250 }}>
                    {item.post_title}
                  </span>
                )}
                <span style={{ fontSize: 11, color: t.textMuted, marginLeft: "auto" }}>
                  {new Date(item.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>

              {/* Content */}
              {item.type === "post" && item.post && (
                <div>
                  <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 6, color: t.text }}>{item.post.title}</div>
                  <div style={{ fontSize: 13, color: t.textSecondary, marginBottom: 6 }}>{item.post.body.substring(0, 200)}{item.post.body.length > 200 && "..."}</div>
                  <div style={{ display: "flex", gap: 16, fontSize: 12, color: t.textMuted }}>
                    <span>♥ {item.post.likes_count}</span>
                    <span>🗨 {item.post.comments_count}</span>
                    <span>↗ {item.post.shares_count}</span>
                  </div>
                </div>
              )}
              {item.type === "comment" && item.comment && (
                <div style={{ fontSize: 13, color: t.textSecondary }}>
                  {item.comment.body.substring(0, 300)}{item.comment.body.length > 300 && "..."}
                  <div style={{ fontSize: 12, color: t.textMuted, marginTop: 4 }}>♥ {item.comment.likes_count}</div>
                </div>
              )}
              {item.type === "like" && item.post && (
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: t.text, marginBottom: 4 }}>{item.post.title}</div>
                  <div style={{ fontSize: 12, color: t.textMuted }}>♥ {item.post.likes_count} likes</div>
                </div>
              )}
              {item.type === "share" && item.post && (
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: t.text, marginBottom: 4 }}>{item.post.title}</div>
                  <div style={{ fontSize: 12, color: t.textMuted }}>↗ {item.post.shares_count} shares</div>
                </div>
              )}
              {item.type === "follow" && item.target_user && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%",
                    background: t.accent, color: "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 600, flexShrink: 0,
                  }}>
                    {(item.target_user.display_name || item.target_user.username).charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontSize: 13, color: t.text }}>{item.target_user.display_name || item.target_user.username}</span>
                  <span style={{ fontSize: 12, color: t.textMuted }}>@{item.target_user.username}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
