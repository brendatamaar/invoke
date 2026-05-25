export function GrpcStatusBar({ status }: { status: string }) {
  return (
    <div className="px-3 py-1 text-2xs text-[var(--text-3)] border-b border-[var(--border)] bg-[var(--surface-2)]">
      {status}
    </div>
  );
}
