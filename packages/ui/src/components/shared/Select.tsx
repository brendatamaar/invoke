import { useState, useRef, useEffect } from "react";
import { Check, ChevronDown } from "lucide-react";
import React from "react";
import type {
  SelectOptionItem,
  SelectProps,
  SelectSize,
  SelectSizeClasses,
} from "../../types";

function parseOptions(children: React.ReactNode): SelectOptionItem[] {
  const items: SelectOptionItem[] = [];
  React.Children.forEach(children, (child) => {
    if (React.isValidElement(child) && child.type === "option") {
      const p = child.props as {
        value?: string | number;
        children?: React.ReactNode;
      };
      items.push({
        value: String(p.value ?? ""),
        label: p.children ?? String(p.value ?? ""),
      });
    }
  });
  return items;
}

const sizeMap: Record<SelectSize, SelectSizeClasses> = {
  "2xs": {
    trigger: "py-0.5 text-2xs",
    item: "px-2 py-1 text-2xs",
    chevron: 10,
  },
  xs: { trigger: "py-1 text-xs", item: "px-2.5 py-1.5 text-xs", chevron: 11 },
  sm: { trigger: "py-1.5 text-xs", item: "px-2.5 py-1.5 text-xs", chevron: 11 },
};

export function Select({
  value,
  onChange,
  size = "xs",
  className = "",
  wrapperClassName = "",
  disabled,
  children,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const s = sizeMap[size];
  const options = parseOptions(children);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const pick = (val: string) => {
    onChange?.({
      target: { value: val },
    } as React.ChangeEvent<HTMLSelectElement>);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen((o) => !o);
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const idx = options.findIndex((o) => o.value === value);
      const next =
        e.key === "ArrowDown"
          ? Math.min(idx + 1, options.length - 1)
          : Math.max(idx - 1, 0);
      pick(options[next]?.value ?? "");
    }
  };

  return (
    <div ref={wrapRef} className={`relative ${wrapperClassName}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        className={`flex items-center w-full px-2 pr-6 text-left cursor-pointer outline-none disabled:opacity-40 disabled:pointer-events-none ${s.trigger} ${className}`}
        style={{
          fontFamily: "var(--font-mono)",
          background: "var(--bg-2)",
          border: `1px solid ${open ? "var(--accent)" : "var(--line-2)"}`,
          borderRadius: "var(--r-2)",
          color: "var(--fg-0)",
          transition: "border-color var(--dur-fast)",
        }}
      >
        <span className="flex-1 truncate">
          {selected?.label ?? <span style={{ color: "var(--fg-3)" }}>—</span>}
        </span>
        <ChevronDown
          size={s.chevron}
          className={`absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          style={{ color: "var(--fg-3)" }}
        />
      </button>

      {open && (
        <div
          className="absolute z-50 top-full left-0 mt-0.5 min-w-full overflow-hidden"
          style={{
            background: "var(--bg-2)",
            border: "1px solid var(--line-2)",
            borderRadius: "var(--r-2)",
            boxShadow: "var(--shadow-2)",
          }}
        >
          {options.map((opt) => {
            const active = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => pick(opt.value)}
                className={`flex items-center gap-1.5 w-full text-left whitespace-nowrap ${s.item}`}
                style={{
                  fontFamily: "var(--font-mono)",
                  background: active ? "var(--accent-faint)" : "transparent",
                  color: active ? "var(--accent)" : "var(--fg-0)",
                  border: "none",
                  cursor: "pointer",
                  transition: "background var(--dur-fast)",
                }}
                onMouseEnter={(e) => {
                  if (!active)
                    (e.currentTarget as HTMLElement).style.background =
                      "var(--bg-3)";
                }}
                onMouseLeave={(e) => {
                  if (!active)
                    (e.currentTarget as HTMLElement).style.background =
                      "transparent";
                }}
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
