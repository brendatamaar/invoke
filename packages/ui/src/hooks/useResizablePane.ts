import { useCallback, useEffect, useRef, useState } from "react";
import type { MouseEvent } from "react";

export function useResizablePane(initial: number) {
  const [size, setSize] = useState(initial);
  const dragging = useRef(false);
  const startPos = useRef(0);
  const startSize = useRef(initial);

  const onMouseDown = useCallback(
    (e: MouseEvent) => {
      dragging.current = true;
      startPos.current = e.clientY;
      startSize.current = size;
      e.preventDefault();
    },
    [size],
  );

  useEffect(() => {
    const onMove = (e: globalThis.MouseEvent) => {
      if (!dragging.current) return;
      const delta = e.clientY - startPos.current;
      setSize(
        Math.max(
          120,
          Math.min(startSize.current + delta, window.innerHeight - 200),
        ),
      );
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
  }, []);

  return { size, onMouseDown };
}
