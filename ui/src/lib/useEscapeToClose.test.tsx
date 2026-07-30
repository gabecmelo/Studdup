// The Escape-to-close contract (the "ESC não fecha o modal" fix): pressing Escape while an overlay
// is mounted dismisses it, stacked overlays close topmost-first (one Escape per overlay), and once
// nothing is mounted the key does nothing. Exercised through the real DOM (jsdom) so the shared
// document keydown listener + LIFO stack are covered end to end.

import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EscapeCloser, useEscapeToClose } from "./useEscapeToClose";

function Overlay({ onClose }: { onClose: () => void }) {
  useEscapeToClose(onClose);
  return null;
}

function pressEscape() {
  fireEvent.keyDown(document, { key: "Escape" });
}

describe("useEscapeToClose", () => {
  it("dismisses a mounted overlay on Escape", () => {
    const onClose = vi.fn();
    render(<Overlay onClose={onClose} />);
    pressEscape();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes the topmost overlay first, one Escape per overlay", () => {
    const outer = vi.fn();
    const inner = vi.fn();
    render(
      <>
        <Overlay onClose={outer} />
        <Overlay onClose={inner} />
      </>,
    );

    pressEscape();
    expect(inner).toHaveBeenCalledTimes(1);
    expect(outer).not.toHaveBeenCalled();
  });

  it("does nothing once every overlay has unmounted", () => {
    const onClose = vi.fn();
    const { unmount } = render(<Overlay onClose={onClose} />);
    unmount();
    pressEscape();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("uses the latest close callback, not the one from first render", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = render(<Overlay onClose={first} />);
    rerender(<Overlay onClose={second} />);
    pressEscape();
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("EscapeCloser registers a dismisser only while mounted", () => {
    const base = vi.fn();
    const nested = vi.fn();
    function Host({ showNested }: { showNested: boolean }) {
      useEscapeToClose(base);
      return showNested ? <EscapeCloser onClose={nested} /> : null;
    }
    const { rerender } = render(<Host showNested={false} />);

    pressEscape();
    expect(base).toHaveBeenCalledTimes(1);

    rerender(<Host showNested />);
    pressEscape();
    expect(nested).toHaveBeenCalledTimes(1);
    expect(base).toHaveBeenCalledTimes(1); // still shielded by the nested closer

    rerender(<Host showNested={false} />);
    pressEscape();
    expect(base).toHaveBeenCalledTimes(2);
  });
});
