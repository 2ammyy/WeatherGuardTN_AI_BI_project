from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from sqlalchemy import text

router = APIRouter(prefix="/api/news", tags=["news"])

@router.get("/test")
async def test():
    """Test endpoint to verify news route is working"""
    return {
        "success": True,
        "message": "News API is working!",
        "endpoints": ["/api/news", "/api/news/test", "/api/news/weather"]
    }

@router.get("/")
async def get_all_news(db: Session = Depends(get_db)):
    """Get all news articles from database"""
    try:
        # Query all news articles
        result = db.execute(text("""
            SELECT id, title, body, source_name, category, risk_level, 
                   governorates, published_at
            FROM news_articles 
            ORDER BY published_at DESC 
            LIMIT 50
        """))
        
        articles = []
        for row in result:
            articles.append({
                "id": str(row[0]),
                "title": row[1] or "No title",
                "body": (row[2][:300] + "...") if row[2] and len(row[2]) > 300 else (row[2] or ""),
                "source": row[3] or "Meteo Tunisia",
                "category": row[4] or "weather",
                "risk_level": row[5] or "green",
                "governorates": row[6] if row[6] else ["Tunis"],
                "published_at": row[7].isoformat() if row[7] else None
            })
        
        # Get total count
        count_result = db.execute(text("SELECT COUNT(*) FROM news_articles"))
        total = count_result.scalar()
        
        return {
            "success": True,
            "articles": articles,
            "total": total,
            "message": f"Found {total} news articles"
        }
        
    except Exception as e:
        print(f"Error in news endpoint: {e}")
        return {
            "success": False,
            "error": str(e),
            "articles": []
        }

@router.get("/weather")
async def get_weather_news(db: Session = Depends(get_db)):
    """Get weather-related news only"""
    try:
        result = db.execute(text("""
            SELECT id, title, body, source_name, category, risk_level, 
                   governorates, published_at
            FROM news_articles 
            WHERE category IN ('meteo', 'weather', 'climate', 'alerts')
            ORDER BY published_at DESC 
            LIMIT 20
        """))
        
        articles = []
        for row in result:
            articles.append({
                "id": str(row[0]),
                "title": row[1],
                "body": (row[2][:250] + "...") if row[2] and len(row[2]) > 250 else (row[2] or ""),
                "source": row[3] or "Meteo Tunisia",
                "category": row[4],
                "risk_level": row[5] or "green",
                "governorates": row[6] if row[6] else ["Tunis"],
                "published_at": row[7].isoformat() if row[7] else None
            })
        
        return {
            "success": True,
            "articles": articles,
            "count": len(articles)
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "articles": []
        }
