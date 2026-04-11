"""
backend/forum/routes.py
All API routes for the WeatherGuardTN forum.
Mount this router in your main app with:
    from app.forum.routes import router as forum_router
    app.include_router(forum_router, prefix="/api/forum", tags=["forum"])
"""
from __future__ import annotations

import math
from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.forum import models
from app.database import get_db
from app.forum import schemas
from app.forum.ai_moderation import moderate_text
from app.forum.auth import (
    create_tokens, get_current_user, get_current_user_optional,
    hash_password, verify_password,
)
from app.forum.notifications import send_notification

router = APIRouter()


# ══════════════════════════════════════════════════════════════════════════════
# AUTH
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/auth/register", response_model=schemas.TokenResponse, status_code=201)
def register(payload: schemas.UserRegister, db: Session = Depends(get_db)):
    if db.query(models.ForumUser).filter(models.ForumUser.email == payload.email).first():
        raise HTTPException(400, "Email already registered")
    if db.query(models.ForumUser).filter(models.ForumUser.username == payload.username).first():
        raise HTTPException(400, "Username already taken")

    user = models.ForumUser(
        username        = payload.username,
        email           = payload.email,
        hashed_password = hash_password(payload.password),
        display_name    = payload.display_name or payload.username,
        governorate     = payload.governorate,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    access, refresh = create_tokens(user.id)
    return schemas.TokenResponse(access_token=access, refresh_token=refresh)


@router.post("/auth/login", response_model=schemas.TokenResponse)
def login(payload: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.ForumUser).filter(models.ForumUser.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(401, "Invalid credentials")
    if user.is_banned:
        raise HTTPException(403, "Account is banned")

    access, refresh = create_tokens(user.id)
    return schemas.TokenResponse(access_token=access, refresh_token=refresh)


@router.get("/auth/me", response_model=schemas.UserPublic)
def me(current: models.ForumUser = Depends(get_current_user)):
    return current


# ══════════════════════════════════════════════════════════════════════════════
# USER PROFILES
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/users/{username}", response_model=schemas.UserProfile)
def get_profile(
    username: str,
    db:       Session = Depends(get_db),
    current:  Optional[models.ForumUser] = Depends(get_current_user_optional),
):
    user = db.query(models.ForumUser).filter(models.ForumUser.username == username).first()
    if not user:
        raise HTTPException(404, "User not found")

    followers_count = db.query(models.UserFollow).filter(models.UserFollow.following_id == user.id).count()
    following_count = db.query(models.UserFollow).filter(models.UserFollow.follower_id  == user.id).count()
    posts_count     = db.query(models.ForumPost) .filter(
        models.ForumPost.author_id == user.id,
        models.ForumPost.is_published == True,
        models.ForumPost.is_deleted == False,
    ).count()

    is_following = is_blocked = False
    if current and current.id != user.id:
        is_following = bool(db.query(models.UserFollow).filter_by(
            follower_id=current.id, following_id=user.id).first())
        is_blocked = bool(db.query(models.UserBlock).filter_by(
            blocker_id=current.id, blocked_id=user.id).first())

    profile = schemas.UserProfile.model_validate(user)
    profile.followers_count = followers_count
    profile.following_count = following_count
    profile.posts_count     = posts_count
    profile.is_following    = is_following
    profile.is_blocked      = is_blocked
    return profile


@router.patch("/users/me", response_model=schemas.UserPublic)
def update_profile(
    payload: schemas.UserUpdate,
    db:      Session = Depends(get_db),
    current: models.ForumUser = Depends(get_current_user),
):
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(current, field, value)
    db.commit()
    db.refresh(current)
    return current


# ── Follow / Unfollow ─────────────────────────────────────────────────────────

@router.post("/users/{username}/follow", response_model=schemas.MessageResponse)
def follow_user(
    username: str,
    db:       Session = Depends(get_db),
    current:  models.ForumUser = Depends(get_current_user),
):
    target = db.query(models.ForumUser).filter(models.ForumUser.username == username).first()
    if not target:
        raise HTTPException(404, "User not found")
    if target.id == current.id:
        raise HTTPException(400, "Cannot follow yourself")

    existing = db.query(models.UserFollow).filter_by(follower_id=current.id, following_id=target.id).first()
    if existing:
        raise HTTPException(400, "Already following")

    db.add(models.UserFollow(follower_id=current.id, following_id=target.id))
    send_notification(db, user_id=target.id, type="new_follower",
                      actor_id=current.id, actor_name=current.display_name or current.username)
    db.commit()
    return {"message": f"Now following {target.username}"}


@router.delete("/users/{username}/follow", response_model=schemas.MessageResponse)
def unfollow_user(
    username: str,
    db:       Session = Depends(get_db),
    current:  models.ForumUser = Depends(get_current_user),
):
    target = db.query(models.ForumUser).filter(models.ForumUser.username == username).first()
    if not target:
        raise HTTPException(404, "User not found")

    row = db.query(models.UserFollow).filter_by(follower_id=current.id, following_id=target.id).first()
    if not row:
        raise HTTPException(400, "Not following this user")
    db.delete(row)
    db.commit()
    return {"message": f"Unfollowed {target.username}"}


# ── Block / Report user ───────────────────────────────────────────────────────

@router.post("/users/{username}/block", response_model=schemas.MessageResponse)
def block_user(
    username: str,
    db:       Session = Depends(get_db),
    current:  models.ForumUser = Depends(get_current_user),
):
    target = db.query(models.ForumUser).filter(models.ForumUser.username == username).first()
    if not target or target.id == current.id:
        raise HTTPException(404, "User not found")

    if not db.query(models.UserBlock).filter_by(blocker_id=current.id, blocked_id=target.id).first():
        db.add(models.UserBlock(blocker_id=current.id, blocked_id=target.id))
        # Also remove follow relationship in both directions
        db.query(models.UserFollow).filter_by(follower_id=current.id,  following_id=target.id).delete()
        db.query(models.UserFollow).filter_by(follower_id=target.id, following_id=current.id).delete()
        db.commit()
    return {"message": f"Blocked {target.username}"}


@router.delete("/users/{username}/block", response_model=schemas.MessageResponse)
def unblock_user(
    username: str,
    db:       Session = Depends(get_db),
    current:  models.ForumUser = Depends(get_current_user),
):
    target = db.query(models.ForumUser).filter(models.ForumUser.username == username).first()
    if not target:
        raise HTTPException(404, "User not found")
    db.query(models.UserBlock).filter_by(blocker_id=current.id, blocked_id=target.id).delete()
    db.commit()
    return {"message": f"Unblocked {target.username}"}


@router.post("/users/{username}/report", response_model=schemas.MessageResponse, status_code=201)
def report_user(
    username: str,
    payload:  schemas.ReportCreate,
    db:       Session = Depends(get_db),
    current:  models.ForumUser = Depends(get_current_user),
):
    target = db.query(models.ForumUser).filter(models.ForumUser.username == username).first()
    if not target or target.id == current.id:
        raise HTTPException(404, "User not found")
    db.add(models.UserReport(reporter_id=current.id, reported_id=target.id, reason=payload.reason))
    db.commit()
    return {"message": "Report submitted and will be reviewed by our moderation team."}


# ══════════════════════════════════════════════════════════════════════════════
# POSTS
# ══════════════════════════════════════════════════════════════════════════════

def _post_out(post: models.ForumPost, current: Optional[models.ForumUser], db: Session) -> schemas.PostOut:
    is_liked = False
    if current:
        is_liked = bool(db.query(models.PostLike).filter_by(post_id=post.id, user_id=current.id).first())
    out = schemas.PostOut.model_validate(post)
    out.is_liked = is_liked
    return out


@router.get("/posts", response_model=schemas.PaginatedPosts)
def list_posts(
    page:        int = Query(1, ge=1),
    size:        int = Query(20, ge=1, le=100),
    category:    Optional[str] = None,
    governorate: Optional[str] = None,
    risk_level:  Optional[str] = None,
    db:          Session = Depends(get_db),
    current:     Optional[models.ForumUser] = Depends(get_current_user_optional),
):
    q = db.query(models.ForumPost).filter(
        models.ForumPost.is_published == True,
        models.ForumPost.is_deleted   == False,
    )
    if category:
        q = q.filter(models.ForumPost.category == category)
    if governorate:
        q = q.filter(models.ForumPost.governorate == governorate)
    if risk_level:
        q = q.filter(models.ForumPost.risk_level == risk_level)

    # Hide posts from users who blocked the current user (or were blocked by them)
    if current:
        blocked_ids = [r.blocked_id  for r in db.query(models.UserBlock).filter_by(blocker_id=current.id).all()]
        blocker_ids = [r.blocker_id  for r in db.query(models.UserBlock).filter_by(blocked_id=current.id).all()]
        hidden_ids  = list(set(blocked_ids + blocker_ids))
        if hidden_ids:
            q = q.filter(models.ForumPost.author_id.notin_(hidden_ids))

    total  = q.count()
    posts  = q.order_by(models.ForumPost.created_at.desc()).offset((page - 1) * size).limit(size).all()
    return schemas.PaginatedPosts(
        items=[_post_out(p, current, db) for p in posts],
        total=total, page=page, size=size, pages=math.ceil(total / size),
    )


@router.post("/posts/check", response_model=schemas.AICheckResult)
async def check_post_ai(
    payload: schemas.PostCreate,
    current: models.ForumUser = Depends(get_current_user),
):
    """Calls AI moderation without saving. Frontend calls this before submit."""
    return await moderate_text(
        content_type="post",
        title=payload.title,
        body=payload.body,
        category=payload.category,
        governorate=payload.governorate,
    )


@router.post("/posts", response_model=schemas.PostOut, status_code=201)
async def create_post(
    payload: schemas.PostCreate,
    db:      Session = Depends(get_db),
    current: models.ForumUser = Depends(get_current_user),
):
    # Run AI moderation
    ai_result = await moderate_text(
        content_type="post",
        title=payload.title,
        body=payload.body,
        category=payload.category,
        governorate=payload.governorate,
    )

    post = models.ForumPost(
        author_id     = current.id,
        title         = payload.title,
        body          = payload.body,
        category      = payload.category,
        governorate   = payload.governorate,
        risk_level    = payload.risk_level,
        image_url     = payload.image_url,
        ai_approved   = ai_result.approved,
        ai_reason     = ai_result.reason,
        ai_checked_at = datetime.now(timezone.utc),
        is_published  = ai_result.approved,
    )
    db.add(post)
    db.flush()

    # Notify author about AI decision
    notif_type = "post_approved" if ai_result.approved else "post_rejected"
    send_notification(db, user_id=current.id, type=notif_type, post_id=post.id,
                      extra={"reason": ai_result.reason})
    db.commit()
    db.refresh(post)

    if not ai_result.approved:
        raise HTTPException(
            status_code=422,
            detail={
                "message": "Post not published: content not relevant to WeatherGuardTN forum.",
                "ai_reason": ai_result.reason,
            }
        )
    return _post_out(post, current, db)


@router.get("/posts/{post_id}", response_model=schemas.PostOut)
def get_post(
    post_id: UUID,
    db:      Session = Depends(get_db),
    current: Optional[models.ForumUser] = Depends(get_current_user_optional),
):
    post = db.query(models.ForumPost).filter(
        models.ForumPost.id == post_id,
        models.ForumPost.is_deleted == False,
    ).first()
    if not post or (not post.is_published and (not current or current.id != post.author_id)):
        raise HTTPException(404, "Post not found")
    return _post_out(post, current, db)


@router.patch("/posts/{post_id}", response_model=schemas.PostOut)
async def update_post(
    post_id: UUID,
    payload: schemas.PostUpdate,
    db:      Session = Depends(get_db),
    current: models.ForumUser = Depends(get_current_user),
):
    post = db.query(models.ForumPost).filter_by(id=post_id, is_deleted=False).first()
    if not post:
        raise HTTPException(404, "Post not found")
    if post.author_id != current.id and current.role not in ("moderator","admin"):
        raise HTTPException(403, "Forbidden")

    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(post, field, value)

    # Re-run AI moderation on body/title changes
    if payload.body or payload.title:
        ai_result = await moderate_text(
            content_type="post", title=post.title, body=post.body,
            category=post.category, governorate=post.governorate,
        )
        post.ai_approved  = ai_result.approved
        post.ai_reason    = ai_result.reason
        post.ai_checked_at = datetime.now(timezone.utc)
        post.is_published = ai_result.approved

    db.commit()
    db.refresh(post)
    return _post_out(post, current, db)


@router.delete("/posts/{post_id}", response_model=schemas.MessageResponse)
def delete_post(
    post_id: UUID,
    db:      Session = Depends(get_db),
    current: models.ForumUser = Depends(get_current_user),
):
    post = db.query(models.ForumPost).filter_by(id=post_id, is_deleted=False).first()
    if not post:
        raise HTTPException(404, "Post not found")
    if post.author_id != current.id and current.role not in ("moderator","admin"):
        raise HTTPException(403, "Forbidden")
    post.is_deleted = True
    db.commit()
    return {"message": "Post deleted"}


# ── Post interactions ─────────────────────────────────────────────────────────

@router.post("/posts/{post_id}/like", response_model=schemas.MessageResponse)
def like_post(
    post_id: UUID,
    db:      Session = Depends(get_db),
    current: models.ForumUser = Depends(get_current_user),
):
    post = db.query(models.ForumPost).filter_by(id=post_id, is_published=True, is_deleted=False).first()
    if not post:
        raise HTTPException(404, "Post not found")
    if db.query(models.PostLike).filter_by(post_id=post_id, user_id=current.id).first():
        raise HTTPException(400, "Already liked")
    db.add(models.PostLike(post_id=post_id, user_id=current.id))
    if post.author_id != current.id:
        send_notification(db, user_id=post.author_id, type="post_like",
                          actor_id=current.id, actor_name=current.display_name or current.username,
                          post_id=post_id)
    db.commit()
    return {"message": "Post liked"}


@router.delete("/posts/{post_id}/like", response_model=schemas.MessageResponse)
def unlike_post(
    post_id: UUID,
    db:      Session = Depends(get_db),
    current: models.ForumUser = Depends(get_current_user),
):
    row = db.query(models.PostLike).filter_by(post_id=post_id, user_id=current.id).first()
    if not row:
        raise HTTPException(400, "Not liked")
    db.delete(row)
    db.commit()
    return {"message": "Post unliked"}


@router.post("/posts/{post_id}/share", response_model=schemas.MessageResponse)
def share_post(
    post_id: UUID,
    db:      Session = Depends(get_db),
    current: models.ForumUser = Depends(get_current_user),
):
    post = db.query(models.ForumPost).filter_by(id=post_id, is_published=True, is_deleted=False).first()
    if not post:
        raise HTTPException(404, "Post not found")
    db.add(models.PostShare(post_id=post_id, user_id=current.id))
    post.shares_count += 1
    if post.author_id != current.id:
        send_notification(db, user_id=post.author_id, type="post_share",
                          actor_id=current.id, actor_name=current.display_name or current.username,
                          post_id=post_id)
    db.commit()
    return {"message": "Post shared"}


@router.post("/posts/{post_id}/report", response_model=schemas.MessageResponse, status_code=201)
def report_post(
    post_id: UUID,
    payload: schemas.ReportCreate,
    db:      Session = Depends(get_db),
    current: models.ForumUser = Depends(get_current_user),
):
    post = db.query(models.ForumPost).filter_by(id=post_id, is_deleted=False).first()
    if not post:
        raise HTTPException(404, "Post not found")
    db.add(models.PostReport(post_id=post_id, reporter_id=current.id, reason=payload.reason))
    db.commit()
    return {"message": "Report submitted"}


# ══════════════════════════════════════════════════════════════════════════════
# COMMENTS
# ══════════════════════════════════════════════════════════════════════════════

def _build_comment_tree(comments: list, current_id: Optional[UUID], db: Session) -> list[schemas.CommentOut]:
    """Build nested comment structure from flat list."""
    by_parent: dict = {}
    for c in comments:
        key = str(c.parent_id) if c.parent_id else "root"
        by_parent.setdefault(key, []).append(c)

    def to_out(c: models.ForumComment) -> schemas.CommentOut:
        is_liked = False
        if current_id:
            is_liked = bool(db.query(models.CommentLike).filter_by(
                comment_id=c.id, user_id=current_id).first())
        out = schemas.CommentOut.model_validate(c)
        out.is_liked = is_liked
        out.replies  = [to_out(r) for r in by_parent.get(str(c.id), [])]
        return out

    return [to_out(c) for c in by_parent.get("root", [])]


@router.get("/posts/{post_id}/comments", response_model=schemas.PaginatedComments)
def get_comments(
    post_id: UUID,
    page:    int = Query(1, ge=1),
    size:    int = Query(50, ge=1, le=200),
    db:      Session = Depends(get_db),
    current: Optional[models.ForumUser] = Depends(get_current_user_optional),
):
    comments = db.query(models.ForumComment).filter(
        models.ForumComment.post_id   == post_id,
        models.ForumComment.is_deleted == False,
        models.ForumComment.ai_approved == True,
    ).order_by(models.ForumComment.created_at).all()

    tree  = _build_comment_tree(comments, current.id if current else None, db)
    total = len(tree)
    page_items = tree[(page - 1) * size: page * size]
    return schemas.PaginatedComments(items=page_items, total=total)


@router.post("/posts/{post_id}/comments", response_model=schemas.CommentOut, status_code=201)
async def create_comment(
    post_id: UUID,
    payload: schemas.CommentCreate,
    db:      Session = Depends(get_db),
    current: models.ForumUser = Depends(get_current_user),
):
    post = db.query(models.ForumPost).filter_by(id=post_id, is_published=True, is_deleted=False).first()
    if not post:
        raise HTTPException(404, "Post not found")

    # AI moderation for the comment
    ai_result = await moderate_text(content_type="comment", title=None, body=payload.body)

    comment = models.ForumComment(
        post_id     = post_id,
        author_id   = current.id,
        parent_id   = payload.parent_id,
        body        = payload.body,
        ai_approved = ai_result.approved,
        ai_reason   = ai_result.reason,
    )
    db.add(comment)
    db.flush()

    if ai_result.approved and post.author_id != current.id:
        send_notification(db, user_id=post.author_id, type="post_comment",
                          actor_id=current.id, actor_name=current.display_name or current.username,
                          post_id=post_id, comment_id=comment.id)
    db.commit()
    db.refresh(comment)

    if not ai_result.approved:
        raise HTTPException(
            status_code=422,
            detail={"message": "Comment not posted: not relevant to the forum.", "ai_reason": ai_result.reason},
        )
    out = schemas.CommentOut.model_validate(comment)
    out.replies  = []
    out.is_liked = False
    return out


@router.delete("/comments/{comment_id}", response_model=schemas.MessageResponse)
def delete_comment(
    comment_id: UUID,
    db:         Session = Depends(get_db),
    current:    models.ForumUser = Depends(get_current_user),
):
    comment = db.query(models.ForumComment).filter_by(id=comment_id, is_deleted=False).first()
    if not comment:
        raise HTTPException(404, "Comment not found")
    if comment.author_id != current.id and current.role not in ("moderator","admin"):
        raise HTTPException(403, "Forbidden")
    comment.is_deleted = True
    db.commit()
    return {"message": "Comment deleted"}


@router.post("/comments/{comment_id}/like", response_model=schemas.MessageResponse)
def like_comment(
    comment_id: UUID,
    db:         Session = Depends(get_db),
    current:    models.ForumUser = Depends(get_current_user),
):
    comment = db.query(models.ForumComment).filter_by(id=comment_id, is_deleted=False).first()
    if not comment:
        raise HTTPException(404, "Comment not found")
    if db.query(models.CommentLike).filter_by(comment_id=comment_id, user_id=current.id).first():
        raise HTTPException(400, "Already liked")
    db.add(models.CommentLike(comment_id=comment_id, user_id=current.id))
    if comment.author_id != current.id:
        send_notification(db, user_id=comment.author_id, type="comment_like",
                          actor_id=current.id, actor_name=current.display_name or current.username,
                          comment_id=comment_id)
    db.commit()
    return {"message": "Comment liked"}


@router.delete("/comments/{comment_id}/like", response_model=schemas.MessageResponse)
def unlike_comment(
    comment_id: UUID,
    db:         Session = Depends(get_db),
    current:    models.ForumUser = Depends(get_current_user),
):
    row = db.query(models.CommentLike).filter_by(comment_id=comment_id, user_id=current.id).first()
    if not row:
        raise HTTPException(400, "Not liked")
    db.delete(row)
    db.commit()
    return {"message": "Comment unliked"}


@router.post("/comments/{comment_id}/report", response_model=schemas.MessageResponse, status_code=201)
def report_comment(
    comment_id: UUID,
    payload:    schemas.ReportCreate,
    db:         Session = Depends(get_db),
    current:    models.ForumUser = Depends(get_current_user),
):
    comment = db.query(models.ForumComment).filter_by(id=comment_id).first()
    if not comment:
        raise HTTPException(404, "Comment not found")
    db.add(models.CommentReport(comment_id=comment_id, reporter_id=current.id, reason=payload.reason))
    db.commit()
    return {"message": "Report submitted"}


# ══════════════════════════════════════════════════════════════════════════════
# NOTIFICATIONS
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/notifications", response_model=List[schemas.NotificationOut])
def get_notifications(
    unread_only: bool = False,
    limit:       int  = Query(30, ge=1, le=100),
    db:          Session = Depends(get_db),
    current:     models.ForumUser = Depends(get_current_user),
):
    q = db.query(models.Notification).filter(models.Notification.user_id == current.id)
    if unread_only:
        q = q.filter(models.Notification.is_read == False)
    return q.order_by(models.Notification.created_at.desc()).limit(limit).all()


@router.get("/notifications/unread-count")
def unread_count(
    db:      Session = Depends(get_db),
    current: models.ForumUser = Depends(get_current_user),
):
    count = db.query(models.Notification).filter_by(user_id=current.id, is_read=False).count()
    return {"count": count}


@router.post("/notifications/read-all", response_model=schemas.MessageResponse)
def mark_all_read(
    db:      Session = Depends(get_db),
    current: models.ForumUser = Depends(get_current_user),
):
    db.query(models.Notification).filter_by(user_id=current.id, is_read=False).update({"is_read": True})
    db.commit()
    return {"message": "All notifications marked as read"}


@router.post("/notifications/{notif_id}/read", response_model=schemas.MessageResponse)
def mark_read(
    notif_id: UUID,
    db:       Session = Depends(get_db),
    current:  models.ForumUser = Depends(get_current_user),
):
    notif = db.query(models.Notification).filter_by(id=notif_id, user_id=current.id).first()
    if not notif:
        raise HTTPException(404, "Notification not found")
    notif.is_read = True
    db.commit()
    return {"message": "Notification marked as read"}


# ══════════════════════════════════════════════════════════════════════════════
# USER ACTIVITY (own posts + liked posts)
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/users/{username}/posts", response_model=schemas.PaginatedPosts)
def user_posts(
    username: str,
    page:     int = Query(1, ge=1),
    size:     int = Query(20, ge=1, le=100),
    db:       Session = Depends(get_db),
    current:  Optional[models.ForumUser] = Depends(get_current_user_optional),
):
    user = db.query(models.ForumUser).filter(models.ForumUser.username == username).first()
    if not user:
        raise HTTPException(404, "User not found")

    q = db.query(models.ForumPost).filter(
        models.ForumPost.author_id   == user.id,
        models.ForumPost.is_published == True,
        models.ForumPost.is_deleted   == False,
    )
    total = q.count()
    posts = q.order_by(models.ForumPost.created_at.desc()).offset((page-1)*size).limit(size).all()
    return schemas.PaginatedPosts(
        items=[_post_out(p, current, db) for p in posts],
        total=total, page=page, size=size, pages=math.ceil(total/size),
    )
