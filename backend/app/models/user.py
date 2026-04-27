from sqlalchemy import Column, DateTime, Integer, String, Boolean
from app.database import Base

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    google_id = Column(String, unique=True, nullable=True)
    email = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=True)
    password_hash = Column(String, nullable=True)
    picture = Column(String, nullable=True)
    governorate = Column(String, nullable=True)
    user_type = Column(String, nullable=True)
    last_login = Column(DateTime, nullable=True)
    is_admin = Column(Boolean, default=False)   # ← Added this line
