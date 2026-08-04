# Studdup Architecture

Studdup is a Cargo workspace with a pure, Tauri-free core and a thin Tauri bridge that a React UI
calls. This document maps the layers, states the invariants that must not break, describes the
database schema, and gives step-by-step guides for adding a new method or technique.

## Layer map

```
┌──────────────────────────────────────────────────────────────────────┐
│ ui/  — React + Vite + TypeScript                                       │
│   routes/ (Quadro, QuadroProva, ListaProvas, DetalheProva, Historico,  │
│            Configuracoes)                                               │
│   components/ (Card, Board, StageBadge, RhythmPicker, modals/, …)       │
│   sessions/ (Pomodoro, None)                                           │
│   lib/ (commands.ts, queries.ts, bindings.ts, sessionEstimate.ts)      │
│   store.ts (Zustand: active method, sidebar, live session)             │
│                         │ invoke(command, args)                        │
├─────────────────────────┼──────────────────────────────────────────────┤
│ studdup/ — Tauri app    ▼                                              │
│   commands.rs  #[tauri::command] wrappers, 1:1 over core::api          │
│   state.rs     Mutex<Db> in managed state                             │
│   paths.rs     platform DB-path resolution + legacy copy              │
│   main.rs      open + migrate DB, register commands                   │
│                         │ core::api calls                             │
├─────────────────────────┼──────────────────────────────────────────────┤
│ studdup-core/ — pure Rust, no Tauri                                    │
│   api.rs        the facade: one function per user action              │
│   scheduler/    spaced.rs (ladder) + exam.rs (materialized sessions)  │
│   repository/   cards, exams, events, settings, migration, schema     │
│   domain/       Date, Card, Exam, HistoryEvent, enums (Method, Stage, │
│                 Technique, PomodoroRhythm)                             │
│                         │ rusqlite                                    │
│                         ▼                                             │
│                  SQLite  (srs.db)                                     │
└──────────────────────────────────────────────────────────────────────┘
```

**Why this shape.** The core owns all domain logic, scheduling, persistence and migration; it links
and tests without Tauri, so the coverage gate is meaningful over the logic that matters (the same way
the old C++ CI tested the core with the app excluded). The Tauri layer is a dumb bridge: every
command locks the DB, supplies `Date::today()`, and delegates to exactly one `core::api` function. The
UI owns all interaction and never talks to SQLite directly.

**Request flow (drag a card Hoje→Amanhã):** dnd-kit `onDragEnd` → optimistic move in the board →
`invoke('postpone_card', {id, days:1})` → command → `core::api::postpone_card` → `scheduler::postpone`
(re-anchors `start_date`) → `repository::update_card` + `record_event` → returns the updated `Card` →
React Query cache reconciles. On error the optimistic move rolls back and a toast shows.

### State & types

- **Server/command state** lives in TanStack Query (`ui/src/lib/queries.ts`); mutations invalidate the
  board, history and exams caches.
- **Ephemeral UI state** (active method, sidebar collapse, live session) lives in a Zustand store
  (`ui/src/store.ts`); the active method + sidebar persist to `localStorage`.
- **Rust ⇄ TS types** are kept in a hand-maintained `ui/src/lib/bindings.ts`, reviewed 1:1 against the
  serde wire format (field-less enums → PascalCase strings; `Option<T>` → `T | null`; `Date` → an ISO
  `YYYY-MM-DD` string; `ApiError` is adjacently tagged `{ kind, detail? }`). Keep it in sync whenever a
  `core::api` signature or a domain struct changes.

## Invariants that must not break

### Stage-as-offset (AD-003) — the headline invariant

The `Stage` enum's numeric value **is** the day offset from a card's `start_date`:

```rust
enum Stage { Day0 = 0, Day1 = 1, Day2 = 2, Day5 = 5, Day15 = 15, Day30 = 30, Done = -1 }
```

Therefore, for a spaced card:

```
due_date(card) == card.start_date + card.current_stage
```

There is **no stored "next due date"** that could desynchronize. Every scheduling operation preserves
this by re-anchoring `start_date`, never by storing a separate due date:

- `restart_study` → `start_date = today - stage` (keeps the stage, makes it due today)
- `postpone(n)`   → `start_date += n`
- `erase_study` / `revive` → `start_date = today`, `stage = Day0`

`Done = -1` is the sentinel off the ladder. If you ever find yourself adding a `due_date` column to
`cards`, stop — you are breaking this invariant.

### Other invariants

- **A card's method is fixed at creation.** There is no operation to change it (separate histories and
  incompatible stage vocabularies fall out of this).
- **Exam sessions are materialized once and never recomputed.** The back-loaded distribution formula
  runs at card creation; the scheduler afterwards only reads the stored `exam_sessions` rows.
- **Migration is backup-first and idempotent.** It writes a timestamped backup before any change,
  aborts untouched if the backup fails, and no-ops when `user_version` is already current.
- **Backward-compatible table/column names.** The two pre-existing C++ tables keep their exact names
  and columns so the same `srs.db` opens (see below).
- **Completion is idempotent per day.** Completing the same card twice in one day advances the stage
  once and records one `completed` event.
- **Links are opened, never executed.** A link is handed to the OS default handler; it is never run as
  a shell command. Unresolvable links are stored but flagged unopenable.

## Database schema

