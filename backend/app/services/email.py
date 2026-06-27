"""Email handling for the MVP.

Two responsibilities:
1. enqueue_* helpers create rows in email_queue.
2. send_pending_emails() is called by the worker (cron loop) and actually
   delivers anything whose scheduled_at <= now. If no SendGrid key is set,
   emails are printed to stdout so the flow is fully testable locally.
"""

from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models import (
    EmailQueue,
    EmailStatus,
    EmailType,
    Event,
    Participant,
)

settings = get_settings()


# ---- Enqueue ---------------------------------------------------------------


async def enqueue_invitation(db: AsyncSession, participant: Participant) -> None:
    db.add(
        EmailQueue(
            participant_id=participant.id,
            type=EmailType.invitation,
            scheduled_at=datetime.now(timezone.utc),
        )
    )


async def enqueue_registration_confirmation(
    db: AsyncSession, participant: Participant
) -> None:
    db.add(
        EmailQueue(
            participant_id=participant.id,
            type=EmailType.registration_confirmation,
            scheduled_at=datetime.now(timezone.utc),
        )
    )


async def enqueue_reminder_24h(
    db: AsyncSession, participant: Participant, event: Event
) -> None:
    """Schedule a reminder 24h before the event start. Skipped if the event
    has no start time or that moment is already in the past."""
    if event.starts_at is None:
        return
    reminder_at = event.starts_at - timedelta(hours=24)
    if reminder_at <= datetime.now(timezone.utc):
        return
    db.add(
        EmailQueue(
            participant_id=participant.id,
            type=EmailType.reminder_24h,
            scheduled_at=reminder_at,
        )
    )


# ---- Rendering -------------------------------------------------------------


def _render(email_type: EmailType, participant: Participant, event: Event) -> tuple[str, str]:
    reg_link = f"{settings.public_base_url}/r/{event.public_slug}"
    when = event.starts_at.strftime("%d %b %Y, %H:%M") if event.starts_at else "TBA"
    where = event.location or "TBA"

    if email_type == EmailType.invitation:
        subject = f"You're invited: {event.title}"
        body = (
            f"Hi {participant.name},\n\n"
            f"You're invited to {event.title}.\n"
            f"When: {when}\nWhere: {where}\n\n"
            f"Register here: {reg_link}\n"
        )
    elif email_type == EmailType.registration_confirmation:
        subject = f"Registration confirmed: {event.title}"
        body = (
            f"Hi {participant.name},\n\n"
            f"Your registration for {event.title} is confirmed.\n"
            f"When: {when}\nWhere: {where}\n\nSee you there!\n"
        )
    else:  # reminder_24h
        subject = f"Reminder: {event.title} is tomorrow"
        body = (
            f"Hi {participant.name},\n\n"
            f"A quick reminder that {event.title} starts in 24 hours.\n"
            f"When: {when}\nWhere: {where}\n"
        )
    return subject, body


def _deliver(to_email: str, subject: str, body: str) -> bool:
    if not settings.sendgrid_api_key:
        print(f"\n[EMAIL:stdout] to={to_email}\nsubject={subject}\n{body}\n")
        return True
    try:
        from sendgrid import SendGridAPIClient
        from sendgrid.helpers.mail import Mail

        message = Mail(
            from_email=(settings.email_from, settings.email_from_name),
            to_emails=to_email,
            subject=subject,
            plain_text_content=body,
        )
        client = SendGridAPIClient(settings.sendgrid_api_key)
        resp = client.send(message)
        return 200 <= resp.status_code < 300
    except Exception as exc:  # noqa: BLE001 - log and mark failed
        print(f"[EMAIL:error] {exc}")
        return False


# ---- Worker entry point ----------------------------------------------------


async def send_pending_emails(db: AsyncSession) -> int:
    """Send all due emails. Returns the count of successfully sent messages."""
    now = datetime.now(timezone.utc)
    stmt = select(EmailQueue).where(
        EmailQueue.status == EmailStatus.pending,
        EmailQueue.scheduled_at <= now,
    )
    rows = (await db.execute(stmt)).scalars().all()

    sent = 0
    for row in rows:
        participant = await db.get(Participant, row.participant_id)
        if participant is None:
            row.status = EmailStatus.failed
            continue
        event = await db.get(Event, participant.event_id)
        if event is None:
            row.status = EmailStatus.failed
            continue

        subject, body = _render(row.type, participant, event)
        ok = _deliver(participant.email, subject, body)
        if ok:
            row.status = EmailStatus.sent
            row.sent_at = now
            sent += 1
        else:
            row.status = EmailStatus.failed

    await db.commit()
    return sent
