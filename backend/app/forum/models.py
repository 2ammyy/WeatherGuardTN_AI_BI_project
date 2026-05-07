"""
backend/forum/models.py
SQLAlchemy ORM models for the WeatherGuardTN forum feature.
Add this file at: backend/forum/models.py
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Text, Boolean, Integer, DateTime,
    ForeignKey, CheckConstraint, UniqueConstraint, Enum as SAEnum
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy import Index
from sqlalchemy.orm import relationship, backref
from app.database import Base   # reuse your existing Base/engine


def utcnow():
    return datetime.now(timezone.utc)


# ─────────────────────────────────────────────
# Users
# ─────────────────────────────────────────────
class ForumUser(Base):
    __tablename__ = "forum_users"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username        = Column(String(50),  unique=True, nullable=False, index=True)
    email           = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(Text, nullable=False)
    display_name    = Column(String(100))
    avatar_url      = Column(Text)
    bio             = Column(Text)
    governorate     = Column(String(100))
    role            = Column(String(20), default="user")
    is_active       = Column(Boolean, default=True)
    is_banned       = Column(Boolean, default=False)
    created_at      = Column(DateTime(timezone=True), default=utcnow)
    updated_at      = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    posts     = relationship("ForumPost",    back_populates="author", lazy="dynamic")
    comments  = relationship("ForumComment", back_populates="author", lazy="dynamic")
    notifications = relationship("Notification", foreign_keys="Notification.user_id",
                                 back_populates="recipient", lazy="dynamic")


class UserFollow(Base):
    __tablename__ = "user_follows"
    follower_id  = Column(UUID(as_uuid=True), ForeignKey("forum_users.id", ondelete="CASCADE"), primary_key=True)
    following_id = Column(UUID(as_uuid=True), ForeignKey("forum_users.id", ondelete="CASCADE"), primary_key=True)
    created_at   = Column(DateTime(timezone=True), default=utcnow)


class UserBlock(Base):
    __tablename__ = "user_blocks"
    blocker_id = Column(UUID(as_uuid=True), ForeignKey("forum_users.id", ondelete="CASCADE"), primary_key=True)
    blocked_id = Column(UUID(as_uuid=True), ForeignKey("forum_users.id", ondelete="CASCADE"), primary_key=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)


class UserReport(Base):
    __tablename__ = "user_reports"
    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    reporter_id = Column(UUID(as_uuid=True), ForeignKey("forum_users.id", ondelete="CASCADE"))
    reported_id = Column(UUID(as_uuid=True), ForeignKey("forum_users.id", ondelete="CASCADE"))
    reason      = Column(Text)
    status      = Column(String(20), default="pending")
    created_at  = Column(DateTime(timezone=True), default=utcnow)


# ─────────────────────────────────────────────
# Posts
# ─────────────────────────────────────────────
class ForumPost(Base):
    __tablename__ = "forum_posts"

    id             = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    author_id      = Column(UUID(as_uuid=True), ForeignKey("forum_users.id", ondelete="CASCADE"), nullable=False)
    title          = Column(String(300), nullable=False)
    body           = Column(Text, nullable=False)
    category       = Column(String(50), nullable=False)
    governorate    = Column(String(100))
    risk_level     = Column(String(20), default="green")
    image_url      = Column(Text)
    ai_approved    = Column(Boolean, default=False)
    ai_reason      = Column(Text)
    ai_checked_at  = Column(DateTime(timezone=True))
    likes_count    = Column(Integer, default=0)
    comments_count = Column(Integer, default=0)
    shares_count   = Column(Integer, default=0)
    is_published   = Column(Boolean, default=False)
    is_deleted     = Column(Boolean, default=False)
    created_at     = Column(DateTime(timezone=True), default=utcnow)
    updated_at     = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    author   = relationship("ForumUser", back_populates="posts")
    comments = relationship("ForumComment", back_populates="post", lazy="dynamic",
                            primaryjoin="and_(ForumComment.post_id==ForumPost.id, ForumComment.is_deleted==False)")
    likes    = relationship("PostLike", back_populates="post", lazy="dynamic")
    reports  = relationship("PostReport", back_populates="post", lazy="dynamic")


class PostMedia(Base):
    __tablename__ = "post_media"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    post_id     = Column(UUID(as_uuid=True), ForeignKey("forum_posts.id", ondelete="CASCADE"), nullable=False)
    file_url    = Column(Text, nullable=False)
    file_type   = Column(String(20), nullable=False)  # "image" or "video"
    mime_type   = Column(String(100))
    file_name   = Column(String(300))
    created_at  = Column(DateTime(timezone=True), default=utcnow)

    post = relationship("ForumPost", backref="media_items", lazy="select")


class PostLike(Base):
    __tablename__ = "post_likes"
    post_id    = Column(UUID(as_uuid=True), ForeignKey("forum_posts.id", ondelete="CASCADE"), primary_key=True)
    user_id    = Column(UUID(as_uuid=True), ForeignKey("forum_users.id", ondelete="CASCADE"), primary_key=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    post = relationship("ForumPost", back_populates="likes")


class PostShare(Base):
    __tablename__ = "post_shares"
    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    post_id    = Column(UUID(as_uuid=True), ForeignKey("forum_posts.id", ondelete="CASCADE"))
    user_id    = Column(UUID(as_uuid=True), ForeignKey("forum_users.id", ondelete="CASCADE"))
    created_at = Column(DateTime(timezone=True), default=utcnow)


class PostReport(Base):
    __tablename__ = "post_reports"
    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    post_id     = Column(UUID(as_uuid=True), ForeignKey("forum_posts.id", ondelete="CASCADE"))
    reporter_id = Column(UUID(as_uuid=True), ForeignKey("forum_users.id", ondelete="CASCADE"))
    reason      = Column(Text)
    status      = Column(String(20), default="pending")
    created_at  = Column(DateTime(timezone=True), default=utcnow)
    post = relationship("ForumPost", back_populates="reports")


# ─────────────────────────────────────────────
# Comments
# ─────────────────────────────────────────────
class ForumComment(Base):
    __tablename__ = "forum_comments"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    post_id     = Column(UUID(as_uuid=True), ForeignKey("forum_posts.id", ondelete="CASCADE"), nullable=False)
    author_id   = Column(UUID(as_uuid=True), ForeignKey("forum_users.id", ondelete="CASCADE"), nullable=False)
    parent_id   = Column(UUID(as_uuid=True), ForeignKey("forum_comments.id", ondelete="CASCADE"), nullable=True)
    body        = Column(Text, nullable=False)
    ai_approved = Column(Boolean, default=False)
    ai_reason   = Column(Text)
    is_deleted  = Column(Boolean, default=False)
    likes_count = Column(Integer, default=0)
    created_at  = Column(DateTime(timezone=True), default=utcnow)
    updated_at  = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    author  = relationship("ForumUser", back_populates="comments")
    post    = relationship("ForumPost", back_populates="comments")
    replies = relationship("ForumComment", backref=backref("parent", remote_side="ForumComment.id"))
    likes   = relationship("CommentLike", lazy="dynamic")
    reports = relationship("CommentReport", lazy="dynamic")


class CommentLike(Base):
    __tablename__ = "comment_likes"
    comment_id = Column(UUID(as_uuid=True), ForeignKey("forum_comments.id", ondelete="CASCADE"), primary_key=True)
    user_id    = Column(UUID(as_uuid=True), ForeignKey("forum_users.id", ondelete="CASCADE"), primary_key=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)


class CommentReport(Base):
    __tablename__ = "comment_reports"
    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    comment_id  = Column(UUID(as_uuid=True), ForeignKey("forum_comments.id", ondelete="CASCADE"))
    reporter_id = Column(UUID(as_uuid=True), ForeignKey("forum_users.id", ondelete="CASCADE"))
    reason      = Column(Text)
    status      = Column(String(20), default="pending")
    created_at  = Column(DateTime(timezone=True), default=utcnow)


# ─────────────────────────────────────────────
# Messages (private user-to-user)
# ─────────────────────────────────────────────
class Message(Base):
    __tablename__ = "messages"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sender_id   = Column(UUID(as_uuid=True), ForeignKey("forum_users.id", ondelete="CASCADE"), nullable=False)
    receiver_id = Column(UUID(as_uuid=True), ForeignKey("forum_users.id", ondelete="CASCADE"), nullable=False)
    body        = Column(Text, nullable=False)
    is_read     = Column(Boolean, default=False)
    created_at  = Column(DateTime(timezone=True), default=utcnow)

    sender   = relationship("ForumUser", foreign_keys=[sender_id])
    receiver = relationship("ForumUser", foreign_keys=[receiver_id])


# ─────────────────────────────────────────────
# Notifications
# ─────────────────────────────────────────────
class Notification(Base):
    __tablename__ = "notifications"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id    = Column(UUID(as_uuid=True), ForeignKey("forum_users.id", ondelete="CASCADE"), nullable=False)
    actor_id   = Column(UUID(as_uuid=True), ForeignKey("forum_users.id", ondelete="SET NULL"), nullable=True)
    type       = Column(String(50), nullable=False)
    post_id    = Column(UUID(as_uuid=True), ForeignKey("forum_posts.id", ondelete="CASCADE"), nullable=True)
    comment_id = Column(UUID(as_uuid=True), ForeignKey("forum_comments.id", ondelete="CASCADE"), nullable=True)
    news_article_id = Column(UUID(as_uuid=True), ForeignKey("news_articles.id", ondelete="CASCADE"), nullable=True)
    message    = Column(Text)
    is_read    = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    recipient = relationship("ForumUser", foreign_keys=[user_id], back_populates="notifications")
    actor     = relationship("ForumUser", foreign_keys=[actor_id])
    news_article = relationship("NewsArticle", foreign_keys=[news_article_id])

# ─────────────────────────────────────────────
# News Articles (scraped from external sources)
# ─────────────────────────────────────────────
class NewsArticle(Base):
    __tablename__ = "news_articles"
 
    id             = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_name    = Column(String(100), nullable=False)   # "businessnews" | "mosaiquefm" | "jawharafm"
    source_url     = Column(Text, unique=True, nullable=False)  # dedup key
    title          = Column(String(400), nullable=False)
    body           = Column(Text)
    category       = Column(String(50), default="meteo")   # "meteo" | "impact" | "infrastructure" | "alert"
    governorates   = Column(ARRAY(String), default=list)   # ["Tunis", "Bizerte"]
    risk_level     = Column(String(20), default="green")   # green/yellow/orange/red/purple
    scraped_at     = Column(DateTime(timezone=True), default=utcnow)
    published_at   = Column(DateTime(timezone=True))
    likes_count    = Column(Integer, default=0)
    comments_count = Column(Integer, default=0)
    shares_count   = Column(Integer, default=0)
 
    comments  = relationship("NewsComment",   back_populates="article", lazy="dynamic")
    reactions = relationship("NewsReaction",  back_populates="article", lazy="dynamic")
    shares    = relationship("NewsShare",     back_populates="article", lazy="dynamic")
 
    __table_args__ = (
        Index("ix_news_articles_scraped_at", "scraped_at"),
        Index("ix_news_articles_risk_level", "risk_level"),
    )
 
 
class NewsReaction(Base):
    __tablename__ = "news_reactions"
    article_id = Column(UUID(as_uuid=True), ForeignKey("news_articles.id", ondelete="CASCADE"), primary_key=True)
    user_id    = Column(UUID(as_uuid=True), ForeignKey("forum_users.id",  ondelete="CASCADE"), primary_key=True)
    emoji      = Column(String(10), default="👍")   # 👍 🔥 😮 🙏 😢
    created_at = Column(DateTime(timezone=True), default=utcnow)
 
    article = relationship("NewsArticle", back_populates="reactions")
    user    = relationship("ForumUser")
 
 
class NewsShare(Base):
    __tablename__ = "news_shares"
    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    article_id = Column(UUID(as_uuid=True), ForeignKey("news_articles.id", ondelete="CASCADE"))
    user_id    = Column(UUID(as_uuid=True), ForeignKey("forum_users.id",  ondelete="CASCADE"))
    created_at = Column(DateTime(timezone=True), default=utcnow)
 
    article = relationship("NewsArticle", back_populates="shares")
 
 
class NewsComment(Base):
    __tablename__ = "news_comments"
 
    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    article_id  = Column(UUID(as_uuid=True), ForeignKey("news_articles.id", ondelete="CASCADE"), nullable=False)
    author_id   = Column(UUID(as_uuid=True), ForeignKey("forum_users.id",  ondelete="CASCADE"), nullable=False)
    parent_id   = Column(UUID(as_uuid=True), ForeignKey("news_comments.id", ondelete="CASCADE"), nullable=True)
    body        = Column(Text, nullable=False)
    ai_approved = Column(Boolean, default=False)
    ai_reason   = Column(Text)
    ai_checked_at = Column(DateTime(timezone=True))
    is_deleted  = Column(Boolean, default=False)
    likes_count = Column(Integer, default=0)
    created_at  = Column(DateTime(timezone=True), default=utcnow)
    updated_at  = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
 
    article = relationship("NewsArticle", back_populates="comments")
    author  = relationship("ForumUser")
    replies = relationship("NewsComment", backref=backref("parent", remote_side="NewsComment.id"))
    likes   = relationship("NewsCommentLike", lazy="dynamic")
 
 
class NewsCommentLike(Base):
    __tablename__ = "news_comment_likes"
    comment_id = Column(UUID(as_uuid=True), ForeignKey("news_comments.id", ondelete="CASCADE"), primary_key=True)
    user_id    = Column(UUID(as_uuid=True), ForeignKey("forum_users.id",  ondelete="CASCADE"), primary_key=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)