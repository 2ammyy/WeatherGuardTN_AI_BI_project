from app.scraper import businessnews, mosaiquefm, jawharafm
from app.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()

# Create table if not exists
db.execute(text('''
    CREATE TABLE IF NOT EXISTS news_articles (
        id SERIAL PRIMARY KEY,
        title VARCHAR(500),
        body TEXT,
        source VARCHAR(100),
        category VARCHAR(50),
        url TEXT,
        published_at VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
'''))
db.commit()

# Get all articles
all_articles = []
all_articles.extend(businessnews.scrape())
all_articles.extend(mosaiquefm.scrape())
all_articles.extend(jawharafm.scrape())

# Save to database
saved = 0
for article in all_articles:
    try:
        db.execute(text('''
            INSERT INTO news_articles (title, body, source, category, url, published_at)
            VALUES (:title, :body, :source, :category, :url, :published_at)
        '''), article)
        saved += 1
    except Exception as e:
        print(f'Error: {e}')

db.commit()
print(f'Saved {saved} articles to database')

# Show count
result = db.execute(text('SELECT COUNT(*) FROM news_articles'))
print(f'Total articles in DB: {result.scalar()}')
db.close()
