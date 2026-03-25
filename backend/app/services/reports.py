from decimal import Decimal

from sqlalchemy import extract, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.cost_entry import CostCategory, CostEntry
from app.models.project import Project, PurchaseOrder, SalesInvoice
from app.schemas.report import DashboardSummary, VertriebsberichtReport


async def get_vertriebsbericht(
    db: AsyncSession, year: int, month: int | None
) -> VertriebsberichtReport:
    q = select(CostEntry).where(extract("year", CostEntry.entry_date) == year)
    if month is not None:
        q = q.where(extract("month", CostEntry.entry_date) == month)
    q = q.order_by(CostEntry.entry_date)
    result = await db.execute(q)
    entries = result.scalars().all()

    revenue = sum((e.revenue_net for e in entries), Decimal("0"))
    purchases = sum((e.purchase_cost_net for e in entries), Decimal("0"))
    other = sum((e.other_costs for e in entries), Decimal("0"))
    profit = revenue - purchases - other

    totals: dict[str, Decimal] = {}
    for cat in CostCategory:
        cat_entries = [e for e in entries if e.category == cat]
        totals[cat.value] = (
            sum((e.revenue_net for e in cat_entries), Decimal("0"))
            - sum((e.purchase_cost_net for e in cat_entries), Decimal("0"))
            - sum((e.other_costs for e in cat_entries), Decimal("0"))
        )

    return VertriebsberichtReport(
        year=year,
        month=month,
        revenue_net=revenue,
        purchase_cost_net=purchases,
        other_costs=other,
        profit=profit,
        entries=entries,
        totals_by_category=totals,
    )


async def get_dashboard_summary(db: AsyncSession) -> DashboardSummary:
    projects_result = await db.execute(
        select(Project).options(selectinload(Project.sales_invoices), selectinload(Project.purchase_orders))
    )
    projects = projects_result.scalars().all()

    total_revenue = sum((p.total_sales for p in projects), Decimal("0"))
    total_purchases = sum((p.total_purchases for p in projects), Decimal("0"))
    total_still = sum((p.total_still_to_invoice for p in projects), Decimal("0"))
    # open = projects where at least one invoice is not fully paid
    open_count = sum(
        1 for p in projects
        if any(si.customer_payment_date is None for si in p.sales_invoices) or not p.sales_invoices
    )

    cost_result = await db.execute(select(CostEntry))
    cost_entries = cost_result.scalars().all()
    overhead = sum((e.other_costs + e.purchase_cost_net for e in cost_entries), Decimal("0"))
    current_profit = total_revenue - total_purchases

    return DashboardSummary(
        total_projects=len(projects),
        total_revenue=total_revenue,
        total_purchases=total_purchases,
        total_still_to_invoice=total_still,
        current_profit=current_profit,
        open_projects=open_count,
    )
