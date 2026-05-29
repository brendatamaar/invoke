import { X } from "lucide-react";

export function WebhookModalHeader({ label, onClose }: { label: string; onClose: () => void }) {
  return (
    <div
      className="flex items-center justify-between px-4 py-2.5 shrink-0"
      style={{ background: "var(--bg-1)", borderBottom: "1px solid var(--line-1)" }}
    >
      <span
        style={{
          fontSize: "var(--t-base)",
          fontWeight: 600,
          color: "var(--fg-0)",
        }}
      >
        {label}
      </span>
      <button
        type="button"
        onClick={onClose}
        className="p-0.5 rounded"
        style={{ color: "var(--fg-3)", transition: "color var(--dur-fast)" }}
        onMouseEnter={(event) => (event.currentTarget.style.color = "var(--fg-0)")}
        onMouseLeave={(event) => (event.currentTarget.style.color = "var(--fg-3)")}
      >
        <X size={13} />
      </button>
    </div>
  );
}
