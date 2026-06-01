import { useState } from "react";
import { id } from "@invoke/core";
import { coreStore } from "../../../store";

const FIELD = "text-xs font-mono bg-[var(--surface-2)] border border-[var(--border)] rounded px-2 py-1 w-full outline-none focus:border-[var(--accent)] placeholder:text-[var(--text-3)]";

export function AddCookieForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [domain, setDomain] = useState("");
  const [path, setPath] = useState("/");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError("Name is required");
    if (!domain.trim()) return setError("Domain is required");
    setSaving(true);
    setError(null);
    try {
      const now = Date.now();
      await coreStore.upsertCookie({
        id: id(),
        name: name.trim(),
        value,
        domain: domain.trim().replace(/^\./, ""),
        path: path.trim() || "/",
        secure: false,
        httpOnly: false,
        createdAt: now,
        updatedAt: now,
      });
      onDone();
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="px-4 py-3 border-b border-[var(--border)] bg-[var(--surface)] flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-2xs text-[var(--text-3)]">Name *</label>
          <input className={FIELD} placeholder="session_id" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-2xs text-[var(--text-3)]">Value</label>
          <input className={FIELD} placeholder="abc123" value={value} onChange={(e) => setValue(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-2xs text-[var(--text-3)]">Domain *</label>
          <input className={FIELD} placeholder="localhost" value={domain} onChange={(e) => setDomain(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-2xs text-[var(--text-3)]">Path</label>
          <input className={FIELD} placeholder="/" value={path} onChange={(e) => setPath(e.target.value)} />
        </div>
      </div>
      {error && <p className="text-2xs text-[var(--danger)]">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onDone} className="btn text-xs py-1 px-3">Cancel</button>
        <button type="submit" disabled={saving} className="btn btn-primary text-xs py-1 px-3">
          {saving ? "Adding…" : "Add Cookie"}
        </button>
      </div>
    </form>
  );
}
