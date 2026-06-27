import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { Button, Card, Input, StatusPill, Textarea } from "../components/ui";

function toLocalInput(value) {
  return value || "";
}

export default function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
    starts_at: "",
    ends_at: "",
  });
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      setEvents(await api.listEvents());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function create() {
    setError("");
    try {
      const payload = {
        title: form.title,
        description: form.description || null,
        location: form.location || null,
        starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
        ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
      };
      await api.createEvent(payload);
      setForm({ title: "", description: "", location: "", starts_at: "", ends_at: "" });
      setShowForm(false);
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Events</h1>
        <Button onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Cancel" : "New event"}
        </Button>
      </div>

      {showForm && (
        <Card className="mt-5 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Input
                label="Title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <Input
              label="Location"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
            <div />
            <Input
              label="Starts at"
              type="datetime-local"
              value={toLocalInput(form.starts_at)}
              onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
            />
            <Input
              label="Ends at"
              type="datetime-local"
              value={toLocalInput(form.ends_at)}
              onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
            />
            <div className="sm:col-span-2">
              <Textarea
                label="Description"
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </div>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          <div className="mt-4">
            <Button onClick={create} disabled={!form.title.trim()}>
              Create event
            </Button>
          </div>
        </Card>
      )}

      <div className="mt-6 space-y-2">
        {loading && <p className="text-sm text-ink/50">Loading…</p>}
        {!loading && events.length === 0 && (
          <Card className="p-8 text-center text-sm text-ink/50">
            No events yet. Create your first one to get started.
          </Card>
        )}
        {events.map((ev) => (
          <Link key={ev.id} to={`/events/${ev.id}`}>
            <Card className="flex items-center justify-between p-4 transition hover:border-accent/40">
              <div>
                <div className="font-medium">{ev.title}</div>
                <div className="mt-0.5 text-sm text-ink/50">
                  {ev.starts_at
                    ? new Date(ev.starts_at).toLocaleString()
                    : "No date set"}
                  {ev.location ? ` · ${ev.location}` : ""}
                </div>
              </div>
              <StatusPill status={ev.status} />
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
