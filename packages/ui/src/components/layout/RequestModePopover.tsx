import { useState } from "react";
import { ChevronDown, Globe, Server } from "lucide-react";
import { useStore } from "../../store";

export function RequestModePopover() {
  const { browserMode, streamMode, set, request } = useStore();
  const [open, setOpen] = useState(false);

  if (request.protocol === "grpc" || request.protocol === "websocket") return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={streamMode}
        title="Request mode"
        className={`flex items-center gap-1 px-1.5 py-1 rounded-[var(--r-2)] bg-transparent border-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:text-[var(--fg-0)] ${browserMode ? "text-[var(--accent)]" : "text-[var(--fg-2)]"}`}
      >
        {browserMode ? <Globe size={13} /> : <Server size={13} />}
        <span className="text-2xs">{browserMode ? "Client" : "Server"}</span>
        <ChevronDown size={10} className="opacity-50" />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-50 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--r-2)] shadow-[var(--shadow-2)] py-1"
          style={{ minWidth: 230 }}
        >
          <p className="px-3 py-1.5 text-2xs font-semibold text-[var(--text-3)] uppercase tracking-wide border-b border-[var(--border)]">
            Request mode
          </p>
          <ModeOption
            active={!browserMode}
            icon={<Server size={13} />}
            label="Via server"
            description="Routes through invoke's executor. Full timing breakdown with no CORS, but some APIs may block invoke's server IP."
            onClick={() => { set({ browserMode: false }); setOpen(false); }}
          />
          <ModeOption
            active={browserMode}
            icon={<Globe size={13} />}
            label="Via client"
            description="Sent directly from your browser. Bypasses invoke's IP blocks, but requires CORS and only captures partial timing."
            onClick={() => { set({ browserMode: true }); setOpen(false); }}
          />
        </div>
      )}
    </div>
  );
}

function ModeOption({
  active,
  icon,
  label,
  description,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left hover:bg-[var(--surface-2)] transition-colors"
    >
      <span className={`mt-0.5 shrink-0 ${active ? "text-[var(--accent)]" : "text-[var(--text-3)]"}`}>
        {icon}
      </span>
      <span className="flex flex-col gap-0.5 flex-1">
        <span className={`text-2xs font-medium ${active ? "text-[var(--text-1)]" : "text-[var(--text-2)]"}`}>
          {label}
          {active && <span className="ml-1.5 text-[var(--accent)]">·</span>}
          {active && <span className="ml-0.5 text-2xs font-normal text-[var(--accent)]">active</span>}
        </span>
        <span className="text-2xs text-[var(--text-3)] leading-relaxed">{description}</span>
      </span>
    </button>
  );
}
