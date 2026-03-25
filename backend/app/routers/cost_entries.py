from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_user
from app.models.cost_entry import CostEntry
from app.schemas.cost_entry import CostEntryCreate, CostEntryRead, CostEntryUpdate

router = APIRouter(prefix="/cost-entries", tags=["cost-entries"])


@router.get("/", response_model=list[CostEntryRead])
async def list_cost_entries(
    skip: int = 0, limit: int = 500,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    result = await db.execute(select(CostEntry).order_by(CostEntry.entry_date.desc()).offset(skip).limit(limit))
    return result.scalars().all()


@router.post("/", response_model=CostEntryRead, status_code=status.HTTP_201_CREATED)
async def create_cost_entry(
    body: CostEntryCreate, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)
):
    entry = CostEntry(**body.model_dump())
    db.add(entry)
    await db.flush()
    await db.refresh(entry)
    return entry


@router.get("/{entry_id}", response_model=CostEntryRead)
async def get_cost_entry(
    entry_id: str, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)
):
    result = await db.execute(select(CostEntry).where(CostEntry.id == entry_id))
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Eintrag nicht gefunden")
    return entry


@router.put("/{entry_id}", response_model=CostEntryRead)
async def update_cost_entry(
    entry_id: str,
    body: CostEntryUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    result = await db.execute(select(CostEntry).where(CostEntry.id == entry_id))
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Eintrag nicht gefunden")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(entry, field, value)
    await db.flush()
    await db.refresh(entry)
    return entry


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_cost_entry(
    entry_id: str, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)
):
    result = await db.execute(select(CostEntry).where(CostEntry.id == entry_id))
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Eintrag nicht gefunden")
    await db.delete(entry)
