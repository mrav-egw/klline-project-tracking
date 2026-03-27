import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.customer import Customer
    from app.models.supplier import Supplier


class SalesInvoice(Base):
    __tablename__ = "sales_invoices"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    invoice_number: Mapped[str | None] = mapped_column(String, nullable=True)
    invoice_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    net_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"))
    noch_zu_fakturieren: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"))
    customer_payment_amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    customer_payment_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    project: Mapped["Project"] = relationship("Project", back_populates="sales_invoices")


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    order_number: Mapped[int | None] = mapped_column(nullable=True)
    name: Mapped[str | None] = mapped_column(String, nullable=True)
    project_id: Mapped[str] = mapped_column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    supplier_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("suppliers.id", ondelete="SET NULL"), nullable=True
    )
    supplier_name_free: Mapped[str | None] = mapped_column(String, nullable=True)
    order_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    order_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"))
    supplier_invoice_number: Mapped[str | None] = mapped_column(String, nullable=True)
    supplier_invoice_amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    klline_paid: Mapped[bool] = mapped_column(Boolean, default=False)
    klline_paid_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    delivery_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    installation_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    project: Mapped["Project"] = relationship("Project", back_populates="purchase_orders")
    supplier: Mapped["Supplier | None"] = relationship("Supplier")


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String, nullable=False, index=True)
    customer_id: Mapped[str] = mapped_column(String, ForeignKey("customers.id", ondelete="RESTRICT"), nullable=False)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    customer: Mapped["Customer"] = relationship("Customer", back_populates="projects")
    sales_invoices: Mapped[list["SalesInvoice"]] = relationship(
        "SalesInvoice", back_populates="project", cascade="all, delete-orphan"
    )
    purchase_orders: Mapped[list["PurchaseOrder"]] = relationship(
        "PurchaseOrder", back_populates="project", cascade="all, delete-orphan"
    )

    @property
    def total_sales(self) -> Decimal:
        return sum((si.net_amount for si in self.sales_invoices), Decimal("0"))

    @property
    def total_still_to_invoice(self) -> Decimal:
        return sum(
            (si.net_amount for si in self.sales_invoices if si.customer_payment_date is None),
            Decimal("0"),
        )

    @property
    def total_purchases(self) -> Decimal:
        return sum((po.order_amount for po in self.purchase_orders), Decimal("0"))

    @property
    def contribution_margin(self) -> Decimal:
        return (self.total_sales + self.total_still_to_invoice) - self.total_purchases
