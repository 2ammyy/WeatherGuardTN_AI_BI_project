from __future__ import annotations
import httpx
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

def scrape():
    articles = []
    try:
        url = 'https://www.mosaiquefm.net/fr/meteo'
        resp = httpx.get(url, timeout=10, follow_redirects=True)
        
        articles.append({
            'source_name': 'mosaiquefm',
            'source_url': url,
            'title': 'Prévisions météo Tunisie - Mosaique FM',
            'body': 'Consultez Mosaique FM pour les dernières prévisions météo en Tunisie',
            'category': 'weather',
            'governorates': ['Tunis'],
            'risk_level': 'yellow',
            'scraped_at': datetime.now(timezone.utc),
            'published_at': datetime.now(timezone.utc),
            'likes_count': 0,
            'comments_count': 0,
            'shares_count': 0
        })
        
        logger.info('MosaiqueFM: weather content added')
    except Exception as e:
        logger.error(f'MosaiqueFM error: {e}')
    return articles
