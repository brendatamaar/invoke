import { useState } from "react";
import { X, Cookie, Eye, EyeOff, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { useStore, coreStore } from "../../store";
import type { StoredCookie } from "@invoke/core";

function formatExpiry(expires?: number) {
  if (expires === undefined) return "Session";
  if (expires < Date.now()) return "Expired";
  return new Date(expires).toLocaleString();
}

function groupByDomain(cookies: StoredCookie[]): Map<string, StoredCookie[]> {
  const map = new Map<string, StoredCookie[]>();
  for (const c of cookies) {
    const list = map.get(c.domain) ?? [];
    list.push(c);
    map.set(c.domain, list);
  }
  return map;
}

export function CookieManagerModal() {
  const { showCookieManager, cookies, enableCookies, set, addToast } = useStore();
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [confirmClear, setConfirmClear] = useState<string | null>(null); // domain or "all"

  if (!showCookieManager) return null;

  const close = () => set({ showCookieManager: false });

  const toggleReveal = (id: string) => {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const deleteCookie = async (id: string) => {
    try {
      await coreStore.deleteCookie(id);
      const updated = await coreStore.listCookies();
      set({ cookies: updated });
    } catch (e) {
      addToast("error", String(e));
    }
  };

  const clearDomain = async (domain: string) => {
    setConfirmClear(null);
    try {
      await coreStore.clearCookies(domain);
      const updated = await coreStore.listCookies();
      set({ cookies: updated });
    } catch (e) {
      addToast("error", String(e));
    }
  };

  const clearAll = async () => {
    setConfirmClear(null);
    try {
      await coreStore.clearCookies();
      set({ cookies: [] });
    } catch (e) {
      addToast("error", String(e));
    }
  };

  const grouped = groupByDomain(cookies);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={close}>
      <div
        className="bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-2xl flex flex-col"
        style={{ width: 620, maxHeight: "80vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)]">
          <Cookie size={14} className="text-[var(--accent)]" />
          <span className="text-sm font-semibold">Cookie Manager</span>
          <span className="ml-1 text-xs text-[var(--text-3)]">{cookies.length} cookie{cookies.length !== 1 ? "s" : ""}</span>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => set({ enableCookies: !enableCookies })}
              title={enableCookies ? "Disable cookie jar" : "Enable cookie jar"}
              className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded border transition-colors ${enableCookies ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-subtle)]" : "border-[var(--border)] text-[var(--text-3)]"}`}
            >
              {enableCookies ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
              {enableCookies ? "Enabled" : "Disabled"}
            </button>
            {cookies.length > 0 && (
              <button
                onClick={() => setConfirmClear("all")}
                className="text-xs text-[var(--danger)] hover:underline"
              >
                Clear all
              </button>
            )}
            <button onClick={close} className="p-1 rounded hover:bg-[var(--surface-2)] text-[var(--text-3)]">
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Confirm clear */}
        {confirmClear && (
          <div className="flex items-center gap-3 px-4 py-2 bg-[var(--surface-2)] border-b border-[var(--border)]">
            <span className="text-xs text-[var(--text-1)] flex-1">
              Clear {confirmClear === "all" ? "all cookies" : `cookies for ${confirmClear}`}?
            </span>
            <button
              onClick={() => confirmClear === "all" ? clearAll() : clearDomain(confirmClear)}
              className="btn btn-danger text-2xs py-0.5 px-2"
            >
              Clear
            </button>
            <button onClick={() => setConfirmClear(null)} className="btn text-2xs py-0.5 px-2">
              Cancel
            </button>
          </div>
        )}

        {/* Cookie list */}
        <div className="flex-1 overflow-y-auto">
          {cookies.length === 0 && (
            <p className="p-6 text-xs text-[var(--text-3)] text-center">
              No cookies stored. Send a request that returns Set-Cookie headers.
            </p>
          )}
          {[...grouped.entries()].map(([domain, domainCookies]) => (
            <div key={domain}>
              <div className="flex items-center gap-2 px-4 py-1.5 bg-[var(--surface-2)] border-b border-[var(--border)] sticky top-0">
                <span className="text-2xs font-semibold text-[var(--text-2)] flex-1">{domain}</span>
                <span className="text-2xs text-[var(--text-3)]">{domainCookies.length}</span>
                <button
                  onClick={() => setConfirmClear(domain)}
                  className="text-2xs text-[var(--danger)] hover:underline"
                >
                  Clear
                </button>
              </div>
              {domainCookies.map((c) => (
                <div key={c.id} className="flex items-start gap-2 px-4 py-2 border-b border-[var(--border)] last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-semibold text-[var(--text-1)] truncate">{c.name}</span>
                      <span className="text-2xs text-[var(--text-3)]">{c.path}</span>
                      {c.secure && <span className="text-2xs px-1 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Secure</span>}
                      {c.httpOnly && <span className="text-2xs px-1 rounded bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">HttpOnly</span>}
                      {c.sameSite && <span className="text-2xs px-1 rounded bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">{c.sameSite}</span>}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="text-2xs font-mono text-[var(--text-2)] truncate max-w-xs">
                        {revealed.has(c.id) ? c.value : "••••••••"}
                      </span>
                      <span className="text-2xs text-[var(--text-3)] shrink-0">{formatExpiry(c.expires)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleReveal(c.id)}
                    className="p-1 text-[var(--text-3)] hover:text-[var(--text-1)] shrink-0"
                    title={revealed.has(c.id) ? "Hide value" : "Reveal value"}
                  >
                    {revealed.has(c.id) ? <EyeOff size={12} /> : <Eye size={12} />}
                  </button>
                  <button
                    onClick={() => deleteCookie(c.id)}
                    className="p-1 text-[var(--text-3)] hover:text-[var(--danger)] shrink-0"
                    title="Delete cookie"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
