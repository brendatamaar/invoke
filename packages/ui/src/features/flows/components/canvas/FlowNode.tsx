import type { MouseEvent } from "react";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import type { FlowResult, FlowStep } from "@invoke/core";
import { STEP_COLORS } from "../../flowStepUtils";
import { NODE_H, NODE_W } from "../../utils/layout";

export function FlowNode({
  step,
  index,
  position,
  selected,
  stepResult,
  onMouseDown,
  onSelect,
}: {
  step: FlowStep;
  index: number;
  position: { x: number; y: number };
  selected: boolean;
  stepResult?: FlowResult["steps"][number];
  onMouseDown: (event: MouseEvent, id: string) => void;
  onSelect: (index: number) => void;
}) {
  const statusColor = stepResult
    ? stepResult.status === "passed"
      ? "border-[var(--ok)]"
      : "border-[var(--danger)]"
    : selected
      ? "border-[var(--accent)]"
      : "border-[var(--border)]";
  return (
    <button
      type="button"
      style={{
        position: "absolute",
        left: position.x,
        top: position.y,
        width: NODE_W,
        height: NODE_H,
        cursor: "grab",
        userSelect: "none",
      }}
      className={`bg-[var(--surface)] rounded-md border-2 shadow-sm flex flex-col px-3 py-2 gap-0.5 text-left ${statusColor} ${selected ? "shadow-md" : ""}`}
      onMouseDown={(event) => onMouseDown(event, step.id)}
      onClick={() => onSelect(index)}
    >
      <div className="flex items-center gap-1.5">
        <div className={`w-2 h-2 rounded-full shrink-0 ${STEP_COLORS[step.type]}`} />
        <span className="text-2xs text-[var(--text-3)] uppercase tracking-wide">{step.type}</span>
        {stepResult &&
          (stepResult.status === "passed" ? (
            <CheckCircle2 size={10} className="ml-auto text-[var(--ok)]" />
          ) : (
            <XCircle size={10} className="ml-auto text-[var(--danger)]" />
          ))}
      </div>
      <div className="text-xs font-medium text-[var(--text-1)] truncate">{step.name}</div>
      {step.type === "request" && (
        <div className="text-2xs text-[var(--text-3)] truncate">
          {step.request.method} {step.request.url || "-"}
        </div>
      )}
      {step.type === "delay" && (
        <div className="text-2xs text-[var(--text-3)]">{step.delayMs}ms</div>
      )}
      {stepResult?.response?.status != null && (
        <div className="flex items-center gap-1 text-2xs text-[var(--text-3)]">
          <Clock size={9} />
          {stepResult.completedAt - stepResult.startedAt}ms -{" "}
          {stepResult.response.status === 0 ? "ERR" : stepResult.response.status}
        </div>
      )}
    </button>
  );
}
