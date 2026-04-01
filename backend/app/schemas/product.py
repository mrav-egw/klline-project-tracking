from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class ProductBase(BaseModel):
    name: str
    description: str | None = None
    listenpreis: Decimal = Decimal("0")
    einheit: str = "Stk"
    supplier_id: str | None = None


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    listenpreis: Decimal | None = None
    einheit: str | None = None
    supplier_id: str | None = None


class ProductRead(ProductBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime
    updated_at: datetime
