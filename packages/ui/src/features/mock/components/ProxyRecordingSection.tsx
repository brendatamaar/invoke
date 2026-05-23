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
import { useStore, coreStore } from "../../../store";
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
        ? "text-[var(--danger)] bg-[var(--danger-bg)]"
        : status >= 300
          ? "text-[var(--warn)] bg-[var(--warn-bg)]"
          : "text-[var(--ok)] bg-[var(--ok-bg)]";
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
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number }>({ left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        !btnRef.current?.contains(target) &&
        !panelRef.current?.contains(target)
      )
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const toggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - r.bottom;
      if (spaceBelow < 300) {
        setPos({ bottom: window.innerHeight - r.top + 4, left: r.left });
      } else {
        setPos({ top: r.bottom + 4, left: r.left });
      }
    }
    setOpen((v) => !v);
  };

  const copy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const exampleBody = JSON.stringify(
    { targetUrl: "https://api.example.com/users", method: "GET", headers: [], body: "" },
    null,
    2,
  );

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
            ref={panelRef}
            className="fixed z-50 w-80 bg-[var(--surface)] border border-[var(--border)] rounded-md shadow-[var(--shadow-2)] p-3 flex flex-col gap-3"
            style={{ top: pos.top, bottom: pos.bottom, left: pos.left }}
          >
            <div>
              <p className="text-2xs font-semibold text-[var(--text-1)] mb-1">How proxy recording works</p>
              <p className="text-2xs text-[var(--text-3)] leading-relaxed">
                Send a <code className="font-mono">POST</code> to this endpoint with your real API URL in <code className="font-mono">targetUrl</code>. Invoke forwards the request, records the exchange, and returns the real response. You can then import recordings as mock routes.
              </p>
            </div>

            <div>
              <p className="text-2xs font-semibold text-[var(--text-1)] mb-1">Endpoint</p>
              <div className="flex items-center gap-1 bg-[var(--surface-2)] border border-[var(--border)] rounded px-2 py-1">
                <code className="flex-1 text-2xs font-mono text-[var(--text-1)] truncate">{url}</code>
                <button
                  onClick={copy}
                  className="p-0.5 text-[var(--text-3)] hover:text-[var(--accent)] shrink-0"
                  title="Copy URL"
                >
                  {copied ? <Check size={11} /> : <Copy size={11} />}
                </button>
              </div>
            </div>

            <div>
              <p className="text-2xs font-semibold text-[var(--text-1)] mb-1">Example body</p>
              <pre className="text-2xs font-mono text-[var(--text-2)] bg-[var(--surface-2)] border border-[var(--border)] rounded px-2 py-1.5 leading-relaxed">
                {exampleBody}
              </pre>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

export function ProxyRecordingSection() {
  const { addToast, proxyRecordsTick } = useStore();
  const [records, setRecords] = useState<ProxyRecord[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  const proxyUrl = `${window.location.protocol}//${window.location.hostname}:4000/api/proxy/request`;

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

  useEffect(() => {
    if (proxyRecordsTick > 0) refresh();
  }, [proxyRecordsTick, refresh]);

  const clearAll = async () => {
    try {
      await clearProxyRecords();
      setRecords([]);
      setSelected(new Set());
    } catch (e) {
      addToast("error", String(e));
    }
  };

  const importSelected = async () => {
    setImporting(true);
    try {
      const ids = selected.size > 0 ? [...selected] : undefined;
      const count = ids ? ids.length : records.length;
      const result = await proxyRecordsToMocks(ids);
      coreStore.setMeta("mockRoutes", result.routes).catch(() => {});

      const skipped = count - result.added;
      if (result.added === 0) {
        addToast("success", "No new routes added — all already exist as mocks");
      } else if (skipped > 0) {
        addToast("success", `Added ${result.added} mock route${result.added !== 1 ? "s" : ""} (${skipped} already existed)`);
      } else {
        addToast("success", `Added ${result.added} mock route${result.added !== 1 ? "s" : ""}`);
      }

      const selectedRecords = ids ? records.filter((r) => ids.includes(r.id)) : records;
      const withQuery = selectedRecords.filter((r) => r.path.includes("?"));
      if (withQuery.length > 0) {
        addToast("success", `Note: query params stripped from ${withQuery.length} route path${withQuery.length !== 1 ? "s" : ""}`);
      }

      setSelected(new Set());
    } catch (e) {
      addToast("error", String(e));
    } finally {
      setImporting(false);
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
          Proxy Recording {records.length > 0 && `- ${records.length}`}
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
              disabled={importing}
              className={`p-0.5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${importing ? "text-[var(--accent)]" : "text-[var(--text-3)] hover:text-[var(--accent)]"}`}
              title={importing ? "Importing..." : selected.size > 0 ? `Import ${selected.size} selected` : "Import all as mocks"}
            >
              <Download size={11} />
            </button>
            <button
              onClick={clearAll}
              disabled={importing}
              className="p-0.5 text-[var(--text-3)] hover:text-[var(--danger)] disabled:opacity-40 disabled:cursor-not-allowed"
              title="Clear all records"
            >
              <Trash2 size={11} />
            </button>
          </>
        )}
      </div>

      {/* Empty state */}
      {records.length === 0 && (
        <p className="p-4 text-xs text-[var(--text-3)] text-center">
          No recorded requests yet.
        </p>
      )}

      {/* Record list */}
      {records.length > 0 && (
        <>
          {/* Select-all strip */}
          <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[var(--border)]">
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
            <span className="text-2xs text-[var(--text-3)]">
              {someSelected || allSelected
                ? `${selected.size} selected`
                : "Select all"}
            </span>
          </div>

          {records.map((r) => (
            <div
              key={r.id}
              onClick={() => toggleSelect(r.id)}
              className={`flex items-center gap-2.5 px-3 py-2 border-b border-[var(--border)] last:border-0 cursor-pointer transition-colors ${selected.has(r.id)
                ? "bg-[var(--accent-subtle)]"
                : "hover:bg-[var(--surface-2)]"
                }`}
            >
              <button
                onClick={(e) => { e.stopPropagation(); toggleSelect(r.id); }}
                className="shrink-0 text-[var(--text-3)]"
              >
                {selected.has(r.id) ? (
                  <CheckSquare size={11} className="text-[var(--accent)]" />
                ) : (
                  <Square size={11} />
                )}
              </button>
              <MethodBadge method={r.method} />
              <span
                className="flex-1 text-2xs font-mono text-[var(--text-1)] truncate"
                title={r.path}
              >
                {r.path}
              </span>
              <StatusChip status={r.status} />
              <span className="text-2xs text-[var(--text-3)] tabular-nums shrink-0">
                {formatTime(r.createdAt)}
              </span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
