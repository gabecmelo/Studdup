# Studdup — Project State

Project memory. Decisions are durable constraints; Handoff is in-flight session state.

---

## Decisions

### AD-001 — Two orthogonal axes: Method × Technique

**Date:** 2026-07-20 · **Status:** Active

Studdup models studying as two independent axes that compose:

- **Método de estudo** (*when* to study) — the scheduling philosophy. Mutually exclusive per card.
  - `SpacedRepetition` — free learning, no deadline, fixed ladder 0/1/2/5/15/30.
  - `ExamPrep` — a target date exists; sessions are distributed backwards from it.
- **Técnica de estudo** (*how* to study during a session) — Pomodoro, Leitner, Feynman, Active Recall.

**Why:** The original app told the user *"study this today"* and abandoned them — the user had to already
know how to study on day 5. The technique axis fills exactly that gap. The axes compose:
*spaced repetition + Pomodoro* and *exam prep + active recall* are both valid, distinct experiences.

**Rejected:** treating Pomodoro/Leitner/Feynman as "methods" alongside spaced repetition — they answer a
different question and collapsing them into one enum would have made the menu incoherent.

---

### AD-002 — Rewrite the stack in Tauri (Rust + web UI)

**Date:** 2026-07-20 · **Status:** Active

The C++ / Dear ImGui / GLFW / OpenGL3 stack is replaced by Tauri: Rust backend, web frontend.

**Why:** ImGui is immediate-mode tooling UI. It has a hard ceiling on visual polish (no CSS, manual
animation, laborious custom fonts), and translating a polished Claude Design output into it yields low
fidelity at high effort. Kanban with drag-and-drop would look like a debug tool. The web frontend makes
the design output land almost directly.

**Cost accepted:** the pure C++ core (`Date`, `Card`, `Scheduler`, `DatabaseManager`, ~450 lines) and both
test files are rewritten in Rust. Alternatives that preserved the core (Qt/QML, C++ core + webview) were
presented and declined in favor of UI ergonomics.

**Risk mitigation:** persistence is SQLite. The Rust app opens the *same* database file, so existing user
study data survives via forward schema migration — not export/import. This is the single biggest
de-risking factor of the rewrite.

**Preserved as reference:** the C++ `Scheduler` logic is the behavioral specification for the Rust port.
The stage-as-offset invariant (AD-003) must survive the migration.

---

### AD-003 — Stage is the day offset, not an index (preserved invariant)

**Date:** 2026-07-20 (originating from the C++ implementation) · **Status:** Active

`Stage` enum values ARE the day offset from `startDate` (`Day5 = 5`, `Day30 = 30`). Therefore
`dueDate(card) == card.startDate + stage`. There is no stored "next due date" that can desynchronize.
All scheduling operations work by re-anchoring `startDate` while preserving this invariant:

- `restartStudy` → `startDate = today - stage`
- `postpone(n)` → `startDate += n`

`Done = -1` is the sentinel outside the ladder.

**Why:** it makes the entire scheduler a one-liner and makes desynchronized state unrepresentable.
This invariant carries into the Rust port unchanged.

---

### AD-004 — Kanban replaces the list agenda as the primary view

**Date:** 2026-07-20 · **Status:** Active

Columns are derived from due-date proximity, not stored on the card. Dragging a card between columns is a
reschedule (equivalent to postpone); dragging to the done column completes it.

**Why:** it gives the app direct manipulation and a spatial sense of workload that the list never had.
Single view, not a toggle — a list/kanban toggle would double the UI and design surface for marginal gain.

---

### AD-005 — Exam is a first-class entity grouping cards

**Date:** 2026-07-20 · **Status:** Active

`ExamPrep` cards belong to an `Exam` (name + target date). The app distributes each card's sessions
between its creation date and the exam date, back-loaded (denser near the exam).

**Why:** an exam is how the user actually thinks about the goal, and it gives a consolidated progress view
that a per-card deadline field cannot.

---

### AD-006 — Documentation is a first-class deliverable, agent-agnostic

**Date:** 2026-07-20 · **Status:** Active

`README.md` (humans), `ARCHITECTURE.md` (layer map + invariants + how to add a method/technique), and
`AGENTS.md` — the vendor-neutral agent instruction file read natively by Cursor, Codex, Copilot and others.
`AGENTS.md` must contain no Claude-specific instructions.

---

### AD-007 — "Início" is an orientation overview, not an analytics dashboard

**Date:** 2026-07-27 · **Status:** Active

A landing screen ("Início") shows what is due *right now across both methods* — a cross-method due count,
upcoming exams with countdowns, and an "estudar agora" action. It exists because the method switcher scopes
the board to one method at a time, so no screen answered "what's on my plate overall?".

**Hard boundary:** it shows *what is due*, never *how well you're doing*. No streaks, scores, charts, or
history rollups — those remain out of scope (they conflict with the non-punitive tone, AD stays aligned
with the spec's Out of Scope). Priority **P2**: the app is fully usable without it (the kanban is the
workspace), so it is not MVP. Stories HOME-01..04.

