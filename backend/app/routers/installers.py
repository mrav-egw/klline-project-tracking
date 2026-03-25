from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_user
from app.models.installer import InstallationPartner
from app.schemas.installer import InstallerCreate, InstallerRead, InstallerUpdate

router = APIRouter(prefix="/installers", tags=["installers"])


@router.get("/", response_model=list[InstallerRead])
async def list_installers(db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    result = await db.execute(select(InstallationPartner).order_by(InstallationPartner.name))
    return result.scalars().all()


@router.post("/", response_model=InstallerRead, status_code=status.HTTP_201_CREATED)
async def create_installer(
    body: InstallerCreate, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)
):
    installer = InstallationPartner(**body.model_dump())
    db.add(installer)
    await db.flush()
    await db.refresh(installer)
    return installer


@router.get("/{installer_id}", response_model=InstallerRead)
async def get_installer(
    installer_id: str, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)
):
    result = await db.execute(select(InstallationPartner).where(InstallationPartner.id == installer_id))
    inst = result.scalar_one_or_none()
    if not inst:
        raise HTTPException(status_code=404, detail="Monteur nicht gefunden")
    return inst


@router.put("/{installer_id}", response_model=InstallerRead)
async def update_installer(
    installer_id: str,
    body: InstallerUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    result = await db.execute(select(InstallationPartner).where(InstallationPartner.id == installer_id))
    inst = result.scalar_one_or_none()
    if not inst:
        raise HTTPException(status_code=404, detail="Monteur nicht gefunden")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(inst, field, value)
    await db.flush()
    await db.refresh(inst)
    return inst


@router.delete("/{installer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_installer(
    installer_id: str, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)
):
    result = await db.execute(select(InstallationPartner).where(InstallationPartner.id == installer_id))
    inst = result.scalar_one_or_none()
    if not inst:
        raise HTTPException(status_code=404, detail="Monteur nicht gefunden")
    await db.delete(inst)
