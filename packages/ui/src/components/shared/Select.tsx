import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import React from "react";

type SelectSize = "2xs" | "xs" | "sm";

interface OptionItem { value: string; label: React.ReactNode; }

function parseOptions(children: React.ReactNode): OptionItem[] {
  const items: OptionItem[] = [];
  React.Children.forEach(children, (child) => {
    if (React.isValidElement(child) && child.type === "option") {
      const p = child.props as { value?: string | number; children?: React.ReactNode };
      items.push({ value: String(p.value ?? ""), label: p.children ?? String(p.value ?? "") });
    }
  });
  return items;
}

const sizeMap: Record<SelectSize, { trigger: string; item: string; chevron: number }> = {
  "2xs": { trigger: "py-0.5 text-2xs", item: "px-2 py-1 text-2xs",   chevron: 10 },
  "xs":  { trigger: "py-1 text-xs",    item: "px-2.5 py-1.5 text-xs", chevron: 11 },
  "sm":  { trigger: "py-1.5 text-xs",  item: "px-2.5 py-1.5 text-xs", chevron: 11 },
};

interface Props {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  size?: SelectSize;
  className?: string;
  wrapperClassName?: string;
  disabled?: boolean;
  children?: React.ReactNode;
}

export function Select({ value, onChange, size = "xs", className = "", wrapperClassName = "", disabled, children }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const s = sizeMap[size];
  const options = parseOptions(children);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const pick = (val: string) => {
    onChange?.({ target: { value: val } } as React.ChangeEvent<HTMLSelectElement>);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { setOpen(false); return; }
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen((o) => !o); return; }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const idx = options.findIndex((o) => o.value === value);
      const next = e.key === "ArrowDown"
        ? Math.min(idx + 1, options.length - 1)
        : Math.max(idx - 1, 0);
      pick(options[next]?.value ?? "");
    }
  };

  return (
    <div ref={wrapRef} className={`relative ${wrapperClassName}`}>
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        className={`flex items-center w-full bg-[var(--surface)] border rounded px-2 pr-6 text-[var(--text-1)] cursor-pointer outline-none transition-colors text-left disabled:opacity-45 disabled:pointer-events-none ${s.trigger} ${open ? "border-[var(--accent)]" : "border-[var(--border)] hover:border-[var(--border-strong)]"} ${className}`}
      >
        <span className="flex-1 truncate">{selected?.label ?? <span className="text-[var(--text-3)]">—</span>}</span>
        <ChevronDown
          size={s.chevron}
          className={`absolute right-1.5 top-1/2 -translate-y-1/2 text-[var(--text-3)] pointer-events-none transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 top-full left-0 mt-0.5 min-w-full bg-[var(--surface)] border border-[var(--border)] rounded shadow-lg overflow-hidden">
          {options.map((opt) => {
            const active = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => pick(opt.value)}
                className={`flex items-center gap-1.5 w-full text-left whitespace-nowrap transition-colors ${s.item} ${
                  active
                    ? "bg-[var(--accent-subtle)] text-[var(--accent)]"
                    : "text-[var(--text-1)] hover:bg-[var(--surface-2)]"
                }`}
              >
                <span className="w-3 shrink-0 flex items-center justify-center">
                  {active && <Check size={s.chevron - 1} />}
                </span>
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
