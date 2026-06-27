import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { Button, Card, Input, StatusPill } from "../components/ui";

const EVENT_STATUSES = ["draft", "published", "completed", "cancelled"];

function Stat({ label, value }) {
  return (
    <Card className="p-4">
      <div className="text-3xl font-semibold tabular-nums">{value}</div>
      <div className="mt-1 text-xs font-medium uppercase tracking-wide text-ink/50">
        {label}
      </div>
    </Card>
  );
}

export default function EventDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [event, setEvent] = useState(null);
  const [dash, setDash] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [addForm, setAddForm] = useState({ name: "", email: "", phone: "", company: "" });
  const [showAdd, setShowAdd] = useState(false);

  const loadParticipants = useCallback(
    async (q = "") => {
      try {
        setParticipants(await api.listParticipants(id, { search: q }));
      } catch (e) {
        setError(e.message);
      }
    },
    [id]
  );

  const refresh = useCallback(async () => {
    try {
      const [ev, d] = await Promise.all([api.getEvent(id), api.dashboard(id)]);
      setEvent(ev);
      setDash(d);
      await loadParticipants(search);
    } catch (e) {
      setError(e.message);
    }
  }, [id, search, loadParticipants]);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function changeStatus(status) {
    setEvent(await api.updateEvent(id, { status }));
  }

  async function addParticipant() {
    setError("");
    try {
      await api.addParticipant(id, {
        name: addForm.name,
        email: addForm.email,
        phone: addForm.phone || null,
        company: addForm.company || null,
      });
      setAddForm({ name: "", email: "", phone: "", company: "" });
      setShowAdd(false);
      refresh();
    } catch (e) {
      setError(e.message);
    }
  }

  async function invite(pid) {
    await api.invite(pid);
    refresh();
  }
  async function checkin(pid) {
    await api.checkin(pid);
    refresh();
  }
  async function removeParticipant(pid) {
    await api.deleteParticipant(pid);
    refresh();
  }

  if (!event) {
    return <p className="text-sm text-ink/50">{error || "Loading…"}</p>;
  }

  const publicUrl = `${window.location.origin}/r/${event.public_slug}`;

  return (
    <div className="space-y-8">
      <div>
        <button
          onClick={() => nav("/events")}
          className="text-sm text-ink/50 hover:text-ink"
        >
          ← Events
        </button>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{event.title}</h1>
          <div className="flex items-center gap-2">
            <StatusPill status={event.status} />
            <select
              value={event.status}
              onChange={(e) => changeStatus(e.target.value)}
              className="rounded-md border border-black/15 bg-white px-2 py-1.5 text-sm"
            >
              {EVENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="mt-1 text-sm text-ink/50">
          {event.starts_at ? new Date(event.starts_at).toLocaleString() : "No date set"}
          {event.location ? ` · ${event.location}` : ""}
        </p>
      </div>

      {/* Public link */}
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-wide text-ink/50">
            Public registration link
          </div>
          <div className="mt-1 truncate font-mono text-sm">{publicUrl}</div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigator.clipboard?.writeText(publicUrl)}
          >
            Copy
          </Button>
          <Button variant="outline" onClick={() => window.open(publicUrl, "_blank")}>
            Open
          </Button>
        </div>
      </Card>
      {event.status !== "published" && (
        <p className="-mt-6 text-xs text-amber-700">
          Publish the event to make the registration link live.
        </p>
      )}

      {/* Dashboard */}
      {dash && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Invited" value={dash.invited} />
          <Stat label="Registered" value={dash.registered} />
          <Stat label="Confirmed" value={dash.confirmed} />
          <Stat label="Attended" value={dash.attended} />
        </div>
      )}

      {/* Participants */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Participants</h2>
          <Button onClick={() => setShowAdd((s) => !s)}>
            {showAdd ? "Cancel" : "Add participant"}
          </Button>
        </div>

        {showAdd && (
          <Card className="mt-3 grid gap-3 p-4 sm:grid-cols-2">
            <Input
              label="Name"
              value={addForm.name}
              onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
            />
            <Input
              label="Email"
              type="email"
              value={addForm.email}
              onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
            />
            <Input
              label="Phone"
              value={addForm.phone}
              onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
            />
            <Input
              label="Company"
              value={addForm.company}
              onChange={(e) => setAddForm({ ...addForm, company: e.target.value })}
            />
            <div className="sm:col-span-2">
              <Button
                onClick={addParticipant}
                disabled={!addForm.name.trim() || !addForm.email.trim()}
              >
                Add
              </Button>
            </div>
          </Card>
        )}

        <div className="mt-3">
          <Input
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              loadParticipants(e.target.value);
            }}
          />
        </div>

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <Card className="mt-3 overflow-hidden">
          <div className="hidden grid-cols-[1.4fr_1.6fr_1fr_auto] gap-3 border-b border-black/10 px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-ink/45 sm:grid">
            <div>Name</div>
            <div>Contact</div>
            <div>Status</div>
            <div className="text-right">Actions</div>
          </div>
          {participants.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-ink/50">
              No participants yet.
            </div>
          )}
          {participants.map((p) => (
            <div
              key={p.id}
              className="grid grid-cols-1 gap-2 border-b border-black/5 px-4 py-3 last:border-0 sm:grid-cols-[1.4fr_1.6fr_1fr_auto] sm:items-center sm:gap-3"
            >
              <div>
                <div className="font-medium">{p.name}</div>
                {p.company && <div className="text-xs text-ink/50">{p.company}</div>}
              </div>
              <div className="text-sm text-ink/70">
                <div>{p.email}</div>
                {p.phone && <div className="text-xs text-ink/45">{p.phone}</div>}
              </div>
              <div>
                <StatusPill status={p.status} />
              </div>
              <div className="flex justify-start gap-1 sm:justify-end">
                {p.status === "invited" || p.status === "registered" ? (
                  <Button variant="ghost" onClick={() => invite(p.id)}>
                    Invite
                  </Button>
                ) : null}
                {p.status !== "attended" && (
                  <Button variant="ghost" onClick={() => checkin(p.id)}>
                    Check in
                  </Button>
                )}
                <Button variant="danger" onClick={() => removeParticipant(p.id)}>
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
