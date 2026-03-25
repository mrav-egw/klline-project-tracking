from celery import Celery
from celery.schedules import crontab

from app.config import settings

celery = Celery("klline", broker=settings.REDIS_URL, backend=settings.REDIS_URL)

celery.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Europe/Vienna",
    enable_utc=True,
    beat_schedule={
        "refresh-report-cache-hourly": {
            "task": "app.tasks.celery_app.refresh_report_cache",
            "schedule": crontab(minute=0),
        }
    },
)


@celery.task
def refresh_report_cache():
    """Placeholder for report cache refresh — extend as needed."""
    return {"status": "ok"}
