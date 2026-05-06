from __future__ import annotations
import feedparser
import logging
from datetime import datetime, timezone
from app.scraper.governorate_mapper import extract_governorates, assess_risk

logger = logging.getLogger(__name__)

FEED_URLS = [
    'https://businessnews.com.tn/feed/',
]

WEATHER_KEYWORDS = [
    'météo', 'meteo', 'pluie', 'vent', 'tempête', 'orage',
    'chaleur', 'froid', 'canicule', 'neige', 'intempérie',
    'prévisions', 'forecast', 'weather', 'storm', 'rain',
    'temperature', 'humidité', 'gel', 'brouillard', 'poussière',
    'sable', 'nuage', 'soleil', 'degré', 'indice uv',
]

CLIMATE_KEYWORDS = [
    'changement climatique', 'climate change', 'réchauffement',
    'global warming', 'gaz à effet de serre', 'greenhouse gas',
    'désertification', 'sécheresse', 'drought',
    'transition énergétique', 'energy transition',
    'cop28', 'cop29', 'accord de paris', 'paris agreement',
    'empreinte carbone', 'carbon footprint',
    'biodiversité', 'biodiversity',
]

INFRASTRUCTURE_KEYWORDS = [
    'route coupée', 'route fermée', 'road closed',
    'pont endommagé', 'bridge damage', 'autoroute',
    'échangeur', 'inondation', 'inond',
    'flood', 'égout', 'drainage', 'canalisation',
    'effondrement', 'collapse',
    'glissement de terrain', 'landslide', 'éboulement',
    'dégâts matériels', 'dégâts', 'destruction',
]

SCHOOL_KEYWORDS = [
    'suspension des cours', 'fermeture école', 'school closure',
    'écoles fermées', 'école fermée', 'suspension cours',
    'classes annulées', 'class cancelled', 'établissement scolaire',
    'établissements scolaires', 'écoles primaires',
    'crèches', 'jardins d enfants',
]

RISK_KEYWORDS = [
    'vigilance météo', 'vigilance orange', 'vigilance rouge', 'vigilance jaune',
    'vague', 'houle', 'mer agitée', 'rough sea',
    'marée', 'tsunami', 'ouragan', 'cyclone', 'tornade', 'tornado',
    'crue', 'oued déborde', 'oued en crue',
    'glissement de terrain', 'landslide',
    'risque maritime', 'navigation', 'pêche', 'coastal',
    'côtier', 'érosion', 'érosion côtière',
    'noyade', 'noyades', 'incendie de forêt',
    'protection civile', 'catastrophe naturelle',
    'tempête', 'orage violent', 'pluie diluvienne',
    'vent fort', 'vent violent', 'rafale',
]

EXCLUDE_KEYWORDS = [
    'ukraine', 'russie', 'israël', 'palestine', 'gaza',
    'élections', 'élection', 'parlement', 'ministre',
    'foot', 'football', 'ligue', 'club africain', 'espérance',
    'étoile sportive', 'cs sfaxien', 'stade', 'match',
    'incendie au parc', 'tentative d incendie',
    'attentat', 'drone', 'militaire', 'armée', 'guerre',
    'emirats', 'iran', 'états-unis', 'chine', 'corée',
    'politique', 'gouvernement', 'président',
]


def classify_article(text: str) -> str:
    """Classify article into one of the 5 target categories."""
    lower = text.lower()

    if any(kw in lower for kw in EXCLUDE_KEYWORDS):
        return None

    if any(kw in lower for kw in SCHOOL_KEYWORDS):
        return 'school_closure'

    if any(kw in lower for kw in INFRASTRUCTURE_KEYWORDS):
        return 'infrastructure'

    if any(kw in lower for kw in CLIMATE_KEYWORDS):
        return 'climate_change'

    if any(kw in lower for kw in RISK_KEYWORDS):
        return 'risk'

    if any(kw in lower for kw in WEATHER_KEYWORDS):
        return 'weather'

    return None


def scrape():
    articles = []
    for feed_url in FEED_URLS:
        try:
            feed = feedparser.parse(feed_url)

            for entry in feed.entries[:40]:
                title = entry.get('title', '').strip()
                if not title:
                    continue
                combined = title + ' ' + entry.get('summary', '')

                category = classify_article(combined)
                if not category:
                    continue

                summary = entry.get('summary', entry.get('description', ''))
                link = entry.get('link', '')
                pub_date = None
                if hasattr(entry, 'published_parsed') and entry.published_parsed:
                    from calendar import timegm
                    pub_date = datetime.fromtimestamp(timegm(entry.published_parsed), tz=timezone.utc)

                governorates = extract_governorates(combined)
                risk_level = assess_risk(combined)

                articles.append({
                    'source_name': 'businessnews',
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
            logger.info(f'BusinessNews ({feed_url}): found {len(feed.entries)} entries, {len(articles)} relevant')
        except Exception as e:
            logger.error(f'BusinessNews error ({feed_url}): {e}')
    return articles
