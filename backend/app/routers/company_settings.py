from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_admin
from app.models.company_settings import CompanySettings
from app.schemas.company_settings import CompanySettingsRead, CompanySettingsUpdate

router = APIRouter(prefix="/company-settings", tags=["company-settings"])


async def _get_or_create(db: AsyncSession) -> CompanySettings:
    result = await db.execute(select(CompanySettings).where(CompanySettings.id == "default"))
    cs = result.scalar_one_or_none()
    if cs is None:
        cs = CompanySettings(
            id="default",
            company_name="Klline - Freude am Arbeitsplatz",
            country="Österreich",
            default_greeting="Sehr geehrte Damen und Herren,\nvielen Dank für Ihren Auftrag und das damit verbundene Vertrauen!\nHiermit stelle ich Ihnen die folgenden Leistungen in Rechnung:",
            default_payment_terms="Zahlungsbedingungen: Zahlung innerhalb von 8 Tagen ab Rechnungseingang ohne Abzüge.",
        )
        db.add(cs)
        await db.flush()
        await db.refresh(cs)
    return cs


@router.get("/", response_model=CompanySettingsRead)
async def get_company_settings(
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    return await _get_or_create(db)


@router.put("/", response_model=CompanySettingsRead)
async def update_company_settings(
    body: CompanySettingsUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    cs = await _get_or_create(db)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(cs, field, value)
    await db.flush()
    await db.refresh(cs)
    return cs
