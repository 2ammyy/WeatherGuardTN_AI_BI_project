from __future__ import annotations
import feedparser
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

def scrape():
    articles = []
    try:
        feed = feedparser.parse('https://businessnews.com.tn/feed/')
        weather_keywords = ['météo', 'meteo', 'inondation', 'tempête', 'pluie', 'vent', 'climat']
        
        for entry in feed.entries:
            title = entry.get('title', '')
            if any(keyword in title.lower() for keyword in weather_keywords):
                articles.append({
                    'source_name': 'businessnews',
                    'source_url': entry.get('link', ''),
                    'title': title,
                    'body': entry.get('description', 'No description'),
                    'category': 'weather',
                    'governorates': ['Tunis'],
                    'risk_level': 'yellow',
                    'scraped_at': datetime.now(timezone.utc),
                    'published_at': datetime.now(timezone.utc),
                    'likes_count': 0,
                    'comments_count': 0,
                    'shares_count': 0
                })
        
        if not articles:
            articles.append({
                'source_name': 'businessnews',
                'source_url': 'https://businessnews.com.tn',
                'title': 'Météo Tunisie - Dernières nouvelles',
                'body': 'Consultez BusinessNews pour les dernières actualités météo en Tunisie',
                'category': 'weather',
                'governorates': ['Tunis'],
                'risk_level': 'green',
                'scraped_at': datetime.now(timezone.utc),
                'published_at': datetime.now(timezone.utc),
                'likes_count': 0,
                'comments_count': 0,
                'shares_count': 0
            })
        
        logger.info(f'BusinessNews: found {len(articles)} articles')
    except Exception as e:
        logger.error(f'BusinessNews error: {e}')
    return articles
