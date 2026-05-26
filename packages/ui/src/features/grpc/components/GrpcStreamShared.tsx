import { useEffect, useRef, useState } from "react";
import { ArrowDown } from "lucide-react";

export const COLLAPSE_LINES = 8;

export function useAutoScroll(triggerCount: number, streaming: boolean) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isUserScrolledRef = useRef(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  useEffect(() => {
    if (!isUserScrolledRef.current) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [triggerCount]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 60;
    const userScrolled = !nearBottom;
    if (userScrolled !== isUserScrolledRef.current) {
      isUserScrolledRef.current = userScrolled;
      setShowScrollBtn(userScrolled && streaming);
    }
  };

  const scrollToBottom = () => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    isUserScrolledRef.current = false;
    setShowScrollBtn(false);
  };

  return { scrollRef, showScrollBtn, handleScroll, scrollToBottom };
}

export function CollapsibleBody({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const lineCount = text.split("\n").length;
  const isCollapsible = lineCount > COLLAPSE_LINES;

  return (
    <div>
      <div
        className="relative overflow-hidden"
        style={
          isCollapsible && !expanded
            ? {
                maxHeight: `${COLLAPSE_LINES * 1.5}em`,
                maskImage: "linear-gradient(to bottom, black 60%, transparent 100%)",
                WebkitMaskImage: "linear-gradient(to bottom, black 60%, transparent 100%)",
              }
            : undefined
        }
      >
        <pre className="text-2xs font-mono text-[var(--text-1)] whitespace-pre-wrap break-all">
          {text}
        </pre>
      </div>
      {isCollapsible && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-1.5 text-2xs text-[var(--accent)] hover:underline"
        >
          {expanded ? "Show less" : `Show more (${lineCount} lines)`}
        </button>
      )}
    </div>
  );
}

export function ScrollToBottomBtn({
  show,
  onClick,
  offset = false,
}: {
  show: boolean;
  onClick: () => void;
  offset?: boolean;
}) {
  if (!show) return null;
  return (
    <button
      onClick={onClick}
      className={`absolute right-3 flex items-center gap-1.5 px-2 py-1 rounded-full text-2xs bg-[var(--accent)] text-white shadow-md hover:opacity-90 transition-opacity ${offset ? "bottom-10" : "bottom-3"}`}
    >
      <ArrowDown size={10} />
      new messages
    </button>
  );
}
