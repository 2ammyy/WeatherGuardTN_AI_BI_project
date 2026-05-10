from app.database import SessionLocal
from sqlalchemy import inspect
db = SessionLocal()
inspector = inspect(db.bind)
columns = inspector.get_columns('news_articles')
print('Current columns in news_articles:')
for col in columns:
    print(f'  - {col["name"]}')
db.close()
