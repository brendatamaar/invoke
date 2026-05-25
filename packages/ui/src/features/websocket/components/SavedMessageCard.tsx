import { Pencil, Trash2 } from "lucide-react";
import type { WsSavedMessage } from "@invoke/core";
import { Select } from "../../../components/shared/Select";
import type { SavedMessageDraft } from "../types";

export function SavedMessageCard({
  msg,
  selected,
  expanded,
  editDraft,
  onSelect,
  onExpand,
  onDelete,
  onEditDraft,
  onDiscard,
  onSave,
}: {
  msg: WsSavedMessage;
  selected: boolean;
  expanded: boolean;
  editDraft: SavedMessageDraft | null;
  onSelect: () => void;
  onExpand: () => void;
  onDelete: () => void;
  onEditDraft: (draft: SavedMessageDraft) => void;
  onDiscard: () => void;
  onSave: () => void;
}) {
  const preview =
    msg.label || msg.body.slice(0, 52) + (msg.body.length > 52 ? "\u2026" : "");

  return (
    <div
      style={{
        border: `1px solid ${selected ? "var(--accent)" : "var(--line-2)"}`,
        borderRadius: "var(--r-2)",
      }}
    >
      <div
        className="flex items-center gap-2 px-3 py-2 group cursor-pointer hover:bg-[var(--surface-2)]"
        onClick={onSelect}
      >
        <input
          type="checkbox"
          checked={selected}
          onChange={onSelect}
          onClick={(e) => e.stopPropagation()}
          className="w-3.5 h-3.5 shrink-0 cursor-pointer"
        />
        <span className="flex-1 text-xs font-mono text-[var(--text-1)] truncate">
          {preview || <span className="text-[var(--text-3)]">Untitled</span>}
        </span>
        {msg.type === "binary" && (
          <span className="text-[10px] text-[var(--text-3)] shrink-0">bin</span>
        )}
        {msg.autoSend && (
          <span className="text-[10px] text-[var(--accent)] shrink-0">
            auto-send
          </span>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onExpand();
          }}
          className={`p-0.5 rounded shrink-0 ${expanded ? "text-[var(--accent)]" : "text-[var(--text-3)] opacity-0 group-hover:opacity-100 hover:text-[var(--text-1)]"}`}
        >
          <Pencil size={11} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-0.5 rounded shrink-0 text-[var(--text-3)] opacity-0 group-hover:opacity-100 hover:text-[var(--danger)]"
        >
          <Trash2 size={11} />
        </button>
      </div>

      {expanded && editDraft && (
        <div
          className="flex flex-col gap-1.5 p-3"
          style={{
            borderTop: "1px solid var(--line-1)",
            background: "var(--bg-1)",
          }}
        >
          <input
            value={editDraft.label}
            onChange={(e) => onEditDraft({ ...editDraft, label: e.target.value })}
            placeholder="Label (optional)"
            className="input text-xs"
          />
          <textarea
            value={editDraft.body}
            onChange={(e) => onEditDraft({ ...editDraft, body: e.target.value })}
            placeholder="Message body\u2026"
            rows={3}
            className="input text-xs font-mono resize-none py-1.5"
          />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-xs text-[var(--text-2)] cursor-pointer">
              <input
                type="checkbox"
                checked={editDraft.autoSend}
                onChange={(e) =>
                  onEditDraft({ ...editDraft, autoSend: e.target.checked })
                }
              />
              Auto-send on connect
            </label>
            <Select
              value={editDraft.type}
              onChange={(e) =>
                onEditDraft({
                  ...editDraft,
                  type: e.target.value as "text" | "binary",
                })
              }
              size="xs"
            >
              <option value="text">Text</option>
              <option value="binary">Binary</option>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn text-xs px-3" onClick={onDiscard}>
              Discard
            </button>
            <button className="btn btn-primary text-xs px-3" onClick={onSave}>
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
