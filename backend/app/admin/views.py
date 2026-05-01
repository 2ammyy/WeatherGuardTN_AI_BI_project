from sqladmin import ModelView

# Core models
from app.models.user import User

# Forum models
from app.forum.models import (
    ForumPost,
    ForumComment,
    NewsArticle,
    Notification,
    PostLike,
    PostShare,
    PostReport,
    CommentLike,
    UserFollow,
    UserBlock,
    UserReport,
    NewsReaction,
    NewsShare,
    NewsComment,
    NewsCommentLike,
)

# ── User Admin ─────────────────────────────────────
class UserAdmin(ModelView, model=User):
    column_list = ['id', 'email', 'name', 'is_admin', 'governorate', 'user_type', 'last_login']
    column_searchable_list = ['email', 'name']
    column_editable_list = ['is_admin', 'user_type', 'governorate']
    form_excluded_columns = ['password_hash']
    name = 'User'
    name_plural = 'Users'
    icon = 'fa-solid fa-users'

# ── Forum Content ──────────────────────────────────
class ForumPostAdmin(ModelView, model=ForumPost):
    column_list = ['id', 'title', 'user_id', 'category', 'risk_level', 'is_approved', 'created_at']
    column_searchable_list = ['title']
    column_editable_list = ['is_approved', 'risk_level']
    name = 'Forum Post'
    name_plural = 'Forum Posts'
    icon = 'fa-solid fa-newspaper'

class ForumCommentAdmin(ModelView, model=ForumComment):
    column_list = ['id', 'content', 'post_id', 'user_id', 'ai_approved', 'created_at']
    column_searchable_list = ['content']
    column_editable_list = ['ai_approved']
    name = 'Forum Comment'
    name_plural = 'Forum Comments'
    icon = 'fa-solid fa-comments'

# ── News ───────────────────────────────────────────
class NewsArticleAdmin(ModelView, model=NewsArticle):
    column_list = ['id', 'title', 'source_name', 'category', 'risk_level', 'scraped_at', 'published_at']
    column_searchable_list = ['title', 'source_name']
    column_editable_list = ['risk_level', 'category']
    name = 'News Article'
    name_plural = 'News Articles'
    icon = 'fa-solid fa-globe'

class NewsReactionAdmin(ModelView, model=NewsReaction):
    column_list = ['article_id', 'user_id', 'emoji', 'created_at']
    name = 'News Reaction'
    name_plural = 'News Reactions'
    icon = 'fa-solid fa-face-smile'

class NewsShareAdmin(ModelView, model=NewsShare):
    column_list = ['id', 'article_id', 'user_id', 'created_at']
    name = 'News Share'
    name_plural = 'News Shares'
    icon = 'fa-solid fa-share-nodes'

class NewsCommentAdmin(ModelView, model=NewsComment):
    column_list = ['id', 'article_id', 'author_id', 'parent_id', 'ai_approved', 'is_deleted', 'likes_count', 'created_at']
    column_searchable_list = ['body']
    column_editable_list = ['ai_approved', 'is_deleted']
    name = 'News Comment'
    name_plural = 'News Comments'
    icon = 'fa-solid fa-comment-dots'

class NewsCommentLikeAdmin(ModelView, model=NewsCommentLike):
    column_list = ['comment_id', 'user_id', 'created_at']
    name = 'News Comment Like'
    name_plural = 'News Comment Likes'
    icon = 'fa-solid fa-thumbs-up'

# ── Forum Interactions ─────────────────────────────
class PostLikeAdmin(ModelView, model=PostLike):
    column_list = ['id', 'user_id', 'post_id', 'created_at']
    name = 'Post Like'
    name_plural = 'Post Likes'
    icon = 'fa-solid fa-heart'

class PostShareAdmin(ModelView, model=PostShare):
    column_list = ['id', 'user_id', 'post_id', 'created_at']
    name = 'Post Share'
    name_plural = 'Post Shares'
    icon = 'fa-solid fa-share'

class PostReportAdmin(ModelView, model=PostReport):
    column_list = ['id', 'user_id', 'post_id', 'reason', 'created_at']
    column_searchable_list = ['reason']
    name = 'Post Report'
    name_plural = 'Post Reports'
    icon = 'fa-solid fa-flag'

class CommentLikeAdmin(ModelView, model=CommentLike):
    column_list = ['id', 'user_id', 'comment_id', 'created_at']
    name = 'Comment Like'
    name_plural = 'Comment Likes'
    icon = 'fa-regular fa-heart'

# ── Social ─────────────────────────────────────────
class UserFollowAdmin(ModelView, model=UserFollow):
    column_list = ['id', 'follower_id', 'followed_id', 'created_at']
    name = 'User Follow'
    name_plural = 'User Follows'
    icon = 'fa-solid fa-user-plus'

class UserBlockAdmin(ModelView, model=UserBlock):
    column_list = ['id', 'blocker_id', 'blocked_id', 'created_at']
    name = 'User Block'
    name_plural = 'User Blocks'
    icon = 'fa-solid fa-ban'

class UserReportAdmin(ModelView, model=UserReport):
    column_list = ['id', 'reporter_id', 'reported_id', 'reason', 'created_at']
    column_searchable_list = ['reason']
    name = 'User Report'
    name_plural = 'User Reports'
    icon = 'fa-solid fa-triangle-exclamation'

# ── Notifications ──────────────────────────────────
class NotificationAdmin(ModelView, model=Notification):
    column_list = ['id', 'user_id', 'type', 'message', 'is_read', 'created_at']
    column_searchable_list = ['message', 'type']
    column_editable_list = ['is_read']
    name = 'Notification'
    name_plural = 'Notifications'
    icon = 'fa-solid fa-bell'


def register_views(admin):
    # Core
    admin.add_view(UserAdmin)
    # Forum
    admin.add_view(ForumPostAdmin)
    admin.add_view(ForumCommentAdmin)
    admin.add_view(PostLikeAdmin)
    admin.add_view(PostShareAdmin)
    admin.add_view(PostReportAdmin)
    admin.add_view(CommentLikeAdmin)
    # News
    admin.add_view(NewsArticleAdmin)
    admin.add_view(NewsReactionAdmin)
    admin.add_view(NewsShareAdmin)
    admin.add_view(NewsCommentAdmin)
    admin.add_view(NewsCommentLikeAdmin)
    # Social
    admin.add_view(UserFollowAdmin)
    admin.add_view(UserBlockAdmin)
    admin.add_view(UserReportAdmin)
    # Notifications
    admin.add_view(NotificationAdmin)

    print('✅ All 16 admin views registered')
