from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import func, desc
from app.database import SessionLocal
from app.models.user import User
from app.forum.models import (
    ForumPost, ForumComment, PostReport, CommentReport,
    UserReport, ForumUser, Notification, NewsArticle, Message, PriorityFeedback
)
from app.models.ml_model import MLModel
from app.admin.priority import classify_priority, classify_reports_bulk, evaluate_model, test_custom_text, retrain_model
from datetime import datetime, timedelta
import json
import jwt
import os
import requests as http_requests

SECRET_KEY = os.getenv('FORUM_SECRET_KEY', 'weatherguardtn-admin-secret-2026')
ALGORITHM = 'HS256'

from pydantic import BaseModel

class DryRunInput(BaseModel):
    text: str

class BatchTestInput(BaseModel):
    reasons: list[str]

class PriorityFeedbackInput(BaseModel):
    input_text: str
    ai_predicted_priority: str
    ai_predicted_score: int
    ai_probabilities: str | None = None
    admin_corrected_priority: str
    notes: str | None = None
    admin_email: str | None = None

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

SUPERSET_BASE = os.getenv("SUPERSET_BASE", "http://superset:8088")
SUPERSET_LOGIN = os.getenv("SUPERSET_LOGIN_USER", "admin")
SUPERSET_PASSWORD = os.getenv("SUPERSET_LOGIN_PASSWORD", "admin123")
SUPERSET_DASHBOARD_ID = os.getenv("SUPERSET_DASHBOARD_ID", "2")


@router.get("/superset/guest-token")
def get_superset_guest_token(_=Depends(require_admin)):
    """Get an embedded guest token and embedded UUID for the Superset dashboard."""
    try:
        sess = http_requests.Session()

        r = sess.post(
            f"{SUPERSET_BASE}/api/v1/security/login",
            json={
                "username": SUPERSET_LOGIN,
                "password": SUPERSET_PASSWORD,
                "provider": "db",
                "refresh": True,
            },
            timeout=10,
        )
        r.raise_for_status()
        access_token = r.json()["access_token"]

        sess.headers.update({"Authorization": f"Bearer {access_token}"})

        r = sess.get(f"{SUPERSET_BASE}/api/v1/security/csrf_token", timeout=10)
        r.raise_for_status()
        csrf_token = r.json()["result"]

        guest_resp = sess.post(
            f"{SUPERSET_BASE}/api/v1/security/guest_token/",
            headers={
                "X-CSRFToken": csrf_token,
                "Referer": f"{SUPERSET_BASE}/",
            },
            json={
                "user": {"username": "admin", "first_name": "Admin", "last_name": ""},
                "resources": [{"type": "dashboard", "id": SUPERSET_DASHBOARD_ID}],
                "rls": [],
            },
            timeout=10,
        )
        guest_resp.raise_for_status()
        guest_token = guest_resp.json()

        embedded_uuid = None
        try:
            r = sess.get(
                f"{SUPERSET_BASE}/api/v1/dashboard/{SUPERSET_DASHBOARD_ID}/embedded",
                timeout=10,
            )
            if r.ok:
                embedded_data = r.json()
                if isinstance(embedded_data, dict):
                    result = embedded_data.get("result") or embedded_data
                    if isinstance(result, dict):
                        embedded_uuid = result.get("uuid")
        except Exception:
            pass

        return {
            "token": guest_token.get("token", guest_token),
            "embedded_uuid": embedded_uuid,
        }
    except Exception as e:
        raise HTTPException(502, f"Superset guest token failed: {str(e)}")


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

@router.post("/priority/dry-run")
def dry_run_priority(body: DryRunInput, _=Depends(require_admin)):
    """Test AI priority classification on arbitrary text without saving."""
    result = test_custom_text(body.text)
    return result

@router.get("/priority/model-info")
def model_info(_=Depends(require_admin)):
    """Get model evaluation metrics and information."""
    return evaluate_model()

@router.post("/priority/batch-test")
def batch_test(body: BatchTestInput, _=Depends(require_admin)):
    """Test AI on multiple texts at once."""
    results = []
    for text in body.reasons:
        r = test_custom_text(text)
        results.append(r)
    return {
        "total": len(results),
        "distribution": {
            "high": sum(1 for r in results if r["priority"] == "high"),
            "medium": sum(1 for r in results if r["priority"] == "medium"),
            "low": sum(1 for r in results if r["priority"] == "low"),
        },
        "avg_confidence": round(sum(r["score"] for r in results) / max(len(results), 1), 1),
        "results": results,
    }

