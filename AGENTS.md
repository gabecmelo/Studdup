# Contributor & Agent Guide

This file gives any contributor — human or AI agent — the conventions and invariants needed to change
Studdup without breaking its design. It is intentionally vendor-neutral: it names no specific tool,
model, or assistant. Read it before making changes.

## What Studdup is

A single-user, offline desktop study planner: a Rust + web (Tauri) application. Two orthogonal axes —
**method** (when to study, fixed per card) and **technique** (how to study during a session, optional)
— compose over a kanban board, with per-method and unified history. All data is one local SQLite file.

## Project layout

```
studdup-core/   Pure Rust. Domain types, scheduler, SQLite repository, migration, the api facade.
                No Tauri, no UI. This is the tested, coverage-gated core.
studdup/        Tauri desktop app. Thin #[tauri::command] wrappers over core::api; DB path + state.
ui/             React + Vite + TypeScript frontend.
.specs/         The specification, design, and durable decision log (see "Where the spec lives").
```

Architecture detail — layer map, database schema, and how to add a method or technique — lives in
`ARCHITECTURE.md`. Read it before adding a method, technique, table, or column.

## Invariants that must not break

1. **Stage-as-offset (the headline invariant).** The `Stage` enum's numeric value *is* the day offset
   from a card's `start_date`, so `due_date == start_date + stage`. There is no stored due date.
   Scheduling operations re-anchor `start_date` (e.g. `postpone(n)` → `start_date += n`); they never
   store a separate due date. Do not add a `due_date` column to `cards`.
2. **A card's method is fixed at creation.** No operation changes it.
3. **Exam sessions are materialized once, never recomputed.** The distribution formula runs at card
   creation; the scheduler afterwards only reads the stored sessions.
4. **Migration is backup-first, abort-on-failure, and idempotent** (guarded by `PRAGMA user_version`).
5. **Backward-compatible persistence.** The `cards` and `history` tables keep their original column
   names so an existing database opens unchanged. Add columns; do not rename existing ones.
6. **Completion is idempotent per day** (one stage advance, one event).
7. **Links are opened via the OS handler, never executed as shell commands.**
8. **The pure core stays Tauri-free.** Domain, scheduler, repository and api must not depend on the
   Tauri crate — this keeps the core unit-testable and the coverage gate meaningful.

If a change appears to require breaking one of these, stop and raise it in the spec/decision log rather
than working around it.

## Building, testing, linting

Prerequisites: Rust stable with `cargo`, `rustfmt`, `clippy`; Node.js 22+ and npm 10+; `cargo-llvm-cov`
for coverage. Run commands from the repository root unless noted.

```sh
# Build
cargo build                         # Rust workspace (core + app)
cd ui && npm install                # install UI deps (first time), from the ui/ directory
npm --prefix ui run build           # type-check + bundle the frontend

# Test
cargo test                          # Rust unit + integration tests
npm --prefix ui run test            # frontend unit tests (Vitest)

# Run
npm --prefix ui run dev             # frontend dev server (hot reload)

# Lint, format, coverage
cargo fmt --check
cargo clippy -- -D warnings
cargo llvm-cov -p studdup-core --fail-under-lines 70
```

The coverage gate requires **≥70% line coverage on `studdup-core`**. Do not lower it.

## Testing conventions

- **Core domain / scheduler:** unit tests co-located with the code (`#[cfg(test)]`). Assertions map
  1:1 to the specification's acceptance criteria; every listed edge case gets a test.
- **Core repository / api:** integration tests in `studdup-core/tests/`.
- **Frontend pure logic** (column placement, validation, timers, filters): unit tests beside the code
  (`*.test.ts`), run with Vitest. Presentational components are covered by the build (type-check), not
  by snapshot tests.
- Tests are derived from the specification, never from the implementation. Do not weaken, skip, or
  delete a test to make a suite pass — a failing test is a signal. If a test encodes the wrong
  behavior, fix the spec first.

## Commit conventions

- **Atomic commits:** one logical change per commit. Do not batch unrelated changes.
- **[Conventional Commits](https://www.conventionalcommits.org/):** `type(scope): description`, in the
  imperative mood, lowercase, no trailing period. Types: `feat`, `fix`, `refactor`, `docs`, `test`,
  `style`, `perf`, `build`, `ci`, `chore`.
- **No `Co-Authored-By` trailer.** This project's commits must not include a co-author trailer, and
  must not include any attribution to the tool or assistant that produced them.
- Stage only the files that belong to the change (`git add <paths>`); never blanket-stage the tree.
  `.specs/` and local design assets are intentionally untracked — do not commit them.

Examples:

```
feat(core): add back-loaded exam session distribution
fix(ui): prevent optimistic drag state from surviving a failed command
docs: add ARCHITECTURE
```

## Where the spec lives

The authoritative specification and its history live under `.specs/` (untracked, local):

- `.specs/features/study-methods/spec.md` — requirements with traceable IDs and acceptance criteria.
- `.specs/features/study-methods/design.md` — architecture and non-obvious tech decisions.
- `.specs/features/study-methods/tasks.md` — the task breakdown, test matrix, and gate commands.
- `.specs/STATE.md` — the durable decision log (AD-001..010). The stage-as-offset invariant is AD-003.

When in doubt about intended behavior, the spec's acceptance criteria are the source of truth.
