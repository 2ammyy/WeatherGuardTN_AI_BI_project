from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import func, desc
from app.database import SessionLocal
from app.models.user import User
from app.forum.models import (
    ForumPost, ForumComment, PostReport, CommentReport,
    UserReport, ForumUser, Notification, NewsArticle, Message
)
from app.models.ml_model import MLModel
from app.admin.priority import classify_priority, classify_reports_bulk
from datetime import datetime, timedelta
import jwt
import os

SECRET_KEY = os.getenv('FORUM_SECRET_KEY', 'weatherguardtn-admin-secret-2026')
ALGORITHM = 'HS256'

router = APIRouter()

async def require_admin(request: Request):
    token = request.session.get('token')
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get('sub')
        if not email:
            raise HTTPException(401, "Invalid token")
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.email == email).first()
            if not user or not user.is_admin:
                raise HTTPException(403, "Not authorized")
            return user
        finally:
            db.close()
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Session expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")

def get_stats():
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_ago = now - timedelta(days=7)

        total_users = db.query(ForumUser).count()
        total_posts = db.query(ForumPost).filter(ForumPost.is_deleted == False).count()
        total_comments = db.query(ForumComment).filter(ForumComment.is_deleted == False).count()
        total_reports = db.query(PostReport).count() + db.query(CommentReport).count() + db.query(UserReport).count()
        total_ml_models = db.query(MLModel).count()
        active_ml_models = db.query(MLModel).filter(MLModel.is_active == True).count()
        total_notifications = db.query(Notification).count()
        unread_notifications = db.query(Notification).filter(Notification.is_read == False).count()
        total_messages = db.query(Message).count()
        unread_messages = db.query(Message).filter(Message.is_read == False).count()
        pending_reports = (
            db.query(PostReport).filter(PostReport.status == "pending").count()
            + db.query(CommentReport).filter(CommentReport.status == "pending").count()
            + db.query(UserReport).filter(UserReport.status == "pending").count()
        )
        posts_today = db.query(ForumPost).filter(ForumPost.created_at >= today_start).count()
        users_today = db.query(ForumUser).filter(ForumUser.created_at >= today_start).count()
        posts_week = db.query(ForumPost).filter(ForumPost.created_at >= week_ago).count()
        news_articles = db.query(NewsArticle).count()

        risk_distribution = (
            db.query(ForumPost.risk_level, func.count(ForumPost.id))
            .filter(ForumPost.is_deleted == False)
            .group_by(ForumPost.risk_level)
            .all()
        )

        ai_approved = db.query(ForumPost).filter(ForumPost.ai_approved == True, ForumPost.is_deleted == False).count()
        ai_rejected = db.query(ForumPost).filter(ForumPost.ai_approved == False, ForumPost.is_deleted == False).count()

        top_governorates = (
            db.query(ForumPost.governorate, func.count(ForumPost.id))
            .filter(ForumPost.governorate.isnot(None), ForumPost.is_deleted == False)
            .group_by(ForumPost.governorate)
            .order_by(desc(func.count(ForumPost.id)))
            .limit(5)
            .all()
        )

        return {
            "users": {"total": total_users, "today": users_today},
            "posts": {"total": total_posts, "today": posts_today, "week": posts_week},
            "comments": {"total": total_comments},
            "reports": {"total": total_reports, "pending": pending_reports},
            "news": {"total": news_articles},
            "models": {"total": total_ml_models, "active": active_ml_models},
            "notifications": {"total": total_notifications, "unread": unread_notifications},
            "messages": {"total": total_messages, "unread": unread_messages},
            "moderation": {
                "ai_approved": ai_approved,
                "ai_rejected": ai_rejected,
                "total_checked": ai_approved + ai_rejected,
                "approval_rate": round(ai_approved / (ai_approved + ai_rejected) * 100, 1) if (ai_approved + ai_rejected) > 0 else 0,
            },
            "risk_distribution": {r[0] or "unknown": r[1] for r in risk_distribution},
            "top_governorates": {r[0] or "unknown": r[1] for r in top_governorates},
        }
    finally:
        db.close()

@router.get("/stats")
def dashboard_stats(_=Depends(require_admin)):
    return get_stats()

