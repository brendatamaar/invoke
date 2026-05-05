import { ChevronDown, Zap, RefreshCw } from "lucide-react";
import { useStore } from "../../store";
import type { HttpMethod } from "@invoke/core";

const METHODS: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];

const METHOD_COLORS: Record<string, string> = {
  GET:     "text-emerald-700",
  POST:    "text-blue-700",
  PUT:     "text-amber-700",
  PATCH:   "text-violet-700",
  DELETE:  "text-red-700",
  HEAD:    "text-zinc-600",
  OPTIONS: "text-zinc-600"
};

interface Props {
  onSend: () => void;
  loading: boolean;
}

export function URLBar({ onSend, loading }: Props) {
  const { request, setRequest, streamMode, set } = useStore();
  const color = METHOD_COLORS[request.method] ?? "text-zinc-600";

  return (
    <div className="flex items-center gap-2 px-3 py-2">
      {/* Method selector */}
      <div className="relative">
        <select
          value={request.method}
          onChange={(e) => setRequest({ method: e.target.value as HttpMethod })}
          className={`appearance-none bg-none bg-[var(--surface-2)] border border-[var(--border)] rounded px-2 py-1.5 pr-6 text-xs font-semibold font-mono cursor-pointer outline-none focus:border-[var(--accent)] ${color}`}
        >
          {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <ChevronDown size={11} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[var(--text-3)] pointer-events-none" />
      </div>

      {/* URL input */}
      <input
        type="text"
        value={request.url}
        onChange={(e) => setRequest({ url: e.target.value })}
        onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) onSend(); }}
        placeholder="https://api.example.com/endpoint"
        className="flex-1 bg-[var(--surface-2)] border border-[var(--border)] rounded px-3 py-1.5 text-xs font-mono text-[var(--text-1)] placeholder-[var(--text-3)] outline-none focus:border-[var(--accent)] focus:bg-white transition-colors"
        spellCheck={false}
      />

      {/* Stream toggle */}
      <button
        onClick={() => set({ streamMode: !streamMode })}
        title="Stream mode"
        className={`p-1.5 rounded border text-xs transition-colors ${streamMode ? "border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)]" : "border-[var(--border)] text-[var(--text-3)] hover:text-[var(--text-2)]"}`}
      >
        <Zap size={13} />
      </button>

      {/* Send button */}
      <button
        onClick={onSend}
        disabled={loading || !request.url.trim()}
        className="btn btn-primary px-4 gap-1.5 text-xs"
      >
        {loading ? <RefreshCw size={13} className="animate-spin" /> : null}
        {loading ? "Sending…" : "Send"}
      </button>
    </div>
  );
}
