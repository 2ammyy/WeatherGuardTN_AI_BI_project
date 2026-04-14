# Prompt: "Is this comment relevant to weather/safety in Tunisia and free of hate speech? 
# Return JSON: {approved: bool, reason: str}"
# Sets ai_approved, ai_reason, ai_checked_at on ForumComment

"""
backend/forum/moderation.py
AI-powered comment moderation using the Anthropic API.
Checks for hate speech, off-topic content, and spam before publishing.
"""
from __future__ import annotations
import json
import logging
import os
from typing import Tuple

import httpx

logger = logging.getLogger(__name__)

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
MODERATION_MODEL  = "claude-sonnet-4-20250514"

SYSTEM_PROMPT = """
You are a content moderator for WeatherGuardTN, a Tunisian weather safety platform.
Your job is to evaluate user comments on weather news articles.

A comment is APPROVED if it:
- Is relevant to weather, safety, local conditions, or personal experiences related to the article
- Is written in any language (Arabic, French, English, Tunisian dialect are all fine)
- Is respectful and constructive, even if expressing concern or frustration about conditions

A comment must be REJECTED if it:
- Contains hate speech, racism, or personal attacks
- Is completely unrelated to weather/safety topics (e.g. politics unrelated to weather, spam, advertisements)
- Contains dangerous misinformation that could put lives at risk
- Is abusive toward other users or authorities

Respond ONLY with a valid JSON object, no markdown, no explanation outside the JSON:
{
  "approved": true or false,
  "reason": "brief explanation in English (max 100 chars)"
}
""".strip()


async def moderate_comment(body: str, article_title: str = "") -> Tuple[bool, str]:
    """
    Call Claude to check if a comment is appropriate.
    Returns (approved: bool, reason: str).
    Falls back to approved=True on API errors so comments aren't silently dropped.
    """
    if not ANTHROPIC_API_KEY:
        logger.warning("ANTHROPIC_API_KEY not set — skipping moderation, auto-approving.")
        return True, "moderation_skipped"

    user_message = f"""
Article title: "{article_title}"

User comment to evaluate:
\"\"\"
{body}
\"\"\"

Is this comment appropriate to publish on a weather safety platform?
""".strip()

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": ANTHROPIC_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": MODERATION_MODEL,
                    "max_tokens": 200,
                    "system": SYSTEM_PROMPT,
                    "messages": [{"role": "user", "content": user_message}],
                },
            )
            resp.raise_for_status()
            data = resp.json()

            raw = data["content"][0]["text"].strip()
            # Strip accidental markdown fences
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            result = json.loads(raw.strip())
            approved = bool(result.get("approved", True))
            reason   = str(result.get("reason", ""))
            return approved, reason

    except (httpx.HTTPError, json.JSONDecodeError, KeyError) as e:
        logger.error("Moderation API error: %s — auto-approving comment.", e)
        return True, f"moderation_error: {type(e).__name__}"


async def moderate_batch(comments: list[dict]) -> list[dict]:
    """
    Moderate a list of {"id": ..., "body": ..., "article_title": ...} dicts.
    Returns same list with "approved" and "reason" added.
    """
    import asyncio
    results = await asyncio.gather(*[
        moderate_comment(c["body"], c.get("article_title", ""))
        for c in comments
    ])
    for comment, (approved, reason) in zip(comments, results):
        comment["approved"] = approved
        comment["reason"]   = reason
    return comments