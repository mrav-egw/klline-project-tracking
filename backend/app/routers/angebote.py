from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.deps import get_current_user
from app.models.angebot import Angebot, AngebotPosition, AngebotPositionGroup, AngebotStatus
from app.models.company_settings import CompanySettings
from app.models.number_sequence import NumberSequence
from app.models.project import Project
from app.models.rechnung import Rechnung, RechnungType
from app.services.pdf_generator import generate_angebot_pdf, generate_rechnung_pdf
from app.schemas.angebot import (
    AngebotCreate, AngebotListRead, AngebotRead, AngebotUpdate,
    PositionCreate, PositionGroupCreate, PositionGroupRead, PositionGroupUpdate,
    PositionRead, PositionUpdate,
)
from app.schemas.rechnung import RechnungCreate, RechnungPaymentUpdate, RechnungRead

router = APIRouter(prefix="/projects/{project_id}/angebote", tags=["angebote"])

_LOAD = [
    selectinload(Angebot.groups),
    selectinload(Angebot.positions).selectinload(AngebotPosition.product),
    selectinload(Angebot.rechnungen),
]


async def _next_number(db: AsyncSession, seq_id: str) -> str:
    result = await db.execute(select(NumberSequence).where(NumberSequence.id == seq_id).with_for_update())
    seq = result.scalar_one()
    seq.current_value += 1
    return f"{seq.prefix}{seq.current_value}"


async def _get_angebot(db: AsyncSession, project_id: str, angebot_id: str) -> Angebot:
    result = await db.execute(
        select(Angebot).options(*_LOAD)
        .where(Angebot.id == angebot_id, Angebot.project_id == project_id)
    )
    a = result.scalar_one_or_none()
    if not a:
        raise HTTPException(status_code=404, detail="Angebot nicht gefunden")
    return a


def _angebot_read(a: Angebot) -> dict:
    return {
        **{c.name: getattr(a, c.name) for c in a.__table__.columns},
        "total_netto": a.total_netto,
        "groups": a.groups,
        "positions": [
            {
                **{c.name: getattr(p, c.name) for c in p.__table__.columns},
                "product": p.product,
                "gesamtpreis": p.gesamtpreis,
                "rabatt_amount": p.rabatt_amount,
                "netto_amount": p.netto_amount,
            }
            for p in a.positions
        ],
        "rechnungen": a.rechnungen,
    }


# ── Angebot CRUD ─────────────────────────────────────────────────────────────

