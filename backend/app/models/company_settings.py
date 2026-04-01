from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class CompanySettings(Base):
    __tablename__ = "company_settings"

    id: Mapped[str] = mapped_column(String, primary_key=True, default="default")
    company_name: Mapped[str | None] = mapped_column(String, nullable=True)
    address: Mapped[str | None] = mapped_column(String, nullable=True)
    postal_code: Mapped[str | None] = mapped_column(String, nullable=True)
    city: Mapped[str | None] = mapped_column(String, nullable=True)
    country: Mapped[str | None] = mapped_column(String, nullable=True, default="Österreich")
    phone: Mapped[str | None] = mapped_column(String, nullable=True)
    email: Mapped[str | None] = mapped_column(String, nullable=True)
    web: Mapped[str | None] = mapped_column(String, nullable=True)
    fn_nr: Mapped[str | None] = mapped_column(String, nullable=True)
    ust_id: Mapped[str | None] = mapped_column(String, nullable=True)
    amtsgericht: Mapped[str | None] = mapped_column(String, nullable=True)
    geschaeftsfuehrung: Mapped[str | None] = mapped_column(String, nullable=True)
    bank_name: Mapped[str | None] = mapped_column(String, nullable=True)
    iban: Mapped[str | None] = mapped_column(String, nullable=True)
    bic: Mapped[str | None] = mapped_column(String, nullable=True)
    logo_base64: Mapped[str | None] = mapped_column(Text, nullable=True)
    default_payment_terms: Mapped[str | None] = mapped_column(Text, nullable=True)
    default_greeting: Mapped[str | None] = mapped_column(Text, nullable=True)