**Why:** the two-axis model itself created the friction; this removes it without reintroducing gamification.

---

### AD-008 — Visual direction: "soft and rounded"

**Date:** 2026-07-27 · **Status:** Active (may be A/B tested)

Elevated surfaces, generous radii, lavender accent, geometric sans-serif, cozy feel.

**Why:** elevation + radii carry the kanban card and drag-and-drop language and read equally well in light
and dark (both first-class, AD-002 stack makes theming cheap). "Cozy, non-alarming" fits the non-punitive
tone. The "native utility" option (flat, cold grays, no shadow) was rejected: it mirrors the ImGui look
being left behind and breaks drag legibility. A warm paper/notebook direction remains a possible A/B
alternative, but it fights the mandatory dark theme.

---

### AD-009 — Shell: collapsible sidebar + method switcher promoted out of it

**Date:** 2026-07-27 · **Status:** Active

The app chrome is a **left sidebar that collapses to an icon rail** (labels when expanded, icons + tooltips
when collapsed). Navigation only lives in it: Início, Quadro, Histórico, Técnicas, Ajuda, Configurações,
plus the primary "Novo Card" action. Collapse state persists across sessions; the sidebar auto-collapses
below ~1024px width; a keyboard shortcut toggles it.

**The method switcher does NOT live in the collapsing area.** It is promoted to a **segmented control at the
top of the board content area** (Repetição Espaçada | Prova), always fully legible.

**Why:** a labeled sidebar is more scannable than top-bar nav (rejected: top-bar shell — nav items become
unscannable text in the corner). Collapsing recovers horizontal space the 4-column kanban needs. But the
method switcher swaps the entire board and is the app's most critical control — collapsed into an icon it
would become ambiguous ("which icon is Prova?"), so it is kept out of the collapse and shown as a segmented
control, borrowing the one strong idea from the rejected top-bar shell.

**Board layout is a separate decision:** the primary board is the 4-column kanban (Hoje / Amanhã /
Próximos / Concluídos) per AD-004 — NOT the "A Estudar / A Revisar" horizontal-bands layout that one design
draft produced. Both methods use the same 4-column structure so they stay coherent.

---

### AD-010 — Session length: per-technique default, editable per card; Pomodoro rhythm presets

**Date:** 2026-07-28 · **Status:** Active

The design mock shows an estimated duration on every active card. Modeled as: each technique carries a
**default** session length (Pomodoro = one focus block; Active Recall 20; Feynman 20; Leitner 15; none =
no estimate), which the user can **override per card** (5–180 min). Pomodoro additionally exposes a
focus/break **rhythm** picked from presets **25/5, 50/10, 90/20 or custom** (default 25/5); the Pomodoro
session runs exactly that pair, and the card's estimate derives from it.

**On the board:** active cards show the *estimate*; completed cards show the *actual* focused time recorded
on the session event (TECH-03) — same slot, two meanings by card state.

**Global defaults** (Configurações) apply only to cards created afterwards, never retroactively.

**Why:** a single fixed estimate would be wrong for most users; the user asked for editable per-technique
defaults and real Pomodoro cadence choice. Requirements TECH-09 + TECH-EST; amends TECH-02 (no longer
hardcodes 25/5).

---

### AD-011 — Written attempts persist in their own table (schema v2)

**Date:** 2026-07-30 · **Status:** Active

Active Recall and Feynman sessions capture free-text the user writes from memory (TECH-04/05), and a card
must show its previous attempts in reverse-chronological order (TECH-04.4). These are stored in a new
`attempts` table — `id, card_id (FK CASCADE), kind ('active_recall'|'feynman'), text, created_at` — **not**
on the `history` event log. This bumps `SCHEMA_VERSION` 1 → 2; the forward migration adds the table
idempotently (fresh `create_schema` and `run_upgrade` both create it `IF NOT EXISTS`).

**Why:** history is a compact, fixed-shape audit log (one row per state transition); attempts are unbounded
long text with their own lifecycle and a per-card reverse-chrono read. Overloading `history` with a nullable
big-text column would muddy every history read and the migration story. A dedicated table keeps both clean
and makes the reverse-chrono query trivial. The three-point **self-rating** (TECH-06) is different — it is a
tiny fixed value that belongs on the completion event, and `history.self_rating` + `record_session` already
carry it (only the frontend needs to collect and pass it).

---

### AD-012 — Leitner review scheduling: boxes 1–5 → intervals 1/2/4/8/16 days

**Date:** 2026-07-30 · **Status:** Active

A Leitner item lives in a box 1–5 (schema `leitner_items` already exists). A pure domain function decides its
next state on review: **correct** → `min(box + 1, 5)`; **wrong** → `1`; then `due_date = today + interval`
where boxes 1–5 map to intervals `[1, 2, 4, 8, 16]` days (TECH-08). A Leitner session presents only items
whose `due_date <= today`.

