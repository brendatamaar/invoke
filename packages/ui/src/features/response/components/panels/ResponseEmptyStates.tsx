import { Code2 } from "lucide-react";

export function EmptyResponseState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-8">
      <div className="size-10 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center mb-2">
        <Code2 size={18} className="text-[var(--text-3)]" />
      </div>
      <p className="text-sm text-[var(--text-2)] font-medium">Send a request to see the response</p>
      <p className="text-xs text-[var(--text-3)]">
        Press{" "}
        <kbd className="px-1.5 py-0.5 rounded bg-[var(--surface-2)] border border-[var(--border)] font-mono text-2xs">
          Ctrl+Enter
        </kbd>{" "}
        to send
      </p>
    </div>
  );
}

export function FailedResponseState({ error }: { error?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-8">
      <div className="size-10 rounded bg-[var(--danger-bg)] border border-[var(--danger)] flex items-center justify-center mb-2">
        <Code2 size={18} className="text-[var(--danger)]" />
      </div>
      <p className="text-sm text-[var(--text-2)] font-medium">Request failed</p>
      {error && (
        <p className="text-xs text-[var(--danger)] font-mono max-w-md break-all">{error}</p>
      )}
    </div>
  );
}
