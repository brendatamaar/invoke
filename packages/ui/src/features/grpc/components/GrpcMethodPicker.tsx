import { useRef, useState, type KeyboardEvent } from "react";
import type { GrpcMethodInfo } from "@invoke/core";
import { streamBadge } from "../utils/badges";

export function GrpcMethodPicker({
  methods,
  selectedService,
  selectedMethod,
  onSelect,
}: {
  methods: GrpcMethodInfo[];
  selectedService: string;
  selectedMethod: string;
  onSelect: (service: string, method: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [cursor, setCursor] = useState(0);

  const filtered = query.trim()
    ? methods.filter(
        (m) =>
          m.method.toLowerCase().includes(query.toLowerCase()) ||
          m.service.toLowerCase().includes(query.toLowerCase()),
      )
    : methods;

  const selectedLabel =
    selectedService && selectedMethod
      ? `${selectedService} / ${selectedMethod}`
      : "Select method\u2026";

  const choose = (m: GrpcMethodInfo) => {
    onSelect(m.service, m.method);
    setOpen(false);
    setQuery("");
    setCursor(0);
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter") {
      if (filtered[cursor]) choose(filtered[cursor]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
    }
  };

  return (
    <div className="px-3 py-1.5 border-b border-[var(--border)] flex items-center gap-2 relative">
      <div className="flex-1 relative">
        {open ? (
          <input
            ref={inputRef}
            autoFocus
            className="w-full bg-[var(--surface-2)] border border-[var(--accent)] rounded px-2 py-1 text-xs outline-none"
            placeholder="Filter methods\u2026"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCursor(0);
            }}
            onKeyDown={onKey}
            onBlur={(e) => {
              if (!listRef.current?.contains(e.relatedTarget as Node)) {
                setOpen(false);
                setQuery("");
              }
            }}
          />
        ) : (
          <button
            className="w-full text-left bg-[var(--surface-2)] border border-[var(--border)] rounded px-2 py-1 text-xs text-[var(--text-1)] hover:border-[var(--accent)] truncate"
            onClick={() => setOpen(true)}
          >
            {selectedLabel}
          </button>
        )}
        {open && filtered.length > 0 && (
          <div
            ref={listRef}
            className="absolute top-full left-0 right-0 z-50 mt-0.5 bg-[var(--surface-1)] border border-[var(--border)] rounded shadow-[var(--shadow-2)] max-h-56 overflow-y-auto"
          >
            {filtered.map((m, i) => (
              <button
                key={`${m.service}/${m.method}`}
                tabIndex={-1}
                className={`w-full text-left px-3 py-1.5 text-2xs hover:bg-[var(--surface-2)] flex items-center justify-between gap-2 ${i === cursor ? "bg-[var(--surface-2)]" : ""}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(m);
                }}
                onMouseEnter={() => setCursor(i)}
              >
                <span className="truncate">
                  <span className="text-[var(--text-3)]">{m.service} / </span>
                  <span className="font-medium text-[var(--text-1)]">
                    {m.method}
                  </span>
                </span>
                {streamBadge(m)}
              </button>
            ))}
          </div>
        )}
      </div>
      {selectedService &&
        selectedMethod &&
        (() => {
          const m = methods.find(
            (x) => x.service === selectedService && x.method === selectedMethod,
          );
          return m ? streamBadge(m) : null;
        })()}
    </div>
  );
}
