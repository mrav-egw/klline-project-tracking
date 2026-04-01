import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Product(Base):
    __tablename__ = "products"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String, nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    listenpreis: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"))
    einheit: Mapped[str] = mapped_column(String, default="Stk")
    supplier_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("suppliers.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    supplier: Mapped["Supplier | None"] = relationship("Supplier")


from app.models.supplier import Supplier  # noqa: E402
