from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from app.database import get_db
from sqlalchemy import text
from app.scraper.scheduler import run_all_scrapers

router = APIRouter(prefix="/api/news", tags=["news"])

def _row_to_dict(row):
    return {
        "id": str(row[0]),
        "title": row[1] or "No title",
        "body": row[2] or "",
        "source": row[3] or "Unknown",
        "category": row[4] or "meteo",
        "risk_level": row[5] or "green",
        "governorates": row[6] if row[6] else [],
        "published_at": row[7].isoformat() if row[7] else None,
        "scraped_at": row[8].isoformat() if row[8] else None,
        "source_url": row[9] if len(row) > 9 else "",
    }

CATEGORY_LABELS = {
    "meteo": "Météo",
    "weather": "Météo",
    "alert": "Alerte",
    "infrastructure": "Infrastructure",
    "school_closure": "Fermeture d'école",
    "community_aid": "Aide communautaire",
    "climate": "Climat",
    "climate_change": "Climat",
    "risk": "Risques",
}

CATEGORY_ICONS = {
    "meteo": "🌦",
    "weather": "🌤",
    "alert": "🚨",
    "infrastructure": "🏗",
    "school_closure": "🏫",
    "community_aid": "🤝",
    "climate": "🌍",
    "climate_change": "🌍",
    "risk": "⚠",
}

RELEVANT_CATEGORIES = [
    "weather", "climate_change", "infrastructure",
    "school_closure", "risk", "meteo", "alert",
]

@router.get("/")
async def get_all_news(db: Session = Depends(get_db)):
    """Get all news articles from database"""
    try:
        result = db.execute(text("""
            SELECT id, title, body, source_name, category, risk_level, 
                   governorates, published_at, scraped_at, source_url
            FROM news_articles 
            ORDER BY published_at DESC 
            LIMIT 50
        """))
        
        articles = [_row_to_dict(row) for row in result]
        count_result = db.execute(text("SELECT COUNT(*) FROM news_articles"))
        total = count_result.scalar()
        
        return {
            "success": True,
            "articles": articles,
            "total": total,
        }
        
    except Exception as e:
        return {"success": False, "error": str(e), "articles": []}

@router.get("/relevant")
async def get_relevant_news(db: Session = Depends(get_db)):
    """Get news related to weather, infrastructure, school closures, community aid, alerts"""
    try:
        placeholders = ", ".join([f"'{c}'" for c in RELEVANT_CATEGORIES])
        result = db.execute(text(f"""
            SELECT id, title, body, source_name, category, risk_level, 
                   governorates, published_at, scraped_at, source_url
            FROM news_articles 
            WHERE category IN ({placeholders})
            ORDER BY published_at DESC 
            LIMIT 30
        """))
        
        articles = [_row_to_dict(row) for row in result]
        
        # Enrich with display labels
        for a in articles:
            a["category_label"] = CATEGORY_LABELS.get(a["category"], a["category"])
            a["category_icon"] = CATEGORY_ICONS.get(a["category"], "📰")
        
        return {
            "success": True,
            "articles": articles,
            "count": len(articles),
        }
    except Exception as e:
        return {"success": False, "error": str(e), "articles": []}

@router.get("/alerts")
async def get_alerts(db: Session = Depends(get_db)):
    """Get high-risk news alerts (orange, red, purple)"""
    try:
        result = db.execute(text("""
            SELECT id, title, body, source_name, category, risk_level, 
                   governorates, published_at, scraped_at, source_url
            FROM news_articles 
            WHERE risk_level IN ('orange', 'red', 'purple')
            ORDER BY published_at DESC 
            LIMIT 20
        """))
        
        articles = [_row_to_dict(row) for row in result]
        for a in articles:
            a["category_label"] = CATEGORY_LABELS.get(a["category"], a["category"])
            a["category_icon"] = CATEGORY_ICONS.get(a["category"], "📰")
        
        return {"success": True, "articles": articles, "count": len(articles)}
    except Exception as e:
        return {"success": False, "error": str(e), "articles": []}

@router.get("/by-region/{governorate}")
async def get_news_by_region(governorate: str, db: Session = Depends(get_db)):
    """Get news articles filtered by governorate/region"""
    try:
        result = db.execute(text("""
            SELECT id, title, body, source_name, category, risk_level, 
                   governorates, published_at, scraped_at, source_url
            FROM news_articles 
            WHERE :gov = ANY(governorates)
            ORDER BY published_at DESC 
            LIMIT 30
        """), {"gov": governorate})
        
        articles = [_row_to_dict(row) for row in result]
        for a in articles:
            a["category_label"] = CATEGORY_LABELS.get(a["category"], a["category"])
            a["category_icon"] = CATEGORY_ICONS.get(a["category"], "📰")
        
        return {"success": True, "articles": articles, "governorate": governorate, "count": len(articles)}
    except Exception as e:
        return {"success": False, "error": str(e), "articles": []}

@router.post("/scrape-now")
async def scrape_now(background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Manually trigger all scrapers to fetch fresh news."""
    background_tasks.add_task(run_all_scrapers)
    return {
        "success": True,
        "message": "Scrapers started in background. New articles will appear shortly."
    }
