from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from app.schemas.product import ProductRead
from app.schemas.rechnung import RechnungRead


# ── Position Groups ──────────────────────────────────────────────────────────

class PositionGroupCreate(BaseModel):
    name: str
    sort_order: int = 0


class PositionGroupUpdate(BaseModel):
    name: str | None = None
    sort_order: int | None = None


class PositionGroupRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    sort_order: int


# ── Positions ────────────────────────────────────────────────────────────────

class PositionCreate(BaseModel):
    group_id: str | None = None
    product_id: str
    description_override: str | None = None
    menge: Decimal = Decimal("1")
    einzelpreis: Decimal = Decimal("0")
    rabatt_pct: Decimal = Decimal("0")
    sort_order: int = 0


class PositionUpdate(BaseModel):
    group_id: str | None = None
    product_id: str | None = None
    description_override: str | None = None
    menge: Decimal | None = None
    einzelpreis: Decimal | None = None
    rabatt_pct: Decimal | None = None
    sort_order: int | None = None


class PositionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    group_id: str | None
    product_id: str
    product: ProductRead
    position_number: int
    description_override: str | None
    menge: Decimal
    einzelpreis: Decimal
    rabatt_pct: Decimal
    gesamtpreis: Decimal
    rabatt_amount: Decimal
    netto_amount: Decimal
    sort_order: int


# ── Angebot ──────────────────────────────────────────────────────────────────

class AngebotCreate(BaseModel):
    angebot_date: date | None = None


class AngebotUpdate(BaseModel):
    angebot_date: date | None = None


class AngebotRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str
    angebot_number: str
    angebot_date: date | None
    status: str
    total_netto: Decimal
    groups: list[PositionGroupRead]
    positions: list[PositionRead]
    rechnungen: list[RechnungRead]
    created_at: datetime
    updated_at: datetime


class AngebotListRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str
    angebot_number: str
    angebot_date: date | None
    status: str
    total_netto: Decimal
    position_count: int
    created_at: datetime
