import { Plus, Trash2 } from "lucide-react";
import type { MockSequenceItem } from "@invoke/core";

export function RouteSequenceEditor({
  sequences,
  onAdd,
  onRemove,
  onUpdate,
}: {
  sequences: MockSequenceItem[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, patch: Partial<MockSequenceItem>) => void;
}) {
  return (
    <>
      <p className="text-xs text-[var(--text-3)]">
        When sequences are set, each call to this route returns the next item in order, wrapping
        around. Overrides the default response.
      </p>
      {sequences.map((sequence, index) => (
        <div
          key={index}
          className="border border-[var(--border)] rounded-md p-3 flex flex-col gap-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--text-2)]">Response {index + 1}</span>
            <button
              onClick={() => onRemove(index)}
              className="text-[var(--text-3)] hover:text-[var(--danger)] p-0.5"
            >
              <Trash2 size={12} />
            </button>
          </div>
          <div className="flex gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-2xs text-[var(--text-3)]">Status</label>
              <input
                type="number"
                className="input text-xs py-1 w-20"
                min={100}
                max={599}
                value={sequence.status}
                onChange={(event) => onUpdate(index, { status: Number(event.target.value) })}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-2xs text-[var(--text-3)]">Latency</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  className="input text-xs py-1 w-20"
                  min={0}
                  placeholder="0"
                  value={sequence.latencyMs ?? ""}
                  onChange={(event) =>
                    onUpdate(index, {
                      latencyMs: event.target.value ? Number(event.target.value) : undefined,
                    })
                  }
                />
                <span className="text-2xs text-[var(--text-3)]">ms</span>
              </div>
            </div>
          </div>
          <textarea
            className="input text-xs py-1.5 font-mono resize-none"
            rows={3}
            placeholder='{"message": "ok"}'
            value={sequence.body}
            onChange={(event) => onUpdate(index, { body: event.target.value })}
          />
        </div>
      ))}
      <button
        onClick={onAdd}
        className="flex items-center gap-1.5 text-xs text-[var(--text-3)] hover:text-[var(--text-1)] self-start"
      >
        <Plus size={12} /> Add response
      </button>
    </>
  );
}
