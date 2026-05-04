from __future__ import annotations
import feedparser
import logging
from datetime import datetime, timezone
from app.scraper.governorate_mapper import extract_governorates, assess_risk

logger = logging.getLogger(__name__)

FEED_URLS = [
    'https://www.shemsfm.net/ar/rss',
]

def scrape():
    articles = []
    for feed_url in FEED_URLS:
        try:
            feed = feedparser.parse(feed_url)
            weather_keywords_ar = ['طقس', 'مطر', 'رياح', 'عواصف', 'حرارة', 'برد', 'ثلوج', 'فيضانات', 'منخفض جوي']
            weather_keywords_fr = ['meteo', 'pluie', 'vent', 'tempete', 'chaleur', 'froid', 'neige', 'inondation']

            for entry in feed.entries[:20]:
                title = entry.get('title', '').strip()
                if not title:
                    continue
                combined = title + ' ' + entry.get('summary', '')
                is_weather = any(kw in combined for kw in weather_keywords_ar + weather_keywords_fr)
                if not is_weather:
                    continue

                summary = entry.get('summary', entry.get('description', ''))
                link = entry.get('link', '')
                pub_date = None
                if hasattr(entry, 'published_parsed') and entry.published_parsed:
                    from calendar import timegm
                    pub_date = datetime.fromtimestamp(timegm(entry.published_parsed), tz=timezone.utc)

                governorates = extract_governorates(combined)
                risk_level = assess_risk(combined)
                category = 'alert' if risk_level in ('red', 'orange', 'purple') else 'meteo'

                articles.append({
                    'source_name': 'shemsfm',
                    'source_url': link or f'{feed_url}/{title}',
                    'title': title,
                    'body': summary,
                    'category': category,
                    'governorates': governorates if governorates else ['Tunis'],
                    'risk_level': risk_level,
                    'scraped_at': datetime.now(timezone.utc),
                    'published_at': pub_date or datetime.now(timezone.utc),
                    'likes_count': 0,
                    'comments_count': 0,
                    'shares_count': 0,
                })
            logger.info(f'ShemsFM ({feed_url}): found {len(feed.entries)} entries')
        except Exception as e:
            logger.error(f'ShemsFM error ({feed_url}): {e}')
    return articles
