export function RouteResponseEditor({
  status,
  latencyMs,
  body,
  sequenceCount,
  onStatusChange,
  onLatencyChange,
  onBodyChange,
}: {
  status: number;
  latencyMs: number | undefined;
  body: string;
  sequenceCount: number;
  onStatusChange: (status: number) => void;
  onLatencyChange: (latencyMs: number | undefined) => void;
  onBodyChange: (body: string) => void;
}) {
  return (
    <>
      <div className="flex gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="route-status-code" className="text-xs font-medium text-[var(--text-2)]">Status code</label>
          <input
            id="route-status-code"
            type="number"
            className="input text-sm py-1.5 w-28"
            min={100}
            max={599}
            value={status}
            onChange={(event) => onStatusChange(Number(event.target.value))}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="route-latency" className="text-xs font-medium text-[var(--text-2)]">Latency</label>
          <div className="flex items-center gap-2">
            <input
              id="route-latency"
              type="number"
              className="input text-sm py-1.5 w-28"
              min={0}
              placeholder="0"
              value={latencyMs ?? ""}
              onChange={(event) =>
                onLatencyChange(event.target.value ? Number(event.target.value) : undefined)
              }
            />
            <span className="text-sm text-[var(--text-3)]">ms</span>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="route-response-body" className="text-xs font-medium text-[var(--text-2)]">Response body</label>
        <textarea
          id="route-response-body"
          className="input text-sm py-2 font-mono resize-none"
          rows={8}
          placeholder='{"message": "ok"}'
          value={body}
          onChange={(event) => onBodyChange(event.target.value)}
        />
      </div>
      {sequenceCount > 0 && (
        <p className="text-2xs text-[var(--warn)] bg-[var(--warn-bg)] px-3 py-2 rounded">
          Sequences are active - this default response is overridden. Switch to Sequences tab to
          manage.
        </p>
      )}
    </>
  );
}
