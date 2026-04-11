"""
backend/forum/schemas.py
Pydantic v2 request / response schemas for the forum feature.
"""
from __future__ import annotations
from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, EmailStr, field_validator, model_validator


# ─────────────────────────────────────────────
# Auth / Users
# ─────────────────────────────────────────────
class UserRegister(BaseModel):
    username:     str
    email:        EmailStr
    password:     str
    display_name: Optional[str] = None
    governorate:  Optional[str] = None

    @field_validator("password")
    @classmethod
    def password_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

    @field_validator("username")
    @classmethod
    def username_alnum(cls, v: str) -> str:
        if not v.replace("_", "").replace("-", "").isalnum():
            raise ValueError("Username may only contain letters, digits, _ and -")
        return v.lower()


class UserLogin(BaseModel):
    email:    EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token:  str
    refresh_token: str
    token_type:    str = "bearer"


class UserPublic(BaseModel):
    id:           UUID
    username:     str
    display_name: Optional[str]
    avatar_url:   Optional[str]
    bio:          Optional[str]
    governorate:  Optional[str]
    role:         str
    created_at:   datetime

    model_config = {"from_attributes": True}


class UserProfile(UserPublic):
    followers_count: int = 0
    following_count: int = 0
    posts_count:     int = 0
    is_following:    bool = False
    is_blocked:      bool = False


class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    bio:          Optional[str] = None
    governorate:  Optional[str] = None
    avatar_url:   Optional[str] = None


# ─────────────────────────────────────────────
# Posts
# ─────────────────────────────────────────────
class PostCreate(BaseModel):
    title:       str
    body:        str
    category:    str
    governorate: Optional[str] = None
    risk_level:  Optional[str] = "green"
    image_url:   Optional[str] = None

    @field_validator("category")
    @classmethod
    def valid_category(cls, v: str) -> str:
        allowed = {"school_closure","community_aid","infrastructure","weather_alert","other"}
        if v not in allowed:
            raise ValueError(f"Category must be one of {allowed}")
        return v

    @field_validator("risk_level")
    @classmethod
    def valid_risk(cls, v: str) -> str:
        allowed = {"green","yellow","orange","red","purple"}
        if v not in allowed:
            raise ValueError(f"risk_level must be one of {allowed}")
        return v


class PostUpdate(BaseModel):
    title:       Optional[str] = None
    body:        Optional[str] = None
    category:    Optional[str] = None
    governorate: Optional[str] = None
    risk_level:  Optional[str] = None
    image_url:   Optional[str] = None


class AICheckResult(BaseModel):
    approved:   bool
    reason:     str
    confidence: str  # "high" | "medium" | "low"


class PostOut(BaseModel):
    id:             UUID
    title:          str
    body:           str
    category:       str
    governorate:    Optional[str]
    risk_level:     str
    image_url:      Optional[str]
    ai_approved:    bool
    ai_reason:      Optional[str]
    likes_count:    int
    comments_count: int
    shares_count:   int
    is_published:   bool
    created_at:     datetime
    author:         UserPublic
    is_liked:       bool = False

    model_config = {"from_attributes": True}


# ─────────────────────────────────────────────
# Comments
# ─────────────────────────────────────────────
class CommentCreate(BaseModel):
    body:      str
    parent_id: Optional[UUID] = None

    @field_validator("body")
    @classmethod
    def body_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Comment body cannot be empty")
        return v


class CommentOut(BaseModel):
    id:          UUID
    body:        str
    ai_approved: bool
    ai_reason:   Optional[str]
    likes_count: int
    parent_id:   Optional[UUID]
    created_at:  datetime
    author:      UserPublic
    replies:     List["CommentOut"] = []
    is_liked:    bool = False

    model_config = {"from_attributes": True}

CommentOut.model_rebuild()


# ─────────────────────────────────────────────
# Interactions
# ─────────────────────────────────────────────
class ReportCreate(BaseModel):
    reason: Optional[str] = None


class MessageResponse(BaseModel):
    message: str


# ─────────────────────────────────────────────
# Notifications
# ─────────────────────────────────────────────
class NotificationOut(BaseModel):
    id:         UUID
    type:       str
    message:    Optional[str]
    is_read:    bool
    created_at: datetime
    actor:      Optional[UserPublic]
    post_id:    Optional[UUID]
    comment_id: Optional[UUID]

    model_config = {"from_attributes": True}


class PaginatedPosts(BaseModel):
    items:   List[PostOut]
    total:   int
    page:    int
    size:    int
    pages:   int


class PaginatedComments(BaseModel):
    items: List[CommentOut]
    total: int
