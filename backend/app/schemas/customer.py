from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class CustomerBase(BaseModel):
    name: str
    contact_person: str | None = None
    email: str | None = None
    phone: str | None = None
    notes: str | None = None
    ust_pct: Decimal = Decimal("20.00")


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    name: str | None = None
    contact_person: str | None = None
    email: str | None = None
    phone: str | None = None
    notes: str | None = None
    ust_pct: Decimal | None = None


class CustomerRead(CustomerBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime
    updated_at: datetime
