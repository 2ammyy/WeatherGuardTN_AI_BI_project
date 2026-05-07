from sqladmin import ModelView
from markupsafe import Markup

from app.models.user import User

from app.forum.models import (
    ForumUser, ForumPost, ForumComment, NewsArticle, Notification,
    PostLike, PostShare, PostReport, CommentLike,
    UserFollow, UserBlock, UserReport,
    NewsReaction, NewsShare, NewsComment, NewsCommentLike,
    PostMedia, CommentReport, Message,
)
from app.models.ml_model import MLModel


def badge(text, color="#64748b"):
    return Markup(f'<span style="background:{color}18;color:{color};padding:2px 8px;border-radius:6px;font-size:11px;font-weight:600">{text}</span>')

def status_badge(value, yes="Yes", no="No", yes_color="#10b981", no_color="#64748b"):
    if value:
        return Markup(f'<span style="background:{yes_color}22;color:{yes_color};padding:2px 8px;border-radius:6px;font-size:11px;font-weight:600">{yes}</span>')
    return Markup(f'<span style="background:{no_color}22;color:{no_color};padding:2px 8px;border-radius:6px;font-size:11px;font-weight:600">{no}</span>')

def risk_badge(level):
    colors = {"green": "#22c55e", "yellow": "#eab308", "orange": "#f97316", "red": "#ef4444", "purple": "#a855f7"}
    c = colors.get(level, "#64748b")
    return Markup(f'<span style="background:{c}22;color:{c};padding:2px 8px;border-radius:6px;font-size:11px;font-weight:600">{level.upper()}</span>')

def priority_badge(priority, score=None):
    colors = {"high": "#ef4444", "medium": "#f59e0b", "low": "#6b7280"}
    icons = {"high": "fa-solid fa-circle-exclamation", "medium": "fa-solid fa-circle", "low": "fa-solid fa-circle-down"}
    c = colors.get(priority, "#6b7280")
    icon = icons.get(priority, "fa-solid fa-circle")
    score_html = f' <span style="font-size:10px;opacity:0.7">({score}%)</span>' if score is not None else ""
    return Markup(f'<span style="display:inline-flex;align-items:center;gap:4px;background:{c}18;color:{c};padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600"><i class="{icon}" style="font-size:10px"></i>{priority.upper()}{score_html}</span>')

def user_link(uid, username=None):
    if not uid:
        return Markup('<span style="color:#9ca3af">—</span>')
    name = username or str(uid)[:8]
    return Markup(f'<a href="/admin/forum-user/details/{uid}" style="color:#059669;text-decoration:none;font-weight:500" title="{uid}"><i class="fa-solid fa-user me-1" style="font-size:10px"></i>{name}</a>')
    colors = {"green": "#22c55e", "yellow": "#eab308", "orange": "#f97316", "red": "#ef4444", "purple": "#a855f7"}
    c = colors.get(level, "#64748b")
    return Markup(f'<span style="background:{c}22;color:{c};padding:2px 8px;border-radius:6px;font-size:11px;font-weight:600">{level.upper()}</span>')

def truncate(val, max=60):
    if not val:
        return "—"
    val = str(val)
    return val[:max] + "..." if len(val) > max else val

def fmt_dt(obj, prop):
    v = getattr(obj, prop, None)
    return v.strftime("%Y-%m-%d %H:%M") if v else "—"

def fmt_truncate(max=60):
    return lambda obj, prop: truncate(getattr(obj, prop, None), max)


class UserAdmin(ModelView, model=User):
    column_list = ['id', 'email', 'name', 'is_admin', 'governorate', 'user_type', 'last_login', 'created_at']
    column_searchable_list = ['email', 'name']
    column_editable_list = ['is_admin', 'user_type', 'governorate']
    column_sortable_list = ['email', 'name', 'last_login', 'created_at']
    form_excluded_columns = ['password_hash']
    column_details_exclude_list = ['password_hash']
    can_delete = True
    can_create = True
    can_edit = True
    name = 'User'
    name_plural = 'Users'
    icon = 'fa-solid fa-users'
    page_size = 25
    column_labels = {'is_admin': 'Role', 'user_type': 'Type', 'last_login': 'Last Login'}
    column_formatters = {
        'is_admin': lambda o, p: status_badge(o.is_admin, "Admin", "User", yes_color="#a855f7", no_color="#64748b"),
        'last_login': fmt_dt,
        'created_at': fmt_dt,
    }


