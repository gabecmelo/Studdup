// Escape-to-close for overlays. A single document keydown listener serves every open overlay
// through a LIFO stack: Escape dismisses only the topmost one, so stacked modals close one at a
// time (and nothing double-fires). Each overlay registers a stable wrapper on mount that reads the
// latest close callback through a ref, so inline `() => setX(null)` handlers don't churn the stack.

import { useEffect, useRef } from "react";

const stack: Array<() => void> = [];
let bound = false;

function onKeyDown(event: KeyboardEvent) {
  if (event.key !== "Escape") return;
  const top = stack[stack.length - 1];
  if (!top) return;
  event.stopPropagation();
  top();
}

/** Dismiss the topmost overlay on Escape while this component is mounted. */
export function useEscapeToClose(onClose?: () => void) {
  const ref = useRef(onClose);
  ref.current = onClose;

  useEffect(() => {
    const dismiss = () => ref.current?.();
    stack.push(dismiss);
    if (!bound) {
      document.addEventListener("keydown", onKeyDown);
      bound = true;
    }
    return () => {
      const i = stack.lastIndexOf(dismiss);
      if (i !== -1) stack.splice(i, 1);
      if (stack.length === 0 && bound) {
        document.removeEventListener("keydown", onKeyDown);
        bound = false;
      }
    };
  }, []);
}

/**
 * Escape-to-close as a zero-render component. Mount it (conditionally) to register a dismisser only
 * while it is present — the mount lands on top of the stack, so a nested overlay rendered inside an
 * already-open modal takes Escape first, then hands it back on unmount.
 */
export function EscapeCloser({ onClose }: { onClose: () => void }) {
  useEscapeToClose(onClose);
  return null;
}
