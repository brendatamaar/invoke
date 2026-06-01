import { useState } from "react";
import { Cookie, Plus, ToggleLeft, ToggleRight, X } from "lucide-react";
import { useCookies } from "../../../hooks/useDb";
import { coreStore, useStore } from "../../../store";
import { CookieDomainGroup } from "./CookieDomainGroup";
import { AddCookieForm } from "./AddCookieForm";
import { groupByDomain } from "../utils/grouping";

function toggleEnableCookies(enabled: boolean) {
  coreStore.setMeta("enableCookies", enabled).catch(() => {});
}

export function CookieManagerModal() {
  const { showCookieManager, enableCookies, set, addToast } = useStore();
  const cookies = useCookies();
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [pendingDeletes, setPendingDeletes] = useState<Set<string>>(new Set());
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!showCookieManager) return null;

  const hasPending = pendingDeletes.size > 0;

  const close = () => {
    setPendingDeletes(new Set());
    setShowAddForm(false);
    set({ showCookieManager: false });
  };

  const grouped = groupByDomain(cookies);

  const toggleReveal = (id: string) => {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const stageDelete = (id: string) => {
    setPendingDeletes((prev) => new Set([...prev, id]));
  };

  const undoDelete = (id: string) => {
    setPendingDeletes((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const stageClearDomain = (domain: string) => {
    const ids = cookies.filter((c) => c.domain === domain).map((c) => c.id);
    setPendingDeletes((prev) => new Set([...prev, ...ids]));
  };

  const stageClearAll = () => {
    setPendingDeletes(new Set(cookies.map((c) => c.id)));
  };

  const saveChanges = async () => {
    setSaving(true);
    try {
      for (const id of pendingDeletes) {
        await coreStore.deleteCookie(id);
      }
      setPendingDeletes(new Set());
    } catch (error) {
      addToast("error", String(error));
    } finally {
      setSaving(false);
    }
  };

  const cancelChanges = () => {
    setPendingDeletes(new Set());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button type="button" className="absolute inset-0 bg-black/40" onClick={close} aria-label="Close" />
      <div
        className="relative bg-[var(--surface)] border border-[var(--border)] rounded-md shadow-[var(--shadow-pop)] flex flex-col"
        style={{ width: 620, maxHeight: "80vh" }}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)]">
          <Cookie size={14} className="text-[var(--accent)]" />
          <span className="text-sm font-semibold">Cookie Manager</span>
          <span className="ml-1 text-xs text-[var(--text-3)]">
            {cookies.length} cookie{cookies.length !== 1 ? "s" : ""}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const next = !enableCookies;
                set({ enableCookies: next });
                toggleEnableCookies(next);
              }}
              title={enableCookies ? "Disable cookie jar" : "Enable cookie jar"}
              className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded border transition-colors ${enableCookies ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-subtle)]" : "border-[var(--border)] text-[var(--text-3)]"}`}
            >
              {enableCookies ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
              {enableCookies ? "Enabled" : "Disabled"}
            </button>
            {cookies.length > 0 && (
              <button
                type="button"
                onClick={stageClearAll}
                className="text-xs text-[var(--danger)] hover:underline"
              >
                Clear all
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowAddForm((v) => !v)}
              title="Add cookie"
              className={`p-1 rounded hover:bg-[var(--surface-2)] transition-colors ${showAddForm ? "text-[var(--accent)]" : "text-[var(--text-3)]"}`}
            >
              <Plus size={14} />
            </button>
            <button
              type="button"
              onClick={close}
              className="p-1 rounded hover:bg-[var(--surface-2)] text-[var(--text-3)]"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {showAddForm && <AddCookieForm onDone={() => setShowAddForm(false)} />}

        <div className="flex-1 overflow-y-auto min-h-0">
          {cookies.length === 0 && (
            <p className="p-6 text-xs text-[var(--text-3)] text-center">
              No cookies stored. Send a request that returns Set-Cookie headers.
            </p>
          )}
          {[...grouped.entries()].map(([domain, domainCookies]) => (
            <CookieDomainGroup
              key={domain}
              domain={domain}
              cookies={domainCookies}
              revealed={revealed}
              pendingDeletes={pendingDeletes}
              onClearDomain={stageClearDomain}
              onToggleReveal={toggleReveal}
              onDeleteCookie={stageDelete}
              onUndoDelete={undoDelete}
            />
          ))}
        </div>

        {hasPending && (
          <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-[var(--border)]">
            <span className="text-xs text-[var(--text-3)] mr-auto">
              {pendingDeletes.size} deletion{pendingDeletes.size !== 1 ? "s" : ""} pending
            </span>
            <button
              type="button"
              onClick={cancelChanges}
              className="btn text-xs py-1 px-3"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveChanges}
              disabled={saving}
              className="btn btn-primary text-xs py-1 px-3"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
