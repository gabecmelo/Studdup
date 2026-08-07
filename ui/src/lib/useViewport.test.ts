// RWD-01: the pure breakpoint mapping that drives every responsive branch. Asserted at the
// breakpoint edges so the phone/tablet/desktop boundaries can't drift silently.

import { describe, expect, it } from "vitest";
import { viewportFor } from "./useViewport";

describe("viewportFor", () => {
  it("classifies 320px as phone", () => {
    expect(viewportFor(320)).toBe("phone");
  });

  it("classifies 360px as phone", () => {
    expect(viewportFor(360)).toBe("phone");
  });

  it("classifies 639px (just below the tablet edge) as phone", () => {
    expect(viewportFor(639)).toBe("phone");
  });

  it("classifies 640px (the tablet edge) as tablet", () => {
    expect(viewportFor(640)).toBe("tablet");
  });

  it("classifies 1023px (just below the desktop edge) as tablet", () => {
    expect(viewportFor(1023)).toBe("tablet");
  });

  it("classifies 1024px (the desktop edge) as desktop", () => {
    expect(viewportFor(1024)).toBe("desktop");
  });

  it("classifies 1440px as desktop", () => {
    expect(viewportFor(1440)).toBe("desktop");
  });
});
