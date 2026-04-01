import uuid
from datetime import date, datetime
from decimal import Decimal
from enum import Enum as PyEnum

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class AngebotStatus(str, PyEnum):
    ENTWURF = "ENTWURF"
    AKZEPTIERT = "AKZEPTIERT"


class AngebotPositionGroup(Base):
    __tablename__ = "angebot_position_groups"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    angebot_id: Mapped[str] = mapped_column(String, ForeignKey("angebote.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    positions: Mapped[list["AngebotPosition"]] = relationship(
        "AngebotPosition", back_populates="group", cascade="all, delete-orphan",
        order_by="AngebotPosition.sort_order",
    )


class AngebotPosition(Base):
    __tablename__ = "angebot_positions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    angebot_id: Mapped[str] = mapped_column(String, ForeignKey("angebote.id", ondelete="CASCADE"), nullable=False)
    group_id: Mapped[str | None] = mapped_column(String, ForeignKey("angebot_position_groups.id", ondelete="SET NULL"), nullable=True)
    product_id: Mapped[str] = mapped_column(String, ForeignKey("products.id", ondelete="RESTRICT"), nullable=False)
    position_number: Mapped[int] = mapped_column(Integer, default=0)
    description_override: Mapped[str | None] = mapped_column(Text, nullable=True)
    menge: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("1"))
    einzelpreis: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"))
    rabatt_pct: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("0"))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    group: Mapped["AngebotPositionGroup | None"] = relationship("AngebotPositionGroup", back_populates="positions")
    product: Mapped["Product"] = relationship("Product")

    @property
    def gesamtpreis(self) -> Decimal:
        return self.menge * self.einzelpreis

    @property
    def rabatt_amount(self) -> Decimal:
        return self.gesamtpreis * (self.rabatt_pct / Decimal("100"))

    @property
    def netto_amount(self) -> Decimal:
        return self.gesamtpreis - self.rabatt_amount


class Angebot(Base):
    __tablename__ = "angebote"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    angebot_number: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    angebot_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[AngebotStatus] = mapped_column(Enum(AngebotStatus), default=AngebotStatus.ENTWURF)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    project: Mapped["Project"] = relationship("Project", back_populates="angebote")
    groups: Mapped[list["AngebotPositionGroup"]] = relationship(
        "AngebotPositionGroup", cascade="all, delete-orphan",
        order_by="AngebotPositionGroup.sort_order",
    )
    positions: Mapped[list["AngebotPosition"]] = relationship(
        "AngebotPosition", cascade="all, delete-orphan",
        order_by="AngebotPosition.sort_order",
    )
    rechnungen: Mapped[list["Rechnung"]] = relationship(
        "Rechnung", back_populates="angebot", cascade="all, delete-orphan",
    )

    @property
    def total_netto(self) -> Decimal:
        return sum((p.netto_amount for p in self.positions), Decimal("0"))


# Avoid circular imports
from app.models.product import Product  # noqa: E402
from app.models.rechnung import Rechnung  # noqa: E402
from app.models.project import Project  # noqa: E402
