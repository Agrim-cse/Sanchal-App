from datetime import date, datetime
from enum import Enum

from sqlalchemy import Date, DateTime, Enum as SqlEnum, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class WorkStatus(str, Enum):
    PENDING = "Pending"
    ONGOING = "Ongoing"
    COMPLETED = "Completed"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    full_name: Mapped[str] = mapped_column(String(160), nullable=False)
    contact_number: Mapped[str] = mapped_column(String(32), nullable=False)
    zone: Mapped[str] = mapped_column(String(160), nullable=False, index=True)
    block: Mapped[str] = mapped_column(String(160), nullable=False, index=True)
    profession: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class Work(Base):
    __tablename__ = "works"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    department: Mapped[str] = mapped_column(String(160), nullable=False)
    contractor_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    zone: Mapped[str] = mapped_column(String(160), nullable=False, index=True)
    block: Mapped[str] = mapped_column(String(160), nullable=False, index=True)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    estimated_completion: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[WorkStatus] = mapped_column(
        SqlEnum(WorkStatus, name="work_status", values_callable=lambda values: [v.value for v in values]),
        default=WorkStatus.PENDING,
        nullable=False,
    )
    cost: Mapped[float] = mapped_column(Float, nullable=False)
    conflicts_detected: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Persisted delay estimate; retained as part of the ML feature pipeline.
    ml_delay_risk_score: Mapped[float | None] = mapped_column(Float, nullable=True)


class Grievance(Base):
    __tablename__ = "grievances"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    resident_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    zone: Mapped[str] = mapped_column(String(160), nullable=False, index=True)
    block: Mapped[str] = mapped_column(String(160), nullable=False, index=True)
    issue_type: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    photo_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="Open", index=True)
