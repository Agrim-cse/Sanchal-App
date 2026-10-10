"""Sanchal API: authentication, zone-scoped civic works and grievances, and delay scoring."""

from __future__ import annotations

import os
import re
from contextlib import asynccontextmanager
from datetime import date, datetime, timedelta, timezone
from typing import Any

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import get_db, initialize_database
from models import Grievance, User, Work, WorkStatus

load_dotenv()

JWT_SECRET = os.getenv("JWT_SECRET")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET is required. Configure backend/.env before starting the API.")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer(auto_error=False)
ALLOWED_PROFESSIONS = {
    "PWD Dept Officer", "Water Board Official", "Telecom Engineer",
    "Private Contractor", "Electricity Board",
}
WORK_STATUSES = {item.value for item in WorkStatus}
GRIEVANCE_STATUSES = {"Open", "In Progress", "Resolved"}


@asynccontextmanager
async def lifespan(_: FastAPI):
    initialize_database()
    yield


app = FastAPI(
    title="Sanchal API",
    description="Location-scoped municipal works and grievance services.",
    version="3.0.0",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        item.strip()
        for item in os.getenv("FRONTEND_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")
        if item.strip()
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SignupRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=8, max_length=72)
    role: str
    full_name: str = Field(min_length=1, max_length=160)
    contact_number: str = Field(min_length=1, max_length=32)
    zone: str = Field(min_length=1, max_length=160)
    block: str = Field(min_length=1, max_length=160)
    profession: str | None = Field(default=None, max_length=100)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        value = value.lower()
        if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", value):
            raise ValueError("Enter a valid email address.")
        return value

    @field_validator("role")
    @classmethod
    def validate_role(cls, value: str) -> str:
        if value not in {"official", "resident"}:
            raise ValueError("Role must be 'official' or 'resident'.")
        return value

    @model_validator(mode="after")
    def validate_profession(self):
        if self.role == "official" and self.profession not in ALLOWED_PROFESSIONS:
            raise ValueError("Select a valid profession for officials.")
        if self.role == "resident" and self.profession is not None:
            raise ValueError("Profession is only accepted for officials.")
        return self


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=1, max_length=72)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()


class PasswordVerificationRequest(LoginRequest):
    pass


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    role: str
    full_name: str
    contact_number: str
    zone: str
    block: str
    profession: str | None
    created_at: datetime


class WorkInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1)
    department: str = Field(min_length=1, max_length=160)
    start_date: date
    estimated_completion: date
    status: str = "Pending"
    cost: float = Field(ge=0)
    conflicts_detected: str | None = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        if value not in WORK_STATUSES:
            raise ValueError("Status must be Pending, Ongoing, or Completed.")
        return value

    @model_validator(mode="after")
    def validate_dates(self):
        if self.estimated_completion < self.start_date:
            raise ValueError("Estimated completion cannot be before the start date.")
        return self


class GrievanceInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    issue_type: str = Field(min_length=1, max_length=120)
    description: str = Field(min_length=1)
    photo_url: str | None = Field(default=None, max_length=2048)


class WorkResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str
    department: str
    contractor_id: int
    zone: str
    block: str
    start_date: date
    estimated_completion: date
    status: WorkStatus
    cost: float
    conflicts_detected: str | None
    ml_delay_risk_score: float | None


class GrievanceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    resident_id: int
    zone: str
    block: str
    issue_type: str
    description: str
    photo_url: str | None
    status: str


def create_access_token(user_id: int) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=60)
    return jwt.encode({"sub": str(user_id), "exp": expires_at}, JWT_SECRET, algorithm=ALGORITHM)


def auth_result(user: User) -> dict[str, Any]:
    return {
        "token": create_access_token(user.id),
        "user": UserResponse.model_validate(user).model_dump(mode="json"),
    }


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired access token.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None:
        raise unauthorized
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub", ""))
    except (JWTError, ValueError, TypeError):
        raise unauthorized
    user = db.get(User, user_id)
    if user is None:
        raise unauthorized
    return user


def require_role(role: str):
    def dependency(user: User = Depends(get_current_user)) -> User:
        if user.role != role:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"A {role} account is required.")
        return user
    return dependency


# Lightweight delay-risk estimator retained from the existing ML scoring pipeline.
_DEPT_RISK_WEIGHT = {"tangedco": 1.4, "electricity": 1.4, "telecom": 1.2, "water": 1.0}


def _dept_weight(dept_name: str) -> float:
    lowered = dept_name.lower()
    return next((weight for keyword, weight in _DEPT_RISK_WEIGHT.items() if keyword in lowered), 1.0)


