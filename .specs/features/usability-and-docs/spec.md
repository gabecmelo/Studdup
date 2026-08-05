# Usability, Docs & Contextual Help — Spec

Three independent improvements on top of the study-methods feature. Confirmed decisions:
- **Adiar stays** — only free drag is removed; the deliberate postpone (with the 5-min review
  challenge) remains a valid, intentional way to move a card without studying.
- **Screenshots = placeholders** — the README is scaffolded with image placeholders under
  `docs/images/`; the user captures and swaps the real app screenshots.
- **Contextual help covers both methods and techniques.**

---

## Feature A — Studying (or Adiar) is the only way a card's date changes; remove drag

Supersedes the drag aspect of AD-004 (see AD-016).

- **REQ-A1** — The spaced board has no drag. Cards are opened by a click only.
- **REQ-A2** — A card's due date changes only by (a) studying (completing a session) or (b) the
  explicit "Adiar" action. There is no free drag manipulation that reschedules/completes.
- **REQ-A3** — Completing a card requires studying it (the drag-to-Concluídos shortcut is gone).
- **REQ-A4** — The Prova board's and spaced card's cosmetic "grab" cursor becomes a normal pointer.
- **REQ-A5** — Dead drag code (`lib/dnd.ts` + test) and the unused `@dnd-kit/*` deps are removed;
  the UI build and test suite stay green.

**AC:** no `DndContext`/draggable/droppable in the board; clicking a card opens its detail; there is
no drag behaviour; `lib/dnd.ts` and `dnd.test.ts` are gone; `@dnd-kit/*` is absent from
`ui/package.json`; `npm run build` and `npm run test` pass.

---

## Feature B — Open-source, user-facing docs

- **REQ-B1** — `README.md` is rewritten for end users: what Studdup is, screenshots (placeholders),
  how to download & install per OS (Windows NSIS `.exe`, macOS `.dmg`, Linux `.deb`/`.AppImage`
  from GitHub Releases), a short "how to use", how to report issues, how to contribute, the license.
- **REQ-B2** — The developer-oriented content (build from source, workspace layout, dev commands,
  architecture pointers) moves to `SETUP.md`.
- **REQ-B3** — A `LICENSE` file is added (MIT, matching `Cargo.toml`).
- **REQ-B4** — `CONTRIBUTING.md` + GitHub issue templates (bug, feature) + a PR template under
  `.github/`.
- **REQ-B5** — `docs/images/` holds placeholder references and a note listing which screenshots to
  capture.

**AC:** README has the user-facing sections with working relative links; SETUP.md holds the dev
content; LICENSE, CONTRIBUTING and the templates exist; no broken internal links.

---

## Feature C — Contextual "how to use in the app" help (methods + techniques)

- **REQ-C1** — In the Novo Card modal, a `(?)` affordance by the method selector opens a short,
  task-oriented tutorial on how that method works in Studdup (Spaced: the ladder + kanban flow;
  Exam: sessions distributed to the exam date).
- **REQ-C2** — A `(?)` affordance by the technique picker opens a per-technique tutorial on how the
  session actually runs in Studdup (Pomodoro cycles, Active Recall write-then-reveal, Feynman,
  Leitner boxes).
- **REQ-C3** — The help is task-oriented ("how to use it here"), distinct from the conceptual
  Técnicas page ("what it is").
- **REQ-C4** — The help popover closes on Escape (reuse `useEscapeToClose`) and on outside click.
- **REQ-C5** — Help content is a pure, tested mapping: every method (2) and every technique (4) has
  content.

**AC:** the `(?)` buttons open the right content; content exists for 2 methods + 4 techniques
(unit-tested); Escape closes the popover; the copy is how-to, not a definition.

---

## Tasks (execution order, atomic commits)

**Phase A — remove drag**
- A1. Rewrite `Board.tsx` without dnd (click-to-open only); drop the optimistic-move + toast plumbing.
- A2. `Card.tsx` + `ProvaCard.tsx`: cursor `grab` → `pointer`.
- A3. Remove `lib/dnd.ts` + `lib/dnd.test.ts`.
- A4. Remove `@dnd-kit/*` from `ui/package.json` + lockfile.
- A5. Record AD-016 (supersedes the drag aspect of AD-004).

**Phase B — docs**
- B1. New user-facing `README.md`.
- B2. `SETUP.md` (dev content).
- B3. `LICENSE` (MIT).
- B4. `CONTRIBUTING.md` + `.github/ISSUE_TEMPLATE/` + PR template.
- B5. `docs/images/` scaffold + capture note.

**Phase C — contextual help**
- C1. `methodHelp` + `techniqueHelp` content module (+ unit test for full coverage).
- C2. A reusable help popover component (ESC + outside-click close).
- C3. Wire the `(?)` on the method selector in Novo Card.
- C4. Wire the `(?)` on the technique picker in Novo Card.
