from __future__ import annotations
import logging
import requests
from bs4 import BeautifulSoup
from datetime import datetime, timezone
from app.scraper.governorate_mapper import extract_governorates, assess_risk

logger = logging.getLogger(__name__)

WEATHER_KEYWORDS = [
    'طقس', 'مطر', 'رياح', 'عواصف', 'حرارة', 'برد', 'ثلوج', 'فيضانات', 'منخفض جوي',
    'meteo', 'pluie', 'vent', 'tempete', 'chaleur', 'froid', 'neige', 'inondation',
]

EXCLUDE_KEYWORDS = [
    'foot', 'football', 'match', 'ligue', 'club', 'espérance', 'étoile',
    'politique', 'gouvernement', 'président', 'élection',
]


def scrape():
    articles = []
    urls = [
        ('https://www.jawharafm.net/ar/', 'ar'),
        ('https://www.jawharafm.net/fr/', 'fr'),
    ]

    for base_url, lang in urls:
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
                if title in [a.get_text(strip=True) for a in articles[:10]]:
                    continue

                combined = title.lower()
                if any(kw in combined for kw in EXCLUDE_KEYWORDS):
                    continue
                if not any(kw.lower() in combined for kw in WEATHER_KEYWORDS):
                    continue

                full_url = href if href.startswith('http') else base_url.rstrip('/') + href
                governorates = extract_governorates(title)
                risk_level = assess_risk(title)
                category = 'alert' if risk_level in ('red', 'orange', 'purple') else 'weather'

                articles.append({
                    'source_name': 'jawharafm',
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

            logger.info(f'JawharaFM ({base_url}): found {len(articles)} relevant')
        except Exception as e:
            logger.error(f'JawharaFM error ({base_url}): {e}')

    return articles[:10]
