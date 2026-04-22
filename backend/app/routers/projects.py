from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.deps import get_current_user
from app.models.angebot import Angebot
from app.models.project import Project, PurchaseOrder, SalesInvoice
from app.schemas.project import (
    ProjectCreate,
    ProjectListRead,
    ProjectRead,
    ProjectUpdate,
    PurchaseOrderCreate,
    PurchaseOrderRead,
    PurchaseOrderUpdate,
    SalesInvoiceCreate,
    SalesInvoiceRead,
    SalesInvoiceUpdate,
)

router = APIRouter(prefix="/projects", tags=["projects"])

_LOAD = [
    selectinload(Project.customer),
    selectinload(Project.sales_invoices),
    selectinload(Project.purchase_orders),
    selectinload(Project.angebote).options(
        selectinload(Angebot.positions),
        selectinload(Angebot.rechnungen),
    ),
]


def _enrich(p: Project) -> dict:
    unpaid_re = sum(
        1 for a in p.angebote for r in a.rechnungen if r.customer_payment_date is None
    )
    unpaid_po = sum(1 for po in p.purchase_orders if not po.klline_paid)
    return {
        **{c.name: getattr(p, c.name) for c in p.__table__.columns},
        "customer": p.customer,
        "sales_invoices": p.sales_invoices,
        "purchase_orders": p.purchase_orders,
        "contribution_margin": p.contribution_margin,
        "total_sales": p.total_sales,
        "total_purchases": p.total_purchases,
        "total_still_to_invoice": p.total_still_to_invoice,
        "unpaid_rechnungen_count": unpaid_re,
        "unpaid_bestellungen_count": unpaid_po,
        "invoice_count": len(p.sales_invoices),
        "purchase_order_count": len(p.purchase_orders),
    }


@router.get("/", response_model=list[ProjectListRead])
async def list_projects(
    skip: int = 0, limit: int = 200,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    result = await db.execute(
        select(Project).options(*_LOAD).order_by(Project.updated_at.desc()).offset(skip).limit(limit)
    )
    projects = result.scalars().all()
    return [ProjectListRead.model_validate(_enrich(p)) for p in projects]


@router.post("/", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
async def create_project(
    body: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    project = Project(**body.model_dump())
    db.add(project)
    await db.flush()
    result = await db.execute(select(Project).options(*_LOAD).where(Project.id == project.id))
    p = result.scalar_one()
    return ProjectRead.model_validate(_enrich(p))


@router.get("/{project_id}", response_model=ProjectRead)
async def get_project(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    result = await db.execute(select(Project).options(*_LOAD).where(Project.id == project_id))
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Projekt nicht gefunden")
    return ProjectRead.model_validate(_enrich(p))


@router.put("/{project_id}", response_model=ProjectRead)
async def update_project(
    project_id: str,
    body: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    result = await db.execute(select(Project).options(*_LOAD).where(Project.id == project_id))
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Projekt nicht gefunden")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(p, field, value)
    await db.flush()
    await db.refresh(p)
    result2 = await db.execute(select(Project).options(*_LOAD).where(Project.id == project_id))
    p = result2.scalar_one()
    return ProjectRead.model_validate(_enrich(p))


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    result = await db.execute(select(Project).where(Project.id == project_id))
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Projekt nicht gefunden")
    await db.delete(p)


# ── Sales Invoices ──────────────────────────────────────────────────────────

@router.post("/{project_id}/sales-invoices", response_model=SalesInvoiceRead, status_code=201)
async def add_sales_invoice(
    project_id: str,
    body: SalesInvoiceCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    si = SalesInvoice(project_id=project_id, **body.model_dump())
    db.add(si)
    await db.flush()
    await db.refresh(si)
    return si


@router.put("/{project_id}/sales-invoices/{si_id}", response_model=SalesInvoiceRead)
async def update_sales_invoice(
    project_id: str,
    si_id: str,
    body: SalesInvoiceUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    result = await db.execute(
        select(SalesInvoice).where(SalesInvoice.id == si_id, SalesInvoice.project_id == project_id)
    )
    si = result.scalar_one_or_none()
    if not si:
        raise HTTPException(status_code=404, detail="Rechnung nicht gefunden")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(si, field, value)
    await db.flush()
    await db.refresh(si)
    return si


@router.delete("/{project_id}/sales-invoices/{si_id}", status_code=204)
async def delete_sales_invoice(
    project_id: str,
    si_id: str,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    result = await db.execute(
        select(SalesInvoice).where(SalesInvoice.id == si_id, SalesInvoice.project_id == project_id)
    )
    si = result.scalar_one_or_none()
    if not si:
        raise HTTPException(status_code=404, detail="Rechnung nicht gefunden")
    await db.delete(si)


# ── Purchase Orders ─────────────────────────────────────────────────────────

@router.post("/{project_id}/purchase-orders", response_model=PurchaseOrderRead, status_code=201)
async def add_purchase_order(
    project_id: str,
    body: PurchaseOrderCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    # Use a Postgres advisory transaction lock to serialize concurrent inserts
    # (FOR UPDATE doesn't work with aggregate functions like MAX).
    await db.execute(text("SELECT pg_advisory_xact_lock(42)"))
    max_result = await db.execute(select(func.max(PurchaseOrder.order_number)))
    next_number = (max_result.scalar() or 0) + 1
    data = body.model_dump()
    data["klline_paid"] = data.get("klline_paid_date") is not None
    po = PurchaseOrder(project_id=project_id, order_number=next_number, **data)
    db.add(po)
    await db.flush()
    await db.refresh(po)
    return po


@router.put("/{project_id}/purchase-orders/{po_id}", response_model=PurchaseOrderRead)
async def update_purchase_order(
    project_id: str,
    po_id: str,
    body: PurchaseOrderUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    result = await db.execute(
        select(PurchaseOrder).where(PurchaseOrder.id == po_id, PurchaseOrder.project_id == project_id)
    )
    po = result.scalar_one_or_none()
    if not po:
        raise HTTPException(status_code=404, detail="Bestellung nicht gefunden")
    data = body.model_dump(exclude_unset=True)
    # Auto-derive klline_paid from klline_paid_date
    if "klline_paid_date" in data:
        data["klline_paid"] = data["klline_paid_date"] is not None
    elif "klline_paid" in data:
        del data["klline_paid"]  # Don't allow setting klline_paid without klline_paid_date
    for field, value in data.items():
        setattr(po, field, value)
    await db.flush()
    await db.refresh(po)
    return po


@router.delete("/{project_id}/purchase-orders/{po_id}", status_code=204)
async def delete_purchase_order(
    project_id: str,
    po_id: str,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    result = await db.execute(
        select(PurchaseOrder).where(PurchaseOrder.id == po_id, PurchaseOrder.project_id == project_id)
    )
    po = result.scalar_one_or_none()
    if not po:
        raise HTTPException(status_code=404, detail="Bestellung nicht gefunden")
    await db.delete(po)
