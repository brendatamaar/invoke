import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  CheckSquare,
  RefreshCw,
  Square,
  Trash2,
  Download,
  Copy,
  Check,
  HelpCircle,
} from "lucide-react";
import type { ProxyRecord } from "../../../types";
import { useStore } from "../../../store";
import {
  clearProxyRecords,
  loadProxyRecords,
  proxyRecordsToMocks,
} from "../../proxy/api";
import { formatTime } from "./mockRouteUtils";
import { MethodBadge } from "../../../components/shared/MethodBadge";

function StatusChip({ status }: { status: number }) {
  const color =
    status >= 500
      ? "text-orange-600 bg-orange-50"
      : status >= 400
        ? "text-red-600 bg-red-50"
        : status >= 300
          ? "text-amber-600 bg-amber-50"
          : "text-emerald-700 bg-emerald-50";
  return (
    <span
      className={`inline-block rounded font-mono font-semibold text-2xs px-1.5 py-px leading-none ${color}`}
    >
      {status}
    </span>
  );
}

function ProxyUrlTooltip({ url }: { url: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (btnRef.current && !btnRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const toggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left });
    }
    setOpen((v) => !v);
  };

  const copy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        className="p-0.5 text-[var(--text-3)] hover:text-[var(--accent)]"
        title="How to use proxy recording"
      >
        <HelpCircle size={11} />
      </button>
      {open &&
        createPortal(
          <div
            className="fixed z-50 w-72 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-lg p-3"
            style={{ top: pos.top, left: pos.left }}
          >
            <p className="text-2xs text-[var(--text-2)] mb-2">
              Point your HTTP client at this URL. Invoke will forward the
              request and record it here so you can import it as a mock.
            </p>
            <div className="flex items-center gap-1 bg-[var(--surface-2)] border border-[var(--border)] rounded px-2 py-1">
              <code className="flex-1 text-2xs font-mono text-[var(--text-1)] truncate">
                {url}
              </code>
              <button
                onClick={copy}
                className="p-0.5 text-[var(--text-3)] hover:text-[var(--accent)] shrink-0"
                title="Copy"
              >
                {copied ? <Check size={11} /> : <Copy size={11} />}
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

export function ProxyRecordingSection() {
  const { addToast, set } = useStore();
  const [records, setRecords] = useState<ProxyRecord[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const proxyUrl = `${window.location.origin}/api/proxy/request`;

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const recs = await loadProxyRecords();
      setRecords(recs);
    } catch (e) {
      addToast("error", String(e));
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const clearAll = async () => {
    await clearProxyRecords();
    setRecords([]);
    setSelected(new Set());
  };

  const importSelected = async () => {
    try {
      const ids = selected.size > 0 ? [...selected] : undefined;
      const result = await proxyRecordsToMocks(ids);
      set({ mockRoutes: result.routes });
      addToast(
        "success",
        `Added ${result.added} mock route${result.added !== 1 ? "s" : ""}`,
      );
      setSelected(new Set());
    } catch (e) {
      addToast("error", String(e));
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected = records.length > 0 && selected.size === records.length;
  const someSelected = selected.size > 0 && !allSelected;

  const toggleAll = () => {
    if (allSelected || someSelected) setSelected(new Set());
    else setSelected(new Set(records.map((r) => r.id)));
  };

  return (
    <div className="flex flex-col border-b border-[var(--border)]">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border)]">
        <span className="text-2xs font-semibold text-[var(--text-3)] uppercase tracking-wider flex-1">
          Proxy Recording
          {records.length > 0 && (
            <span className="ml-1.5 normal-case font-normal text-[var(--text-2)]">
              {records.length} recorded
            </span>
          )}
        </span>
        <ProxyUrlTooltip url={proxyUrl} />
        <button
          onClick={refresh}
          className={`p-0.5 text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors ${loading ? "animate-spin" : ""}`}
          title="Refresh"
        >
          <RefreshCw size={11} />
        </button>
        {records.length > 0 && (
          <>
            <button
              onClick={importSelected}
              className="btn text-2xs py-0.5 px-2 flex items-center gap-1"
              title={
                selected.size > 0
                  ? "Import selected as mocks"
                  : "Import all as mocks"
              }
            >
              <Download size={11} />
              {selected.size > 0 ? `Import (${selected.size})` : "Import all"}
            </button>
            <button
              onClick={clearAll}
              className="p-0.5 text-[var(--text-3)] hover:text-[var(--danger)]"
              title="Clear all records"
            >
              <Trash2 size={11} />
            </button>
          </>
        )}
      </div>

      {/* Empty state */}
      {records.length === 0 && (
        <p className="p-4 text-2xs text-[var(--text-3)] text-center">
          No recorded requests yet.
        </p>
      )}

      {/* Record list */}
      {records.length > 0 && (
        <>
          {/* List header with select-all */}
          <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[var(--border)] bg-[var(--surface-2)]">
            <button
              onClick={toggleAll}
              className="text-[var(--text-3)] hover:text-[var(--accent)] shrink-0"
            >
              {allSelected ? (
                <CheckSquare size={11} className="text-[var(--accent)]" />
              ) : someSelected ? (
                <CheckSquare size={11} className="text-[var(--text-3)]" />
              ) : (
                <Square size={11} />
              )}
            </button>
            <span className="text-2xs text-[var(--text-3)] w-14 shrink-0">
              Method
            </span>
            <span className="flex-1 text-2xs text-[var(--text-3)]">Path</span>
            <span className="text-2xs text-[var(--text-3)] w-10 shrink-0 text-right">
              Status
            </span>
            <span className="text-2xs text-[var(--text-3)] w-16 shrink-0 text-right">
              Time
            </span>
          </div>

          {records.map((r) => (
            <div
              key={r.id}
              onClick={() => toggleSelect(r.id)}
              className={`flex items-center gap-2 px-3 py-2 border-b border-[var(--border)] last:border-0 cursor-pointer transition-colors ${
                selected.has(r.id)
                  ? "bg-[var(--accent-subtle)]"
                  : "hover:bg-[var(--surface-2)]"
              }`}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSelect(r.id);
                }}
                className="shrink-0 text-[var(--text-3)]"
              >
                {selected.has(r.id) ? (
                  <CheckSquare size={11} className="text-[var(--accent)]" />
                ) : (
                  <Square size={11} />
                )}
              </button>
              <span className="w-14 shrink-0">
                <MethodBadge method={r.method} />
              </span>
              <span
                className="flex-1 text-2xs font-mono text-[var(--text-1)] truncate"
                title={r.path}
              >
                {r.path}
              </span>
              <span className="w-10 shrink-0 flex justify-end">
                <StatusChip status={r.status} />
              </span>
              <span className="text-2xs text-[var(--text-3)] w-16 shrink-0 text-right tabular-nums">
                {formatTime(r.createdAt)}
              </span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
