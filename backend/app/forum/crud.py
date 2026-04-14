"""
backend/forum/crud.py
Database operations for the WeatherGuardTN news forum.
All functions are synchronous (standard SQLAlchemy session).
"""
from __future__ import annotations
from datetime import datetime, timezone
from typing import List, Optional, Tuple
from uuid import UUID

from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_

from app.forum.models import (
    NewsArticle, NewsReaction, NewsComment, NewsCommentLike,
    NewsShare, Notification, ForumUser,
)
from app.forum.schemas import CommentCreate, ReactionCreate, UserProfileUpdate


def utcnow():
    return datetime.now(timezone.utc)


# ─────────────────────────────────────────────
# News Articles
# ─────────────────────────────────────────────

def get_news_feed(
    db: Session,
    page: int = 1,
    per_page: int = 20,
    risk_level: Optional[str] = None,
    governorate: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
) -> Tuple[List[NewsArticle], int]:
    """Return paginated, filtered news articles, newest first."""
    q = db.query(NewsArticle)

    if risk_level:
        q = q.filter(NewsArticle.risk_level == risk_level)
    if governorate:
        q = q.filter(NewsArticle.governorates.any(governorate))
    if category:
        q = q.filter(NewsArticle.category == category)
    if search:
        q = q.filter(NewsArticle.title.ilike(f"%{search}%"))

    total = q.count()
    items = (
        q.order_by(desc(NewsArticle.scraped_at))
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )
    return items, total


def get_article(db: Session, article_id: UUID) -> Optional[NewsArticle]:
    return db.query(NewsArticle).filter(NewsArticle.id == article_id).first()


def article_url_exists(db: Session, url: str) -> bool:
    return db.query(NewsArticle).filter(NewsArticle.source_url == url).first() is not None


def create_article(db: Session, **kwargs) -> NewsArticle:
    article = NewsArticle(**kwargs)
    db.add(article)
    db.commit()
    db.refresh(article)
    return article


# ─────────────────────────────────────────────
# Reactions
# ─────────────────────────────────────────────

def get_reaction(db: Session, article_id: UUID, user_id: UUID) -> Optional[NewsReaction]:
    return db.query(NewsReaction).filter(
        NewsReaction.article_id == article_id,
        NewsReaction.user_id == user_id,
    ).first()


def upsert_reaction(db: Session, article_id: UUID, user_id: UUID, emoji: str) -> NewsReaction:
    """Add or change reaction. Returns the reaction (emoji=None removed)."""
    existing = get_reaction(db, article_id, user_id)

    if existing:
        if existing.emoji == emoji:
            # Toggle off — remove reaction
            db.delete(existing)
            _adjust_count(db, article_id, -1)
            db.commit()
            return None
        existing.emoji = emoji
        db.commit()
        db.refresh(existing)
        return existing

    reaction = NewsReaction(article_id=article_id, user_id=user_id, emoji=emoji)
    db.add(reaction)
    _adjust_count(db, article_id, +1)
    db.commit()
    db.refresh(reaction)
    return reaction


def _adjust_count(db: Session, article_id: UUID, delta: int):
    db.query(NewsArticle).filter(NewsArticle.id == article_id).update(
        {NewsArticle.likes_count: NewsArticle.likes_count + delta}
    )


def get_reaction_summary(db: Session, article_id: UUID) -> dict:
    rows = (
        db.query(NewsReaction.emoji, func.count(NewsReaction.user_id))
        .filter(NewsReaction.article_id == article_id)
        .group_by(NewsReaction.emoji)
        .all()
    )
    return {emoji: count for emoji, count in rows}


# ─────────────────────────────────────────────
# Shares
# ─────────────────────────────────────────────

def record_share(db: Session, article_id: UUID, user_id: UUID) -> NewsShare:
    share = NewsShare(article_id=article_id, user_id=user_id)
    db.add(share)
    db.query(NewsArticle).filter(NewsArticle.id == article_id).update(
        {NewsArticle.shares_count: NewsArticle.shares_count + 1}
    )
    db.commit()
    db.refresh(share)
    return share


# ─────────────────────────────────────────────
# Comments
# ─────────────────────────────────────────────

