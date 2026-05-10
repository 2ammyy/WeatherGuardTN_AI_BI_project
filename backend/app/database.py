from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# Use the environment variable we set in docker-compose
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://weatheruser:weatherpass@db:5432/weatherguard")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# THIS IS THE MISSING LINE:
Base = declarative_base() 

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()