@router.get("/moderation/pending-reports")
def pending_reports(_=Depends(require_admin)):
    db = SessionLocal()
    try:
        post_reports = (
            db.query(PostReport)
            .filter(PostReport.status == "pending")
            .order_by(PostReport.created_at.desc())
            .limit(50)
            .all()
        )
        comment_reports = (
            db.query(CommentReport)
            .filter(CommentReport.status == "pending")
            .order_by(CommentReport.created_at.desc())
            .limit(50)
            .all()
        )
        user_reports = (
            db.query(UserReport)
            .filter(UserReport.status == "pending")
            .order_by(UserReport.created_at.desc())
            .limit(50)
            .all()
        )

        def fmt(r, t):
            return {"id": str(r.id), "type": t, "reason": r.reason, "created_at": r.created_at.isoformat() if r.created_at else None}

        return {
            "post_reports": [fmt(r, "post") for r in post_reports],
            "comment_reports": [fmt(r, "comment") for r in comment_reports],
            "user_reports": [fmt(r, "user") for r in user_reports],
            "total": len(post_reports) + len(comment_reports) + len(user_reports),
        }
    finally:
        db.close()

@router.post("/moderation/resolve/{report_type}/{report_id}")
def resolve_report(report_type: str, report_id: str, action: str = "dismissed", _=Depends(require_admin)):
    db = SessionLocal()
    try:
        model_map = {"post": PostReport, "comment": CommentReport, "user": UserReport}
        model = model_map.get(report_type)
        if not model:
            raise HTTPException(400, f"Invalid report type: {report_type}")

        from sqlalchemy import text
        stmt = text(f"UPDATE {model.__tablename__} SET status = :status WHERE id = :id")
        db.execute(stmt, {"status": action, "id": report_id})
        db.commit()
        return {"success": True, "message": f"Report {report_id} resolved as '{action}'"}
    except Exception as e:
        db.rollback()
        raise HTTPException(500, str(e))
    finally:
        db.close()

@router.post("/users/{user_id}/toggle-ban")
def toggle_ban(user_id: str, _=Depends(require_admin)):
    db = SessionLocal()
    try:
        user = db.query(ForumUser).filter(ForumUser.id == user_id).first()
        if not user:
            raise HTTPException(404, "User not found")
        user.is_banned = not user.is_banned
        db.commit()
        return {"success": True, "is_banned": user.is_banned}
    except Exception as e:
        db.rollback()
        raise HTTPException(500, str(e))
    finally:
        db.close()

@router.post("/posts/{post_id}/toggle-approve")
def toggle_approve(post_id: str, _=Depends(require_admin)):
    db = SessionLocal()
    try:
        post = db.query(ForumPost).filter(ForumPost.id == post_id).first()
        if not post:
            raise HTTPException(404, "Post not found")
        post.is_published = not post.is_published
        post.ai_approved = post.is_published
        db.commit()
        return {"success": True, "is_published": post.is_published}
    except Exception as e:
        db.rollback()
        raise HTTPException(500, str(e))
    finally:
        db.close()

@router.post("/posts/{post_id}/delete")
def soft_delete_post(post_id: str, _=Depends(require_admin)):
    db = SessionLocal()
    try:
        post = db.query(ForumPost).filter(ForumPost.id == post_id).first()
        if not post:
            raise HTTPException(404, "Post not found")
        post.is_deleted = True
        db.commit()
        return {"success": True}
    except Exception as e:
        db.rollback()
        raise HTTPException(500, str(e))
    finally:
        db.close()

@router.get("/moderation/recent")
def recent_moderation(limit: int = 20, _=Depends(require_admin)):
    db = SessionLocal()
    try:
        posts = (
            db.query(ForumPost)
            .filter(ForumPost.is_deleted == False)
            .order_by(ForumPost.created_at.desc())
            .limit(limit)
            .all()
        )
        return [{
            "id": str(p.id),
            "title": p.title[:80] if p.title else "",
            "ai_approved": p.ai_approved,
            "ai_reason": p.ai_reason,
            "risk_level": p.risk_level,
            "category": p.category,
            "created_at": p.created_at.isoformat() if p.created_at else None,
        } for p in posts]
    finally:
        db.close()

