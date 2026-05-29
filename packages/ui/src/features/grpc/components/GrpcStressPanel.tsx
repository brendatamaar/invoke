import { useCallback, useRef, useState } from "react";
import { Gauge } from "lucide-react";
import { useStore } from "../../../store";
import { grpcStreamSend } from "../api";
import { percentile } from "../utils/format";

interface StressStats {
  sent: number;
  received: number;
  lost: number;
  rtts: number[];
  running: boolean;
}

export function GrpcStressPanel({ streamId }: { streamId: string }) {
  const { grpcRequest } = useStore();
  const [rate, setRate] = useState(5);
  const [duration, setDuration] = useState(10);
  const [stats, setStats] = useState<StressStats | null>(null);
  const stopRef = useRef(false);

  const run = useCallback(async () => {
    if (!streamId) return;
    stopRef.current = false;
    const body = grpcRequest.body ?? "{}";
    const intervalMs = 1000 / rate;
    const endAt = Date.now() + duration * 1000;
    let sent = 0;
    let received = 0;
    const rtts: number[] = [];
    setStats({ sent: 0, received: 0, lost: 0, rtts: [], running: true });

    // Rate-controlled stress test — sequential sends are intentional
    // eslint-disable-next-line react-doctor/async-await-in-loop
    while (Date.now() < endAt && !stopRef.current) {
      const t0 = Date.now();
      // eslint-disable-next-line react-doctor/async-await-in-loop
      const res = await grpcStreamSend(streamId, body).catch(() => ({
        error: "send failed",
      }));
      if (!res.error) {
        sent++;
        const nowReceived = useStore
          .getState()
          .grpcStreamReceivedMessages.filter((m) => !m.done).length;
        if (nowReceived > received) {
          rtts.push(Date.now() - t0);
          received = nowReceived;
        }
      }
      setStats({
        sent,
        received,
        lost: sent - received,
        rtts: [...rtts],
        running: true,
      });
      const elapsed = Date.now() - t0;
      if (elapsed < intervalMs) {
        await new Promise((r) => setTimeout(r, intervalMs - elapsed));
      }
    }

    const sorted = rtts.toSorted((a, b) => a - b);
    setStats({
      sent,
      received,
      lost: sent - received,
      rtts: sorted,
      running: false,
    });
  }, [streamId, rate, duration, grpcRequest.body]);

  const stop = () => {
    stopRef.current = true;
  };

  return (
    <div className="p-3 flex flex-col gap-3">
      <p className="text-2xs text-[var(--text-3)]">
        Send messages at a fixed rate on the open stream and measure throughput.
      </p>
      <div className="flex items-center gap-3">
        <label htmlFor="stress-rate" className="text-xs text-[var(--text-2)] w-24 shrink-0">Rate (msg/s)</label>
        <input
          id="stress-rate"
          type="number"
          min={1}
          max={100}
          className="input text-xs py-1 w-20"
          value={rate}
          aria-label="Rate in messages per second"
          onChange={(e) => setRate(Math.max(1, Number(e.target.value)))}
        />
      </div>
      <div className="flex items-center gap-3">
        <label htmlFor="stress-duration" className="text-xs text-[var(--text-2)] w-24 shrink-0">Duration (s)</label>
        <input
          id="stress-duration"
          type="number"
          min={1}
          max={300}
          className="input text-xs py-1 w-20"
          value={duration}
          aria-label="Duration in seconds"
          onChange={(e) => setDuration(Math.max(1, Number(e.target.value)))}
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          className="btn btn-primary text-xs flex items-center gap-1"
          onClick={run}
          disabled={!streamId || (stats?.running ?? false)}
        >
          <Gauge size={12} /> Start
        </button>
        {stats?.running && (
          <button type="button" className="btn btn-danger text-xs" onClick={stop}>
            Stop
          </button>
        )}
      </div>
      {stats && (
        <div className="bg-[var(--surface-2)] rounded p-2 flex flex-col gap-1 text-2xs font-mono">
          <div className="flex gap-4">
            <span>
              Sent: <b>{stats.sent}</b>
            </span>
            <span>
              Received: <b>{stats.received}</b>
            </span>
            <span className={stats.lost > 0 ? "text-[var(--danger)]" : ""}>
              Lost: <b>{stats.lost}</b>
            </span>
          </div>
          {stats.rtts.length > 0 && (
            <div className="flex gap-4 text-[var(--text-2)]">
              <span>p50: {percentile(stats.rtts, 50)}ms</span>
              <span>p95: {percentile(stats.rtts, 95)}ms</span>
              <span>p99: {percentile(stats.rtts, 99)}ms</span>
            </div>
          )}
          {stats.running && (
            <span className="flex items-center gap-1 text-[var(--accent)]">
              <span className="inline-block size-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
              running…
            </span>
          )}
        </div>
      )}
    </div>
  );
}
