from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from app.schemas.customer import CustomerRead


class SalesInvoiceBase(BaseModel):
    invoice_number: str | None = None
    invoice_date: date | None = None
    net_amount: Decimal = Decimal("0")
    noch_zu_fakturieren: Decimal = Decimal("0")
    customer_payment_amount: Decimal | None = None
    customer_payment_date: date | None = None


class SalesInvoiceCreate(SalesInvoiceBase):
    pass


class SalesInvoiceUpdate(BaseModel):
    invoice_number: str | None = None
    invoice_date: date | None = None
    net_amount: Decimal | None = None
    noch_zu_fakturieren: Decimal | None = None
    customer_payment_amount: Decimal | None = None
    customer_payment_date: date | None = None


class SalesInvoiceRead(SalesInvoiceBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str


class PurchaseOrderBase(BaseModel):
    supplier_id: str | None = None
    supplier_name_free: str | None = None
    order_date: date | None = None
    order_amount: Decimal = Decimal("0")
    supplier_invoice_number: str | None = None
    supplier_invoice_amount: Decimal | None = None
    klline_paid: bool = False
    klline_paid_date: date | None = None
    delivery_notes: str | None = None
    installation_notes: str | None = None


class PurchaseOrderCreate(PurchaseOrderBase):
    pass


class PurchaseOrderUpdate(BaseModel):
    supplier_id: str | None = None
    supplier_name_free: str | None = None
    order_date: date | None = None
    order_amount: Decimal | None = None
    supplier_invoice_number: str | None = None
    supplier_invoice_amount: Decimal | None = None
    klline_paid: bool | None = None
    klline_paid_date: date | None = None
    delivery_notes: str | None = None
    installation_notes: str | None = None


class PurchaseOrderRead(PurchaseOrderBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str


class ProjectBase(BaseModel):
    name: str
    customer_id: str


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    name: str | None = None
    customer_id: str | None = None


class ProjectRead(ProjectBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    customer: CustomerRead | None = None
    sales_invoices: list[SalesInvoiceRead] = []
    purchase_orders: list[PurchaseOrderRead] = []
    contribution_margin: Decimal
    total_sales: Decimal
    total_purchases: Decimal
    total_still_to_invoice: Decimal
    created_at: datetime
    updated_at: datetime


class ProjectListRead(ProjectBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    customer: CustomerRead | None = None
    contribution_margin: Decimal
    total_sales: Decimal
    total_purchases: Decimal
    total_still_to_invoice: Decimal
    invoice_count: int
    purchase_order_count: int
    created_at: datetime
    updated_at: datetime
