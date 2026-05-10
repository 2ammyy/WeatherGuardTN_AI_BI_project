"""
backend/app/scraper/governorate_mapper.py
Shared helpers for scrapers: extract Tunisian governorates from text
and assess risk level from weather keywords.
"""
from __future__ import annotations

GOVERNORATES = [
    "Tunis", "Ariana", "Ben Arous", "Manouba", "Nabeul", "Zaghouan",
    "Bizerte", "Béja", "Jendouba", "Le Kef", "Siliana",
    "Sousse", "Monastir", "Mahdia", "Sfax", "Kairouan",
    "Kasserine", "Sidi Bouzid", "Gabès", "Medenine",
    "Tataouine", "Gafsa", "Tozeur", "Kébili",
]

CRITICAL_KEYWORDS = [
    "inondation", "flood", "crue", "cyclone", "tornade", "tornado",
    "dégât", "evacuation", "évacuation", "effondrement", "catastrophe",
    "danger", "alerte rouge", "emergency",
]
HIGH_KEYWORDS = [
    "tempête", "storm", "orage violent", "pluie diluvienne", "vent violent",
    "strong wind", "heavy rain", "neige", "snow", "verglas", "gel",
    "alerte orange", "warning",
]
MODERATE_KEYWORDS = [
    "pluie", "rain", "vent", "wind", "froid", "cold", "chaud", "hot",
    "canicule", "heatwave", "brouillard", "fog", "orage", "thunderstorm",
    "alerte jaune", "watch", "prévision", "forecast",
]

RISK_ORDER = ["green", "yellow", "orange", "red", "purple"]


def extract_governorates(text: str) -> list[str]:
    found = []
    text_lower = text.lower()
    gov_aliases = {
        "tunis": "Tunis",
        "ariana": "Ariana",
        "ben arous": "Ben Arous",
        "manouba": "Manouba",
        "nabeul": "Nabeul",
        "zaghouan": "Zaghouan",
        "bizerte": "Bizerte",
        "béja": "Béja",
        "beja": "Béja",
        "jendouba": "Jendouba",
        "le kef": "Le Kef",
        "kef": "Le Kef",
        "siliana": "Siliana",
        "sousse": "Sousse",
        "monastir": "Monastir",
        "mahdia": "Mahdia",
        "sfax": "Sfax",
        "kairouan": "Kairouan",
        "kasserine": "Kasserine",
        "sidi bouzid": "Sidi Bouzid",
        "gabès": "Gabès",
        "gabes": "Gabès",
        "medenine": "Medenine",
        "tataouine": "Tataouine",
        "gafsa": "Gafsa",
        "tozeur": "Tozeur",
        "kébili": "Kébili",
        "kebili": "Kébili",
    }
    for alias, official in gov_aliases.items():
        if alias.lower() in text_lower:
            if official not in found:
                found.append(official)
    return found


def assess_risk(text: str) -> str:
    text_lower = text.lower()
    if any(kw in text_lower for kw in CRITICAL_KEYWORDS):
        return "red"
    if any(kw in text_lower for kw in HIGH_KEYWORDS):
        return "orange"
    if any(kw in text_lower for kw in MODERATE_KEYWORDS):
        return "yellow"
    return "green"
