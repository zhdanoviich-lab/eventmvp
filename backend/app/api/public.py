from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models import (
    Event,
    EventStatus,
    Participant,
    ParticipantStatus,
)
from app.schemas import (
    PublicEventOut,
    PublicRegisterRequest,
    PublicRegisterResponse,
)
from app.services import email as email_service

router = APIRouter(prefix="/public", tags=["public"])


async def _get_published_event(slug: str, db: AsyncSession) -> Event:
    event = await db.scalar(select(Event).where(Event.public_slug == slug))
    if event is None or event.status not in (
        EventStatus.published,
        EventStatus.completed,
    ):
        raise HTTPException(status_code=404, detail="Event not found")
    return event


@router.get("/events/{slug}", response_model=PublicEventOut)
async def public_event(slug: str, db: AsyncSession = Depends(get_db)):
    return await _get_published_event(slug, db)


@router.post("/events/{slug}/register", response_model=PublicRegisterResponse)
async def public_register(
    slug: str,
    payload: PublicRegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    event = await _get_published_event(slug, db)
    if event.status != EventStatus.published:
        raise HTTPException(status_code=400, detail="Registration is closed")

    now = datetime.now(timezone.utc)

    # Upsert by (event, email): a previously-invited person registering, or a
    # repeat submission, updates the existing record rather than duplicating.
    participant = await db.scalar(
        select(Participant).where(
            Participant.event_id == event.id, Participant.email == payload.email
        )
    )
    if participant is None:
        participant = Participant(
            event_id=event.id,
            name=payload.name,
            email=payload.email,
            phone=payload.phone,
            company=payload.company,
            status=ParticipantStatus.registered,
            registered_at=now,
        )
        db.add(participant)
    else:
        participant.name = payload.name
        participant.phone = payload.phone
        participant.company = payload.company
        if participant.status == ParticipantStatus.invited:
            participant.status = ParticipantStatus.registered
        participant.registered_at = participant.registered_at or now

    await db.flush()  # ensure participant.id is available for email queue

    await email_service.enqueue_registration_confirmation(db, participant)
    await email_service.enqueue_reminder_24h(db, participant, event)

    await db.commit()
    await db.refresh(participant)

    return PublicRegisterResponse(
        message="Registration successful. Check your email for confirmation.",
        participant_id=participant.id,
    )
