import { Eye, EyeOff, Trash2 } from "lucide-react";
import type { StoredCookie } from "@invoke/core";
import { formatExpiry } from "../utils/expiry";

export function CookieDomainGroup({
  domain,
  cookies,
  revealed,
  onClearDomain,
  onToggleReveal,
  onDeleteCookie,
}: {
  domain: string;
  cookies: StoredCookie[];
  revealed: Set<string>;
  onClearDomain: (domain: string) => void;
  onToggleReveal: (id: string) => void;
  onDeleteCookie: (id: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 px-4 py-1.5 bg-[var(--surface-2)] border-b border-[var(--border)] sticky top-0">
        <span className="text-2xs font-semibold text-[var(--text-2)] flex-1">{domain}</span>
        <span className="text-2xs text-[var(--text-3)]">{cookies.length}</span>
        <button
          type="button"
          onClick={() => onClearDomain(domain)}
          className="text-2xs text-[var(--danger)] hover:underline"
        >
          Clear
        </button>
      </div>
      {cookies.map((cookie) => (
        <CookieRow
          key={cookie.id}
          cookie={cookie}
          revealed={revealed.has(cookie.id)}
          onToggleReveal={() => onToggleReveal(cookie.id)}
          onDelete={() => onDeleteCookie(cookie.id)}
        />
      ))}
    </div>
  );
}

function CookieRow({
  cookie,
  revealed,
  onToggleReveal,
  onDelete,
}: {
  cookie: StoredCookie;
  revealed: boolean;
  onToggleReveal: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-start gap-2 px-4 py-2 border-b border-[var(--border)] last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-mono font-semibold text-[var(--text-1)] truncate">
            {cookie.name}
          </span>
          <span className="text-2xs text-[var(--text-3)]">{cookie.path}</span>
          {cookie.secure && (
            <span className="text-2xs px-1 rounded bg-[var(--ok-bg)] text-[var(--ok)] dark:text-[var(--ok)]">
              Secure
            </span>
          )}
          {cookie.httpOnly && (
            <span className="text-2xs px-1 rounded bg-[var(--bg-3)] text-[var(--fg-2)] dark:bg-[var(--bg-3)] dark:text-[var(--fg-2)]">
              HttpOnly
            </span>
          )}
          {cookie.sameSite && (
            <span className="text-2xs px-1 rounded bg-[var(--bg-3)] text-[var(--fg-2)] dark:bg-[var(--bg-3)] dark:text-[var(--fg-2)]">
              {cookie.sameSite}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          <span className="text-2xs font-mono text-[var(--text-2)] truncate max-w-xs">
            {revealed ? cookie.value : "\u2022".repeat(8)}
          </span>
          <span className="text-2xs text-[var(--text-3)] shrink-0">
            {formatExpiry(cookie.expires)}
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={onToggleReveal}
        className="p-1 text-[var(--text-3)] hover:text-[var(--text-1)] shrink-0"
        title={revealed ? "Hide value" : "Reveal value"}
      >
        {revealed ? <EyeOff size={12} /> : <Eye size={12} />}
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="p-1 text-[var(--text-3)] hover:text-[var(--danger)] shrink-0"
        title="Delete cookie"
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}
