import { useState } from "react";
import type { MockRoute, MockSequenceItem } from "@invoke/core";
import type { RouteTab } from "../../../types";
import { makeSequenceItem } from "../mockRouteUtils";
import { RouteEndpointEditor } from "./route/RouteEndpointEditor";
import { RouteHeadersEditor } from "./route/RouteHeadersEditor";
import { RouteModalHeader } from "./route/RouteModalHeader";
import { RouteResponseEditor } from "./route/RouteResponseEditor";
import { RouteSequenceEditor } from "./route/RouteSequenceEditor";
import { RouteTabs } from "./route/RouteTabs";

export function RouteModal({
  route,
  onSave,
  onClose,
}: {
  route: MockRoute;
  onSave: (route: MockRoute) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<MockRoute>({ ...route });
  const [tab, setTab] = useState<RouteTab>("response");

  const set = <K extends keyof MockRoute>(key: K, value: MockRoute[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const sequences = draft.sequences ?? [];
  const updateSeq = (index: number, patch: Partial<MockSequenceItem>) =>
    set(
      "sequences",
      sequences.map((sequence, sequenceIndex) =>
        sequenceIndex === index ? { ...sequence, ...patch } : sequence,
      ),
    );
  const addSeq = () => set("sequences", [...sequences, makeSequenceItem()]);
  const removeSeq = (index: number) =>
    set(
      "sequences",
      sequences.filter((_, sequenceIndex) => sequenceIndex !== index),
    );

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/20 backdrop-blur-[1px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="bg-[var(--surface)] border border-[var(--border)] rounded-md shadow-[var(--shadow-pop)] flex flex-col overflow-hidden"
        style={{ width: 620, maxHeight: "84vh" }}
      >
        <RouteModalHeader
          route={route}
          enabled={draft.enabled !== false}
          onEnabledChange={(enabled) => set("enabled", enabled)}
          onClose={onClose}
        />

        <RouteEndpointEditor
          method={draft.method}
          pathPattern={draft.pathPattern}
          onMethodChange={(method) => set("method", method)}
          onPathPatternChange={(pathPattern) => set("pathPattern", pathPattern)}
        />

        <RouteTabs tab={tab} sequenceCount={sequences.length} onTabChange={setTab} />

        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          {tab === "response" && (
            <RouteResponseEditor
              status={draft.status}
              latencyMs={draft.latencyMs}
              body={draft.body}
              sequenceCount={sequences.length}
              onStatusChange={(status) => set("status", status)}
              onLatencyChange={(latencyMs) => set("latencyMs", latencyMs)}
              onBodyChange={(body) => set("body", body)}
            />
          )}
          {tab === "sequences" && (
            <RouteSequenceEditor
              sequences={sequences}
              onAdd={addSeq}
              onRemove={removeSeq}
              onUpdate={updateSeq}
            />
          )}
          {tab === "headers" && (
            <RouteHeadersEditor
              headers={draft.headers}
              onHeadersChange={(headers) => set("headers", headers)}
            />
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
