import { useRef, useState, type KeyboardEvent } from "react";
import { ChevronDown } from "lucide-react";
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
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = query.trim()
    ? methods.filter(
        (m) =>
          m.method.toLowerCase().includes(query.toLowerCase()) ||
          m.service.toLowerCase().includes(query.toLowerCase()),
      )
    : methods;

  const selectedLabel =
    selectedService && selectedMethod ? `${selectedService} / ${selectedMethod}` : null;

  const selectedInfo = methods.find(
    (x) => x.service === selectedService && x.method === selectedMethod,
  );

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
    <div className="px-3 py-1.5 border-b border-[var(--border)] flex items-center gap-2">
      <div className="flex-1 relative">
        {open ? (
          <input
            ref={inputRef}
            autoFocus
            className="w-full px-2 py-1 pr-6 text-xs outline-none"
            style={{
              fontFamily: "var(--font-mono)",
              background: "var(--bg-2)",
              border: "1px solid var(--accent)",
              borderRadius: "var(--r-2)",
              color: "var(--fg-0)",
            }}
            placeholder="Filter methods..."
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
            type="button"
            className="flex items-center w-full px-2 pr-6 py-1 text-xs text-left cursor-pointer outline-none"
            style={{
              fontFamily: "var(--font-mono)",
              background: "var(--bg-2)",
              border: "1px solid var(--line-2)",
              borderRadius: "var(--r-2)",
              color: selectedLabel ? "var(--fg-0)" : "var(--fg-3)",
              transition: "border-color var(--dur-fast)",
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.borderColor = "var(--accent)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.borderColor = "var(--line-2)")
            }
            onClick={() => setOpen(true)}
          >
            <span className="flex-1 truncate">{selectedLabel ?? "Select method..."}</span>
            <ChevronDown
              size={11}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: "var(--fg-3)" }}
            />
          </button>
        )}

        {open && filtered.length > 0 && (
          <div
            ref={listRef}
            className="absolute top-full left-0 right-0 z-50 mt-0.5 max-h-56 overflow-y-auto"
            style={{
              background: "var(--bg-2)",
              border: "1px solid var(--line-2)",
              borderRadius: "var(--r-2)",
              boxShadow: "var(--shadow-2)",
            }}
          >
            {filtered.map((m, i) => (
              <button
                key={`${m.service}/${m.method}`}
                type="button"
                tabIndex={-1}
                className="flex items-center justify-between gap-2 w-full text-left px-2.5 py-1.5 text-xs"
                style={{
                  fontFamily: "var(--font-mono)",
                  background: i === cursor ? "var(--bg-3)" : "transparent",
                  color: "var(--fg-0)",
                  border: "none",
                  cursor: "pointer",
                  transition: "background var(--dur-fast)",
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(m);
                }}
                onMouseEnter={() => setCursor(i)}
              >
                <span className="truncate">
                  <span style={{ color: "var(--fg-3)" }}>{m.service} / </span>
                  <span className="font-medium">{m.method}</span>
                </span>
                {streamBadge(m)}
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedInfo && streamBadge(selectedInfo)}
    </div>
  );
}
