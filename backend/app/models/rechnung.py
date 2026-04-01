import uuid
from datetime import date, datetime
from decimal import Decimal
from enum import Enum as PyEnum

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class RechnungType(str, PyEnum):
    ABSCHLAG = "ABSCHLAG"
    SCHLUSS = "SCHLUSS"


class Rechnung(Base):
    __tablename__ = "rechnungen"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    angebot_id: Mapped[str] = mapped_column(String, ForeignKey("angebote.id", ondelete="CASCADE"), nullable=False)
    project_id: Mapped[str] = mapped_column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    rechnung_number: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    rechnung_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    rechnung_type: Mapped[RechnungType] = mapped_column(Enum(RechnungType), nullable=False)
    abschlag_pct: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    total_netto: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"))
    customer_payment_amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    customer_payment_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    angebot: Mapped["Angebot"] = relationship("Angebot", back_populates="rechnungen")


# Avoid circular imports
from app.models.angebot import Angebot  # noqa: E402
