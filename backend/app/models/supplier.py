import uuid
from decimal import Decimal

from sqlalchemy import Boolean, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Supplier(Base):
    __tablename__ = "suppliers"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    code: Mapped[str] = mapped_column(String(10), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    contact_person: Mapped[str | None] = mapped_column(String, nullable=True)
    email: Mapped[str | None] = mapped_column(String, nullable=True)
    phone: Mapped[str | None] = mapped_column(String, nullable=True)
    discount_pct: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    payment_terms: Mapped[str | None] = mapped_column(String, nullable=True)
    delivery_costs: Mapped[str | None] = mapped_column(String, nullable=True)
    lead_time: Mapped[str | None] = mapped_column(String, nullable=True)
    # Product categories
    work_tables: Mapped[bool] = mapped_column(Boolean, default=False)
    conference_furniture: Mapped[bool] = mapped_column(Boolean, default=False)
    seating: Mapped[bool] = mapped_column(Boolean, default=False)
    lounge: Mapped[bool] = mapped_column(Boolean, default=False)
    office_chairs: Mapped[bool] = mapped_column(Boolean, default=False)
    school_furniture: Mapped[bool] = mapped_column(Boolean, default=False)
    acoustics: Mapped[bool] = mapped_column(Boolean, default=False)
    kitchens: Mapped[bool] = mapped_column(Boolean, default=False)
