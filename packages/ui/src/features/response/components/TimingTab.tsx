import type { Timing, TimingAttempt, TimingPhaseName } from "@invoke/core";
import { StatusBadge } from "../../../components/shared/StatusBadge";
import { useStore } from "../../../store";
import type { PhaseBar } from "../../../types";
import { fmtMs } from "../responseFormatting";

const PHASE_DEFS: { name: TimingPhaseName; label: string; color: string }[] = [
  { name: "dns", label: "DNS", color: "#5bc0be" },
  { name: "tcp", label: "TCP", color: "#7bd88f" },
  { name: "tls", label: "TLS", color: "#ffd166" },
  { name: "ttfb", label: "TTFB", color: "#b388ff" },
  { name: "transfer", label: "Transfer", color: "#ff8f70" },
];

function syntheticPhases(timing: Timing) {
  const phases = new Map<TimingPhaseName, { startMs: number; durationMs: number }>();
  let cursor = 0;
  for (const { name } of PHASE_DEFS) {
    const key = `${name}Ms` as keyof Timing;
    const durationMs = Math.max(0, timing[key] ?? 0);
    phases.set(name, { startMs: cursor, durationMs });
    cursor += durationMs;
  }
  return phases;
}

function buildAttemptBars(attempt: TimingAttempt): PhaseBar[] {
  const byName = new Map((attempt.phases ?? []).map((p) => [p.name, p]));
  const synthetic = syntheticPhases(attempt.timing);
  const total = Math.max(attempt.timing?.totalMs ?? 0, 1);
  const clamp = (v: number) => Math.min(100, Math.max(0, Number.isFinite(v) ? v : 0));

  let cursor = 0;
  return PHASE_DEFS.map(({ name, label, color }) => {
    const durationMs = byName.get(name)?.durationMs ?? synthetic.get(name)?.durationMs ?? 0;
    const startMs = cursor;
    cursor += durationMs;
    return {
      name,
      label,
      color,
      startMs,
      durationMs,
      leftPct: clamp((startMs / total) * 100),
      widthPct: clamp((durationMs / total) * 100),
    };
  });
}

export function TimingTab() {
  const { response, responseBrowserMode } = useStore();
  if (!response?.timing) return <p className="p-4 text-xs text-[var(--text-3)]">No timing data</p>;

  const attempts: TimingAttempt[] = response.attempts?.length
    ? response.attempts
    : [
        {
          url: "",
          status: response.status,
          headers: response.headers,
          timing: response.timing,
          phases: [],
          redirect: false,
        },
      ];

  const timing = response.timing;
  const timingRows = [
    { key: "dns", label: "DNS", value: timing.dnsMs },
    { key: "tcp", label: "TCP", value: timing.tcpMs },
    { key: "tls", label: "TLS", value: timing.tlsMs },
    { key: "ttfb", label: "TTFB", value: timing.ttfbMs },
    { key: "transfer", label: "Transfer", value: timing.transferMs },
    { key: "total", label: "Total", value: timing.totalMs },
  ];

  return (
    <div className="p-4 flex flex-col gap-4">
      {responseBrowserMode && (
        <p className="text-2xs text-[var(--text-3)] px-2 py-1.5 rounded border border-[var(--border)] bg-[var(--surface-2)]">
          Client mode — DNS, TCP, and TLS phases are not available. Only TTFB and transfer are
          measured.
        </p>
      )}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[var(--text-1)]">Timing waterfall</span>
        <span className="text-xs text-[var(--text-3)]">
          {attempts.length > 1 ? `${attempts.length} hops` : "Single request"}
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {attempts.map((attempt, idx) => {
          const bars = buildAttemptBars(attempt);
          const total = Math.max(attempt.timing?.totalMs ?? 0, 1);
          const label = attempt.redirect
            ? `Redirect ${idx + 1}`
            : attempts.length > 1
              ? "Final"
              : "Request";
          return (
            <div
              key={`${attempt.url || "req"}-${attempt.status ?? 0}-${attempt.redirect ? "r" : "f"}`}
              className="flex flex-col gap-2.5 p-3 rounded border border-[var(--border)] bg-[var(--surface-2)]"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-semibold text-[var(--text-1)] shrink-0">{label}</span>
                {attempt.status && <StatusBadge status={attempt.status} />}
                {attempt.url && (
                  <span className="text-2xs font-mono text-[var(--text-3)] truncate min-w-0">
                    {attempt.url}
                  </span>
                )}
              </div>

              <div
                className="relative h-13 bg-[var(--surface)] rounded border border-[var(--border)]"
                style={{ height: 52 }}
              >
                <span className="absolute left-2 top-1 text-2xs text-[var(--text-3)] z-10 leading-none">
                  0
                </span>
                <span className="absolute right-2 top-1 text-2xs text-[var(--text-3)] z-10 leading-none">
                  {fmtMs(total)}
                </span>
                {bars.map((bar) =>
                  bar.durationMs === 0 ? null : (
                    <div
                      key={bar.name}
                      className="absolute flex items-center overflow-hidden rounded-sm"
                      style={{
                        left: `${bar.leftPct}%`,
                        width: `${Math.max(bar.widthPct, 0.5)}%`,
                        top: 22,
                        bottom: 6,
                        backgroundColor: bar.color,
                      }}
                      title={`${bar.label}: ${fmtMs(bar.durationMs)} (starts ${fmtMs(bar.startMs)})`}
                    >
                      {bar.widthPct >= 10 && (
                        <span
                          className="text-2xs font-bold px-1.5 truncate"
                          style={{ color: "#061214" }}
                        >
                          {bar.label} {fmtMs(bar.durationMs)}
                        </span>
                      )}
                    </div>
                  ),
                )}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {bars.map((bar) => (
                  <span
                    key={bar.name}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-[var(--border)] bg-[var(--surface)] text-2xs text-[var(--text-1)]"
                    title={`${bar.label}: ${fmtMs(bar.durationMs)} (starts ${fmtMs(bar.startMs)})`}
                  >
                    <span
                      className="size-2 rounded-sm shrink-0"
                      style={{ backgroundColor: bar.color }}
                    />
                    {bar.label}
                    <strong className="text-[var(--text-3)]">{fmtMs(bar.durationMs)}</strong>
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))" }}
      >
        {timingRows.map((row) => (
          <div
            key={row.key}
            className="flex flex-col gap-0.5 p-2.5 rounded border border-[var(--border)] bg-[var(--surface-2)]"
          >
            <span className="text-2xs text-[var(--text-3)]">{row.label}</span>
            <span className="text-xs text-[var(--text-1)]">{fmtMs(row.value ?? 0)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
