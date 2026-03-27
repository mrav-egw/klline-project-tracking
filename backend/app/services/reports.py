from decimal import Decimal

from sqlalchemy import extract, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.cost_entry import CostCategory, CostEntry
from app.models.project import Project, PurchaseOrder, SalesInvoice
from app.schemas.report import (
    DashboardSummary,
    ProjectPurchaseRow,
    ProjectRevenueRow,
    VertriebsberichtReport,
)


async def get_vertriebsbericht(
    db: AsyncSession, year: int, month: int | None
) -> VertriebsberichtReport:

    # ── Project-derived revenue (from SalesInvoices) ─────────────────────────
    si_q = (
        select(SalesInvoice)
        .join(SalesInvoice.project)
        .options(selectinload(SalesInvoice.project).selectinload(Project.customer))
        .where(extract("year", SalesInvoice.invoice_date) == year)
    )
    if month is not None:
        si_q = si_q.where(extract("month", SalesInvoice.invoice_date) == month)
    si_result = await db.execute(si_q)
    invoices = si_result.scalars().all()

    revenue_rows = [
        ProjectRevenueRow(
            project_id=si.project_id,
            project_name=si.project.name,
            customer_name=si.project.customer.name if si.project.customer else "–",
            invoice_date=si.invoice_date,
            invoice_number=si.invoice_number,
            net_amount=si.net_amount,
            customer_payment_date=si.customer_payment_date,
        )
        for si in invoices
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
    nzf_result = await db.execute(
        select(SalesInvoice).where(SalesInvoice.customer_payment_date.is_(None))
    )
    noch_zu_erwartende_einnahmen = sum(
        (si.net_amount for si in nzf_result.scalars().all()),
        Decimal("0"),
    )

    unpaid_result = await db.execute(
        select(PurchaseOrder).where(PurchaseOrder.klline_paid == False)  # noqa: E712
    )
    noch_zu_erwartende_ausgaben = sum(
        (po.order_amount for po in unpaid_result.scalars().all()),
        Decimal("0"),
    )

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
        noch_zu_erwartende_ausgaben=noch_zu_erwartende_ausgaben,
    )


async def get_dashboard_summary(db: AsyncSession) -> DashboardSummary:
    projects_result = await db.execute(
        select(Project).options(selectinload(Project.sales_invoices), selectinload(Project.purchase_orders))
    )
    projects = projects_result.scalars().all()

    total_revenue = sum((p.total_sales for p in projects), Decimal("0"))
    total_purchases = sum((p.total_purchases for p in projects), Decimal("0"))
    total_still = sum((p.total_still_to_invoice for p in projects), Decimal("0"))
    open_count = sum(
        1 for p in projects
        if not p.is_completed and (
            any(si.customer_payment_date is None for si in p.sales_invoices) or not p.sales_invoices
        )
    )
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
