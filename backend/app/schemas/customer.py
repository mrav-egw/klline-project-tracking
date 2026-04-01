from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class CustomerBase(BaseModel):
    name: str
    contact_person: str | None = None
    email: str | None = None
    phone: str | None = None
    address: str | None = None
    postal_code: str | None = None
    city: str | None = None
    country: str | None = "Österreich"
    customer_ust_id: str | None = None
    notes: str | None = None
    ust_pct: Decimal = Decimal("20.00")


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    name: str | None = None
    contact_person: str | None = None
    email: str | None = None
    phone: str | None = None
    address: str | None = None
    postal_code: str | None = None
    city: str | None = None
    country: str | None = None
    customer_ust_id: str | None = None
    notes: str | None = None
    ust_pct: Decimal | None = None


class CustomerRead(CustomerBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime
    updated_at: datetime
