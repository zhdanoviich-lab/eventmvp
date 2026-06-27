import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Button, Card, Input, StatusPill } from "../components/ui";

export default function Team() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ email: "", password: "", role: "manager" });
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);

  async function load() {
    try {
      setUsers(await api.listUsers());
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function create() {
    setError("");
    try {
      await api.createUser(form);
      setForm({ email: "", password: "", role: "manager" });
      setShowForm(false);
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function remove(id) {
    await api.deleteUser(id);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
        <Button onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Cancel" : "Add member"}
        </Button>
      </div>

      {showForm && (
        <Card className="mt-5 grid gap-4 p-5 sm:grid-cols-3">
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <Input
            label="Password"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink/50">
              Role
            </span>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full rounded-md border border-black/15 bg-white px-3 py-2 text-sm"
            >
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          {error && <p className="text-sm text-red-600 sm:col-span-3">{error}</p>}
          <div className="sm:col-span-3">
            <Button onClick={create} disabled={!form.email.trim() || !form.password}>
              Create member
            </Button>
          </div>
        </Card>
      )}

      <Card className="mt-6 overflow-hidden">
        {users.map((u) => (
          <div
            key={u.id}
            className="flex items-center justify-between border-b border-black/5 px-4 py-3 last:border-0"
          >
            <div>
              <div className="font-medium">{u.email}</div>
              <div className="mt-0.5">
                <StatusPill status={u.role} />
              </div>
            </div>
            {u.id !== user.id && (
              <Button variant="danger" onClick={() => remove(u.id)}>
                Remove
              </Button>
            )}
          </div>
        ))}
      </Card>
    </div>
  );
}
