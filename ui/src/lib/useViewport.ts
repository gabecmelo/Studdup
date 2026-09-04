// Responsive breakpoint source of truth (RWD-01). The codebase is inline-styles-only, so every
// responsive branch is JS-driven off a single hook rather than CSS media queries. `viewportFor` is
// the pure mapping (unit-tested at the breakpoint edges); `useViewport` wraps it in a resize
// subscription and is SSR/no-`window` safe.
//
// Breakpoints (AD-017): phone `< 640`, tablet `640–1023`, desktop `>= 1024`. 1024 is the existing
// sidebar auto-collapse edge (AD-009); 640 is the standard phone/tablet split.

import { useEffect, useState } from "react";

export type Viewport = "phone" | "tablet" | "desktop";

/** The phone/tablet split, in CSS px. Widths below this are `phone`. */
export const PHONE_MAX = 640;
/** The tablet/desktop split, in CSS px. Widths below this (and `>= PHONE_MAX`) are `tablet`. */
export const TABLET_MAX = 1024;

/** Pure width → viewport bucket. `< 640` phone, `< 1024` tablet, else desktop. */
export function viewportFor(width: number): Viewport {
  if (width < PHONE_MAX) return "phone";
  if (width < TABLET_MAX) return "tablet";
  return "desktop";
}

/** The current viewport bucket, updated on `resize`. SSR/no-`window` safe → `'desktop'`. */
export function useViewport(): Viewport {
  const [viewport, setViewport] = useState<Viewport>(() =>
    typeof window === "undefined" ? "desktop" : viewportFor(window.innerWidth),
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onResize = () => setViewport(viewportFor(window.innerWidth));
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return viewport;
}