def create_comment(
    db: Session,
    article_id: UUID,
    author_id: UUID,
    payload: CommentCreate,
    ai_approved: bool = False,
    ai_reason: str = "",
) -> NewsComment:
    comment = NewsComment(
        article_id=article_id,
        author_id=author_id,
        parent_id=payload.parent_id,
        body=payload.body,
        ai_approved=ai_approved,
        ai_reason=ai_reason,
        ai_checked_at=utcnow(),
    )
    db.add(comment)
    if ai_approved:
        db.query(NewsArticle).filter(NewsArticle.id == article_id).update(
            {NewsArticle.comments_count: NewsArticle.comments_count + 1}
        )
    db.commit()
    db.refresh(comment)
    return comment


def get_comments(db: Session, article_id: UUID) -> List[NewsComment]:
    """Return top-level approved comments (with replies eager-loaded)."""
    return (
        db.query(NewsComment)
        .filter(
            NewsComment.article_id == article_id,
            NewsComment.parent_id == None,
            NewsComment.is_deleted == False,
            NewsComment.ai_approved == True,
        )
        .order_by(NewsComment.created_at)
        .all()
    )


def like_comment(db: Session, comment_id: UUID, user_id: UUID) -> bool:
    existing = db.query(NewsCommentLike).filter(
        NewsCommentLike.comment_id == comment_id,
        NewsCommentLike.user_id == user_id,
    ).first()
    if existing:
        db.delete(existing)
        db.query(NewsComment).filter(NewsComment.id == comment_id).update(
            {NewsComment.likes_count: NewsComment.likes_count - 1}
        )
        db.commit()
        return False  # unliked
    like = NewsCommentLike(comment_id=comment_id, user_id=user_id)
    db.add(like)
    db.query(NewsComment).filter(NewsComment.id == comment_id).update(
        {NewsComment.likes_count: NewsComment.likes_count + 1}
    )
    db.commit()
    return True  # liked


def soft_delete_comment(db: Session, comment_id: UUID, requester_id: UUID) -> bool:
    comment = db.query(NewsComment).filter(
        NewsComment.id == comment_id,
        NewsComment.author_id == requester_id,
    ).first()
    if not comment:
        return False
    comment.is_deleted = True
    db.commit()
    return True


# ─────────────────────────────────────────────
# Notifications
# ─────────────────────────────────────────────

def create_notification(
    db: Session,
    user_id: UUID,
    notif_type: str,
    message: str,
    article_id: Optional[UUID] = None,
    actor_id: Optional[UUID] = None,
    comment_id: Optional[UUID] = None,
) -> Notification:
    notif = Notification(
        user_id=user_id,
        type=notif_type,
        message=message,
        article_id=article_id,
        actor_id=actor_id,
        comment_id=comment_id,
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return notif


def get_user_notifications(
    db: Session, user_id: UUID, limit: int = 50
) -> Tuple[List[Notification], int]:
    q = db.query(Notification).filter(Notification.user_id == user_id)
    unread = q.filter(Notification.is_read == False).count()
    items = q.order_by(desc(Notification.created_at)).limit(limit).all()
    return items, unread


def mark_notification_read(db: Session, notif_id: UUID, user_id: UUID) -> bool:
    notif = db.query(Notification).filter(
        Notification.id == notif_id,
        Notification.user_id == user_id,
    ).first()
    if not notif:
        return False
    notif.is_read = True
    db.commit()
    return True


def mark_all_read(db: Session, user_id: UUID):
    db.query(Notification).filter(
        Notification.user_id == user_id,
        Notification.is_read == False,
    ).update({Notification.is_read: True})
    db.commit()


def notification_already_sent(db: Session, user_id: UUID, article_id: UUID) -> bool:
    """Prevent duplicate recommendations for the same article/user."""
    return db.query(Notification).filter(
        Notification.user_id == user_id,
        Notification.article_id == article_id,
        Notification.type == "news_recommendation",
    ).first() is not None


# ─────────────────────────────────────────────
# User profile
# ─────────────────────────────────────────────

def get_user(db: Session, user_id: UUID) -> Optional[ForumUser]:
    return db.query(ForumUser).filter(ForumUser.id == user_id).first()


def get_all_active_users(db: Session) -> List[ForumUser]:
    return db.query(ForumUser).filter(
        ForumUser.is_active == True,
        ForumUser.is_banned == False,
    ).all()


def update_user_profile(db: Session, user_id: UUID, payload: UserProfileUpdate) -> Optional[ForumUser]:
    user = get_user(db, user_id)
    if not user:
        return None
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user