import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, Enum, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base

import enum


class CostCategory(str, enum.Enum):
    REVENUE = "REVENUE"
    PURCHASE = "PURCHASE"
    PAYROLL = "PAYROLL"
    OVERHEAD = "OVERHEAD"


class CostEntry(Base):
    __tablename__ = "cost_entries"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String, nullable=False)
    entry_date: Mapped[date] = mapped_column(Date, nullable=False)
    invoice_number: Mapped[str | None] = mapped_column(String, nullable=True)
    revenue_net: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"))
    purchase_cost_net: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"))
    other_costs: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"))
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[CostCategory] = mapped_column(
        Enum(CostCategory, name="cost_category"), nullable=False, default=CostCategory.REVENUE
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
