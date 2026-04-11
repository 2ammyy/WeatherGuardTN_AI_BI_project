"""
backend/forum/notifications.py
Creates notification rows in the DB.
Extend send_notification() to push via WebSocket or email as needed.
"""
from __future__ import annotations
from typing import Optional
from uuid import UUID

from sqlalchemy.orm import Session

from app.forum.models import Notification


NOTIFICATION_MESSAGES = {
    "post_like":             "{actor} liked your post.",
    "post_comment":          "{actor} commented on your post.",
    "post_share":            "{actor} shared your post.",
    "post_approved":         "Your post was approved by AI moderation and is now live!",
    "post_rejected":         "Your post was not approved: {reason}",
    "comment_like":          "{actor} liked your comment.",
    "new_follower":          "{actor} started following you.",
    "user_report_resolved":  "A report you submitted has been reviewed.",
    "post_report_resolved":  "A post you reported has been reviewed.",
}


def send_notification(
    db:         Session,
    *,
    user_id:    UUID,          # recipient
    type:       str,
    actor_id:   Optional[UUID] = None,
    actor_name: Optional[str]  = None,
    post_id:    Optional[UUID] = None,
    comment_id: Optional[UUID] = None,
    extra:      Optional[dict] = None,
) -> Notification:
    """
    Persist a notification.  actor_name is used only for message templating.
    """
    template = NOTIFICATION_MESSAGES.get(type, "You have a new notification.")
    fmt_kwargs: dict = {}
    if actor_name:
        fmt_kwargs["actor"] = actor_name
    if extra:
        fmt_kwargs.update(extra)
    try:
        message = template.format(**fmt_kwargs)
    except KeyError:
        message = template

    notif = Notification(
        user_id    = user_id,
        actor_id   = actor_id,
        type       = type,
        post_id    = post_id,
        comment_id = comment_id,
        message    = message,
    )
    db.add(notif)
    db.flush()          # get the id without committing the parent transaction
    return notif
