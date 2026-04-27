from sqladmin import ModelView

# Core models
from app.models.user import User

# Forum models (they are all in one file)
from app.forum.models import (
    ForumPost, 
    ForumComment, 
    NewsArticle, 
    Notification
)

# ── User Admin ─────────────────────────────────────
class UserAdmin(ModelView, model=User):
    column_list = ['id', 'email', 'full_name', 'is_admin', 'created_at']
    column_searchable_list = ['email', 'full_name']
    column_editable_list = ['is_admin']
    form_excluded_columns = ['hashed_password']
    name = 'User'
    name_plural = 'Users'
    icon = 'fa-solid fa-users'

# ── Forum Post Admin ───────────────────────────────
class ForumPostAdmin(ModelView, model=ForumPost):
    column_list = ['id', 'title', 'user_id', 'created_at', 'is_approved', 'is_deleted']
    column_searchable_list = ['title', 'content']
    column_editable_list = ['is_approved']
    name = 'Forum Post'
    name_plural = 'Forum Posts'
    icon = 'fa-solid fa-newspaper'

# ── Forum Comment Admin ────────────────────────────
class ForumCommentAdmin(ModelView, model=ForumComment):
    column_list = ['id', 'content', 'post_id', 'user_id', 'created_at']
    column_searchable_list = ['content']
    name = 'Forum Comment'
    name_plural = 'Forum Comments'

# ── News Article Admin ─────────────────────────────
class NewsArticleAdmin(ModelView, model=NewsArticle):
    column_list = ['id', 'title', 'source', 'published_at', 'created_at']
    column_searchable_list = ['title']
    name = 'News Article'
    name_plural = 'News Articles'
    icon = 'fa-solid fa-globe'

# ── Notification Admin ─────────────────────────────
class NotificationAdmin(ModelView, model=Notification):
    column_list = ['id', 'user_id', 'title', 'read', 'created_at']
    column_searchable_list = ['title']
    column_editable_list = ['read']
    name = 'Notification'
    name_plural = 'Notifications'

def register_views(admin):
    '''Register all important views'''
    admin.add_view(UserAdmin)
    admin.add_view(ForumPostAdmin)
    admin.add_view(ForumCommentAdmin)
    admin.add_view(NewsArticleAdmin)
    admin.add_view(NotificationAdmin)
    
    print('✅ Admin views registered: Users + Forum Posts + Comments + News + Notifications')
