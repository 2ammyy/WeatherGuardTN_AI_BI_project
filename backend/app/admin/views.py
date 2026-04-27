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
    UserReport
)

# ── User Admin ─────────────────────────────────────
class UserAdmin(ModelView, model=User):
    column_list = ['id', 'email', 'full_name', 'is_admin']
    column_searchable_list = ['email', 'full_name']
    column_editable_list = ['is_admin']
    form_excluded_columns = ['hashed_password']
    name = 'User'
    name_plural = 'Users'
    icon = 'fa-solid fa-users'

# ── Forum Content ──────────────────────────────────
class ForumPostAdmin(ModelView, model=ForumPost):
    column_list = ['id', 'title', 'user_id', 'created_at', 'is_approved']
    column_searchable_list = ['title']
    column_editable_list = ['is_approved']
    name = 'Forum Post'
    name_plural = 'Forum Posts'
    icon = 'fa-solid fa-newspaper'

class ForumCommentAdmin(ModelView, model=ForumComment):
    column_list = ['id', 'content', 'post_id', 'user_id', 'created_at']
    column_searchable_list = ['content']
    name = 'Forum Comment'
    name_plural = 'Forum Comments'

# ── News ───────────────────────────────────────────
class NewsArticleAdmin(ModelView, model=NewsArticle):
    column_list = ['id', 'title', 'source', 'published_at']
    column_searchable_list = ['title']
    name = 'News Article'
    name_plural = 'News Articles'
    icon = 'fa-solid fa-globe'

# ── Interactions ───────────────────────────────────
class PostLikeAdmin(ModelView, model=PostLike):
    column_list = ['id', 'user_id', 'post_id', 'created_at']
    name = 'Post Like'
    name_plural = 'Post Likes'

class UserFollowAdmin(ModelView, model=UserFollow):
    column_list = ['id', 'follower_id', 'followed_id', 'created_at']
    name = 'User Follow'
    name_plural = 'User Follows'

class UserBlockAdmin(ModelView, model=UserBlock):
    column_list = ['id', 'blocker_id', 'blocked_id', 'created_at']
    name = 'User Block'
    name_plural = 'User Blocks'

# ── Notification ───────────────────────────────────
class NotificationAdmin(ModelView, model=Notification):
    column_list = ['id', 'user_id', 'title', 'read', 'created_at']
    column_searchable_list = ['title']
    column_editable_list = ['read']
    name = 'Notification'
    name_plural = 'Notifications'

def register_views(admin):
    admin.add_view(UserAdmin)
    admin.add_view(ForumPostAdmin)
    admin.add_view(ForumCommentAdmin)
    admin.add_view(NewsArticleAdmin)
    admin.add_view(NotificationAdmin)
    admin.add_view(PostLikeAdmin)
    admin.add_view(UserFollowAdmin)
    admin.add_view(UserBlockAdmin)
    
    print('✅ Extended admin views registered (added likes, follows, blocks)')
