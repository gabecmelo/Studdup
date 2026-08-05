# Studdup

Studdup is a calm, non-punitive desktop study planner. It answers two questions that most study
tools leave to the user: **when** to study a topic, and **how** to study it during a session.

- **Method** (the *when*) — the scheduling philosophy, fixed per card when it is created.
- **Technique** (the *how*) — an optional guided session that runs when you start studying.

These two axes compose: *spaced repetition + Pomodoro* and *exam prep + active recall* are both
valid, distinct experiences. Your cards live on a four-column kanban board (Hoje / Amanhã / Próximos
/ Concluídos), and every study event is recorded in a per-method and a unified history.

Studdup is a single-user, offline, desktop application. All data lives in one local SQLite file — no
accounts, no cloud, no network. It is a Rust + web (Tauri) rewrite of an earlier C++ app; existing
databases are migrated forward in place, backup-first, with zero data loss.

## Study methods

| Method | When to use it | How it schedules |
| --- | --- | --- |
| **Repetição Espaçada** (Spaced Repetition) | Open-ended learning with no deadline | A fixed ladder — Day 0 → 1 → 2 → 5 → 15 → 30 → Done. A card's due date is always `start_date + stage` (the stage value *is* the day offset), so the schedule can never desynchronize. |
| **Prova** (Exam Prep) | Material with a known exam date | Sessions are distributed from today to the exam date, back-loaded so reviews get denser as the exam approaches. Completing the last session archives the card. |

## Study techniques

A card may carry one optional technique (or none). Each technique has a default estimated session
length that you can override per card (5–180 minutes).

| Technique | What the session does | Default estimate |
| --- | --- | --- |
| **Pomodoro** | A timed focus block followed by a break, using the card's rhythm (25/5, 50/10, 90/20, or custom; default 25/5). Notifies and auto-starts the break at zero; pause/resume holds the exact remaining time. | one focus block |
| **Active Recall** | Write what you remember before revealing the source *(guided session ships in a later release)* | 20 min |
| **Feynman** | Explain the topic in plain language, then compare with the source *(guided session ships in a later release)* | 20 min |
| **Leitner** | Box-based flashcard review *(guided session ships in a later release)* | 15 min |

Cards without a technique get a plain session screen with the material links and a single "Concluir"
action. An active card shows its estimated session length; a completed card shows the actual focused
time recorded on that session.

## Repository layout

```
studdup-core/   Pure Rust: domain types, scheduler, SQLite repository, migration, the api facade.
                No Tauri, no UI — the tested, coverage-gated heart of the app.
studdup/        The Tauri desktop app: resolves the DB path, migrates it, exposes core::api as
                #[tauri::command]s.
ui/             React + Vite + TypeScript frontend (kanban board, session screens, modals).
```

## Prerequisites

- **Rust** stable (developed against 1.97.1), installed via [rustup](https://rustup.rs). This
  provides `cargo`, `rustfmt` and `clippy`.
- **Node.js** 22+ and **npm** 10+ (developed against Node 22.17.0, npm 10.9.2).
- **cargo-llvm-cov** for the coverage gate: `cargo install cargo-llvm-cov`.
- Building the desktop shell additionally needs the platform WebView (WebView2 on Windows, WebKitGTK
  on Linux, WKWebView on macOS) and the C toolchain Tauri requires for your OS.

## Build

Compile the Rust workspace (core + desktop app):

```sh
cargo build
```

Install the UI dependencies and build the frontend bundle:

```sh
cd ui && npm install
npm --prefix ui run build
```

## Run

Run the frontend in Vite's dev server (hot-reloading UI at the printed `localhost` URL):

```sh
npm --prefix ui run dev
```

## Test

Run the Rust test suite (unit tests in `studdup-core/src`, integration tests in
`studdup-core/tests`):

```sh
cargo test
```

Run the frontend unit tests (Vitest):

```sh
npm --prefix ui run test
```

## Lint, format and coverage

```sh
cargo fmt --check
cargo clippy -- -D warnings
cargo llvm-cov -p studdup-core --fail-under-lines 70
```

Line coverage on `studdup-core` is currently ~91% (the gate requires ≥70%).

## Documentation

- [`ARCHITECTURE.md`](ARCHITECTURE.md) — the layer map, the stage-as-offset invariant, the database
  schema, and step-by-step guides for adding a new method or technique.
- [`AGENTS.md`](AGENTS.md) — conventions and invariants for any contributor (human or AI agent).