class ForumUserAdmin(ModelView, model=ForumUser):
    column_list = ['id', 'username', 'email', 'display_name', 'role', 'is_active', 'is_banned', 'governorate', 'posts_count', 'created_at']
    column_searchable_list = ['username', 'email', 'display_name']
    column_editable_list = ['role', 'is_active', 'is_banned']
    column_sortable_list = ['created_at', 'username', 'posts_count']
    can_delete = True
    name = 'Forum User'
    name_plural = 'Forum Users'
    icon = 'fa-solid fa-user'
    page_size = 25
    column_formatters = {
        'is_active': lambda o, p: status_badge(o.is_active, "Active", "Inactive"),
        'is_banned': lambda o, p: status_badge(o.is_banned, "Banned", "OK", yes_color="#ef4444", no_color="#10b981"),
        'role': lambda o, p: {
            "admin": badge("Admin", "#a855f7"),
            "moderator": badge("Mod", "#f97316"),
            "user": badge("User", "#64748b"),
        }.get(o.role, badge(str(o.role or "User"), "#64748b")),
        'created_at': fmt_dt,
    }


class ForumPostAdmin(ModelView, model=ForumPost):
    column_list = ['id', 'title', 'author_id', 'category', 'risk_level', 'ai_approved', 'is_published', 'is_deleted', 'likes_count', 'comments_count', 'created_at']
    column_searchable_list = ['title', 'body']
    column_editable_list = ['is_published', 'risk_level', 'category', 'ai_approved']
    column_sortable_list = ['created_at', 'likes_count', 'comments_count']
    can_delete = True
    can_create = False
    name = 'Forum Post'
    name_plural = 'Forum Posts'
    icon = 'fa-solid fa-newspaper'
    page_size = 25
    column_formatters = {
        'title': fmt_truncate(70),
        'body': fmt_truncate(100),
        'ai_approved': lambda o, p: status_badge(o.ai_approved, "Approved", "Rejected"),
        'is_published': lambda o, p: status_badge(o.is_published, "Published", "Draft"),
        'is_deleted': lambda o, p: status_badge(o.is_deleted, "Deleted", "Active", yes_color="#ef4444"),
        'risk_level': lambda o, p: risk_badge(o.risk_level) if o.risk_level else badge("N/A", "#64748b"),
        'created_at': fmt_dt,
    }


class ForumCommentAdmin(ModelView, model=ForumComment):
    column_list = ['id', 'body', 'post_id', 'author_id', 'ai_approved', 'is_deleted', 'likes_count', 'created_at']
    column_searchable_list = ['body']
    column_editable_list = ['ai_approved', 'is_deleted']
    column_sortable_list = ['created_at', 'likes_count']
    name = 'Forum Comment'
    name_plural = 'Forum Comments'
    icon = 'fa-solid fa-comments'
    page_size = 25
    column_formatters = {
        'body': fmt_truncate(80),
        'ai_approved': lambda o, p: status_badge(o.ai_approved, "Approved", "Rejected"),
        'is_deleted': lambda o, p: status_badge(o.is_deleted, "Deleted", "Active", yes_color="#ef4444"),
        'created_at': fmt_dt,
    }


class PostLikeAdmin(ModelView, model=PostLike):
    column_list = ['post_id', 'user_id', 'created_at']
    column_sortable_list = ['created_at']
    can_delete = False
    can_create = False
    can_edit = False
    name = 'Post Like'
    name_plural = 'Post Likes'
    icon = 'fa-solid fa-heart'
    page_size = 50
    column_formatters = {'created_at': fmt_dt}


class PostShareAdmin(ModelView, model=PostShare):
    column_list = ['id', 'post_id', 'user_id', 'created_at']
    column_sortable_list = ['created_at']
    can_delete = False
    can_create = False
    can_edit = False
    name = 'Post Share'
    name_plural = 'Post Shares'
    icon = 'fa-solid fa-share'
    page_size = 50
    column_formatters = {'created_at': fmt_dt}


