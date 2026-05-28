import { useState } from "react";
import { Cpu, MoreHorizontal, Pin, PinOff, Tag, Trash2 } from "lucide-react";
import type { HistoryEntry } from "@invoke/core";
import { MethodBadge, protocolMethod } from "../../../components/shared/MethodBadge";
import { StatusBadge } from "../../../components/shared/StatusBadge";
import { CollectionMenuItem } from "../../collections";

export function HistoryItem({
  entry,
  restore,
  onDelete,
  onPin,
  onLabel,
  onCreateMock,
}: {
  entry: HistoryEntry;
  restore: (entry: HistoryEntry) => void;
  onDelete: (entry: HistoryEntry) => void;
  onPin: (entry: HistoryEntry, pinned: boolean) => void;
  onLabel: (entry: HistoryEntry, label: string) => void;
  onCreateMock: (entry: HistoryEntry) => void;
}) {
  const request = entry.request as { method?: string; url?: string } | undefined;
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState(entry.label ?? "");

  return (
    <div
      className="group flex items-center gap-2 px-3 py-2 hover:bg-[var(--surface-2)] border-b border-[var(--border)] cursor-pointer"
      onClick={() => restore(entry)}
    >
      <MethodBadge method={protocolMethod(entry.protocol, request?.method)} />
      <div className="flex-1 min-w-0">
        <span
          className="block text-xs font-mono text-[var(--text-1)] truncate"
          title={request?.url}
        >
          {request?.url ?? "-"}
        </span>
        {editingLabel ? (
          <input
            autoFocus
            value={labelDraft}
            onChange={(event) => setLabelDraft(event.target.value)}
            onBlur={() => {
              setEditingLabel(false);
              onLabel(entry, labelDraft.trim());
            }}
            onKeyDown={(event) => {
              event.stopPropagation();
              if (event.key === "Enter") {
                setEditingLabel(false);
                onLabel(entry, labelDraft.trim());
              }
              if (event.key === "Escape") setEditingLabel(false);
            }}
            onClick={(event) => event.stopPropagation()}
            placeholder="Add label..."
            className="input text-xs py-0 px-1 w-32 mt-0.5"
          />
        ) : entry.label ? (
          <span className="text-2xs text-[var(--accent)] truncate">{entry.label}</span>
        ) : null}
      </div>
      <StatusBadge status={entry.response?.status ?? 0} />
      {entry.pinned && <Pin size={11} className="text-[var(--accent)] shrink-0" />}
      <HistoryItemMenu
        entry={entry}
        open={menuOpen}
        onOpenChange={setMenuOpen}
        onEditLabel={() => {
          setLabelDraft(entry.label ?? "");
          setEditingLabel(true);
        }}
        onDelete={onDelete}
        onPin={onPin}
        onCreateMock={onCreateMock}
      />
    </div>
  );
}

function HistoryItemMenu({
  entry,
  open,
  onOpenChange,
  onEditLabel,
  onDelete,
  onPin,
  onCreateMock,
}: {
  entry: HistoryEntry;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditLabel: () => void;
  onDelete: (entry: HistoryEntry) => void;
  onPin: (entry: HistoryEntry, pinned: boolean) => void;
  onCreateMock: (entry: HistoryEntry) => void;
}) {
  return (
    <div
      className="opacity-0 group-hover:opacity-100 relative shrink-0"
      onClick={(event) => event.stopPropagation()}
    >
      <button
        onClick={() => onOpenChange(!open)}
        className="p-0.5 rounded hover:bg-[var(--border)] text-[var(--text-3)]"
      >
        <MoreHorizontal size={13} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 bg-[var(--surface)] border border-[var(--border)] rounded-md shadow-[var(--shadow-2)] py-1 min-w-[152px]">
          <CollectionMenuItem
            icon={<Tag size={12} />}
            label={entry.label ? "Edit Label" : "Add Label"}
            onClick={() => {
              onOpenChange(false);
              onEditLabel();
            }}
          />
          <CollectionMenuItem
            icon={<Cpu size={12} />}
            label="Create Mock"
            onClick={() => {
              onOpenChange(false);
              onCreateMock(entry);
            }}
          />
          <CollectionMenuItem
            icon={entry.pinned ? <PinOff size={12} /> : <Pin size={12} />}
            label={entry.pinned ? "Unpin" : "Pin"}
            onClick={() => {
              onOpenChange(false);
              onPin(entry, !entry.pinned);
            }}
          />
          <div className="h-px bg-[var(--border)] my-1" />
          <CollectionMenuItem
            icon={<Trash2 size={12} />}
            label="Delete"
            onClick={() => {
              onOpenChange(false);
              onDelete(entry);
            }}
            danger
          />
        </div>
      )}
    </div>
  );
}
