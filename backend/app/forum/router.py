"""
backend/forum/router.py
FastAPI router — all /api/forum/* endpoints for WeatherGuardTN.
Mount with: app.include_router(forum_router, prefix="/api/forum", tags=["forum"])
"""
from __future__ import annotations
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status, BackgroundTasks
from sqlalchemy.orm import Session

from app.database import get_db          # your existing dependency
from app.auth import get_current_user    # your existing JWT dependency  →  returns ForumUser | None
from app.forum import crud
from app.forum.schemas import (
    NewsArticleOut, NewsArticleListOut,
    CommentCreate, CommentOut,
    ReactionCreate, ReactionOut, ReactionSummary,
    ShareOut, NotificationOut, NotificationListOut,
    UserProfileUpdate,
)
from app.forum.moderation import moderate_comment
from app.forum.recommendation import run_recommendations_for_article

router = APIRouter()


# ─────────────────────────────────────────────
# Helper
# ─────────────────────────────────────────────
def require_auth(current_user=Depends(get_current_user)):
    if current_user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    return current_user


# ─────────────────────────────────────────────
# News Feed
# ─────────────────────────────────────────────

@router.get("/news", response_model=NewsArticleListOut)
def list_news(
    page:        int            = Query(1,  ge=1),
    per_page:    int            = Query(20, ge=1, le=100),
    risk_level:  Optional[str]  = Query(None),
    governorate: Optional[str]  = Query(None),
    category:    Optional[str]  = Query(None),
    search:      Optional[str]  = Query(None),
    db:          Session        = Depends(get_db),
    current_user                = Depends(get_current_user),   # optional auth
):
    items, total = crud.get_news_feed(db, page, per_page, risk_level, governorate, category, search)

    # Annotate with the authenticated user's reaction (if any)
    out = []
    for article in items:
        a = NewsArticleOut.model_validate(article)
        if current_user:
            reaction = crud.get_reaction(db, article.id, current_user.id)
            a.user_reaction = reaction.emoji if reaction else None
        out.append(a)

    return NewsArticleListOut(total=total, page=page, per_page=per_page, items=out)


@router.get("/news/{article_id}", response_model=NewsArticleOut)
def get_news(
    article_id:  UUID,
    db:          Session = Depends(get_db),
    current_user          = Depends(get_current_user),
):
    article = crud.get_article(db, article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    out = NewsArticleOut.model_validate(article)
    if current_user:
        reaction = crud.get_reaction(db, article_id, current_user.id)
        out.user_reaction = reaction.emoji if reaction else None
    return out


# ─────────────────────────────────────────────
# Reactions
# ─────────────────────────────────────────────

@router.post("/news/{article_id}/react", response_model=ReactionSummary)
def react_to_news(
    article_id:  UUID,
    payload:     ReactionCreate,
    db:          Session = Depends(get_db),
    current_user          = Depends(require_auth),
):
    article = crud.get_article(db, article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    payload.validate_emoji()
    crud.upsert_reaction(db, article_id, current_user.id, payload.emoji)

    counts = crud.get_reaction_summary(db, article_id)
    user_reaction = crud.get_reaction(db, article_id, current_user.id)
    return ReactionSummary(
        article_id=article_id,
        counts=counts,
        user_emoji=user_reaction.emoji if user_reaction else None,
    )


@router.get("/news/{article_id}/reactions", response_model=ReactionSummary)
def get_reactions(
    article_id:  UUID,
    db:          Session = Depends(get_db),
    current_user          = Depends(get_current_user),
):
    article = crud.get_article(db, article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    counts = crud.get_reaction_summary(db, article_id)
    user_emoji = None
    if current_user:
        r = crud.get_reaction(db, article_id, current_user.id)
        user_emoji = r.emoji if r else None
    return ReactionSummary(article_id=article_id, counts=counts, user_emoji=user_emoji)


# ─────────────────────────────────────────────
# Shares
# ─────────────────────────────────────────────

@router.post("/news/{article_id}/share", response_model=ShareOut)
def share_news(
    article_id:  UUID,
    db:          Session = Depends(get_db),
    current_user          = Depends(require_auth),
):
    article = crud.get_article(db, article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    share = crud.record_share(db, article_id, current_user.id)
    return ShareOut.model_validate(share)


# ─────────────────────────────────────────────
# Comments
# ─────────────────────────────────────────────

@router.get("/news/{article_id}/comments", response_model=list[CommentOut])
def get_comments(
    article_id: UUID,
    db:         Session = Depends(get_db),
):
    article = crud.get_article(db, article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    comments = crud.get_comments(db, article_id)
    return [CommentOut.model_validate(c) for c in comments]


@router.post("/news/{article_id}/comments", response_model=CommentOut, status_code=201)
async def post_comment(
    article_id:  UUID,
    payload:     CommentCreate,
    db:          Session = Depends(get_db),
    current_user          = Depends(require_auth),
):
    article = crud.get_article(db, article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    # AI moderation — runs before persisting
    approved, reason = await moderate_comment(payload.body, article.title)

    comment = crud.create_comment(
        db,
        article_id=article_id,
        author_id=current_user.id,
        payload=payload,
        ai_approved=approved,
        ai_reason=reason,
    )

    if not approved:
        # Return 422 with the moderation reason so the frontend can show it
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Comment not approved: {reason}",
        )

    return CommentOut.model_validate(comment)


@router.post("/news/{article_id}/comments/{comment_id}/like")
def like_comment(
    article_id:  UUID,
    comment_id:  UUID,
    db:          Session = Depends(get_db),
    current_user          = Depends(require_auth),
):
    liked = crud.like_comment(db, comment_id, current_user.id)
    return {"liked": liked}


@router.delete("/news/{article_id}/comments/{comment_id}", status_code=204)
def delete_comment(
    article_id:  UUID,
    comment_id:  UUID,
    db:          Session = Depends(get_db),
    current_user          = Depends(require_auth),
):
    success = crud.soft_delete_comment(db, comment_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Comment not found or not yours")


# ─────────────────────────────────────────────
# Notifications
# ─────────────────────────────────────────────

@router.get("/notifications/mine", response_model=NotificationListOut)
def my_notifications(
    db:          Session = Depends(get_db),
    current_user          = Depends(require_auth),
):
    items, unread = crud.get_user_notifications(db, current_user.id)
    return NotificationListOut(
        unread_count=unread,
        items=[NotificationOut.model_validate(n) for n in items],
    )


@router.post("/notifications/{notif_id}/read")
def mark_read(
    notif_id:    UUID,
    db:          Session = Depends(get_db),
    current_user          = Depends(require_auth),
):
    ok = crud.mark_notification_read(db, notif_id, current_user.id)
    if not ok:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"ok": True}


@router.post("/notifications/read-all")
def mark_all_read(
    db:          Session = Depends(get_db),
    current_user          = Depends(require_auth),
):
    crud.mark_all_read(db, current_user.id)
    return {"ok": True}


# ─────────────────────────────────────────────
# User Profile (occupation + governorate for recommendations)
# ─────────────────────────────────────────────

@router.patch("/profile", response_model=dict)
def update_profile(
    payload:     UserProfileUpdate,
    db:          Session = Depends(get_db),
    current_user          = Depends(require_auth),
):
    user = crud.update_user_profile(db, current_user.id, payload)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "id":           str(user.id),
        "username":     user.username,
        "display_name": user.display_name,
        "governorate":  user.governorate,
        "occupation":   user.occupation,
    }