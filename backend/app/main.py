import asyncio
import contextlib
from collections.abc import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.api import auth, events, participants, public
from app.core.config import get_settings
from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models import Organization, User, UserRole
from app.services.email import send_pending_emails

settings = get_settings()

EMAIL_POLL_SECONDS = 60


async def seed_initial_admin() -> None:
    async with SessionLocal() as db:
        existing = await db.scalar(select(User.id))
        if existing:
            return
        org = Organization(name=settings.seed_org_name)
        db.add(org)
        await db.flush()
        db.add(
            User(
                organization_id=org.id,
                email=settings.seed_admin_email,
                password_hash=hash_password(settings.seed_admin_password),
                role=UserRole.admin,
            )
        )
        await db.commit()
        print(f"[seed] created admin {settings.seed_admin_email}")


async def email_worker_loop() -> None:
    """Lightweight in-process scheduler. Sends due emails every minute.
    Good enough for MVP; swap for a real queue/cron when traffic grows."""
    while True:
        try:
            async with SessionLocal() as db:
                count = await send_pending_emails(db)
                if count:
                    print(f"[email-worker] sent {count} email(s)")
        except Exception as exc:  # noqa: BLE001
            print(f"[email-worker] error: {exc}")
        await asyncio.sleep(EMAIL_POLL_SECONDS)


@contextlib.asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    await seed_initial_admin()
    worker = asyncio.create_task(email_worker_loop())
    yield
    worker.cancel()
    with contextlib.suppress(asyncio.CancelledError):
        await worker


app = FastAPI(title="Event MVP API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(events.router)
app.include_router(participants.router)
app.include_router(public.router)


@app.get("/health", tags=["meta"])
async def health():
    return {"status": "ok"}
