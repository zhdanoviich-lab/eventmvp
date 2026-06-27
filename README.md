# Event MVP

A minimal event-management SaaS: create events, collect public registrations,
send invitation / confirmation / 24h-reminder emails, run check-in at the door,
and watch a 4-number funnel dashboard. Built MVP-first — nothing speculative.

## Stack
- **Backend**: FastAPI + SQLAlchemy 2.0 (async) + Alembic, PostgreSQL
- **Frontend**: React + Vite + Tailwind
- **Auth**: JWT, two roles (`admin`, `manager`)
- **Email**: SendGrid, with stdout fallback when no API key is set
- **Run**: one `docker compose up`

## Quick start
```bash
cp backend/.env.example backend/.env   # optional; compose uses .env.example by default
docker compose up --build
```
- App: http://localhost:5173
- API docs: http://localhost:8000/docs
- Seed admin: `admin@eventmvp.local` / `admin12345` (created on first boot)

Without a `SENDGRID_API_KEY`, all emails are printed to the backend container
logs instead of being delivered — so the full flow is testable locally.

## Local dev (without Docker)
```bash
# Backend (needs a Postgres on :5432)
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL=postgresql+asyncpg://eventmvp:eventmvp@localhost:5432/eventmvp
alembic upgrade head
uvicorn app.main:app --reload

# Frontend (proxies /api -> :8000)
cd frontend
npm install && npm run dev
```

---

## PRD summary

### Modules (in scope)
1. **Events** — create, edit, status, date/time, description, location
2. **Participants** — name, email, phone, company, participation status
3. **Registration** — public page, form, confirmation
4. **Email** — invitation, registration confirmation, 24h reminder
5. **Check-in** — search participant, mark attended
6. **Dashboard** — invited / registered / confirmed / attended counts

### Roles
- **Admin**: everything a manager can do + manages team members (`/team`)
- **Manager**: events and participants only

### Status models
- Event: `draft → published → completed` (or `cancelled`)
- Participant funnel: `invited → registered → confirmed → attended`
  Dashboard counts are cumulative down the funnel (an attendee also counts as
  invited/registered/confirmed).

## Architecture
Monolith. Stateless API (JWT) so it can run behind a load balancer when needed.
Multi-tenant via a single `organization_id` column. The 24h reminder is handled
by a lightweight in-process worker loop that flushes due rows from `email_queue`
every 60s — no external queue/cron for the MVP.

## Data model
`organizations → users`, `organizations → events → participants → email_queue`.
See `backend/app/models/__init__.py` and `backend/alembic/versions/0001_initial.py`.

## User scenarios
1. Manager logs in, creates an event (draft), fills details, publishes → gets a public link.
2. Manager adds participants and clicks Invite → invitation emails queued.
3. Guest opens the public link, fills the form → status `registered`, gets a
   confirmation email, and a 24h reminder is scheduled.
4. At the door, manager searches a participant and clicks Check in → `attended`.
5. Anyone on the team views the event dashboard: 4 live counters.

## API
```
POST   /auth/login                        -> { access_token }
GET    /auth/me

GET    /users                             (admin)
POST   /users                             (admin)
DELETE /users/{id}                        (admin)

GET    /events
POST   /events
GET    /events/{id}
PATCH  /events/{id}                        (incl. status change)
DELETE /events/{id}
GET    /events/{id}/dashboard              -> { invited, registered, confirmed, attended }

GET    /events/{id}/participants?search=&status=
POST   /events/{id}/participants
PATCH  /participants/{id}
DELETE /participants/{id}
POST   /participants/{id}/invite           (queues invitation)
POST   /participants/{id}/checkin          (-> attended)

GET    /public/events/{slug}               (no auth)
POST   /public/events/{slug}/register      (no auth; queues confirmation + reminder)
```

## Explicitly deferred (Future Version — not built)
CSV import, QR check-in, custom form fields, dashboard charts/analytics, multiple
email templates / editor, waitlist / tickets / payments / capacity limits,
webhooks, public API, SSO, finer-grained roles.
