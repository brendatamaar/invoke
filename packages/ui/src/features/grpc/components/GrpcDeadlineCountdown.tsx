import { useEffect, useRef, useState } from "react";
import { useStore } from "../../../store";

export function GrpcDeadlineCountdown() {
  const { grpcDeadlineEnd } = useStore();
  const [, rerender] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    if (!grpcDeadlineEnd) {
      clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => rerender((t) => t + 1), 250);
    return () => clearInterval(intervalRef.current);
  }, [grpcDeadlineEnd]);

  if (!grpcDeadlineEnd) return null;

  const ms = grpcDeadlineEnd - Date.now();
  const remaining = ms > 0 ? ms : 0;

  const secs = (remaining / 1000).toFixed(1);
  const urgent = remaining < 5000;
  return (
    <span
      className={`font-mono text-2xs shrink-0 ${urgent ? "text-[var(--danger)] animate-pulse" : "text-[var(--text-3)]"}`}
    >
      {"\u23f1"} {secs}s
    </span>
  );
}
