import { useCallback, useEffect, useState } from "react";
import {
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Radio,
  RefreshCw,
  Square,
  Trash2,
} from "lucide-react";
import type { MockRoute } from "@invoke/core";
import type { ProxyRecord } from "../../../types";
import { useStore } from "../../../store";
import {
  clearProxyRecords,
  loadProxyRecords,
  proxyRecordsToMocks,
} from "../../proxy/api";
import { formatTime } from "./mockRouteUtils";

export function ProxyRecordingSection() {
  const { addToast, set } = useStore();
  const [records, setRecords] = useState<ProxyRecord[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const recs = await loadProxyRecords();
      setRecords(recs);
    } catch (e) {
      addToast("error", String(e));
    }
  }, [addToast]);

  useEffect(() => {
    if (expanded) refresh();
  }, [expanded, refresh]);

  const clearAll = async () => {
    await clearProxyRecords();
    setRecords([]);
    setSelected(new Set());
  };

  const importSelected = async () => {
    try {
      const ids = selected.size > 0 ? [...selected] : undefined;
      const result = await proxyRecordsToMocks(ids);
      const routes = (await (await fetch("/api/mock/routes")).json()) as {
        routes: MockRoute[];
      };
      set({ mockRoutes: result.routes });
      addToast(
        "success",
        `Added ${result.added} mock route${result.added !== 1 ? "s" : ""}`,
      );
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

  return (
    <div className="border-b border-[var(--border)]">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-2xs font-semibold text-[var(--text-3)] uppercase tracking-wider hover:bg-[var(--surface-2)]"
      >
        <span className="flex items-center gap-1.5">
          <Radio size={11} />
          Proxy Recording {records.length > 0 && `- ${records.length}`}
        </span>
        {expanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
      </button>

      {expanded && (
        <div className="flex flex-col">
          <div className="flex items-center gap-2 px-3 py-1.5 border-t border-[var(--border)] border-b">
            <span className="text-2xs text-[var(--text-3)] flex-1">
              Requests proxied through{" "}
              <code className="font-mono">/api/proxy/request</code> are recorded
              here.
            </span>
            <button
              onClick={refresh}
              className="p-0.5 text-[var(--text-3)] hover:text-[var(--text-1)]"
              title="Refresh"
            >
              <RefreshCw size={11} />
            </button>
            {records.length > 0 && (
              <>
                <button
                  onClick={importSelected}
                  className="btn text-2xs py-0.5 px-1.5"
                  title={
                    selected.size > 0
                      ? "Import selected as mocks"
                      : "Import all as mocks"
                  }
                >
                  Import {selected.size > 0 ? `(${selected.size})` : "all"}
                </button>
                <button
                  onClick={clearAll}
                  className="p-0.5 text-[var(--text-3)] hover:text-[var(--danger)]"
                  title="Clear"
                >
                  <Trash2 size={11} />
                </button>
              </>
            )}
          </div>

          {records.length === 0 && (
            <p className="p-3 text-2xs text-[var(--text-3)] text-center">
              No recorded requests. Use{" "}
              <code className="font-mono">POST /api/proxy/request</code> as your
              target base URL.
            </p>
          )}

          {records.map((r) => (
            <div
              key={r.id}
              onClick={() => toggleSelect(r.id)}
              className="flex items-center gap-2 px-3 py-1.5 border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)] cursor-pointer"
            >
              {selected.has(r.id) ? (
                <CheckSquare
                  size={11}
                  className="text-[var(--accent)] shrink-0"
                />
              ) : (
                <Square size={11} className="text-[var(--text-3)] shrink-0" />
              )}
              <span className="text-2xs font-mono font-semibold text-[var(--text-3)] w-12 shrink-0">
                {r.method}
              </span>
              <span
                className="flex-1 text-2xs font-mono text-[var(--text-1)] truncate"
                title={r.path}
              >
                {r.path}
              </span>
              <span
                className={`text-2xs font-mono shrink-0 ${r.status >= 400 ? "text-red-500" : "text-emerald-600"}`}
              >
                {r.status}
              </span>
              <span className="text-2xs text-[var(--text-3)] shrink-0">
                {formatTime(r.createdAt)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
