import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import { useOnboarding } from "./useOnboarding";

interface Step {
  target: string;
  title: string;
  body: string;
  placement: "bottom" | "right" | "top";
}

const STEPS: Step[] = [
  {
    target: "request-mode",
    title: "Choose how requests are sent",
    body: "Requests go through your browser by default. Switch to Server mode if you need full timing data or want to skip CORS.",
    placement: "bottom",
  },
  {
    target: "url-bar",
    title: "Send your first request",
    body: "Pick an HTTP method, type a URL, and hit Send.",
    placement: "bottom",
  },
  {
    target: "sidebar-collections",
    title: "Save with Collections",
    body: "Organize and reuse requests by saving them into collections and folders.",
    placement: "right",
  },
  {
    target: "sidebar-environments",
    title: "Switch Environments",
    body: "Define variables and swap environments without touching every request.",
    placement: "right",
  },
  {
    target: "response-area",
    title: "Inspect Responses",
    body: "Body, headers, timing, and assertions all appear here after you hit Send.",
    placement: "top",
  },
];

const PAD = 6;
const TW = 276;
const GAP = 10;

interface SpotRect {
  top: number;
  left: number;
  w: number;
  h: number;
}

function toSpot(rect: DOMRect): SpotRect {
  return {
    top: rect.top - PAD,
    left: rect.left - PAD,
    w: rect.width + PAD * 2,
    h: rect.height + PAD * 2,
  };
}

function tooltipPos(sp: SpotRect, placement: Step["placement"]): React.CSSProperties {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  if (placement === "bottom") {
    let left = sp.left + sp.w / 2 - TW / 2;
    left = Math.max(12, Math.min(vw - TW - 12, left));
    return { top: sp.top + sp.h + GAP, left };
  }
  if (placement === "right") {
    const left = sp.left + sp.w + GAP;
    const top = Math.max(12, Math.min(vh - 200, sp.top + sp.h / 2 - 100));
    return { top, left };
  }
  // top
  let left = sp.left + sp.w / 2 - TW / 2;
  left = Math.max(12, Math.min(vw - TW - 12, left));
  return { bottom: vh - (sp.top - GAP), left };
}

export function OnboardingTour() {
  const { show, dismiss } = useOnboarding();
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const current = STEPS[step];

  const measure = useCallback(() => {
    const el = document.querySelector(`[data-tour="${current.target}"]`);
    setRect(el ? el.getBoundingClientRect() : null);
  }, [current.target]);

  useEffect(() => {
    if (!show) return;
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [show, measure]);

  useEffect(() => {
    if (!show) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [show, dismiss]);

  if (!show || !rect) return null;

  const sp = toSpot(rect);
  const pos = tooltipPos(sp, current.placement);
  const isLast = step === STEPS.length - 1;

  const next = () => (isLast ? dismiss() : setStep((s) => s + 1));
  const back = () => setStep((s) => s - 1);

  return (
    <>
      {/* Click-blocker */}
      <div style={{ position: "fixed", inset: 0, zIndex: 9998 }} onClick={dismiss} aria-hidden />

      {/* Spotlight */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          top: sp.top,
          left: sp.left,
          width: sp.w,
          height: sp.h,
          borderRadius: 6,
          boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
          outline: "1.5px solid var(--accent)",
          outlineOffset: 0,
          pointerEvents: "none",
          zIndex: 9999,
          transition: "top 0.18s ease, left 0.18s ease, width 0.18s ease, height 0.18s ease",
        }}
      />

      {/* Tooltip */}
      <div
        role="dialog"
        aria-label={current.title}
        style={{
          position: "fixed",
          width: TW,
          zIndex: 10000,
          background: "var(--bg-2)",
          border: "1px solid var(--line-2)",
          borderRadius: "var(--r-3)",
          boxShadow: "var(--shadow-pop)",
          padding: "14px",
          fontFamily: "var(--font-sans)",
          ...pos,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <span style={{ fontSize: "var(--t-xs)", color: "var(--fg-3)" }}>
            {step + 1} / {STEPS.length}
          </span>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Close tour"
            style={{
              background: "transparent",
              border: 0,
              cursor: "pointer",
              color: "var(--fg-3)",
              padding: 2,
              display: "flex",
              borderRadius: "var(--r-1)",
            }}
          >
            <X size={13} />
          </button>
        </div>

        <p
          style={{
            fontWeight: 600,
            fontSize: "var(--t-base)",
            color: "var(--fg-0)",
            margin: "0 0 6px",
            lineHeight: 1.4,
          }}
        >
          {current.title}
        </p>
        <p
          style={{
            fontSize: "var(--t-sm)",
            color: "var(--fg-2)",
            margin: "0 0 14px",
            lineHeight: 1.55,
          }}
        >
          {current.body}
        </p>

        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <button
            type="button"
            className="btn btn-ghost text-xs px-3 py-1.5"
            onClick={dismiss}
            style={{ marginRight: "auto" }}
          >
            Skip
          </button>
          {step > 0 && (
            <button type="button" className="btn text-xs px-3 py-1.5" onClick={back}>
              Back
            </button>
          )}
          <button type="button" className="btn btn-primary text-xs px-3 py-1.5" onClick={next}>
            {isLast ? "Done" : "Next"}
          </button>
        </div>
      </div>
    </>
  );
}