@router.get("/", response_model=list[AngebotListRead])
async def list_angebote(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    result = await db.execute(
        select(Angebot).options(*_LOAD)
        .where(Angebot.project_id == project_id)
        .order_by(Angebot.created_at.desc())
    )
    angebote = result.scalars().all()
    return [
        AngebotListRead(
            id=a.id, project_id=a.project_id, angebot_number=a.angebot_number,
            angebot_date=a.angebot_date, status=a.status.value,
            total_netto=a.total_netto, position_count=len(a.positions),
            rechnungen_count=len(a.rechnungen),
            unpaid_rechnungen_count=sum(1 for r in a.rechnungen if r.customer_payment_date is None),
            created_at=a.created_at,
        )
        for a in angebote
    ]


@router.post("/", response_model=AngebotRead, status_code=201)
async def create_angebot(
    project_id: str,
    body: AngebotCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    # Verify project exists
    proj = await db.execute(select(Project).where(Project.id == project_id))
    if proj.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Projekt nicht gefunden")
    number = await _next_number(db, "AN")
    a = Angebot(project_id=project_id, angebot_number=number, angebot_date=body.angebot_date)
    db.add(a)
    await db.flush()
    result = await db.execute(select(Angebot).options(*_LOAD).where(Angebot.id == a.id))
    a = result.scalar_one()
    return AngebotRead.model_validate(_angebot_read(a))


@router.get("/{angebot_id}", response_model=AngebotRead)
async def get_angebot(
    project_id: str, angebot_id: str,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    a = await _get_angebot(db, project_id, angebot_id)
    return AngebotRead.model_validate(_angebot_read(a))


@router.put("/{angebot_id}", response_model=AngebotRead)
async def update_angebot(
    project_id: str, angebot_id: str,
    body: AngebotUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    a = await _get_angebot(db, project_id, angebot_id)
    if a.status == AngebotStatus.AKZEPTIERT:
        raise HTTPException(status_code=400, detail="Akzeptiertes Angebot kann nicht bearbeitet werden")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(a, field, value)
    await db.flush()
    result = await db.execute(select(Angebot).options(*_LOAD).where(Angebot.id == a.id))
    a = result.scalar_one()
    return AngebotRead.model_validate(_angebot_read(a))


@router.delete("/{angebot_id}", status_code=204)
async def delete_angebot(
    project_id: str, angebot_id: str,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    a = await _get_angebot(db, project_id, angebot_id)
    if a.status == AngebotStatus.AKZEPTIERT:
        raise HTTPException(status_code=400, detail="Akzeptiertes Angebot kann nicht gelöscht werden")
    await db.delete(a)


@router.post("/{angebot_id}/accept", response_model=AngebotRead)
async def accept_angebot(
    project_id: str, angebot_id: str,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    a = await _get_angebot(db, project_id, angebot_id)
    if a.status == AngebotStatus.AKZEPTIERT:
        raise HTTPException(status_code=400, detail="Angebot ist bereits akzeptiert")
    if len(a.positions) == 0:
        raise HTTPException(status_code=400, detail="Angebot hat keine Positionen")
    a.status = AngebotStatus.AKZEPTIERT
    await db.flush()
    result = await db.execute(select(Angebot).options(*_LOAD).where(Angebot.id == a.id))
    a = result.scalar_one()
    return AngebotRead.model_validate(_angebot_read(a))


# ── Position Groups ──────────────────────────────────────────────────────────

@router.post("/{angebot_id}/groups", response_model=PositionGroupRead, status_code=201)
async def add_group(
    project_id: str, angebot_id: str,
    body: PositionGroupCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    a = await _get_angebot(db, project_id, angebot_id)
    if a.status == AngebotStatus.AKZEPTIERT:
        raise HTTPException(status_code=400, detail="Akzeptiertes Angebot kann nicht bearbeitet werden")
    g = AngebotPositionGroup(angebot_id=a.id, **body.model_dump())
    db.add(g)
    await db.flush()
    await db.refresh(g)
    return g


@router.put("/{angebot_id}/groups/{group_id}", response_model=PositionGroupRead)
async def update_group(
    project_id: str, angebot_id: str, group_id: str,
    body: PositionGroupUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    a = await _get_angebot(db, project_id, angebot_id)
    if a.status == AngebotStatus.AKZEPTIERT:
        raise HTTPException(status_code=400, detail="Akzeptiertes Angebot kann nicht bearbeitet werden")
    result = await db.execute(
        select(AngebotPositionGroup).where(AngebotPositionGroup.id == group_id, AngebotPositionGroup.angebot_id == a.id)
    )
    g = result.scalar_one_or_none()
    if not g:
        raise HTTPException(status_code=404, detail="Gruppe nicht gefunden")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(g, field, value)
    await db.flush()
    await db.refresh(g)
    return g


@router.delete("/{angebot_id}/groups/{group_id}", status_code=204)
async def delete_group(
    project_id: str, angebot_id: str, group_id: str,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    a = await _get_angebot(db, project_id, angebot_id)
    if a.status == AngebotStatus.AKZEPTIERT:
        raise HTTPException(status_code=400, detail="Akzeptiertes Angebot kann nicht bearbeitet werden")
    result = await db.execute(
        select(AngebotPositionGroup).where(AngebotPositionGroup.id == group_id, AngebotPositionGroup.angebot_id == a.id)
    )
    g = result.scalar_one_or_none()
    if not g:
        raise HTTPException(status_code=404, detail="Gruppe nicht gefunden")
    await db.delete(g)


# ── Positions ────────────────────────────────────────────────────────────────

@router.post("/{angebot_id}/positions", response_model=PositionRead, status_code=201)
async def add_position(
    project_id: str, angebot_id: str,
    body: PositionCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    a = await _get_angebot(db, project_id, angebot_id)
    if a.status == AngebotStatus.AKZEPTIERT:
        raise HTTPException(status_code=400, detail="Akzeptiertes Angebot kann nicht bearbeitet werden")
    # Auto-assign position number
    next_pos = max((p.position_number for p in a.positions), default=0) + 1
    pos = AngebotPosition(angebot_id=a.id, position_number=next_pos, **body.model_dump())
    db.add(pos)
    await db.flush()
    await db.refresh(pos)
    # Load product relation
    result = await db.execute(
        select(AngebotPosition).options(selectinload(AngebotPosition.product))
        .where(AngebotPosition.id == pos.id)
    )
    pos = result.scalar_one()
    return PositionRead.model_validate({
        **{c.name: getattr(pos, c.name) for c in pos.__table__.columns},
        "product": pos.product,
        "gesamtpreis": pos.gesamtpreis,
        "rabatt_amount": pos.rabatt_amount,
        "netto_amount": pos.netto_amount,
    })


@router.put("/{angebot_id}/positions/{position_id}", response_model=PositionRead)
async def update_position(
    project_id: str, angebot_id: str, position_id: str,
    body: PositionUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    a = await _get_angebot(db, project_id, angebot_id)
    if a.status == AngebotStatus.AKZEPTIERT:
        raise HTTPException(status_code=400, detail="Akzeptiertes Angebot kann nicht bearbeitet werden")
    result = await db.execute(
        select(AngebotPosition).options(selectinload(AngebotPosition.product))
        .where(AngebotPosition.id == position_id, AngebotPosition.angebot_id == a.id)
    )
    pos = result.scalar_one_or_none()
    if not pos:
        raise HTTPException(status_code=404, detail="Position nicht gefunden")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(pos, field, value)
    await db.flush()
    await db.refresh(pos)
    # Re-load product
    result = await db.execute(
        select(AngebotPosition).options(selectinload(AngebotPosition.product))
        .where(AngebotPosition.id == pos.id)
    )
    pos = result.scalar_one()
    return PositionRead.model_validate({
        **{c.name: getattr(pos, c.name) for c in pos.__table__.columns},
        "product": pos.product,
        "gesamtpreis": pos.gesamtpreis,
        "rabatt_amount": pos.rabatt_amount,
        "netto_amount": pos.netto_amount,
    })


@router.delete("/{angebot_id}/positions/{position_id}", status_code=204)
async def delete_position(
    project_id: str, angebot_id: str, position_id: str,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    a = await _get_angebot(db, project_id, angebot_id)
    if a.status == AngebotStatus.AKZEPTIERT:
        raise HTTPException(status_code=400, detail="Akzeptiertes Angebot kann nicht bearbeitet werden")
    result = await db.execute(
        select(AngebotPosition).where(AngebotPosition.id == position_id, AngebotPosition.angebot_id == a.id)
    )
    pos = result.scalar_one_or_none()
    if not pos:
        raise HTTPException(status_code=404, detail="Position nicht gefunden")
    await db.delete(pos)


# ── Rechnungen ───────────────────────────────────────────────────────────────

@router.get("/{angebot_id}/rechnungen", response_model=list[RechnungRead])
async def list_rechnungen(
    project_id: str, angebot_id: str,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    a = await _get_angebot(db, project_id, angebot_id)
    return [RechnungRead.model_validate(r) for r in a.rechnungen]


@router.post("/{angebot_id}/rechnungen", response_model=RechnungRead, status_code=201)
async def create_rechnung(
    project_id: str, angebot_id: str,
    body: RechnungCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    a = await _get_angebot(db, project_id, angebot_id)
    if a.status != AngebotStatus.AKZEPTIERT:
        raise HTTPException(status_code=400, detail="Angebot muss akzeptiert sein")

    rtype = RechnungType(body.rechnung_type)

    # Check constraints
    existing_types = [r.rechnung_type for r in a.rechnungen]
    if rtype == RechnungType.ABSCHLAG:
        if RechnungType.ABSCHLAG in existing_types:
            raise HTTPException(status_code=400, detail="Es existiert bereits eine Abschlagsrechnung")
        if not body.abschlag_pct or body.abschlag_pct <= 0:
            raise HTTPException(status_code=400, detail="Abschlag-Prozentsatz erforderlich")
        total_netto = a.total_netto * (body.abschlag_pct / Decimal("100"))
    elif rtype == RechnungType.SCHLUSS:
        if RechnungType.SCHLUSS in existing_types:
            raise HTTPException(status_code=400, detail="Es existiert bereits eine Schlussrechnung")
        # Schlussrechnung: remaining amount after Abschlag
        abschlag_netto = sum(
            (r.total_netto for r in a.rechnungen if r.rechnung_type == RechnungType.ABSCHLAG),
            Decimal("0"),
        )
        total_netto = a.total_netto - abschlag_netto
    else:
        raise HTTPException(status_code=400, detail="Ungültiger Rechnungstyp")

    number = await _next_number(db, "RE")
    r = Rechnung(
        angebot_id=a.id,
        project_id=project_id,
        rechnung_number=number,
        rechnung_date=body.rechnung_date,
        rechnung_type=rtype,
        abschlag_pct=body.abschlag_pct if rtype == RechnungType.ABSCHLAG else None,
        total_netto=total_netto,
    )
    db.add(r)
    await db.flush()
    await db.refresh(r)
    return RechnungRead.model_validate(r)


@router.put("/{angebot_id}/rechnungen/{rechnung_id}", response_model=RechnungRead)
async def update_rechnung_payment(
    project_id: str, angebot_id: str, rechnung_id: str,
    body: RechnungPaymentUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    result = await db.execute(
        select(Rechnung).where(
            Rechnung.id == rechnung_id,
            Rechnung.angebot_id == angebot_id,
            Rechnung.project_id == project_id,
        )
    )
    r = result.scalar_one_or_none()
    if not r:
        raise HTTPException(status_code=404, detail="Rechnung nicht gefunden")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(r, field, value)
    await db.flush()
    await db.refresh(r)
    return RechnungRead.model_validate(r)


# ── PDF Downloads ────────────────────────────────────────────────────────────

async def _load_for_pdf(db: AsyncSession, project_id: str, angebot_id: str):
    """Load angebot with all relations + customer + company settings for PDF."""
    result = await db.execute(
        select(Angebot).options(
            *_LOAD,
            selectinload(Angebot.project).selectinload(Project.customer),
        ).where(Angebot.id == angebot_id, Angebot.project_id == project_id)
    )
    a = result.scalar_one_or_none()
    if not a:
        raise HTTPException(status_code=404, detail="Angebot nicht gefunden")
    customer = a.project.customer
    cs_result = await db.execute(select(CompanySettings).where(CompanySettings.id == "default"))
    cs = cs_result.scalar_one_or_none()
    if cs is None:
        cs = CompanySettings(id="default")
    return a, customer, cs


@router.get("/{angebot_id}/pdf")
async def download_angebot_pdf(
    project_id: str, angebot_id: str,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    a, customer, cs = await _load_for_pdf(db, project_id, angebot_id)
    pdf_bytes = generate_angebot_pdf(a, customer, cs)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="Angebot_{a.angebot_number}.pdf"'},
    )


@router.get("/{angebot_id}/rechnungen/{rechnung_id}/pdf")
async def download_rechnung_pdf(
    project_id: str, angebot_id: str, rechnung_id: str,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    a, customer, cs = await _load_for_pdf(db, project_id, angebot_id)
    rechnung = next((r for r in a.rechnungen if r.id == rechnung_id), None)
    if not rechnung:
        raise HTTPException(status_code=404, detail="Rechnung nicht gefunden")
    pdf_bytes = generate_rechnung_pdf(rechnung, a, customer, cs)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="Rechnung_{rechnung.rechnung_number}.pdf"'},
    )
