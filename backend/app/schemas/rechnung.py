from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class RechnungCreate(BaseModel):
    rechnung_type: str  # "ABSCHLAG" or "SCHLUSS"
    rechnung_date: date | None = None
    abschlag_pct: Decimal | None = None  # Only for ABSCHLAG


class RechnungPaymentUpdate(BaseModel):
    customer_payment_amount: Decimal | None = None
    customer_payment_date: date | None = None


class RechnungRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    angebot_id: str
    project_id: str
    rechnung_number: str
    rechnung_date: date | None
    rechnung_type: str
    abschlag_pct: Decimal | None
    total_netto: Decimal
    customer_payment_amount: Decimal | None
    customer_payment_date: date | None
    created_at: datetime
