import { ArrowLeftRight } from "lucide-react";
import { compareResponses } from "@invoke/core";

export function GrpcMessageDiffModal({
  left,
  right,
  onClose,
}: {
  left: string;
  right: string;
  onClose: () => void;
}) {
  const fakeResponse = (body: string) => ({
    status: 200,
    statusText: "OK",
    headers: [],
    body,
    timing: {
      dnsMs: 0,
      tcpMs: 0,
      tlsMs: 0,
      ttfbMs: 0,
      transferMs: 0,
      totalMs: 0,
    },
    requestSize: 0,
    responseSize: 0,
  });
  const diff = compareResponses(fakeResponse(left), fakeResponse(right));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-[var(--surface)] border border-[var(--border)] rounded-md shadow-[var(--shadow-pop)] flex flex-col"
        style={{ width: "80vw", maxHeight: "80vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-2 border-b border-[var(--border)]">
          <ArrowLeftRight size={13} className="text-[var(--accent)]" />
          <span className="text-xs font-semibold">Diff Messages</span>
          <span className="ml-auto flex items-center gap-2 text-2xs">
            <span className="text-[var(--ok)]">+{diff.summary.additions}</span>
            <span className="text-[var(--danger)]">
              {"\u2212"}
              {diff.summary.deletions}
            </span>
            {diff.summary.changes > 0 && (
              <span className="text-yellow-600">~{diff.summary.changes}</span>
            )}
          </span>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[var(--surface-2)] text-[var(--text-3)] ml-2"
          >
            {"\u2715"}
          </button>
        </div>
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 border-r border-[var(--border)] overflow-auto">
            <div className="px-3 py-1 text-2xs text-[var(--text-3)] border-b border-[var(--border)]">
              Left (baseline)
            </div>
            <pre className="p-2 text-2xs font-mono whitespace-pre-wrap break-all text-[var(--text-1)]">
              {diff.leftText}
            </pre>
          </div>
          <div className="flex-1 overflow-auto">
            <div className="px-3 py-1 text-2xs text-[var(--text-3)] border-b border-[var(--border)]">
              Right (comparison)
            </div>
            <pre className="p-2 text-2xs font-mono whitespace-pre-wrap break-all text-[var(--text-1)]">
              {diff.rightText}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
