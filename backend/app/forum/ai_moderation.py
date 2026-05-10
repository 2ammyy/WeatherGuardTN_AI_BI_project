"""
backend/forum/ai_moderation.py

Content moderation using Qwen2.5 via Ollama (fully open-source, runs locally).

WHY QWEN2.5 + OLLAMA?
  - Completely free, no API key required
  - Runs 100% locally — no data leaves your machine (good for academic projects)
  - Qwen2.5 is multilingual: handles Arabic / French / English naturally,
    which is ideal since Tunisian users write in all three
  - Ollama is the simplest way to run LLMs locally (one command install)

SETUP (do this once):
  1. Install Ollama:        https://ollama.com/download
                            or: curl -fsSL https://ollama.com/install.sh | sh
  2. Pull the model:        ollama pull qwen2.5
  3. Start Ollama server:   ollama serve          (runs on http://localhost:11434)
  4. No pip package needed — we call the Ollama REST API directly via httpx

OPTIONAL — use a smaller/faster variant if your machine is limited:
  - ollama pull qwen2.5:3b   (3 billion params, ~2 GB RAM, faster but less accurate)
  - ollama pull qwen2.5:7b   (default, ~5 GB RAM, recommended)
  - ollama pull qwen2.5:14b  (if you have a GPU with 10+ GB VRAM, best quality)

  Then set OLLAMA_MODEL=qwen2.5:3b in your .env for the lighter version.
"""

import json
import logging
import os
from typing import Literal

import httpx

from app.forum.schemas import AICheckResult

from dotenv import load_dotenv
load_dotenv()  # Load .env variables into environment

logger = logging.getLogger(__name__)

# ── Configuration (override via .env) ─────────────────────────────────────────
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL    = os.getenv("OLLAMA_MODEL",    "qwen2.5")
REQUEST_TIMEOUT = int(os.getenv("OLLAMA_TIMEOUT_SECONDS", "60"))

# ── System prompt ──────────────────────────────────────────────────────────────
# Written in English but Qwen2.5 will correctly handle Arabic / French input.
SYSTEM_PROMPT = """You are a content moderator for WeatherGuardTN, a community forum in Tunisia.

The forum's mission: connect citizens, volunteers, authorities, and NGOs around weather events
and their societal impact in Tunisia — floods, heatwaves, storms, etc.
Users may write in Arabic (العربية), French, or English. Evaluate the meaning, not the language.

APPROVE posts/comments about:
- School or university closures due to weather (إغلاق المدارس بسبب الطقس / fermeture des écoles)
- Community aid, donations, or volunteer efforts after a weather disaster
- Flood, storm, heatwave, or climate-event damage reports
- Infrastructure damage or reconstruction after a weather event
- Family assistance requests caused by weather (evacuation, food, shelter)
- Official weather alerts (INM vigilance, civil protection, Météo Tunisie)
- Climate resilience projects in Tunisian communities
- Weather impact on fishermen, delivery workers, farmers, or vulnerable people
- Solidarity campaigns related to weather emergencies in Tunisia

REJECT posts/comments about:
- General politics unrelated to weather
- Commercial advertising, spam, or promotions
- Personal disputes with no weather link
- Sports, entertainment, or lifestyle unrelated to climate
- Hate speech, harassment, or misinformation

IMPORTANT — respond ONLY with a valid JSON object, nothing else, no markdown, no explanation:
{"approved": true, "reason": "one concise sentence", "confidence": "high"}

The "confidence" field must be exactly one of: "high", "medium", or "low".
"""


# ── Helpers ────────────────────────────────────────────────────────────────────

def _build_user_message(
    content_type: str,
    title: str | None,
    body: str,
    category: str | None,
    governorate: str | None,
) -> str:
    """Assemble the user-facing message sent to the model."""
    parts = [f"Content type: {content_type}"]
    if category:
        parts.append(f"Category: {category}")
    if governorate:
        parts.append(f"Location/Governorate: {governorate}")
    if title:
        parts.append(f"Title: {title}")
    parts.append(f"Content:\n{body}")
    return "\n".join(parts)


def _parse_response(raw: str) -> AICheckResult:
    """
    Parse the model's raw text output into an AICheckResult.
    Qwen2.5 is well-instructed to return JSON, but we add fallback parsing
    in case there are stray characters.
    """
    cleaned = raw.strip()
    for fence in ("```json", "```"):
        cleaned = cleaned.replace(fence, "")
    cleaned = cleaned.strip()

    # Find the first {...} block in case the model added extra text
    start = cleaned.find("{")
    end   = cleaned.rfind("}") + 1
    if start != -1 and end > start:
        cleaned = cleaned[start:end]

    data = json.loads(cleaned)  # raises json.JSONDecodeError if still broken

    approved   = bool(data.get("approved", False))
    reason     = str(data.get("reason", "No reason provided."))
    confidence = str(data.get("confidence", "medium"))

    if confidence not in ("high", "medium", "low"):
        confidence = "medium"

    return AICheckResult(approved=approved, reason=reason, confidence=confidence)


