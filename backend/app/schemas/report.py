from datetime import date
from decimal import Decimal

from pydantic import BaseModel

from app.schemas.cost_entry import CostEntryRead


class ProjectRevenueRow(BaseModel):
    project_id: str
    project_name: str
    customer_name: str
    invoice_date: date | None
    invoice_number: str | None
    net_amount: Decimal


class ProjectPurchaseRow(BaseModel):
    project_id: str
    project_name: str
    supplier_name: str
    order_date: date | None
    order_amount: Decimal


class VertriebsberichtReport(BaseModel):
    year: int
    month: int | None
    # Automatic from projects
    project_revenue: Decimal
    project_purchases: Decimal
    project_revenue_rows: list[ProjectRevenueRow]
    project_purchase_rows: list[ProjectPurchaseRow]
    # Manual cost entries (PAYROLL / OVERHEAD)
    payroll_costs: Decimal
    overhead_costs: Decimal
    manual_entries: list[CostEntryRead]
    # Grand totals
    total_revenue: Decimal
    total_purchases: Decimal
    total_other_costs: Decimal
    profit: Decimal


class DashboardSummary(BaseModel):
    total_projects: int
    open_projects: int
    completed_projects: int
    total_revenue: Decimal
    total_purchases: Decimal
    total_still_to_invoice: Decimal
    current_profit: Decimal
