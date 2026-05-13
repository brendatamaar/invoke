import { useCallback, useEffect, useRef, useState } from "react";
import type { MouseEvent, RefObject } from "react";

export function useResizablePane(
  initial: number,
  direction: "vertical" | "horizontal" = "vertical",
  containerRef?: RefObject<HTMLDivElement>,
  otherPanelMin = 320,
) {
  const [size, setSize] = useState(initial);
  const dragging = useRef(false);
  const startPos = useRef(0);
  const startSize = useRef(initial);

  const onMouseDown = useCallback(
    (e: MouseEvent) => {
      dragging.current = true;
      startPos.current = direction === "horizontal" ? e.clientX : e.clientY;
      startSize.current = size;
      e.preventDefault();
    },
    [size, direction],
  );

  useEffect(() => {
    const onMove = (e: globalThis.MouseEvent) => {
      if (!dragging.current) return;
      const pos = direction === "horizontal" ? e.clientX : e.clientY;
      const delta = pos - startPos.current;
      const containerSize = containerRef?.current
        ? direction === "horizontal"
          ? containerRef.current.offsetWidth
          : containerRef.current.offsetHeight
        : direction === "horizontal"
          ? window.innerWidth
          : window.innerHeight;
      const max = containerSize - otherPanelMin;
      setSize(Math.max(120, Math.min(startSize.current + delta, max)));
    };
    const onUp = () => {
      dragging.current = false;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [direction, containerRef, otherPanelMin]);

  return { size, onMouseDown };
}
