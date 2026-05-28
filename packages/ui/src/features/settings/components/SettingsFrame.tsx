import type { ReactNode } from "react";
import { X } from "lucide-react";
import type { SettingsTab } from "../../../types";
import { TAB_ITEMS } from "../constants";

export function SettingsFrame({
  tab,
  dirty,
  children,
  onTabChange,
  onCancel,
  onSave,
}: {
  tab: SettingsTab;
  dirty: boolean;
  children: ReactNode;
  onTabChange: (tab: SettingsTab) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onCancel}
    >
      <div
        className="flex max-h-[80vh] w-[760px] max-w-[calc(100vw-32px)] flex-col rounded-md border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-pop)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
          <span className="text-sm font-semibold">Settings</span>
          <button
            onClick={onCancel}
            className="ml-auto rounded p-1 text-[var(--text-3)] hover:bg-[var(--surface-2)]"
            title="Close settings"
          >
            <X size={15} />
          </button>
        </div>

        <div className="flex min-h-0 flex-1">
          <nav className="w-[170px] shrink-0 border-r border-[var(--border)] bg-[var(--bg-1)] p-2">
            {TAB_ITEMS.map((item) => (
              <NavItem
                key={item.id}
                item={item}
                active={tab === item.id}
                onClick={() => onTabChange(item.id)}
              />
            ))}
          </nav>

          <div className="min-h-[430px] flex-1 overflow-y-auto p-5">{children}</div>
        </div>

        <div className="flex items-center gap-3 border-t border-[var(--border)] px-4 py-3">
          <div className="mr-auto flex items-center gap-2 text-2xs text-[var(--text-3)]">
            {dirty && (
              <>
                <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
                <span>Unsaved changes</span>
              </>
            )}
          </div>
          <button onClick={onCancel} className="btn px-4 py-1.5 text-xs">
            Cancel
          </button>
          <button onClick={onSave} className="btn btn-primary px-4 py-1.5 text-xs">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function NavItem({
  item,
  active,
  onClick,
}: {
  item: (typeof TAB_ITEMS)[number];
  active: boolean;
  onClick: () => void;
}) {
  const Icon = item.Icon;

  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2 border-l-2 px-3 py-2 text-left text-xs transition-colors ${
        active
          ? "border-[var(--accent)] bg-[var(--bg-3)] text-[var(--fg-0)]"
          : "border-transparent text-[var(--fg-2)] hover:bg-[var(--bg-2)] hover:text-[var(--fg-1)]"
      }`}
    >
      <Icon size={14} />
      <span>{item.label}</span>
    </button>
  );
}
