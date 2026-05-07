import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Boolean, Float, Integer, DateTime
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


def utcnow():
    return datetime.now(timezone.utc)


class MLModel(Base):
    __tablename__ = "ml_models"

    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name          = Column(String(200), nullable=False, index=True)
    version       = Column(String(20), nullable=False, default="1.0")
    algorithm     = Column(String(100), nullable=False)
    description   = Column(Text)
    status        = Column(String(20), default="draft")
    score         = Column(Float)
    metrics       = Column(Text)
    hyperparams   = Column(Text)
    mlflow_run_id = Column(String(100))
    mlflow_model_uri = Column(String(500))
    file_path     = Column(String(500))
    is_active     = Column(Boolean, default=False)
    created_at    = Column(DateTime(timezone=True), default=utcnow)
    updated_at    = Column(DateTime(timezone=True), default=utcnow)
