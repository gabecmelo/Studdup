import { describe, expect, it } from "vitest";
import { isOpenableLink } from "./links";

describe("isOpenableLink", () => {
  it("accepts http and https URLs", () => {
    expect(isOpenableLink("https://www.youtube.com/watch?v=aula-isomeria")).toBe(true);
    expect(isOpenableLink("http://example.com")).toBe(true);
    expect(isOpenableLink("  https://example.com/a/b  ")).toBe(true); // trimmed
  });

  it("accepts absolute local file references", () => {
    expect(isOpenableLink("file:///home/user/notes.pdf")).toBe(true);
    expect(isOpenableLink("C:\\Users\\me\\resumo.pdf")).toBe(true);
    expect(isOpenableLink("/home/user/aula.pdf")).toBe(true);
  });

  it("rejects empty or whitespace-only strings", () => {
    expect(isOpenableLink("")).toBe(false);
    expect(isOpenableLink("   ")).toBe(false);
  });

  it("rejects free text and non-openable schemes (marked não-abrível)", () => {
    expect(isOpenableLink("Aula 12 — Isomeria óptica")).toBe(false);
    expect(isOpenableLink("resumo da prof")).toBe(false);
    expect(isOpenableLink("ftp://example.com/file")).toBe(false);
    expect(isOpenableLink("javascript:alert(1)")).toBe(false);
    expect(isOpenableLink("relative/path/file.pdf")).toBe(false);
  });

  it("rejects a malformed http URL", () => {
    expect(isOpenableLink("http://")).toBe(false);
  });
});
