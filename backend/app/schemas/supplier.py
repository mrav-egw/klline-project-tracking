from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class SupplierBase(BaseModel):
    code: str
    name: str
    contact_person: str | None = None
    email: str | None = None
    phone: str | None = None
    discount_pct: Decimal | None = None
    payment_terms: str | None = None
    delivery_costs: str | None = None
    lead_time: str | None = None
    work_tables: bool = False
    conference_furniture: bool = False
    seating: bool = False
    lounge: bool = False
    office_chairs: bool = False
    school_furniture: bool = False
    acoustics: bool = False
    kitchens: bool = False


class SupplierCreate(SupplierBase):
    pass


class SupplierUpdate(BaseModel):
    code: str | None = None
    name: str | None = None
    contact_person: str | None = None
    email: str | None = None
    phone: str | None = None
    discount_pct: Decimal | None = None
    payment_terms: str | None = None
    delivery_costs: str | None = None
    lead_time: str | None = None
    work_tables: bool | None = None
    conference_furniture: bool | None = None
    seating: bool | None = None
    lounge: bool | None = None
    office_chairs: bool | None = None
    school_furniture: bool | None = None
    acoustics: bool | None = None
    kitchens: bool | None = None


class SupplierRead(SupplierBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
