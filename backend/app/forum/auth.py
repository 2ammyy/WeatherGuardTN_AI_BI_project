"""
backend/forum/auth.py
JWT authentication helpers for the forum.
"""
import os
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.database import get_db
from app.forum.models import ForumUser

SECRET_KEY      = os.getenv("FORUM_SECRET_KEY", "change-me-in-production-use-long-random-string")
ALGORITHM       = "HS256"
ACCESS_EXPIRE   = int(os.getenv("FORUM_ACCESS_EXPIRE_MINUTES", "60"))
REFRESH_EXPIRE  = int(os.getenv("FORUM_REFRESH_EXPIRE_DAYS",  "30"))

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/forum/auth/login")


# ── password helpers ──────────────────────────────────────────────────────────
def hash_password(plain: str) -> str:
    return pwd_ctx.hash(plain[:72])


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_ctx.verify(plain[:72], hashed)


# ── token helpers ─────────────────────────────────────────────────────────────
def _create_token(data: dict, expires_delta: timedelta) -> str:
    payload = data.copy()
    payload["exp"] = datetime.now(timezone.utc) + expires_delta
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def create_tokens(user_id: UUID) -> tuple[str, str]:
    access  = _create_token({"sub": str(user_id), "type": "access"},
                             timedelta(minutes=ACCESS_EXPIRE))
    refresh = _create_token({"sub": str(user_id), "type": "refresh"},
                             timedelta(days=REFRESH_EXPIRE))
    return access, refresh


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")


# ── dependency injection ──────────────────────────────────────────────────────
def get_current_user(
    token: str = Depends(oauth2_scheme),
    db:    Session = Depends(get_db),
) -> ForumUser:
    payload = decode_token(token)
    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid token type")
    user = db.query(ForumUser).filter(ForumUser.id == payload["sub"]).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")
    if user.is_banned:
        raise HTTPException(status_code=403, detail="Account is banned")
    return user


def get_current_user_optional(
    token: Optional[str] = Depends(oauth2_scheme),
    db:    Session = Depends(get_db),
) -> Optional[ForumUser]:
    """Use this for endpoints where auth is optional (e.g. public feed)."""
    if not token:
        return None
    try:
        return get_current_user(token, db)
    except HTTPException:
        return None


def require_moderator(user: ForumUser = Depends(get_current_user)) -> ForumUser:
    if user.role not in ("moderator", "admin"):
        raise HTTPException(status_code=403, detail="Moderator access required")
    return user


def require_admin(user: ForumUser = Depends(get_current_user)) -> ForumUser:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user
