# Study Methods & Techniques — Context

**Gathered:** 2026-07-20
**Spec:** `.specs/features/study-methods/spec.md`
**Status:** Ready for design

---

## Feature Boundary

Two study **methods** (Spaced Repetition, Exam Prep) selectable from the menu, each with its own history
plus a unified cross-method history; a **technique** axis (Pomodoro, Leitner, Feynman, Active Recall)
attached per card that drives an active session screen; a kanban board as the primary workspace; delivered
on a Tauri (Rust + web) stack with lossless migration of existing data; plus README, ARCHITECTURE and
AGENTS documentation.

---

## Implementation Decisions

### Method vs. technique (the framing correction)

- The user rejected the initial framing that treated Pomodoro/Leitner/Feynman as *methods*. They are
  **techniques** — the *how* of a single session.
- A **method** is the scheduling philosophy: Spaced Repetition is open-ended learning with no deadline;
  Exam Prep works backwards from a target date.
- The two axes are orthogonal and compose freely.
- Motivating pain, in the user's words: today the user is left on their own to know how to study on
  day 0, 1, 2, 5 — the technique axis exists to answer that.

### Card ↔ method relationship

- A card belongs to exactly one method, chosen at creation, never changed afterwards.
- Existing cards all become Spaced Repetition on migration.

### Exam modeling

- `Exam` is a first-class entity: name + target date, grouping many cards.
- The app distributes sessions automatically between today and the exam date, **back-loaded** — reviews
  intensify as the exam approaches. Exact formula in spec EXAM-02.
- The exam detail view shows a consolidated progress figure across all its cards.

### Kanban

- Kanban **replaces** the list agenda; it is not a toggle.
- Columns are derived from due-date proximity — Hoje / Amanhã / Próximos / Concluídos — never stored on
  the card.
- Dragging between columns reschedules; dragging into Concluídos completes.
- In Exam Prep, cards are grouped by exam inside each column.

### Technique behavior

- Technique is selected per card at creation and is editable afterwards.
- It is **not** merely informative: starting a session opens the technique's actual tool (Pomodoro timer,
  Feynman editor, and so on).
- Technique is optional; a card with no technique gets a plain Complete action.

### Stack

- Full rewrite in Tauri (Rust backend + web frontend), replacing C++ / Dear ImGui / GLFW / OpenGL3.
- The user was shown three options that preserved the C++ core (Qt/QML, C++ core + webview, restyle ImGui
  in place) and chose the rewrite, accepting the cost of porting the core and its tests to Rust.
- Driving reason: UI quality ceiling. The Claude Design output must land in the app with high fidelity, and
  kanban drag-and-drop must feel like a product, not a debug tool.
- SQLite is retained, so migration is a forward schema change on the same file — the main de-risking factor.

### Documentation

- `README.md`, `ARCHITECTURE.md`, `AGENTS.md`. `CONTRIBUTING.md` and `docs/STUDY_METHODS.md` were offered
  and not selected — their essential content folds into the three chosen files.
- `AGENTS.md` must be vendor-neutral: usable by any agent or LLM, with nothing Claude-specific.

### Agent's Discretion

- Exact visual design, spacing and component styling — the user is producing this separately in Claude
  Design; this spec supplies the screen inventory, not the aesthetics.
- Rust crate selection, module layout, and the C++ → Rust porting strategy — Design phase.
- Frontend framework choice within the Tauri shell — Design phase.

### Declined / Undiscussed Gray Areas → Assumptions

All logged in the spec's Assumptions & Open Questions table: technique tooling priority order, fate of the
C++ codebase, optionality of technique on a card, the back-loaded distribution shape, and exam deletion
cascade behavior.

---

## Specific References

- The current agenda's overdue-resolution flow (Restart vs. Erase) and the 5-minute postpone timer are
  behaviors the user was proud of — the CHANGELOG marks the timer *"THIS IS REALLY COOL"*. Carry both into
  the new stack rather than redesigning them away.
- The existing ladder 0/1/2/5/15/30 stays exactly as is. The user recalled it as including a day 10; it
  does not, and the actual ladder is authoritative.

---

## Deferred Ideas

- Study statistics, streaks and gamification.
- A third method (e.g. project-based or curriculum-driven study).
- Per-session technique choice instead of per-card — deliberately deferred; history already records the
  technique per event, so this remains possible later without a data migration.
- Card sharing, import and export.
