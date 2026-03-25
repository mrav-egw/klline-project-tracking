from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from app.models.cost_entry import CostCategory


class CostEntryBase(BaseModel):
    name: str
    entry_date: date
    invoice_number: str | None = None
    revenue_net: Decimal = Decimal("0")
    purchase_cost_net: Decimal = Decimal("0")
    other_costs: Decimal = Decimal("0")
    notes: str | None = None
    category: CostCategory = CostCategory.REVENUE


class CostEntryCreate(CostEntryBase):
    pass


class CostEntryUpdate(BaseModel):
    name: str | None = None
    entry_date: date | None = None
    invoice_number: str | None = None
    revenue_net: Decimal | None = None
    purchase_cost_net: Decimal | None = None
    other_costs: Decimal | None = None
    notes: str | None = None
    category: CostCategory | None = None


class CostEntryRead(CostEntryBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime
