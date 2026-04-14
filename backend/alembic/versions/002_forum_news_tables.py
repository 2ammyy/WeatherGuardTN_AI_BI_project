"""
backend/alembic/versions/002_forum_news_tables.py
Alembic migration — adds all WeatherGuardTN forum/news tables.
Run: alembic upgrade head
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision  = "002_forum_news"
down_revision = "001_initial"    # ← replace with your actual previous revision id
branch_labels = None
depends_on    = None


def upgrade():
    # ── news_articles ─────────────────────────────────────────────────────
    op.create_table(
        "news_articles",
        sa.Column("id",            postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("source_name",   sa.String(100), nullable=False),
        sa.Column("source_url",    sa.Text,        nullable=False, unique=True),
        sa.Column("title",         sa.String(400), nullable=False),
        sa.Column("body",          sa.Text),
        sa.Column("category",      sa.String(50),  server_default="meteo"),
        sa.Column("governorates",  postgresql.ARRAY(sa.String)),
        sa.Column("risk_level",    sa.String(20),  server_default="green"),
        sa.Column("scraped_at",    sa.DateTime(timezone=True)),
        sa.Column("published_at",  sa.DateTime(timezone=True)),
        sa.Column("likes_count",   sa.Integer, server_default="0"),
        sa.Column("comments_count",sa.Integer, server_default="0"),
        sa.Column("shares_count",  sa.Integer, server_default="0"),
    )
    op.create_index("ix_news_articles_scraped_at", "news_articles", ["scraped_at"])
    op.create_index("ix_news_articles_risk_level", "news_articles", ["risk_level"])

    # ── news_reactions ────────────────────────────────────────────────────
    op.create_table(
        "news_reactions",
        sa.Column("article_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("news_articles.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("user_id",    postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("forum_users.id",  ondelete="CASCADE"), primary_key=True),
        sa.Column("emoji",      sa.String(10), server_default="👍"),
        sa.Column("created_at", sa.DateTime(timezone=True)),
    )

    # ── news_shares ───────────────────────────────────────────────────────
    op.create_table(
        "news_shares",
        sa.Column("id",         postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("article_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("news_articles.id", ondelete="CASCADE")),
        sa.Column("user_id",    postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("forum_users.id",  ondelete="CASCADE")),
        sa.Column("created_at", sa.DateTime(timezone=True)),
    )

    # ── news_comments ─────────────────────────────────────────────────────
    op.create_table(
        "news_comments",
        sa.Column("id",            postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("article_id",    postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("news_articles.id",  ondelete="CASCADE"), nullable=False),
        sa.Column("author_id",     postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("forum_users.id",    ondelete="CASCADE"), nullable=False),
        sa.Column("parent_id",     postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("news_comments.id",  ondelete="CASCADE"), nullable=True),
        sa.Column("body",          sa.Text, nullable=False),
        sa.Column("ai_approved",   sa.Boolean, server_default="false"),
        sa.Column("ai_reason",     sa.Text),
        sa.Column("ai_checked_at", sa.DateTime(timezone=True)),
        sa.Column("is_deleted",    sa.Boolean, server_default="false"),
        sa.Column("likes_count",   sa.Integer, server_default="0"),
        sa.Column("created_at",    sa.DateTime(timezone=True)),
        sa.Column("updated_at",    sa.DateTime(timezone=True)),
    )

    # ── news_comment_likes ────────────────────────────────────────────────
    op.create_table(
        "news_comment_likes",
        sa.Column("comment_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("news_comments.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("user_id",    postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("forum_users.id",   ondelete="CASCADE"), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True)),
    )

    # ── Add occupation column to forum_users ──────────────────────────────
    op.add_column("forum_users", sa.Column("occupation", sa.String(50), server_default="general"))

    # ── Add article_id to notifications ───────────────────────────────────
    op.add_column(
        "notifications",
        sa.Column("article_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("news_articles.id", ondelete="CASCADE"), nullable=True)
    )


def downgrade():
    op.drop_column("notifications", "article_id")
    op.drop_column("forum_users",   "occupation")
    op.drop_table("news_comment_likes")
    op.drop_table("news_comments")
    op.drop_table("news_shares")
    op.drop_table("news_reactions")
    op.drop_index("ix_news_articles_risk_level", "news_articles")
    op.drop_index("ix_news_articles_scraped_at", "news_articles")
    op.drop_table("news_articles")