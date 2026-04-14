from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from sqlalchemy import text

router = APIRouter(prefix="/api/public", tags=["public"])

@router.get("/weather-news")
def get_weather_news(db: Session = Depends(get_db)):
    # Public endpoint to get weather news without authentication
    result = db.execute(text('''
        SELECT id, title, body, source_name, category, risk_level, 
               governorates, published_at, scraped_at
        FROM news_articles 
        WHERE category IN ('meteo', 'weather')
        ORDER BY published_at DESC 
        LIMIT 20
    '''))
    
    articles = []
    for row in result:
        articles.append({
            "id": str(row[0]),
            "title": row[1],
            "body": row[2][:500] if row[2] else "",
            "source": row[3],
            "category": row[4],
            "risk_level": row[5] or "green",
            "governorates": row[6] if row[6] else ["Tunis"],
            "published_at": row[7].isoformat() if row[7] else None,
            "scraped_at": row[8].isoformat() if row[8] else None
        })
    
    return {"articles": articles}
