import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, HelpCircle } from "lucide-react";

export function ProxyUrlTooltip({ url }: { url: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number }>({
    left: 0,
  });
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        !btnRef.current?.contains(target) &&
        !panelRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const toggle = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < 300) {
        setPos({ bottom: window.innerHeight - rect.top + 4, left: rect.left });
      } else {
        setPos({ top: rect.bottom + 4, left: rect.left });
      }
    }
    setOpen((value) => !value);
  };

  const copy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const exampleBody = JSON.stringify(
    {
      targetUrl: "https://api.example.com/users",
      method: "GET",
      headers: [],
      body: "",
    },
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
              <p className="text-2xs font-semibold text-[var(--text-1)] mb-1">
                How proxy recording works
              </p>
              <p className="text-2xs text-[var(--text-3)] leading-relaxed">
                Send a <code className="font-mono">POST</code> to this endpoint
                with your real API URL in <code className="font-mono">targetUrl</code>.
                Invoke forwards the request, records the exchange, and returns the
                real response. You can then import recordings as mock routes.
              </p>
            </div>

            <div>
              <p className="text-2xs font-semibold text-[var(--text-1)] mb-1">
                Endpoint
              </p>
              <div className="flex items-center gap-1 bg-[var(--surface-2)] border border-[var(--border)] rounded px-2 py-1">
                <code className="flex-1 text-2xs font-mono text-[var(--text-1)] truncate">
                  {url}
                </code>
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
              <p className="text-2xs font-semibold text-[var(--text-1)] mb-1">
                Example body
              </p>
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
