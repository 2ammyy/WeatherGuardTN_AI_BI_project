from __future__ import annotations
import feedparser
import logging
import requests
import json
from bs4 import BeautifulSoup
from datetime import datetime, timezone
from app.scraper.governorate_mapper import extract_governorates, assess_risk

logger = logging.getLogger(__name__)

FEED_URLS = [
    'https://www.mosaiquefm.net/fr/rss',
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
    'coupure', 'électricité', 'eau potable', 'panne',
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
    'secousse', 'séisme', 'tremblement de terre',
    'sismique', 'magnitude', 'tellurique',
    'accident', 'collision', 'blessé', 'blessés',
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
    'tennis', 'sabalenka', 'handball', 'bac blanc',
    'détroit', 'trump', 'pétrole', 'inflation',
    'cancer', 'hôpital', 'transplant', 'médical',
    'naturalisation', 'passeport', 'dossier',
    'chiboub', 'démission', 'fonctions',
    'don d organes', 'cœur', 'reins',
    'tunisair', 'hajj', 'bagage',
    'ligue des champions', 'arsenal', 'bayern', 'psg',
    'libération', 'wadie', 'jary', 'caméras',
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


def is_relevant(text: str) -> bool:
    return classify_article(text) is not None


def fetch_full_article(url: str) -> str:
    """Fetch full article content from MosaiqueFM Next.js page."""
    try:
        resp = requests.get(url, timeout=10, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, 'html.parser')

        script = soup.find('script', id='__NEXT_DATA__')
        if script:
            data = json.loads(script.string)
            pagedata = data.get('props', {}).get('pageProps', {}).get('pagedata', {})
            article = pagedata.get('article', {})
            desc = article.get('description', '')
            if desc and len(desc) > 30:
                desc_soup = BeautifulSoup(desc, 'html.parser')
                return desc_soup.get_text(separator=' ', strip=True)
            seo_desc = pagedata.get('seo', {}).get('description', '')
            if seo_desc:
                return seo_desc

        for script_tag in soup.find_all('script', type='application/ld+json'):
            try:
                data = json.loads(script_tag.string)
                if isinstance(data, dict):
                    body = data.get('articleBody', '')
                    if body:
                        return body
                    for item in data.get('@graph', []):
                        if 'articleBody' in item:
                            return item['articleBody']
            except Exception:
                pass

        for tag in soup(['script', 'style', 'nav', 'footer', 'header', 'aside', 'iframe', 'noscript']):
            tag.decompose()

        for selector in ['article', '.article-content', '.article-body', '.content-body', '.post-content', '.entry-content']:
            container = soup.select_one(selector)
            if container:
                text = container.get_text(separator=' ', strip=True)
                if len(text) > 50:
                    return text

        paragraphs = soup.find_all('p')
        if paragraphs:
            return ' '.join(p.get_text(strip=True) for p in paragraphs)

        return ''
    except Exception:
        return ''


def scrape():
    articles = []
    for feed_url in FEED_URLS:
        try:
            feed = feedparser.parse(feed_url)

            for entry in feed.entries[:50]:
                title = entry.get('title', '').strip()
                if not title:
                    continue
                summary = entry.get('summary', entry.get('description', ''))
                combined = title + ' ' + summary

                category = classify_article(combined)
                if not category:
                    continue

                link = entry.get('link', '')

                body = summary
                should_fetch = False
                if not link:
                    should_fetch = False
                elif len(summary.strip()) < 50:
                    should_fetch = True
                elif summary.strip() == title.strip():
                    should_fetch = True

                if should_fetch:
                    full_body = fetch_full_article(link)
                    if full_body and len(full_body) > len(summary):
                        body = full_body

                pub_date = None
                if hasattr(entry, 'published_parsed') and entry.published_parsed:
                    from calendar import timegm
                    pub_date = datetime.fromtimestamp(timegm(entry.published_parsed), tz=timezone.utc)

                combined_full = title + ' ' + body
                governorates = extract_governorates(combined_full)
                risk_level = assess_risk(combined_full)

                if body.strip() == title.strip() or len(body.strip()) < 10:
                    body = ''

                articles.append({
                    'source_name': 'mosaiquefm',
                    'source_url': link or f'{feed_url}/{hash(title)}',
                    'title': title,
                    'body': body,
                    'category': category,
                    'governorates': governorates if governorates else ['Tunis'],
                    'risk_level': risk_level,
                    'scraped_at': datetime.now(timezone.utc),
                    'published_at': pub_date or datetime.now(timezone.utc),
                    'likes_count': 0,
                    'comments_count': 0,
                    'shares_count': 0,
                })
            logger.info(f'MosaiqueFM ({feed_url}): {len(feed.entries)} entries, {len(articles)} relevant')
        except Exception as e:
            logger.error(f'MosaiqueFM error ({feed_url}): {e}')
    return articles