def _compute_delay_risk(p1: dict[str, Any], p2: dict[str, Any], overlap_m: float) -> float:
    """Original schedule/overlap/department delay-risk heuristic, bounded to 0–100."""
    s1 = date.fromisoformat(p1["startDate"])
    e1 = date.fromisoformat(p1["endDate"])
    s2 = date.fromisoformat(p2["startDate"])
    e2 = date.fromisoformat(p2["endDate"])
    temporal_days = max((min(e1, e2) - max(s1, s2)).days, 0)
    spatial_score = min(overlap_m / 50.0, 1.0) * 60
    temporal_score = min(temporal_days / 30.0, 1.0) * 30
    department_penalty = ((_dept_weight(p1["department"]) + _dept_weight(p2["department"])) / 2) * 10
    return round(min(spatial_score + temporal_score + department_penalty, 100.0), 1)


def _estimate_work_delay_risk(
    start: date, estimated_completion: date, department: str, conflicts_detected: str | None
) -> float:
    """Apply the retained delay model to a database work item and its recorded conflicts."""
    work = {
        "startDate": start.isoformat(),
        "endDate": estimated_completion.isoformat(),
        "department": department,
    }
    # The schema stores conflict details as text rather than geometry. Treat a
    # recorded conflict as the model's full 50 m overlap signal; otherwise none.
    overlap_m = 50.0 if (conflicts_detected or "").strip() else 0.0
    return _compute_delay_risk(work, work, overlap_m)


@app.post("/api/signup", status_code=status.HTTP_201_CREATED)
def signup(payload: SignupRequest, db: Session = Depends(get_db)) -> dict[str, Any]:
    if db.scalar(select(User.id).where(User.email == payload.email)) is not None:
        raise HTTPException(status_code=409, detail="An account with this email already exists.")
    user = User(
        email=payload.email,
        hashed_password=pwd_context.hash(payload.password),
        role=payload.role,
        full_name=payload.full_name,
        contact_number=payload.contact_number,
        zone=payload.zone,
        block=payload.block,
        profession=payload.profession,
    )
    db.add(user)
    try:
        db.commit()
        db.refresh(user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="An account with this email already exists.")
    return auth_result(user)


@app.post("/api/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> dict[str, Any]:
    user = db.scalar(select(User).where(User.email == payload.email))
    if user is None or not pwd_context.verify(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    return auth_result(user)


@app.post("/api/verify-password")
def verify_password(payload: PasswordVerificationRequest, db: Session = Depends(get_db)) -> dict[str, bool]:
    user = db.scalar(select(User).where(User.email == payload.email))
    if user is None or not pwd_context.verify(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    return {"verified": True}


@app.get("/api/me", response_model=UserResponse)
def get_me(user: User = Depends(get_current_user)) -> User:
    return user


@app.get("/api/works", response_model=list[WorkResponse])
def get_works(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[Work]:
    return list(db.scalars(select(Work).where(Work.zone == user.zone, Work.block == user.block).order_by(Work.id.desc())))


@app.post("/api/works", response_model=WorkResponse, status_code=status.HTTP_201_CREATED)
def create_work(
    payload: WorkInput,
    user: User = Depends(require_role("official")),
    db: Session = Depends(get_db),
) -> Work:
    work = Work(
        **payload.model_dump(exclude={"status"}),
        status=WorkStatus(payload.status),
        contractor_id=user.id,
        zone=user.zone,
        block=user.block,
        ml_delay_risk_score=_estimate_work_delay_risk(
            payload.start_date, payload.estimated_completion, payload.department, payload.conflicts_detected
        ),
    )
    db.add(work)
    db.commit()
    db.refresh(work)
    return work


@app.put("/api/works/{work_id}", response_model=WorkResponse)
def update_work(
    work_id: int,
    payload: WorkInput,
    user: User = Depends(require_role("official")),
    db: Session = Depends(get_db),
) -> Work:
    work = db.scalar(select(Work).where(
        Work.id == work_id, Work.zone == user.zone, Work.block == user.block
    ))
    if work is None:
        raise HTTPException(status_code=404, detail="Work not found in your zone and block.")
    for field, value in payload.model_dump(exclude={"status"}).items():
        setattr(work, field, value)
    work.status = WorkStatus(payload.status)
    work.ml_delay_risk_score = _estimate_work_delay_risk(
        payload.start_date, payload.estimated_completion, payload.department, payload.conflicts_detected
    )
    db.commit()
    db.refresh(work)
    return work


@app.get("/api/grievances", response_model=list[GrievanceResponse])
def get_grievances(
    user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> list[Grievance]:
    return list(db.scalars(select(Grievance).where(
        Grievance.zone == user.zone, Grievance.block == user.block
    ).order_by(Grievance.id.desc())))


@app.post("/api/grievances", response_model=GrievanceResponse, status_code=status.HTTP_201_CREATED)
def create_grievance(
    payload: GrievanceInput,
    user: User = Depends(require_role("resident")),
    db: Session = Depends(get_db),
) -> Grievance:
    grievance = Grievance(
        **payload.model_dump(), resident_id=user.id, zone=user.zone, block=user.block, status="Open"
    )
    db.add(grievance)
    db.commit()
    db.refresh(grievance)
    return grievance


@app.get("/health", include_in_schema=False)
def health_check() -> dict[str, str]:
    return {"status": "ok", "service": "Sanchal API"}
