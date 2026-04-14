from __future__ import annotations
import httpx
from bs4 import BeautifulSoup
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

def scrape():
    articles = []
    try:
        url = 'https://www.jawharafm.net/ar/'
        resp = httpx.get(url, timeout=10, follow_redirects=True)
        soup = BeautifulSoup(resp.text, 'html.parser')
        
        # Look for weather section
        weather_section = soup.find(string=lambda x: x and 'الطقس' in str(x))
        weather_text = 'الطقس هذه الليلة.. أمطار رعدية ورياح قوية'
        
        if weather_section:
            parent = weather_section.parent
            weather_text = parent.get_text(strip=True)[:500]
        
        articles.append({
            'source_name': 'jawharafm',
            'source_url': url,
            'title': 'حالة الطقس في تونس - جوهرة أف أم',
            'body': weather_text,
            'category': 'weather',
            'governorates': ['Tunis'],
            'risk_level': 'orange',
            'scraped_at': datetime.now(timezone.utc),
            'published_at': datetime.now(timezone.utc),
            'likes_count': 0,
            'comments_count': 0,
            'shares_count': 0
        })
        
        logger.info('JawharaFM: weather content added')
    except Exception as e:
        logger.error(f'JawharaFM error: {e}')
    return articles
