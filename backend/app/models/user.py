from sqlalchemy import Column, DateTime, Integer, String, Boolean
from app.database import Base

# class User(Base):
#     __tablename__ = "users"

#     id = Column(Integer, primary_key=True, index=True)

#     google_id = Column(String, unique=True, index=True, nullable=True)  # For Google-authenticated users    
#     email = Column(String, unique=True, index=True, nullable=False)
#     name = Column(String, nullable=False)

#     # The password should be stored as a hashed string
#     password_hash  = Column(String, nullable=False) 

#     governorate = Column(String, nullable=False)
#     situation = Column(String, nullable=False)
#     picture = Column(String, nullable=True)
#     is_active = Column(Boolean, default=True)

class User(Base):
    __tablename__ = "users"

    id            = Column(Integer, primary_key=True)
    google_id     = Column(String, unique=True, nullable=True)
    email         = Column(String, unique=True, nullable=False)
    name          = Column(String, nullable=True)
    password_hash = Column(String, nullable=True)
    picture       = Column(String, nullable=True)
    governorate   = Column(String, nullable=True)
    user_type     = Column(String, nullable=True)
    last_login    = Column(DateTime, nullable=True)