from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class NumberSequence(Base):
    __tablename__ = "number_sequences"

    id: Mapped[str] = mapped_column(String, primary_key=True)  # "AN" or "RE"
    prefix: Mapped[str] = mapped_column(String, nullable=False)  # "AN-" or "RE-"
    current_value: Mapped[int] = mapped_column(Integer, default=0)
