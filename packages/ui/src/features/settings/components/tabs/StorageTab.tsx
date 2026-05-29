import { Cookie, Trash2 } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import type { RetentionSettings } from "@invoke/core";
import { numericInputValue } from "../../utils/numbers";
import { FieldRow } from "../shared/FieldRow";
import { SectionTitle } from "../shared/SectionTitle";

export function StorageTab({
  retentionDraft,
  setRetentionDraft,
  statItems,
  cookiesCount,
  confirmClearCookies,
  onClearCookies,
  onCancelClearCookies,
  onOpenClearHistory,
}: {
  retentionDraft: RetentionSettings;
  setRetentionDraft: Dispatch<SetStateAction<RetentionSettings>>;
  statItems: Array<{ label: string; value: number }>;
  cookiesCount: number;
  confirmClearCookies: boolean;
  onClearCookies: () => void;
  onCancelClearCookies: () => void;
  onOpenClearHistory: () => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <SectionTitle
          title="Retention"
          description="Pinned history entries are never deleted by cleanup."
        />
        <FieldRow label="Max entries" hint="0 keeps unlimited entries.">
          <input
            type="number"
            min={0}
            step={100}
            value={retentionDraft.maxEntries}
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => {
              const value = numericInputValue(e.currentTarget.value, 0, 0);
              setRetentionDraft((draft) => ({ ...draft, maxEntries: value }));
            }}
            aria-label="Max entries"
            className="input w-24 text-xs"
          />
        </FieldRow>
        <FieldRow label="Keep days" hint="0 keeps entries indefinitely.">
          <input
            type="number"
            min={0}
            step={1}
            value={retentionDraft.retentionDays}
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => {
              const value = numericInputValue(e.currentTarget.value, 0, 0);
              setRetentionDraft((draft) => ({ ...draft, retentionDays: value }));
            }}
            aria-label="Keep days"
            className="input w-24 text-xs"
          />
        </FieldRow>
      </div>

      <div className="flex flex-col gap-3">
        <SectionTitle title="Stats" />
        <div className="grid grid-cols-3 gap-2">
          {statItems.map(({ label, value }) => (
            <div key={label} className="rounded-md bg-[var(--bg-2)] p-3 text-center">
              <div className="font-mono text-sm font-semibold text-[var(--text-1)]">{value}</div>
              <div className="mt-1 text-2xs text-[var(--text-3)]">{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <SectionTitle title="Data management" />
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onOpenClearHistory}
            className="btn flex items-center justify-center gap-2 text-xs"
          >
            <Trash2 size={13} />
            Clear History
          </button>
          <button
            type="button"
            onClick={onClearCookies}
            disabled={cookiesCount === 0}
            className="btn flex items-center justify-center gap-2 text-xs disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Cookie size={13} />
            {confirmClearCookies ? "Confirm Clear" : "Clear Cookies"}
          </button>
        </div>
        {confirmClearCookies && (
          <div className="flex items-center gap-3 bg-[var(--danger-bg)] px-3 py-2 text-xs text-[var(--text-2)]">
            <span className="flex-1">Clear all stored cookies from this workspace?</span>
            <button type="button" onClick={onCancelClearCookies} className="btn text-2xs">
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
