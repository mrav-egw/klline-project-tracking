from decimal import Decimal

from sqlalchemy import extract, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.angebot import Angebot
from app.models.cost_entry import CostCategory, CostEntry
from app.models.project import Project, PurchaseOrder
from app.models.rechnung import Rechnung
from app.schemas.report import (
    DashboardSummary,
    OutstandingExpenseItem,
    OutstandingRevenueItem,
    ProjectPurchaseRow,
    ProjectRevenueRow,
    VertriebsberichtReport,
)


async def get_vertriebsbericht(
    db: AsyncSession, year: int, month: int | None
) -> VertriebsberichtReport:

    # ── Project-derived revenue (from Rechnungen) ────────────────────────────
    r_q = (
        select(Rechnung)
        .join(Rechnung.angebot)
        .join(Angebot.project)
        .options(
            selectinload(Rechnung.angebot).selectinload(Angebot.project).selectinload(Project.customer),
        )
        .where(extract("year", Rechnung.rechnung_date) == year)
    )
    if month is not None:
        r_q = r_q.where(extract("month", Rechnung.rechnung_date) == month)
    r_result = await db.execute(r_q)
    rechnungen = r_result.scalars().all()

    revenue_rows = [
        ProjectRevenueRow(
            project_id=r.project_id,
            project_name=r.angebot.project.name,
            customer_name=r.angebot.project.customer.name if r.angebot.project.customer else "–",
            invoice_date=r.rechnung_date,
            invoice_number=r.rechnung_number,
            net_amount=r.total_netto,
            customer_payment_date=r.customer_payment_date,
        )
        for r in rechnungen
    ]
    project_revenue = sum((r.net_amount for r in revenue_rows), Decimal("0"))

    # ── Project-derived purchases (from PurchaseOrders) ───────────────────────
    po_q = (
        select(PurchaseOrder)
        .join(PurchaseOrder.project)
        .options(
            selectinload(PurchaseOrder.project).selectinload(Project.customer),
            selectinload(PurchaseOrder.supplier),
        )
        .where(extract("year", PurchaseOrder.order_date) == year)
    )
    if month is not None:
        po_q = po_q.where(extract("month", PurchaseOrder.order_date) == month)
    po_result = await db.execute(po_q)
    purchase_orders = po_result.scalars().all()

    purchase_rows = [
        ProjectPurchaseRow(
            po_id=po.id,
            order_number=po.order_number,
            project_id=po.project_id,
            project_name=po.project.name,
            name=po.name,
            supplier_name=po.supplier_name_free or (po.supplier.name if po.supplier else "–"),
            order_date=po.order_date,
            order_amount=po.order_amount,
            supplier_invoice_amount=po.supplier_invoice_amount,
            klline_paid=po.klline_paid,
        )
        for po in purchase_orders
    ]
    project_purchases = sum((r.order_amount for r in purchase_rows), Decimal("0"))
    total_supplier_invoiced = sum(
        (r.supplier_invoice_amount for r in purchase_rows if r.supplier_invoice_amount is not None),
        Decimal("0"),
    )

    # ── Manual cost entries (PAYROLL + OVERHEAD only) ─────────────────────────
    ce_q = (
        select(CostEntry)
        .where(
            CostEntry.category.in_([CostCategory.PAYROLL, CostCategory.OVERHEAD]),
            extract("year", CostEntry.entry_date) == year,
        )
        .order_by(CostEntry.entry_date)
    )
    if month is not None:
        ce_q = ce_q.where(extract("month", CostEntry.entry_date) == month)
    ce_result = await db.execute(ce_q)
    manual_entries = ce_result.scalars().all()

    payroll = sum(
        (e.other_costs for e in manual_entries if e.category == CostCategory.PAYROLL), Decimal("0")
    )
    overhead = sum(
        (e.other_costs for e in manual_entries if e.category == CostCategory.OVERHEAD), Decimal("0")
    )
    total_other = payroll + overhead
    profit = project_revenue - project_purchases - total_other

    # ── Global outstanding (no date filter) ───────────────────────────────────
    # Noch zu erwartende Einnahmen: Rechnungen without customer payment
    unpaid_rechnungen_result = await db.execute(
        select(Rechnung)
        .join(Rechnung.angebot)
        .join(Angebot.project)
        .options(
            selectinload(Rechnung.angebot).selectinload(Angebot.project).selectinload(Project.customer),
        )
        .where(Rechnung.customer_payment_date.is_(None))
    )
    unpaid_rechnungen_list = unpaid_rechnungen_result.scalars().all()
    noch_zu_erwartende_einnahmen = sum(
        (r.total_netto for r in unpaid_rechnungen_list), Decimal("0"),
    )
    einnahmen_items = [
        OutstandingRevenueItem(
            rechnung_number=r.rechnung_number,
            project_name=r.angebot.project.name,
            customer_name=r.angebot.project.customer.name if r.angebot.project.customer else "–",
            total_netto=r.total_netto,
        )
        for r in unpaid_rechnungen_list
    ]

    unpaid_po_result = await db.execute(
        select(PurchaseOrder)
        .join(PurchaseOrder.project)
        .options(
            selectinload(PurchaseOrder.project),
            selectinload(PurchaseOrder.supplier),
        )
        .where(PurchaseOrder.klline_paid == False)  # noqa: E712
    )
    unpaid_po_list = unpaid_po_result.scalars().all()
    noch_zu_erwartende_ausgaben = sum(
        (po.order_amount for po in unpaid_po_list), Decimal("0"),
    )
    ausgaben_items = [
        OutstandingExpenseItem(
            order_number=po.order_number,
            name=po.name,
            project_name=po.project.name,
            supplier_name=po.supplier_name_free or (po.supplier.name if po.supplier else "–"),
            order_amount=po.order_amount,
        )
        for po in unpaid_po_list
    ]

    return VertriebsberichtReport(
        year=year,
        month=month,
        project_revenue=project_revenue,
        project_purchases=project_purchases,
        project_revenue_rows=revenue_rows,
        project_purchase_rows=purchase_rows,
        payroll_costs=payroll,
        overhead_costs=overhead,
        manual_entries=manual_entries,
        total_revenue=project_revenue,
        total_purchases=project_purchases,
        total_other_costs=total_other,
        total_supplier_invoiced=total_supplier_invoiced,
        profit=profit,
        noch_zu_erwartende_einnahmen=noch_zu_erwartende_einnahmen,
        noch_zu_erwartende_einnahmen_items=einnahmen_items,
        noch_zu_erwartende_ausgaben=noch_zu_erwartende_ausgaben,
        noch_zu_erwartende_ausgaben_items=ausgaben_items,
    )


async def get_dashboard_summary(db: AsyncSession) -> DashboardSummary:
    projects_result = await db.execute(
        select(Project).options(
            selectinload(Project.purchase_orders),
            selectinload(Project.angebote).options(
                selectinload(Angebot.positions),
                selectinload(Angebot.rechnungen),
            ),
        )
    )
    projects = projects_result.scalars().all()

    total_revenue = sum((p.total_sales for p in projects), Decimal("0"))
    total_purchases = sum((p.total_purchases for p in projects), Decimal("0"))
    total_still = sum((p.total_still_to_invoice for p in projects), Decimal("0"))
    open_count = sum(1 for p in projects if not p.is_completed)
    completed_count = sum(1 for p in projects if p.is_completed)

    return DashboardSummary(
        total_projects=len(projects),
        open_projects=open_count,
        completed_projects=completed_count,
        total_revenue=total_revenue,
        total_purchases=total_purchases,
        total_still_to_invoice=total_still,
        current_profit=total_revenue - total_purchases,
    )