**Why:** it mirrors the spec's stated intervals exactly and keeps the box math a testable pure function in
`scheduler`, consistent with how spaced/exam scheduling already live there (AD-003). New items enter at box 1
due today.

---

### AD-013 — Pomodoro runs N cycles per card (default 4), part of the rhythm

**Date:** 2026-08-01 · **Status:** Active (extends AD-010)

A Pomodoro card's session runs **N focus blocks** (default 4), editable per card, not a single focus+break.
`cycles: u16` is part of `PomodoroRhythm` (so focus/break/cycles travel together), persisted via a `cards.
pomodoro_cycles` column (schema v3). The session runs N focus blocks with N−1 breaks (no trailing break after
the last focus) and the card estimate is `clamp(cycles × focus_min, 5, 180)` minutes — the estimate is capped
at the TECH-09.2 bound, but the session still runs the real N cycles. Editable via the rhythm picker (presets
2/4/6 + custom 1–12). No global default in Configurações (bounded scope).

**Why:** one focus+break is not how Pomodoro is actually used (the classic cadence is ~4 focus blocks); the
user asked for a default + custom count "like the rhythm already has". Putting cycles inside `PomodoroRhythm`
keeps the whole cadence one value; capping the estimate avoids widening the shared 5–180 bound while still
running the true session length.

---

### AD-014 — Exam cards are placed/displayed by their session cursor due date, not the spaced ladder

**Date:** 2026-08-03 · **Status:** Active (corrects a KAN-04 / AD-005 implementation gap)

The frontend derived **every** card's due date from the spaced formula `start_date + stage offset`
(`placeCard`). Exam cards never leave `Day0`, so their derived due date was frozen at creation: completing a
session advanced the backend session cursor (and its `due_date`) but the board never moved the card — it sat
overdue in Hoje forever, and the detail modal showed "Dia 0" / a stale Vencimento. Fix: expose the cursor
session's due date on `SessionCursor.due_date` (repository `session_cursors` + api), and place/display exam
cards by it. New method-agnostic `placeAtDue(archived, dueDate|null, today)` in `Board.tsx` is the shared
core (spaced feeds the ladder date; exam feeds the cursor date; `null`/archived → Concluídos). `useCardHub`
resolves each card's real due date (`currentDue`) for the detail Vencimento and the Adiar base; the detail
shows "Sessão N de M" and drops the spaced-only overdue "recomeçar/zerar" banner for exam cards.

**Why:** the materialized session cursor is the single source of truth for an exam card's schedule (AD-005 /
AD-010); the ladder formula is meaningless for exam cards. The board must reflect the cursor or completing a
session appears to do nothing.

### AD-015 — Exam prep allows multiple session completions per day (spaced stays one/day)

**Date:** 2026-08-03 · **Status:** Active (refines the AD-005 completion flow)

`complete_exam` previously no-op'd if **any** session was already completed today (a blanket per-day guard
copied from the spaced ladder). That silently blocked a user studying two exam sessions in one sitting: the
second "Concluir" recorded an attempt but advanced nothing. Exam prep is cramming, so each completion now
advances the cursor to the next uncompleted session; the only no-op is a fully-studied card (no cursor left).
Spaced repetition keeps its one-review-per-day idempotency (the ladder is genuinely once/day).

**Why:** discrete exam sessions are independent units of work and cramming several in a day before an exam is
a real, intended use; a silent no-op with no feedback is the worst outcome. Evidence: a reported card showed
three same-day Active-Recall attempts but was stuck at "Sessão 2 de 4".

**Postpone base fix (same session):** the Adiar modal computed its target from the card's *current due date*
(`due + N`), so an overdue card postponed to "Amanhã" (+1) landed in the past. It now computes targets from
**today** (presets + a direct date picker) and passes the delta `target − currentDue` to the command, so the
schedule lands exactly on the chosen day (`postponeDeltaDays`, unit-tested).

---

### AD-016 — The board is read-and-open only; studying (or Adiar) is the only way a card's date changes

**Date:** 2026-08-05 · **Status:** Active (supersedes the drag aspect of AD-004)

The kanban board has **no drag**. A card is opened by clicking it; its due date changes only by studying it
(completing a session advances the schedule) or by the explicit **Adiar** action — a deliberate postpone that
is kept (it still carries the 5-min review challenge). Dragging is removed entirely, including the
drag-to-Concluídos shortcut that completed a card without any studying.

**Why:** the app's whole point is that you make progress by *studying*. Free drag let a user reschedule — or
even mark a card done — without doing the work, which contradicts that. AD-004 keeps its derived-column
kanban and the postpone-equals-reschedule semantics (now only via the Adiar flow); only the
direct-manipulation drag is dropped. The `@dnd-kit` dependency and the pure `lib/dnd` resolver are removed as
dead code.
