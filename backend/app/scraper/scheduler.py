"""
backend/scraper/scheduler.py
Orchestrates all scrapers and runs them on a schedule (APScheduler).
Sends region-based notifications when new articles match user governorates.
Also exposes a manual /api/admin/scrape-now endpoint.
Plugs into FastAPI startup via start_scheduler().
"""
from __future__ import annotations
import logging
from datetime import datetime, timezone

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

from app.database import SessionLocal
from app.forum import crud
from app.forum.notifications import notify_users_about_news
from app.scraper import businessnews, mosaiquefm, jawharafm, shemsfm, tap
from app.forum.schemas import ScraperRunResult

logger = logging.getLogger(__name__)

_scheduler = BackgroundScheduler(timezone="Africa/Tunis")


def run_all_scrapers() -> list[ScraperRunResult]:
    """
    Run all scrapers, persist new articles, trigger region-based notifications.
    Skips articles already in DB (dedup by source_url).
    """
    scrapers = [
        ("businessnews", businessnews.scrape),
        ("mosaiquefm",   mosaiquefm.scrape),
        ("jawharafm",    jawharafm.scrape),
        ("shemsfm",      shemsfm.scrape),
        ("tap",          tap.scrape),
    ]

    all_results = []
    db = SessionLocal()

    try:
        for source_name, scrape_fn in scrapers:
            new_count  = 0
            skip_count = 0
            errors     = []

            try:
                articles = scrape_fn()
            except Exception as e:
                logger.error("Scraper %s crashed: %s", source_name, e)
                all_results.append(ScraperRunResult(
                    source=source_name,
                    articles_new=0,
                    articles_skip=0,
                    errors=[str(e)],
                    ran_at=datetime.now(timezone.utc),
                ))
                continue

            for article_data in articles:
                url = article_data.get("source_url", "")
                if not url:
                    skip_count += 1
                    continue

                if crud.article_url_exists(db, url):
                    skip_count += 1
                    continue

                try:
                    article = crud.create_article(db, **article_data)
                    new_count += 1

                    # Send region-based notifications
                    governorates = article_data.get("governorates", [])
                    if governorates:
                        notify_users_about_news(
                            db,
                            title=article_data.get("title", ""),
                            governorates=governorates,
                            risk_level=article_data.get("risk_level", "green"),
                            news_article_id=article.id,
                        )
                except Exception as e:
                    logger.error("Failed to save article %s: %s", url, e)
                    errors.append(f"{url}: {e}")
                    db.rollback()

            result = ScraperRunResult(
                source=source_name,
                articles_new=new_count,
                articles_skip=skip_count,
                errors=errors,
                ran_at=datetime.now(timezone.utc),
            )
            all_results.append(result)
            logger.info(
                "Scraper %s: %d new, %d skipped, %d errors",
                source_name, new_count, skip_count, len(errors),
            )

    finally:
        db.close()

    return all_results


def start_scheduler(interval_hours: int = 6):
    """Call this from FastAPI lifespan startup."""
    if _scheduler.running:
        return

    _scheduler.add_job(
        run_all_scrapers,
        trigger=IntervalTrigger(hours=interval_hours),
        id="scrape_all",
        name="WeatherGuard news scraper",
        replace_existing=True,
        misfire_grace_time=300,
    )
    _scheduler.start()
    logger.info("Scraper scheduler started (every %dh)", interval_hours)

    # Run immediately on startup in a thread to populate DB
    import threading
    t = threading.Thread(target=run_all_scrapers, daemon=True)
    t.start()


def stop_scheduler():
    """Call from FastAPI shutdown event."""
    if _scheduler.running:
        _scheduler.shutdown(wait=False)
