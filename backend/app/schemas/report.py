from decimal import Decimal

from pydantic import BaseModel

from app.schemas.cost_entry import CostEntryRead


class VertriebsberichtReport(BaseModel):
    year: int
    month: int | None
    revenue_net: Decimal
    purchase_cost_net: Decimal
    other_costs: Decimal
    profit: Decimal
    entries: list[CostEntryRead]
    totals_by_category: dict[str, Decimal]


class DashboardSummary(BaseModel):
    total_projects: int
    total_revenue: Decimal
    total_purchases: Decimal
    total_still_to_invoice: Decimal
    current_profit: Decimal
    open_projects: int
