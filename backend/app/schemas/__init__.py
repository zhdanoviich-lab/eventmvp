import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr

from app.models import (
    EmailStatus,
    EmailType,
    EventStatus,
    ParticipantStatus,
    UserRole,
)


# ---- Auth ------------------------------------------------------------------


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    email: EmailStr
    role: UserRole
    organization_id: uuid.UUID


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    role: UserRole = UserRole.manager


# ---- Events ----------------------------------------------------------------


class EventCreate(BaseModel):
    title: str
    description: str | None = None
    location: str | None = None
    starts_at: datetime | None = None
    ends_at: datetime | None = None


class EventUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    location: str | None = None
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    status: EventStatus | None = None


class EventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    title: str
    description: str | None
    location: str | None
    starts_at: datetime | None
    ends_at: datetime | None
    status: EventStatus
    public_slug: str
    created_at: datetime


class DashboardOut(BaseModel):
    invited: int
    registered: int
    confirmed: int
    attended: int


# ---- Participants ----------------------------------------------------------


class ParticipantCreate(BaseModel):
    name: str
    email: EmailStr
    phone: str | None = None
    company: str | None = None


class ParticipantUpdate(BaseModel):
    name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    company: str | None = None
    status: ParticipantStatus | None = None


class ParticipantOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    event_id: uuid.UUID
    name: str
    email: EmailStr
    phone: str | None
    company: str | None
    status: ParticipantStatus
    registered_at: datetime | None
    checked_in_at: datetime | None
    created_at: datetime


# ---- Public registration ---------------------------------------------------


class PublicEventOut(BaseModel):
    """Limited event info shown on the public registration page."""

    model_config = ConfigDict(from_attributes=True)
    title: str
    description: str | None
    location: str | None
    starts_at: datetime | None
    ends_at: datetime | None
    status: EventStatus
    public_slug: str


class PublicRegisterRequest(BaseModel):
    name: str
    email: EmailStr
    phone: str | None = None
    company: str | None = None


class PublicRegisterResponse(BaseModel):
    message: str
    participant_id: uuid.UUID


# ---- Email queue (read-only, for debugging/admin) --------------------------


class EmailQueueOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    participant_id: uuid.UUID
    type: EmailType
    scheduled_at: datetime
    sent_at: datetime | None
    status: EmailStatus
