from app.database import SessionLocal
from sqlalchemy import text
db = SessionLocal()
result = db.execute(text('SELECT id, title, source_name, category FROM news_articles ORDER BY id DESC LIMIT 10'))
print('Recent articles in database:')
for row in result:
    print(f'  ID:{row[0]} - {row[1]} (Source: {row[2]}, Category: {row[3]})')
db.close()
