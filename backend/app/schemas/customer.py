from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class CustomerBase(BaseModel):
    kundennr: str | None = None
    name: str
    contact_person: str | None = None
    email: str | None = None
    phone: str | None = None
    mobil: str | None = None
    webseite: str | None = None
    address: str | None = None
    postal_code: str | None = None
    city: str | None = None
    country: str | None = "Österreich"
    customer_ust_id: str | None = None
    notes: str | None = None
    ust_pct: Decimal = Decimal("20.00")
    payment_terms_days: int | None = None


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    kundennr: str | None = None
    name: str | None = None
    contact_person: str | None = None
    email: str | None = None
    phone: str | None = None
    mobil: str | None = None
    webseite: str | None = None
    address: str | None = None
    postal_code: str | None = None
    city: str | None = None
    country: str | None = None
    customer_ust_id: str | None = None
    notes: str | None = None
    ust_pct: Decimal | None = None
    payment_terms_days: int | None = None


class CustomerRead(CustomerBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime
    updated_at: datetime
