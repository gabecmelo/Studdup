// RWD-05/06/07: the app shell must show the bottom tab bar on phone, the icon rail on tablet, and
// the full sidebar on desktop. These assert the pure selector at each viewport bucket.

import { describe, expect, it } from "vitest";
import { chromeFor } from "./appShell.chrome";

describe("chromeFor", () => {
  it("gives phone the bottom tab bar (RWD-05)", () => {
    expect(chromeFor("phone")).toBe("bottombar");
  });

  it("gives tablet the icon rail (RWD-06)", () => {
    expect(chromeFor("tablet")).toBe("rail");
  });

  it("gives desktop the full sidebar (RWD-07)", () => {
    expect(chromeFor("desktop")).toBe("sidebar");
  });
});
