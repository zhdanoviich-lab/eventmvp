import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models import Event, Participant, ParticipantStatus, User
from app.schemas import (
    DashboardOut,
    EventCreate,
    EventOut,
    EventUpdate,
)
from app.services.auth import get_current_user
from app.services.slug import generate_unique_slug

router = APIRouter(prefix="/events", tags=["events"])


async def _get_owned_event(
    event_id: str, user: User, db: AsyncSession
) -> Event:
    try:
        eid = uuid.UUID(event_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Event not found")
    event = await db.get(Event, eid)
    if event is None or event.organization_id != user.organization_id:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


@router.get("", response_model=list[EventOut])
async def list_events(
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    rows = await db.scalars(
        select(Event)
        .where(Event.organization_id == user.organization_id)
        .order_by(Event.created_at.desc())
    )
    return list(rows)


@router.post("", response_model=EventOut, status_code=201)
async def create_event(
    payload: EventCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    slug = await generate_unique_slug(db, payload.title)
    event = Event(
        organization_id=user.organization_id,
        public_slug=slug,
        **payload.model_dump(),
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return event


@router.get("/{event_id}", response_model=EventOut)
async def get_event(
    event_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await _get_owned_event(event_id, user, db)


@router.patch("/{event_id}", response_model=EventOut)
async def update_event(
    event_id: str,
    payload: EventUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    event = await _get_owned_event(event_id, user, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(event, field, value)
    await db.commit()
    await db.refresh(event)
    return event


@router.delete("/{event_id}", status_code=204)
async def delete_event(
    event_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    event = await _get_owned_event(event_id, user, db)
    await db.delete(event)
    await db.commit()


@router.get("/{event_id}/dashboard", response_model=DashboardOut)
async def event_dashboard(
    event_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    event = await _get_owned_event(event_id, user, db)
    stmt = (
        select(Participant.status, func.count())
        .where(Participant.event_id == event.id)
        .group_by(Participant.status)
    )
    counts = {status: 0 for status in ParticipantStatus}
    for st, cnt in (await db.execute(stmt)).all():
        counts[st] = cnt

    # Status is a funnel: each later stage implies the earlier ones for the
    # dashboard totals (someone who attended was also invited/registered/confirmed).
    attended = counts[ParticipantStatus.attended]
    confirmed = counts[ParticipantStatus.confirmed] + attended
    registered = counts[ParticipantStatus.registered] + confirmed
    invited = counts[ParticipantStatus.invited] + registered

    return DashboardOut(
        invited=invited,
        registered=registered,
        confirmed=confirmed,
        attended=attended,
    )
