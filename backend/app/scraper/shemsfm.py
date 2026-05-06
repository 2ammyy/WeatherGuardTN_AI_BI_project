from __future__ import annotations
import logging
import requests
from bs4 import BeautifulSoup
from datetime import datetime, timezone
from app.scraper.governorate_mapper import extract_governorates, assess_risk

logger = logging.getLogger(__name__)

WEATHER_KEYWORDS = [
    'météo', 'meteo', 'pluie', 'vent', 'tempête', 'orage',
    'chaleur', 'froid', 'canicule', 'neige', 'intempérie',
    'prévisions', 'weather', 'storm', 'rain', 'temperature',
]

EXCLUDE_KEYWORDS = [
    'foot', 'football', 'match', 'ligue', 'politique', 'élection',
]


def scrape():
    articles = []
    urls = [
        'https://www.shemsfm.net/',
    ]

    for base_url in urls:
        try:
            resp = requests.get(base_url, timeout=10, headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            })
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, 'html.parser')

            for a_tag in soup.find_all('a', href=True):
                href = a_tag.get('href', '')
                title = a_tag.get_text(strip=True)
                if not title or len(title) < 10:
                    continue

                combined = title.lower()
                if any(kw in combined for kw in EXCLUDE_KEYWORDS):
                    continue
                if not any(kw in combined for kw in WEATHER_KEYWORDS):
                    continue

                full_url = href if href.startswith('http') else base_url.rstrip('/') + '/' + href.lstrip('/')
                governorates = extract_governorates(title)
                risk_level = assess_risk(title)

                category = 'weather'
                articles.append({
                    'source_name': 'shemsfm',
                    'source_url': full_url,
                    'title': title,
                    'body': '',
                    'category': category,
                    'governorates': governorates if governorates else ['Tunis'],
                    'risk_level': risk_level,
                    'scraped_at': datetime.now(timezone.utc),
                    'published_at': datetime.now(timezone.utc),
                    'likes_count': 0,
                    'comments_count': 0,
                    'shares_count': 0,
                })

            logger.info(f'ShemsFM ({base_url}): found {len(articles)} relevant')
        except Exception as e:
            logger.error(f'ShemsFM error ({base_url}): {e}')

    return articles[:10]
