import { Copy } from "lucide-react";

export function WebhookUrlStrip({
  url,
  copied,
  onCopy,
}: {
  url: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div
      className="flex items-center gap-2 px-4 py-2 shrink-0"
      style={{ background: "var(--bg-0)", borderBottom: "1px solid var(--line-1)" }}
    >
      <span
        className="font-mono shrink-0"
        style={{
          fontSize: "var(--t-xs)",
          color: "var(--method-post)",
          fontWeight: 600,
        }}
      >
        POST
      </span>
      <span
        className="flex-1 font-mono truncate"
        style={{ fontSize: "var(--t-xs)", color: "var(--fg-2)" }}
      >
        {url}
      </span>
      <button
        type="button"
        onClick={onCopy}
        className="shrink-0 flex items-center gap-1"
        style={{
          color: "var(--fg-3)",
          fontSize: "var(--t-xs)",
          transition: "color var(--dur-fast)",
        }}
        onMouseEnter={(event) => (event.currentTarget.style.color = "var(--accent)")}
        onMouseLeave={(event) => (event.currentTarget.style.color = "var(--fg-3)")}
      >
        {copied ? (
          <span style={{ color: "var(--ok)", fontSize: "var(--t-xs)" }}>copied</span>
        ) : (
          <Copy size={11} />
        )}
      </button>
    </div>
  );
}
