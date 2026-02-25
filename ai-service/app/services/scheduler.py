"""
Scheduler — weekly automated model retraining using APScheduler.
"""

import os
import logging
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from app.utils.database import SessionLocal
from datetime import datetime

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler()


def retrain_all_models():
    """Background job: retrain all AI models."""
    logger.info("=" * 60)
    logger.info(f"[SCHEDULER] Starting weekly model retraining at {datetime.now()}")
    logger.info("=" * 60)
    
    db = SessionLocal()
    try:
        from app.services.training_service import TrainingService
        service = TrainingService(db)
        result = service.train_all()
        logger.info(f"[SCHEDULER] Retraining completed: {result.get('total_duration_seconds', 0)}s")
    except Exception as e:
        logger.error(f"[SCHEDULER] Retraining failed: {e}", exc_info=True)
    finally:
        db.close()


def start_scheduler():
    """Start the background scheduler for weekly retraining."""
    # Default: retrain every Sunday at 2:00 AM
    day_of_week = os.getenv("TRAIN_DAY", "sun")
    hour = int(os.getenv("TRAIN_HOUR", "2"))
    
    scheduler.add_job(
        retrain_all_models,
        trigger=CronTrigger(day_of_week=day_of_week, hour=hour, minute=0),
        id="weekly_retrain",
        name="Weekly AI Model Retraining",
        replace_existing=True,
    )
    
    scheduler.start()
    logger.info(f"Scheduler started — retraining every {day_of_week} at {hour}:00")


def stop_scheduler():
    """Shut down the scheduler gracefully."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Scheduler stopped")
