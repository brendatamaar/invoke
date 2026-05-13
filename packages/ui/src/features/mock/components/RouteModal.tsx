import { useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import type { MockRoute, MockSequenceItem } from "@invoke/core";
import type { RouteTab } from "../../../types";
import { KeyValueEditor } from "../../../components/shared/KeyValueEditor";
import { Select } from "../../../components/shared/Select";
import { HTTP_METHODS, makeSequenceItem } from "./mockRouteUtils";

export function RouteModal({
  route,
  onSave,
  onClose,
}: {
  route: MockRoute;
  onSave: (r: MockRoute) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<MockRoute>({ ...route });
  const [tab, setTab] = useState<RouteTab>("response");

  const set = <K extends keyof MockRoute>(key: K, value: MockRoute[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const sequences = draft.sequences ?? [];
  const updateSeq = (i: number, patch: Partial<MockSequenceItem>) =>
    set(
      "sequences",
      sequences.map((s, idx) => (idx === i ? { ...s, ...patch } : s)),
    );
  const addSeq = () => set("sequences", [...sequences, makeSequenceItem()]);
  const removeSeq = (i: number) =>
    set(
      "sequences",
      sequences.filter((_, idx) => idx !== i),
    );

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/20 backdrop-blur-[1px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-[var(--surface)] border border-[var(--border)] rounded-md shadow-[var(--shadow-pop)] flex flex-col overflow-hidden"
        style={{ width: 620, maxHeight: "84vh" }}
      >
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[var(--border)] shrink-0">
          <span className="text-sm font-semibold text-[var(--text-1)] flex-1">
            {route.id && route.pathPattern !== "/" ? "Edit Route" : "New Route"}
          </span>
          <label className="flex items-center gap-2 text-xs text-[var(--text-2)] cursor-pointer mr-2">
            <input
              type="checkbox"
              checked={draft.enabled !== false}
              onChange={(e) => set("enabled", e.target.checked)}
            />
            Enabled
          </label>
          <button
            onClick={onClose}
            className="text-[var(--text-3)] hover:text-[var(--text-1)] p-1 rounded hover:bg-[var(--surface-2)]"
          >
            <X size={14} />
          </button>
        </div>

        <div className="px-5 pt-4 pb-3 flex flex-col gap-1.5 shrink-0 border-b border-[var(--border)]">
          <label className="text-xs font-medium text-[var(--text-2)]">
            Endpoint
          </label>
          <div className="flex gap-2">
            <Select
              value={draft.method}
              onChange={(v) =>
                set("method", v as unknown as MockRoute["method"])
              }
              size="sm"
            >
              {HTTP_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
            <input
              className="input text-xs py-1.5 flex-1"
              placeholder="/api/users"
              value={draft.pathPattern}
              onChange={(e) => set("pathPattern", e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-0 px-5 border-b border-[var(--border)] shrink-0">
          {(["response", "sequences", "headers"] as RouteTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-2 text-xs capitalize border-b-2 -mb-px transition-colors ${tab === t ? "border-[var(--accent)] text-[var(--accent)]" : "border-transparent text-[var(--text-3)] hover:text-[var(--text-1)]"}`}
            >
              {t}
              {t === "sequences" && sequences.length > 0 && (
                <span className="ml-1 text-2xs bg-[var(--accent-subtle)] text-[var(--accent)] rounded px-1">
                  {sequences.length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          {tab === "response" && (
            <>
              <div className="flex gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-[var(--text-2)]">
                    Status code
                  </label>
                  <input
                    type="number"
                    className="input text-sm py-1.5 w-28"
                    min={100}
                    max={599}
                    value={draft.status}
                    onChange={(e) => set("status", Number(e.target.value))}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-[var(--text-2)]">
                    Latency
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      className="input text-sm py-1.5 w-28"
                      min={0}
                      placeholder="0"
                      value={draft.latencyMs ?? ""}
                      onChange={(e) =>
                        set(
                          "latencyMs",
                          e.target.value ? Number(e.target.value) : undefined,
                        )
                      }
                    />
                    <span className="text-sm text-[var(--text-3)]">ms</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[var(--text-2)]">
                  Response body
                </label>
                <textarea
                  className="input text-sm py-2 font-mono resize-none"
                  rows={8}
                  placeholder='{"message": "ok"}'
                  value={draft.body}
                  onChange={(e) => set("body", e.target.value)}
                />
              </div>
              {sequences.length > 0 && (
                <p className="text-2xs text-[var(--warn)] bg-[var(--warn-bg)] px-3 py-2 rounded">
                  Sequences are active - this default response is overridden.
                  Switch to Sequences tab to manage.
                </p>
              )}
            </>
          )}

          {tab === "sequences" && (
            <>
              <p className="text-xs text-[var(--text-3)]">
                When sequences are set, each call to this route returns the next
                item in order, wrapping around. Overrides the default response.
              </p>
              {sequences.map((seq, i) => (
                <div
                  key={i}
                  className="border border-[var(--border)] rounded-md p-3 flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[var(--text-2)]">
                      Response {i + 1}
                    </span>
                    <button
                      onClick={() => removeSeq(i)}
                      className="text-[var(--text-3)] hover:text-[var(--danger)] p-0.5"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-2xs text-[var(--text-3)]">
                        Status
                      </label>
                      <input
                        type="number"
                        className="input text-xs py-1 w-20"
                        min={100}
                        max={599}
                        value={seq.status}
                        onChange={(e) =>
                          updateSeq(i, { status: Number(e.target.value) })
                        }
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-2xs text-[var(--text-3)]">
                        Latency
                      </label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          className="input text-xs py-1 w-20"
                          min={0}
                          placeholder="0"
                          value={seq.latencyMs ?? ""}
                          onChange={(e) =>
                            updateSeq(i, {
                              latencyMs: e.target.value
                                ? Number(e.target.value)
                                : undefined,
                            })
                          }
                        />
                        <span className="text-2xs text-[var(--text-3)]">
                          ms
                        </span>
                      </div>
                    </div>
                  </div>
                  <textarea
                    className="input text-xs py-1.5 font-mono resize-none"
                    rows={3}
                    placeholder='{"message": "ok"}'
                    value={seq.body}
                    onChange={(e) => updateSeq(i, { body: e.target.value })}
                  />
                </div>
              ))}
              <button
                onClick={addSeq}
                className="flex items-center gap-1.5 text-xs text-[var(--text-3)] hover:text-[var(--text-1)] self-start"
              >
                <Plus size={12} /> Add response
              </button>
            </>
          )}

          {tab === "headers" && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[var(--text-2)]">
                Response headers
              </label>
              <div className="border border-[var(--border)] rounded overflow-hidden">
                <KeyValueEditor
                  rows={draft.headers}
                  onChange={(rows) => set("headers", rows)}
                  keyPlaceholder="Content-Type"
                  valuePlaceholder="application/json"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[var(--border)] bg-[var(--surface-2)] shrink-0">
          <button onClick={onClose} className="btn text-xs">
            Cancel
          </button>
          <button
            onClick={() => {
              onSave(draft);
              onClose();
            }}
            className="btn btn-primary text-xs"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
