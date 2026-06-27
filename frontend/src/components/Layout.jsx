import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "./ui";

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const loc = useLocation();
  const nav = [
    { to: "/events", label: "Events" },
    ...(user?.role === "admin" ? [{ to: "/team", label: "Team" }] : []),
  ];

  return (
    <div className="min-h-screen md:flex">
      <aside className="border-b border-black/10 bg-white md:w-60 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between px-5 py-4 md:block">
          <div>
            <div className="font-mono text-sm font-medium tracking-tight">
              event<span className="text-accent">·</span>mvp
            </div>
            <div className="mt-0.5 text-xs text-ink/45">{user?.email}</div>
          </div>
        </div>
        <nav className="flex gap-1 px-3 pb-3 md:mt-2 md:flex-col">
          {nav.map((n) => {
            const active = loc.pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`rounded-md px-3 py-2 text-sm font-medium ${
                  active ? "bg-accent-soft text-accent" : "text-ink/70 hover:bg-black/5"
                }`}
              >
                {n.label}
              </Link>
            );
          })}
          <Button variant="ghost" className="md:mt-2" onClick={logout}>
            Sign out
          </Button>
        </nav>
      </aside>
      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-5 py-8">{children}</div>
      </main>
    </div>
  );
}
