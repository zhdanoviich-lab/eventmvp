export function Button({ variant = "primary", className = "", ...props }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40";
  const variants = {
    primary: "bg-accent text-white hover:bg-[#275f43]",
    ghost: "text-ink/70 hover:bg-black/5",
    outline: "border border-black/15 text-ink hover:bg-black/5",
    danger: "text-red-600 hover:bg-red-50",
  };
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}

export function Input({ label, className = "", ...props }) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink/50">
          {label}
        </span>
      )}
      <input
        className={`w-full rounded-md border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 ${className}`}
        {...props}
      />
    </label>
  );
}

export function Textarea({ label, className = "", ...props }) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink/50">
          {label}
        </span>
      )}
      <textarea
        className={`w-full rounded-md border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 ${className}`}
        {...props}
      />
    </label>
  );
}

const STATUS_STYLES = {
  draft: "bg-black/5 text-ink/60",
  published: "bg-accent-soft text-accent",
  completed: "bg-blue-50 text-blue-700",
  cancelled: "bg-red-50 text-red-600",
  invited: "bg-black/5 text-ink/60",
  registered: "bg-amber-50 text-amber-700",
  confirmed: "bg-accent-soft text-accent",
  attended: "bg-blue-50 text-blue-700",
};

export function StatusPill({ status }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
        STATUS_STYLES[status] || "bg-black/5 text-ink/60"
      }`}
    >
      {status}
    </span>
  );
}

export function Card({ className = "", children }) {
  return (
    <div className={`rounded-lg border border-black/10 bg-white ${className}`}>
      {children}
    </div>
  );
}