class PostReportAdmin(ModelView, model=PostReport):
    column_list = ['id', 'post_id', 'reporter_id', 'reason', 'priority', 'status', 'created_at']
    column_searchable_list = ['reason']
    column_editable_list = ['status', 'priority']
    column_sortable_list = ['created_at', 'status', 'priority', 'priority_score']
    name = 'Post Report'
    name_plural = 'Post Reports'
    icon = 'fa-solid fa-flag'
    page_size = 25
    column_labels = {
        'post_id': 'Post',
        'reporter_id': 'Reporter',
        'priority': 'Prio',
    }
    column_formatters = {
        'post_id': lambda o, p: Markup(
            f'<a href="/admin/forum-post/details/{o.post_id}" style="color:#059669;text-decoration:none;font-weight:500">'
            f'<i class="fa-solid fa-newspaper me-1" style="font-size:10px"></i>{truncate(o.post.title, 50) if o.post and o.post.title else "Deleted post"}</a>'
        ) if o.post_id else Markup('<span style="color:#9ca3af">—</span>'),
        'reporter_id': lambda o, p: (
            user_link(o.reporter_id, o.reporter.username if o.reporter else None)
        ) if o.reporter_id else Markup('<span style="color:#9ca3af">—</span>'),
        'reason': fmt_truncate(80),
        'priority': lambda o, p: priority_badge(o.priority, o.priority_score),
        'status': lambda o, p: {
            "pending": badge("Pending", "#eab308"),
            "reviewed": badge("Reviewed", "#10b981"),
            "dismissed": badge("Dismissed", "#64748b"),
        }.get(o.status, badge(str(o.status or "Pending"), "#eab308")),
        'created_at': fmt_dt,
    }


class CommentLikeAdmin(ModelView, model=CommentLike):
    column_list = ['comment_id', 'user_id', 'created_at']
    column_sortable_list = ['created_at']
    can_delete = False
    can_create = False
    can_edit = False
    name = 'Comment Like'
    name_plural = 'Comment Likes'
    icon = 'fa-regular fa-heart'
    page_size = 50
    column_formatters = {'created_at': fmt_dt}


class CommentReportAdmin(ModelView, model=CommentReport):
    column_list = ['id', 'comment_id', 'reporter_id', 'reason', 'priority', 'status', 'created_at']
    column_sortable_list = ['created_at', 'status', 'priority', 'priority_score']
    column_searchable_list = ['reason']
    column_editable_list = ['status', 'priority']
    name = 'Comment Report'
    name_plural = 'Comment Reports'
    icon = 'fa-solid fa-flag'
    page_size = 25
    column_labels = {
        'comment_id': 'Comment',
        'reporter_id': 'Reporter',
        'priority': 'Prio',
    }
    column_formatters = {
        'comment_id': lambda o, p: Markup(
            f'<span style="color:#374151;font-size:11px"><i class="fa-solid fa-comment me-1" style="font-size:10px;color:#9ca3af"></i>'
            f'{truncate(o.comment.body if o.comment else "Deleted comment", 60)}</span>'
        ) if o.comment_id else Markup('<span style="color:#9ca3af">—</span>'),
        'reporter_id': lambda o, p: (
            user_link(o.reporter_id, o.reporter.username if o.reporter else None)
        ) if o.reporter_id else Markup('<span style="color:#9ca3af">—</span>'),
        'reason': fmt_truncate(80),
        'priority': lambda o, p: priority_badge(o.priority, o.priority_score),
        'status': lambda o, p: {
            "pending": badge("Pending", "#eab308"),
            "reviewed": badge("Reviewed", "#10b981"),
            "dismissed": badge("Dismissed", "#64748b"),
        }.get(o.status, badge(str(o.status or "Pending"), "#eab308")),
        'created_at': fmt_dt,
    }


class PostMediaAdmin(ModelView, model=PostMedia):
    column_list = ['id', 'post_id', 'file_type', 'file_name', 'mime_type', 'created_at']
    column_searchable_list = ['file_name']
    column_sortable_list = ['created_at']
    name = 'Post Media'
    name_plural = 'Post Media'
    icon = 'fa-solid fa-image'
    page_size = 25
    column_formatters = {
        'file_type': lambda o, p: badge({"image": "🖼 Image", "video": "🎬 Video"}.get(o.file_type, o.file_type or "—"), "#06b6d4"),
        'file_name': fmt_truncate(40),
        'created_at': fmt_dt,
    }


class MessageAdmin(ModelView, model=Message):
    column_list = ['id', 'sender_id', 'receiver_id', 'body', 'is_read', 'created_at']
    column_sortable_list = ['created_at', 'is_read']
    column_searchable_list = ['body']
    name = 'Message'
    name_plural = 'Messages'
    icon = 'fa-solid fa-envelope'
    page_size = 25
    column_formatters = {
        'body': fmt_truncate(80),
        'is_read': lambda o, p: status_badge(o.is_read, "Read", "Unread", yes_color="#64748b", no_color="#eab308"),
        'created_at': fmt_dt,
    }


