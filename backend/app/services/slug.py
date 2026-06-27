import re
import secrets

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Event


def _slugify(title: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
    return base[:40] or "event"


async def generate_unique_slug(db: AsyncSession, title: str) -> str:
    base = _slugify(title)
    for _ in range(5):
        candidate = f"{base}-{secrets.token_hex(3)}"
        exists = await db.scalar(
            select(Event.id).where(Event.public_slug == candidate)
        )
        if not exists:
            return candidate
    # extremely unlikely fallback
    return f"{base}-{secrets.token_hex(6)}"
