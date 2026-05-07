"""
backend/forum/schemas.py
Pydantic v2 request / response schemas for the forum feature.
"""
from __future__ import annotations
from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, EmailStr, field_validator, model_validator, Field, HttpUrl


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
class PostMediaOut(BaseModel):
    id:        UUID
    file_url:  str
    file_type: str  # "image" or "video"
    mime_type: Optional[str]
    file_name: Optional[str]

    model_config = {"from_attributes": True}


class PostCreate(BaseModel):
    title:       str
    body:        str
    category:    str
    governorate: Optional[str] = None
    risk_level:  Optional[str] = "green"
    image_url:   Optional[str] = None
    media_urls:  Optional[List[str]] = None  # list of uploaded file URLs

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


class FileUploadResponse(BaseModel):
    file_url:  str
    file_type: str
    mime_type: str
    file_name: str


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
    media_urls:     List[str] = []
    media_items:    List[PostMediaOut] = []
    ai_approved:    bool
    ai_reason:      Optional[str]
    likes_count:    int
    comments_count: int
    shares_count:   int
    is_published:   bool
    created_at:     datetime
    author:         UserPublic
    is_liked:       bool = False
    liked_by:       List[UserPublic] = []
    shared_by:      List[UserPublic] = []

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
    post_title:  Optional[str] = None

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
# Messages (private user-to-user)
# ─────────────────────────────────────────────
class MessageSend(BaseModel):
    body: str = Field(..., min_length=1, max_length=5000)


class MessageOut(BaseModel):
    id:          UUID
    sender_id:   UUID
    receiver_id: UUID
    body:        str
    is_read:     bool
    created_at:  datetime

    model_config = {"from_attributes": True}


class ConversationOut(BaseModel):
    other_user: UserPublic
    last_message: Optional[MessageOut] = None
    unread_count: int = 0


class ActivityItem(BaseModel):
    type: str  # "post" | "comment" | "like" | "share" | "follow"
    post: Optional[PostOut] = None
    comment: Optional[CommentOut] = None
    target_user: Optional[UserPublic] = None
    post_title: Optional[str] = None
    created_at: datetime


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



# ─────────────────────────────────────────────
# Shared
# ─────────────────────────────────────────────
RISK_LEVELS = {"green", "yellow", "orange", "red", "purple"}
VALID_EMOJIS = {"👍", "🔥", "😮", "🙏", "😢"}
VALID_OCCUPATIONS = {"student", "fisherman", "delivery", "farmer", "authority", "general"}
 
 
# ─────────────────────────────────────────────
# Author (minimal user info embedded in responses)
# ─────────────────────────────────────────────
class AuthorOut(BaseModel):
    id:           UUID
    username:     str
    display_name: Optional[str] = None
    avatar_url:   Optional[str] = None
    governorate:  Optional[str] = None
    occupation:   Optional[str] = None
 
    model_config = {"from_attributes": True}
 
 
# ─────────────────────────────────────────────
# News Articles
# ─────────────────────────────────────────────
class NewsArticleOut(BaseModel):
    id:            UUID
    source_name:   str
    source_url:    str
    title:         str
    body:          Optional[str] = None
    category:      str
    governorates:  List[str] = []
    risk_level:    str
    published_at:  Optional[datetime] = None
    scraped_at:    datetime
    likes_count:   int = 0
    comments_count: int = 0
    shares_count:  int = 0
    # populated per-request when user is authenticated
    user_reaction: Optional[str] = None   # emoji the current user reacted with, or None
 
    model_config = {"from_attributes": True}
 
 
class NewsArticleListOut(BaseModel):
    total:    int
    page:     int
    per_page: int
    items:    List[NewsArticleOut]
 
 
# ─────────────────────────────────────────────
# Reactions
# ─────────────────────────────────────────────
class ReactionCreate(BaseModel):
    emoji: str = Field(default="👍", description="One of: 👍 🔥 😮 🙏 😢")
 
    def validate_emoji(self):
        if self.emoji not in VALID_EMOJIS:
            raise ValueError(f"emoji must be one of {VALID_EMOJIS}")
 
 
class ReactionOut(BaseModel):
    article_id: UUID
    user_id:    UUID
    emoji:      str
    created_at: datetime
 
    model_config = {"from_attributes": True}
 
 
class ReactionSummary(BaseModel):
    """Aggregated reaction counts for an article."""
    article_id: UUID
    counts:     dict[str, int]   # {"👍": 12, "🔥": 4, ...}
    user_emoji: Optional[str] = None
 
 
# ─────────────────────────────────────────────
# Comments
# ─────────────────────────────────────────────
class CommentCreate(BaseModel):
    body:      str = Field(..., min_length=3, max_length=2000)
    parent_id: Optional[UUID] = None
 
 
class NewsCommentOut(BaseModel):
    id:          UUID
    article_id:  UUID
    author:      AuthorOut
    parent_id:   Optional[UUID] = None
    body:        str
    ai_approved: bool
    ai_reason:   Optional[str] = None
    is_deleted:  bool
    likes_count: int
    created_at:  datetime
    replies:     List["NewsCommentOut"] = []

    model_config = {"from_attributes": True}


NewsCommentOut.model_rebuild()
 
 
class CommentModerationResult(BaseModel):
    approved: bool
    reason:   str
 
 
# ─────────────────────────────────────────────
# Shares
# ─────────────────────────────────────────────
class ShareOut(BaseModel):
    article_id: UUID
    user_id:    UUID
    created_at: datetime
 
    model_config = {"from_attributes": True}
 
 
# ─────────────────────────────────────────────
# Notifications
# ─────────────────────────────────────────────
class NotificationOut(BaseModel):
    id:              UUID
    type:            str
    message:         Optional[str] = None
    article_id:      Optional[UUID] = None
    post_id:         Optional[UUID] = None
    comment_id:      Optional[UUID] = None
    news_article_id: Optional[UUID] = None
    is_read:         bool
    created_at:      datetime
 
    model_config = {"from_attributes": True}
 
 
class NotificationListOut(BaseModel):
    unread_count: int
    items:        List[NotificationOut]
 
 
# ─────────────────────────────────────────────
# User profile update (for occupation/governorate)
# ─────────────────────────────────────────────
class UserProfileUpdate(BaseModel):
    display_name: Optional[str] = Field(None, max_length=100)
    bio:          Optional[str] = Field(None, max_length=500)
    governorate:  Optional[str] = Field(None, max_length=100)
    occupation:   Optional[str] = Field(None, description=f"One of: {VALID_OCCUPATIONS}")
    avatar_url:   Optional[str] = None
 
 
# ─────────────────────────────────────────────
# Scraper status (internal / admin)
# ─────────────────────────────────────────────
class ScraperRunResult(BaseModel):
    source:        str
    articles_new:  int
    articles_skip: int
    errors:        List[str] = []
    ran_at:        datetime
 