class NewsArticleAdmin(ModelView, model=NewsArticle):
    column_list = ['id', 'title', 'source_name', 'category', 'risk_level', 'governorates', 'scraped_at', 'published_at']
    column_searchable_list = ['title', 'source_name', 'body']
    column_editable_list = ['risk_level', 'category']
    column_sortable_list = ['scraped_at', 'published_at']
    name = 'News Article'
    name_plural = 'News Articles'
    icon = 'fa-solid fa-globe'
    page_size = 25
    column_formatters = {
        'title': fmt_truncate(70),
        'body': fmt_truncate(100),
        'risk_level': lambda o, p: risk_badge(o.risk_level) if o.risk_level else badge("N/A", "#64748b"),
        'governorates': lambda o, p: ", ".join(o.governorates) if o.governorates else "—",
        'scraped_at': fmt_dt,
        'published_at': fmt_dt,
    }


class NewsReactionAdmin(ModelView, model=NewsReaction):
    column_list = ['article_id', 'user_id', 'emoji', 'created_at']
    can_delete = False
    can_create = False
    can_edit = False
    name = 'News Reaction'
    name_plural = 'News Reactions'
    icon = 'fa-solid fa-face-smile'
    page_size = 50
    column_formatters = {
        'emoji': lambda o, p: Markup(f'<span style="font-size:18px">{o.emoji}</span>') if o.emoji else "—",
        'created_at': fmt_dt,
    }


class NewsShareAdmin(ModelView, model=NewsShare):
    column_list = ['id', 'article_id', 'user_id', 'created_at']
    can_delete = False
    can_create = False
    can_edit = False
    name = 'News Share'
    name_plural = 'News Shares'
    icon = 'fa-solid fa-share-nodes'
    page_size = 50
    column_formatters = {'created_at': fmt_dt}


class NewsCommentAdmin(ModelView, model=NewsComment):
    column_list = ['id', 'article_id', 'author_id', 'parent_id', 'ai_approved', 'is_deleted', 'likes_count', 'created_at']
    column_searchable_list = ['body']
    column_editable_list = ['ai_approved', 'is_deleted']
    column_sortable_list = ['created_at', 'likes_count']
    name = 'News Comment'
    name_plural = 'News Comments'
    icon = 'fa-solid fa-comment-dots'
    page_size = 25
    column_formatters = {
        'ai_approved': lambda o, p: status_badge(o.ai_approved, "Approved", "Rejected"),
        'is_deleted': lambda o, p: status_badge(o.is_deleted, "Deleted", "Active", yes_color="#ef4444"),
        'created_at': fmt_dt,
    }


class NewsCommentLikeAdmin(ModelView, model=NewsCommentLike):
    column_list = ['comment_id', 'user_id', 'created_at']
    can_delete = False
    can_create = False
    can_edit = False
    name = 'News Comment Like'
    name_plural = 'News Comment Likes'
    icon = 'fa-solid fa-thumbs-up'
    page_size = 50
    column_formatters = {'created_at': fmt_dt}


class UserFollowAdmin(ModelView, model=UserFollow):
    column_list = ['follower_id', 'following_id', 'created_at']
    can_delete = False
    can_create = False
    can_edit = False
    name = 'User Follow'
    name_plural = 'User Follows'
    icon = 'fa-solid fa-user-plus'
    page_size = 50
    column_formatters = {'created_at': fmt_dt}


class UserBlockAdmin(ModelView, model=UserBlock):
    column_list = ['blocker_id', 'blocked_id', 'created_at']
    can_delete = False
    can_create = False
    can_edit = False
    name = 'User Block'
    name_plural = 'User Blocks'
    icon = 'fa-solid fa-ban'
    page_size = 50
    column_formatters = {'created_at': fmt_dt}


