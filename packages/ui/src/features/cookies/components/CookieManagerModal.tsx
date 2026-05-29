import { useState } from "react";
import { Cookie, ToggleLeft, ToggleRight, X } from "lucide-react";
import { useCookies } from "../../../hooks/useDb";
import { coreStore, useStore } from "../../../store";
import { CookieDomainGroup } from "./CookieDomainGroup";
import { groupByDomain } from "../utils/grouping";

export function CookieManagerModal() {
  const { showCookieManager, enableCookies, set, addToast } = useStore();
  const cookies = useCookies();
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [confirmClear, setConfirmClear] = useState<string | null>(null);

  if (!showCookieManager) return null;

  const close = () => set({ showCookieManager: false });
  const grouped = groupByDomain(cookies);

  const toggleReveal = (id: string) => {
    setRevealed((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const deleteCookie = async (id: string) => {
    try {
      await coreStore.deleteCookie(id);
    } catch (error) {
      addToast("error", String(error));
    }
  };

  const clearDomain = async (domain: string) => {
    setConfirmClear(null);
    try {
      await coreStore.clearCookies(domain);
    } catch (error) {
      addToast("error", String(error));
    }
  };

  const clearAll = async () => {
    setConfirmClear(null);
    try {
      await coreStore.clearCookies();
    } catch (error) {
      addToast("error", String(error));
    }
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
              onClick={() => set({ enableCookies: !enableCookies })}
              title={enableCookies ? "Disable cookie jar" : "Enable cookie jar"}
              className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded border transition-colors ${enableCookies ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-subtle)]" : "border-[var(--border)] text-[var(--text-3)]"}`}
            >
              {enableCookies ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
              {enableCookies ? "Enabled" : "Disabled"}
            </button>
            {cookies.length > 0 && (
              <button
                type="button"
                onClick={() => setConfirmClear("all")}
                className="text-xs text-[var(--danger)] hover:underline"
              >
                Clear all
              </button>
            )}
            <button
              type="button"
              onClick={close}
              className="p-1 rounded hover:bg-[var(--surface-2)] text-[var(--text-3)]"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {confirmClear && (
          <div className="flex items-center gap-3 px-4 py-2 bg-[var(--surface-2)] border-b border-[var(--border)]">
            <span className="text-xs text-[var(--text-1)] flex-1">
              Clear {confirmClear === "all" ? "all cookies" : `cookies for ${confirmClear}`}?
            </span>
            <button
              type="button"
              onClick={() => (confirmClear === "all" ? clearAll() : clearDomain(confirmClear))}
              className="btn btn-danger text-2xs py-0.5 px-2"
            >
              Clear
            </button>
            <button type="button" onClick={() => setConfirmClear(null)} className="btn text-2xs py-0.5 px-2">
              Cancel
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
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
              onClearDomain={setConfirmClear}
              onToggleReveal={toggleReveal}
              onDeleteCookie={deleteCookie}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