@router.get("/activity/recent")
def recent_activity(limit: int = 10, _=Depends(require_admin)):
    db = SessionLocal()
    try:
        recent_posts = (
            db.query(ForumPost)
            .filter(ForumPost.is_deleted == False)
            .order_by(ForumPost.created_at.desc())
            .limit(limit)
            .all()
        )
        recent_users = (
            db.query(ForumUser)
            .order_by(ForumUser.created_at.desc())
            .limit(limit)
            .all()
        )
        recent_reports = (
            db.query(PostReport)
            .order_by(PostReport.created_at.desc())
            .limit(limit)
            .all()
        )

        activities = []

        for p in recent_posts:
            activities.append({
                "type": "post",
                "icon": "fa-solid fa-newspaper",
                "icon_bg": "rgba(5,150,105,0.1)",
                "icon_color": "#059669",
                "text": f'New post: <strong>{p.title[:60] or "Untitled"}</strong>',
                "time": p.created_at.isoformat() if p.created_at else None,
                "category": p.category,
                "risk_level": p.risk_level,
            })

        for u in recent_users:
            activities.append({
                "type": "user",
                "icon": "fa-solid fa-user-plus",
                "icon_bg": "rgba(8,145,178,0.1)",
                "icon_color": "#0891b2",
                "text": f'New user registered: <strong>{u.username or u.email}</strong>',
                "time": u.created_at.isoformat() if u.created_at else None,
            })

        for r in recent_reports:
            activities.append({
                "type": "report",
                "icon": "fa-solid fa-flag",
                "icon_bg": "rgba(239,68,68,0.1)",
                "icon_color": "#ef4444",
                "text": f'New report: <strong>{r.reason[:50] or "No reason"}</strong>',
                "time": r.created_at.isoformat() if r.created_at else None,
            })

        activities.sort(key=lambda x: x["time"] or "", reverse=True)
        return activities[:limit]
    finally:
        db.close()

@router.post("/priority/classify")
def classify_report_priority(report_type: str, report_id: str, _=Depends(require_admin)):
    """Run AI priority classification on a single report."""
    db = SessionLocal()
    try:
        model_map = {
            "post": PostReport,
            "comment": CommentReport,
            "user": UserReport,
        }
        model_cls = model_map.get(report_type)
        if not model_cls:
            raise HTTPException(400, f"Invalid report type: {report_type}")

        report = db.query(model_cls).filter(model_cls.id == report_id).first()
        if not report:
            raise HTTPException(404, "Report not found")

        result = classify_priority(report.reason or "")
        report.priority = result["priority"]
        report.priority_score = result["score"]
        db.commit()

        return {"success": True, "id": str(report.id), "priority": result["priority"], "score": result["score"]}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(500, str(e))
    finally:
        db.close()

@router.post("/priority/classify-all")
def classify_all_report_priorities(_=Depends(require_admin)):
    """Run AI priority classification on ALL pending reports."""
    db = SessionLocal()
    try:
        results = {"post": 0, "comment": 0, "user": 0, "total": 0}
        for model_cls, key in [(PostReport, "post"), (CommentReport, "comment"), (UserReport, "user")]:
            reports = db.query(model_cls).filter(model_cls.status == "pending").all()
            for r in reports:
                result = classify_priority(r.reason or "")
                r.priority = result["priority"]
                r.priority_score = result["score"]
                results[key] += 1
                results["total"] += 1
        db.commit()
        return {"success": True, "classified": results}
    except Exception as e:
        db.rollback()
        raise HTTPException(500, str(e))
    finally:
        db.close()

@router.get("/reports/summary")
def reports_summary(_=Depends(require_admin)):
    """Get a summary of all reports grouped by type, status, and priority."""
    db = SessionLocal()
    try:
        def get_counts(model):
            total = db.query(model).count()
            pending = db.query(model).filter(model.status == "pending").count()
            high = db.query(model).filter(model.priority == "high").count()
            medium = db.query(model).filter(model.priority == "medium").count()
            low = db.query(model).filter(model.priority == "low").count()
            return {"total": total, "pending": pending, "high": high, "medium": medium, "low": low}

        return {
            "post_reports": get_counts(PostReport),
            "comment_reports": get_counts(CommentReport),
            "user_reports": get_counts(UserReport),
        }
    finally:
        db.close()
