import { useEffect, useState } from "react";
import { useStore } from "../../../store";

export function GrpcDeadlineCountdown() {
  const { grpcDeadlineEnd } = useStore();
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!grpcDeadlineEnd) {
      setRemaining(null);
      return;
    }

    const tick = () => {
      const ms = grpcDeadlineEnd - Date.now();
      setRemaining(ms > 0 ? ms : 0);
    };

    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [grpcDeadlineEnd]);

  if (remaining === null) return null;

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