@router.post("/priority/feedback")
def log_feedback(body: PriorityFeedbackInput, admin=Depends(require_admin)):
    """Log admin feedback on AI priority classification for model improvement."""
    db = SessionLocal()
    try:
        fb = PriorityFeedback(
            input_text=body.input_text,
            ai_predicted_priority=body.ai_predicted_priority,
            ai_predicted_score=body.ai_predicted_score,
            ai_probabilities=body.ai_probabilities,
            admin_corrected_priority=body.admin_corrected_priority,
            notes=body.notes,
            admin_email=body.admin_email or admin.email,
        )
        db.add(fb)
        db.commit()
        db.refresh(fb)
        return {"success": True, "id": str(fb.id)}
    except Exception as e:
        db.rollback()
        raise HTTPException(500, str(e))
    finally:
        db.close()

@router.get("/priority/feedback")
def list_feedback(limit: int = 50, used: bool | None = None, _=Depends(require_admin)):
    """List logged priority feedback entries."""
    db = SessionLocal()
    try:
        q = db.query(PriorityFeedback).order_by(PriorityFeedback.created_at.desc())
        if used is not None:
            q = q.filter(PriorityFeedback.is_used_in_training == used)
        entries = q.limit(limit).all()
        return [{
            "id": str(e.id),
            "input_text": e.input_text[:100],
            "ai_predicted_priority": e.ai_predicted_priority,
            "ai_predicted_score": e.ai_predicted_score,
            "admin_corrected_priority": e.admin_corrected_priority,
            "notes": e.notes,
            "admin_email": e.admin_email,
            "is_used_in_training": e.is_used_in_training,
            "created_at": e.created_at.isoformat() if e.created_at else None,
        } for e in entries]
    finally:
        db.close()

@router.post("/priority/retrain")
def retrain_priority_model(_=Depends(require_admin)):
    """Retrain the priority classifier with all unused feedback data."""
    db = SessionLocal()
    try:
        feedback_entries = db.query(PriorityFeedback).filter(
            PriorityFeedback.is_used_in_training == False
        ).all()
        feedback_data = [
            {"input_text": fb.input_text, "admin_corrected_priority": fb.admin_corrected_priority}
            for fb in feedback_entries
        ]
        result = retrain_model(feedback_data)
        if result["success"]:
            for fb in feedback_entries:
                fb.is_used_in_training = True
            db.commit()
        return result
    except Exception as e:
        db.rollback()
        raise HTTPException(500, str(e))
    finally:
        db.close()

@router.get("/test/demo-cases")
def demo_test_cases(_=Depends(require_admin)):
    """Return curated test cases for the moderation test page."""
    test_cases = [
        {"text": "This user posted my private phone number and home address without consent. I feel unsafe.", "expected": "high"},
        {"text": "Death threats and violent language in the comments section", "expected": "high"},
        {"text": "Hate speech targeting people based on their religion", "expected": "high"},
        {"text": "Someone is planning to cause physical harm to others in the community", "expected": "high"},
        {"text": "This post contains false information about the upcoming storm in Tunis", "expected": "medium"},
        {"text": "User is spreading rumors about the flood damage that are not true", "expected": "medium"},
        {"text": "This comment is rude and disrespectful but not threatening", "expected": "medium"},
        {"text": "Suspicious account activity, possible bot or fake account", "expected": "medium"},
        {"text": "Minor typo in the post title, just letting you know", "expected": "low"},
        {"text": "This is just spam advertising a weather product, nothing dangerous", "expected": "low"},
        {"text": "Small formatting issue with the image placement", "expected": "low"},
        {"text": "The post is in the wrong category, should be under alerts", "expected": "medium"},
        {"text": "Child safety concern - inappropriate content targeting minors", "expected": "high"},
        {"text": "Fraud alert - someone is impersonating an admin and asking for money", "expected": "high"},
        {"text": "Duplicate post, already been shared by another user last week", "expected": "low"},
    ]
    return [{"id": i + 1, **tc} for i, tc in enumerate(test_cases)]