class UserReportAdmin(ModelView, model=UserReport):
    column_list = ['id', 'reporter_id', 'reported_id', 'reason', 'priority', 'status', 'created_at']
    column_searchable_list = ['reason']
    column_editable_list = ['status', 'priority']
    column_sortable_list = ['created_at', 'status', 'priority', 'priority_score']
    name = 'User Report'
    name_plural = 'User Reports'
    icon = 'fa-solid fa-triangle-exclamation'
    page_size = 25
    column_labels = {
        'reporter_id': 'Reporter',
        'reported_id': 'Reported User',
        'priority': 'Prio',
    }
    column_formatters = {
        'reporter_id': lambda o, p: (
            user_link(o.reporter_id, o.reporter.username if o.reporter else None)
        ) if o.reporter_id else Markup('<span style="color:#9ca3af">—</span>'),
        'reported_id': lambda o, p: (
            user_link(o.reported_id, o.reported.username if o.reported else None)
        ) if o.reported_id else Markup('<span style="color:#9ca3af">—</span>'),
        'reason': fmt_truncate(80),
        'priority': lambda o, p: priority_badge(o.priority, o.priority_score),
        'status': lambda o, p: {
            "pending": badge("Pending", "#eab308"),
            "reviewed": badge("Reviewed", "#10b981"),
            "dismissed": badge("Dismissed", "#64748b"),
        }.get(o.status, badge(str(o.status or "Pending"), "#eab308")),
        'created_at': fmt_dt,
    }


class NotificationAdmin(ModelView, model=Notification):
    column_list = ['id', 'user_id', 'type', 'message', 'is_read', 'created_at']
    column_searchable_list = ['message', 'type']
    column_editable_list = ['is_read']
    column_sortable_list = ['created_at']
    name = 'Notification'
    name_plural = 'Notifications'
    icon = 'fa-solid fa-bell'
    page_size = 25
    column_formatters = {
        'message': fmt_truncate(60),
        'is_read': lambda o, p: status_badge(o.is_read, "Read", "Unread", yes_color="#64748b", no_color="#eab308"),
        'created_at': fmt_dt,
    }


class MLModelAdmin(ModelView, model=MLModel):
    column_list = ['id', 'name', 'algorithm', 'version', 'status', 'score', 'mlflow_run_id', 'is_active', 'created_at']
    column_searchable_list = ['name', 'algorithm', 'description']
    column_sortable_list = ['name', 'version', 'score', 'created_at', 'status']
    column_editable_list = ['status', 'description', 'is_active']
    can_create = True
    can_edit = True
    can_delete = True
    name = 'ML Model'
    name_plural = 'ML Models'
    icon = 'fa-solid fa-brain'
    page_size = 25
    column_labels = {
        'mlflow_run_id': 'MLflow Run',
        'is_active': 'Active',
        'mlflow_model_uri': 'MLflow URI',
    }
    column_formatters = {
        'status': lambda o, p: {
            "production": badge("Production", "#10b981"),
            "staging": badge("Staging", "#06b6d4"),
            "active": badge("Active", "#22c55e"),
            "archived": badge("Archived", "#64748b"),
            "failed": badge("Failed", "#ef4444"),
        }.get(o.status, badge(str(o.status or "Draft").capitalize(), "#eab308")),
        'score': lambda o, p: Markup(f'<span style="font-weight:700;color:{"#10b981" if o.score and o.score > 0.8 else "#eab308" if o.score and o.score > 0.6 else "#ef4444"}">{o.score:.4f}</span>') if o.score is not None else "—",
        'is_active': lambda o, p: status_badge(o.is_active, "Active", "Inactive", yes_color="#10b981", no_color="#64748b"),
        'mlflow_run_id': lambda o, p: truncate(o.mlflow_run_id, 20) if o.mlflow_run_id else "—",
        'created_at': fmt_dt,
    }
    form_widget_args = {
        'description': {'rows': 4},
        'metrics': {'rows': 4},
        'hyperparams': {'rows': 4},
    }


def register_views(admin):
    admin.add_view(UserAdmin)
    admin.add_view(ForumUserAdmin)
    admin.add_view(ForumPostAdmin)
    admin.add_view(ForumCommentAdmin)
    admin.add_view(PostLikeAdmin)
    admin.add_view(PostShareAdmin)
    admin.add_view(PostReportAdmin)
    admin.add_view(CommentLikeAdmin)
    admin.add_view(CommentReportAdmin)
    admin.add_view(PostMediaAdmin)
    admin.add_view(MessageAdmin)
    admin.add_view(NewsArticleAdmin)
    admin.add_view(NewsReactionAdmin)
    admin.add_view(NewsShareAdmin)
    admin.add_view(NewsCommentAdmin)
    admin.add_view(NewsCommentLikeAdmin)
    admin.add_view(UserFollowAdmin)
    admin.add_view(UserBlockAdmin)
    admin.add_view(UserReportAdmin)
    admin.add_view(NotificationAdmin)
    admin.add_view(MLModelAdmin)

    print('✅ All 21 admin views registered (enhanced)')