SQLite, WAL journal mode, foreign keys ON, schema version tracked via `PRAGMA user_version`
(current = 1; a pre-feature C++ database is version 0). The two tables inherited from the C++ app —
`cards` and the event log `history` — keep their original names and column names; new columns are
added alongside and new tables are created fresh.

```
cards
  id                  INTEGER PK
  title               TEXT                     ┐
  content_link        TEXT                     │ C++-compatible columns
  review_link         TEXT                     │ (names preserved)
  start_date          TEXT (ISO YYYY-MM-DD)    │
  stage               INTEGER (day offset)     │  ← AD-003
  archived            INTEGER                  │
  created_at          TEXT                     │
  last_completed_at   TEXT (nullable)          ┘
  method              TEXT   DEFAULT 'spaced'  ┐ new: 'spaced' | 'exam'
  technique           TEXT   (nullable)        │ new: pomodoro|active_recall|feynman|leitner
  est_minutes         INTEGER (nullable)       │ new: TECH-EST
  pomodoro_focus_min  INTEGER (nullable)       │ new: Pomodoro rhythm
  pomodoro_break_min  INTEGER (nullable)       │
  exam_id             INTEGER → exams(id) ON DELETE CASCADE  ┘ new: exam-prep cards

history  (the event log — C++ name kept)
  id           INTEGER PK
  card_id      INTEGER → cards(id) ON DELETE CASCADE
  event_type   TEXT                    ┐ C++-compatible columns
  from_stage   INTEGER                 │ (created|completed|postponed|restart|erase|archived|revived)
  to_stage     INTEGER                 │
  when_date    TEXT (ISO)              ┘
  method       TEXT   DEFAULT 'spaced' ┐ new: HIST-04 payload
  technique    TEXT   (nullable)       │
  focused_secs INTEGER (nullable)      │ new: TECH-03
  self_rating  INTEGER (nullable)      ┘ new: 0/1/2

exams               id, name, exam_date, created_at, concluded
exam_sessions       id, card_id → cards, seq, due_date, completed_at   (materialized, frozen)
leitner_items       id, card_id → cards, front, back, box_no, due_date  (table only; UI is P3)
settings            key TEXT PK, value TEXT                             (global technique defaults)
```

The domain layer maps enums to/from these TEXT columns in `repository/mod.rs`
(`method_to_db`/`method_from_db`, `technique_to_db`/`technique_from_db`, `stage_to_db`/`stage_from_db`).

## How to add a new method

The abstraction is intentionally capped at two methods to validate it first; a third is a deliberate
decision. To add one, work outward from the core:

1. **Domain** (`studdup-core/src/domain/enums.rs`): add a variant to `enum Method`. If it uses a stage
   vocabulary different from the spaced ladder, model it explicitly — do **not** overload `Stage`.
2. **DB mapping** (`studdup-core/src/repository/mod.rs`): extend `method_to_db` and `method_from_db`
   with the new string value. Keep `_ => SpacedRepetition` as the migration fallback.
3. **Scheduler** (`studdup-core/src/scheduler/`): add the due-date / completion / postpone behavior,
   either as a new `scheduler` submodule or by extending the dispatch. Preserve the relevant invariant
   (re-anchor rather than store a due date if it is offset-based).
4. **Facade** (`studdup-core/src/api.rs`): branch the method dispatch in `create_card` (session
   materialization, if any), `complete_inner`, and `postpone_card`.
5. **Bridge**: no change if the command surface is unchanged — the commands are method-agnostic.
   Update `ui/src/lib/bindings.ts` `Method` union to include the new variant.
6. **UI**: add the option to `MethodSwitcher`, handle its board layout/grouping, and any method-specific
   screens. Add unit tests for the new scheduler behavior (1:1 with its acceptance criteria) and for
   any new pure UI logic.

## How to add a new technique

Techniques are optional per card and affect the *session*, not the schedule:

1. **Domain** (`studdup-core/src/domain/enums.rs`): add a variant to `enum Technique`.
2. **DB mapping** (`studdup-core/src/repository/mod.rs`): extend `technique_to_db` and
   `technique_from_db` with its string value (`_ => None` stays the fallback).
3. **UI labels** (`ui/src/components/TechniqueChip.tsx`): add its `TECHNIQUE_LABEL` and one-line
   `TECHNIQUE_SUMMARY`.
4. **Default estimate** (`ui/src/lib/sessionEstimate.ts`): add its default to `FIXED_DEFAULT_EST`
   (or, if it has a rhythm-like derivation, extend `defaultEstForTechnique`). Add it to
   `TECHNIQUE_CHOICES` in `ui/src/components/modals/validation.ts` so the pickers list it.
5. **Session screen** (`ui/src/sessions/`): build the guided session component, then dispatch to it
   from `ui/src/components/Board.tsx` (the block that currently routes Pomodoro vs the plain session).
   A technique whose screen is not built yet safely falls through to the plain `NoneSession`.
6. **History**: no change — `record_session` already persists the technique and focused seconds on the
   event; the Histórico filters pick up the new technique automatically.
7. **Tests**: unit-test the pure session logic (as `pomodoroTimer.ts` is tested) and any new estimate
   rule.

## Further reading

- `.specs/features/study-methods/spec.md` — requirements with traceable IDs.
- `.specs/features/study-methods/design.md` — the architecture rationale and tech decisions.
- `.specs/STATE.md` — the durable decision log (AD-001..010).
