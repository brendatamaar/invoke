import { useState } from "react";
import { Download, RefreshCw, Trash2 } from "lucide-react";
import { useStore } from "../../../store";
import {
  useClearProxyRecords,
  useImportProxyToMocks,
  useProxyRecords,
} from "../../proxy/useProxyRecords";
import { ProxyRecordingList } from "./proxy-recording/ProxyRecordingList";
import { ProxyUrlTooltip } from "./proxy-recording/ProxyUrlTooltip";

export function ProxyRecordingSection() {
  const { addToast } = useStore();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);

  const proxyUrl = `${window.location.protocol}//${window.location.hostname}:4000/api/proxy/request`;
  const { data: records = [], isFetching, refetch } = useProxyRecords();
  const clearMutation = useClearProxyRecords();
  const importMutation = useImportProxyToMocks();

  const clearAll = () => {
    clearMutation.mutate(undefined, {
      onError: (error) => addToast("error", String(error)),
    });
    setSelected(new Set());
  };

  const importSelected = async () => {
    setImporting(true);
    const ids = selected.size > 0 ? [...selected] : undefined;
    const count = ids ? ids.length : records.length;
    importMutation.mutate(ids, {
      onSuccess: (result) => {
        const skipped = count - result.added;
        if (result.added === 0) {
          addToast("success", "No new routes added - all already exist as mocks");
        } else if (skipped > 0) {
          addToast(
            "success",
            `Added ${result.added} mock route${result.added !== 1 ? "s" : ""} (${skipped} already existed)`,
          );
        } else {
          addToast("success", `Added ${result.added} mock route${result.added !== 1 ? "s" : ""}`);
        }
        const selectedRecords = ids ? records.filter((record) => ids.includes(record.id)) : records;
        const withQuery = selectedRecords.filter((record) => record.path.includes("?"));
        if (withQuery.length > 0) {
          addToast(
            "success",
            `Note: query params stripped from ${withQuery.length} route path${withQuery.length !== 1 ? "s" : ""}`,
          );
        }
        setSelected(new Set());
      },
      onError: (error) => addToast("error", String(error)),
      onSettled: () => setImporting(false),
    });
  };

  const toggleSelect = (id: string) => {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected = records.length > 0 && selected.size === records.length;
  const someSelected = selected.size > 0 && !allSelected;

  const toggleAll = () => {
    if (allSelected || someSelected) setSelected(new Set());
    else setSelected(new Set(records.map((record) => record.id)));
  };

  return (
    <div className="flex flex-col border-b border-[var(--border)]">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border)]">
        <span className="text-2xs font-semibold text-[var(--text-3)] uppercase tracking-wider flex-1">
          Proxy Recording {records.length > 0 && `- ${records.length}`}
        </span>
        <ProxyUrlTooltip url={proxyUrl} />
        <button
          type="button"
          onClick={() => refetch()}
          className={`p-0.5 text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors ${isFetching ? "animate-spin" : ""}`}
          title="Refresh"
        >
          <RefreshCw size={11} />
        </button>
        {records.length > 0 && (
          <>
            <button
              type="button"
              onClick={importSelected}
              disabled={importing}
              className={`p-0.5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${importing ? "text-[var(--accent)]" : "text-[var(--text-3)] hover:text-[var(--accent)]"}`}
              title={
                importing
                  ? "Importing..."
                  : selected.size > 0
                    ? `Import ${selected.size} selected`
                    : "Import all as mocks"
              }
            >
              <Download size={11} />
            </button>
            <button
              type="button"
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

      <ProxyRecordingList
        records={records}
        selected={selected}
        allSelected={allSelected}
        someSelected={someSelected}
        onToggleAll={toggleAll}
        onToggleSelect={toggleSelect}
      />
    </div>
  );
}
