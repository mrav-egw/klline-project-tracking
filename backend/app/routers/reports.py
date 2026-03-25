from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_user
from app.schemas.report import DashboardSummary, VertriebsberichtReport
from app.services.reports import get_dashboard_summary, get_vertriebsbericht

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/vertriebsbericht", response_model=VertriebsberichtReport)
async def vertriebsbericht(
    year: int = datetime.now().year,
    month: int | None = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    return await get_vertriebsbericht(db, year, month)


@router.get("/summary", response_model=DashboardSummary)
async def summary(db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    return await get_dashboard_summary(db)