# ── Main public function ───────────────────────────────────────────────────────

async def moderate_text(
    content_type: Literal["post", "comment"],
    title: str | None,
    body: str,
    category: str | None = None,
    governorate: str | None = None,
) -> AICheckResult:
    """
    Send text to Qwen2.5 (via Ollama) for relevance moderation.

    Uses the Ollama /api/chat endpoint with the system prompt above.
    Returns AICheckResult(approved, reason, confidence).

    Raises nothing — all errors are caught and return a safe "rejected" result
    so a broken moderation service never accidentally publishes bad content.
    """
    user_message = _build_user_message(content_type, title, body, category, governorate)

    payload = {
        "model": OLLAMA_MODEL,
        "stream": False,                        # we want the full response at once
        "options": {
            "temperature": 0.0,                 # deterministic — moderation needs consistency
            "num_predict": 128,                 # JSON response is short; cap tokens for speed
        },
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": user_message},
        ],
    }

    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
            response = await client.post(
                f"{OLLAMA_BASE_URL}/api/chat",
                json=payload,
            )
            response.raise_for_status()

        data = response.json()
        # Ollama returns: {"message": {"role": "assistant", "content": "..."}, ...}
        raw_text = data["message"]["content"]
        logger.debug("Ollama raw response: %s", raw_text)

        return _parse_response(raw_text)

    except httpx.ConnectError:
        logger.error(
            "Cannot connect to Ollama at %s. Is 'ollama serve' running?", OLLAMA_BASE_URL
        )
        return AICheckResult(
            approved=False,
            reason="Moderation service is offline. Please start Ollama and retry.",
            confidence="low",
        )
    except httpx.TimeoutException:
        logger.error("Ollama request timed out after %s seconds.", REQUEST_TIMEOUT)
        return AICheckResult(
            approved=False,
            reason="Moderation check timed out. Please retry.",
            confidence="low",
        )
    except httpx.HTTPStatusError as e:
        logger.error("Ollama HTTP error %s: %s", e.response.status_code, e.response.text)
        return AICheckResult(
            approved=False,
            reason=f"Moderation service error (HTTP {e.response.status_code}). Please retry.",
            confidence="low",
        )
    except json.JSONDecodeError as e:
        logger.error("Failed to parse Ollama JSON response: %s", e)
        return AICheckResult(
            approved=False,
            reason="Moderation check returned an unreadable response. Please retry.",
            confidence="low",
        )
    except Exception as e:
        logger.exception("Unexpected error in ai_moderation: %s", e)
        return AICheckResult(
            approved=False,
            reason="Unexpected moderation error. Please retry.",
            confidence="low",
        )


# ── Quick smoke-test (run directly: python -m backend.forum.ai_moderation) ─────
if __name__ == "__main__":
    import asyncio

    async def _test():
        print("Testing Qwen2.5 moderation via Ollama...\n")

        cases = [
            {
                "label": "SHOULD APPROVE — school closure (French)",
                "kwargs": dict(content_type="post", title="Fermeture des écoles à Bizerte demain",
                               body="Suite aux inondations, toutes les écoles primaires et secondaires de Bizerte seront fermées demain jeudi. Les parents sont invités à rester informés.",
                               category="school_closure", governorate="Bizerte"),
            },
            {
                "label": "SHOULD APPROVE — community aid (Arabic)",
                "kwargs": dict(content_type="post", title="عائلة تحتاج مساعدة بعد الفيضانات",
                               body="عائلة من 5 أفراد في سيدي بوزيد تضررت من الفيضانات الأخيرة وتحتاج إلى مواد غذائية ومساعدة في الإخلاء. من يستطيع المساعدة يتواصل معنا.",
                               category="community_aid", governorate="Sidi Bouzid"),
            },
            {
                "label": "SHOULD REJECT — off-topic (sports)",
                "kwargs": dict(content_type="post", title="Match de foot ce weekend",
                               body="Le Club Africain joue contre l'Espérance samedi soir. Venez nombreux au stade!",
                               category="other", governorate="Tunis"),
            },
            {
                "label": "SHOULD APPROVE — comment about flood alert",
                "kwargs": dict(content_type="comment", title=None,
                               body="Confirmed: the civil protection team has arrived in Nabeul. Roads on route C28 are still flooded."),
            },
            {
                "label": "SHOULD REJECT — spam comment",
                "kwargs": dict(content_type="comment", title=None,
                               body="Buy cheap insurance now! Best deals at www.spam-insurance.tn"),
            },
        ]

        for case in cases:
            result = await moderate_text(**case["kwargs"])
            icon = "✅" if result.approved else "❌"
            print(f"{icon}  {case['label']}")
            print(f"   approved={result.approved}  confidence={result.confidence}")
            print(f"   reason: {result.reason}\n")

    asyncio.run(_test())
