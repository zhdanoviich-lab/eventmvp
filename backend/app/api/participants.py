import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models import (
    Event,
    Participant,
    ParticipantStatus,
    User,
)
from app.schemas import ParticipantCreate, ParticipantOut, ParticipantUpdate
from app.services import email as email_service
from app.services.auth import get_current_user

router = APIRouter(tags=["participants"])


async def _get_owned_event(event_id: str, user: User, db: AsyncSession) -> Event:
    try:
        eid = uuid.UUID(event_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Event not found")
    event = await db.get(Event, eid)
    if event is None or event.organization_id != user.organization_id:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


async def _get_owned_participant(
    participant_id: str, user: User, db: AsyncSession
) -> tuple[Participant, Event]:
    try:
        pid = uuid.UUID(participant_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Participant not found")
    participant = await db.get(Participant, pid)
    if participant is None:
        raise HTTPException(status_code=404, detail="Participant not found")
    event = await db.get(Event, participant.event_id)
    if event is None or event.organization_id != user.organization_id:
        raise HTTPException(status_code=404, detail="Participant not found")
    return participant, event


@router.get("/events/{event_id}/participants", response_model=list[ParticipantOut])
async def list_participants(
    event_id: str,
    search: str | None = Query(None),
    status: ParticipantStatus | None = Query(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    event = await _get_owned_event(event_id, user, db)
    stmt = select(Participant).where(Participant.event_id == event.id)
    if search:
        like = f"%{search}%"
        stmt = stmt.where(
            or_(Participant.name.ilike(like), Participant.email.ilike(like))
        )
    if status:
        stmt = stmt.where(Participant.status == status)
    stmt = stmt.order_by(Participant.created_at.desc())
    rows = await db.scalars(stmt)
    return list(rows)


@router.post(
    "/events/{event_id}/participants", response_model=ParticipantOut, status_code=201
)
async def add_participant(
    event_id: str,
    payload: ParticipantCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    event = await _get_owned_event(event_id, user, db)
    dup = await db.scalar(
        select(Participant.id).where(
            Participant.event_id == event.id, Participant.email == payload.email
        )
    )
    if dup:
        raise HTTPException(
            status_code=400, detail="Participant with this email already exists"
        )
    participant = Participant(event_id=event.id, **payload.model_dump())
    db.add(participant)
    await db.commit()
    await db.refresh(participant)
    return participant


@router.patch("/participants/{participant_id}", response_model=ParticipantOut)
async def update_participant(
    participant_id: str,
    payload: ParticipantUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    participant, _ = await _get_owned_participant(participant_id, user, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(participant, field, value)
    await db.commit()
    await db.refresh(participant)
    return participant


@router.delete("/participants/{participant_id}", status_code=204)
async def delete_participant(
    participant_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    participant, _ = await _get_owned_participant(participant_id, user, db)
    await db.delete(participant)
    await db.commit()


@router.post("/participants/{participant_id}/invite", response_model=ParticipantOut)
async def invite_participant(
    participant_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    participant, _ = await _get_owned_participant(participant_id, user, db)
    await email_service.enqueue_invitation(db, participant)
    # keep status at invited (it's the initial stage)
    if participant.status not in (
        ParticipantStatus.registered,
        ParticipantStatus.confirmed,
        ParticipantStatus.attended,
    ):
        participant.status = ParticipantStatus.invited
    await db.commit()
    await db.refresh(participant)
    return participant


@router.post("/participants/{participant_id}/checkin", response_model=ParticipantOut)
async def checkin_participant(
    participant_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    participant, _ = await _get_owned_participant(participant_id, user, db)
    participant.status = ParticipantStatus.attended
    participant.checked_in_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(participant)
    return participant
