import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";
import { Button, Card, Input } from "../components/ui";

export default function PublicRegister() {
  const { slug } = useParams();
  const [event, setEvent] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "" });
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .publicEvent(slug)
      .then(setEvent)
      .catch(() => setNotFound(true));
  }, [slug]);

  async function submit() {
    setError("");
    setBusy(true);
    try {
      await api.publicRegister(slug, {
        name: form.name,
        email: form.email,
        phone: form.phone || null,
        company: form.company || null,
      });
      setDone(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (notFound) {
    return (
      <div className="flex min-h-screen items-center justify-center px-5">
        <p className="text-ink/50">This event is not available.</p>
      </div>
    );
  }
  if (!event) {
    return (
      <div className="flex min-h-screen items-center justify-center px-5">
        <p className="text-ink/50">Loading…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-5 py-12">
      <div className="font-mono text-sm font-medium tracking-tight text-ink/50">
        event<span className="text-accent">·</span>mvp
      </div>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight">{event.title}</h1>
      <p className="mt-2 text-sm text-ink/60">
        {event.starts_at ? new Date(event.starts_at).toLocaleString() : "Date TBA"}
        {event.location ? ` · ${event.location}` : ""}
      </p>
      {event.description && (
        <p className="mt-4 whitespace-pre-line text-ink/80">{event.description}</p>
      )}

      <Card className="mt-8 p-6">
        {done ? (
          <div className="text-center">
            <div className="text-lg font-medium text-accent">You're registered</div>
            <p className="mt-2 text-sm text-ink/60">
              We've sent a confirmation to your email. See you there.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-base font-medium">Register</h2>
            <Input
              label="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <Input
              label="Phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <Input
              label="Company"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button
              className="w-full"
              onClick={submit}
              disabled={busy || !form.name.trim() || !form.email.trim()}
            >
              {busy ? "Submitting…" : "Register"}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
