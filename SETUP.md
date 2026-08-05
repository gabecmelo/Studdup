# Developer setup

How to build, run and test Studdup from source. If you just want to *use* the app, download a
prebuilt installer from the [Releases page](https://github.com/gabecmelo/Studdup/releases/latest) —
see the [README](README.md).

## Repository layout

```
studdup-core/   Pure Rust: domain types, scheduler, SQLite repository, migration, the api facade.
                No Tauri, no UI — the tested, coverage-gated heart of the app.
studdup/        The Tauri desktop app: resolves the DB path, migrates it, exposes core::api as
                #[tauri::command]s, and holds the tauri.conf.json + icons.
ui/             React + Vite + TypeScript frontend (kanban board, session screens, modals).
```

The Rust side is a Cargo workspace (`studdup-core` + `studdup`); the frontend is a separate npm
project in `ui/` that the Tauri app embeds from `ui/dist` at build time.

## Prerequisites

- **Rust** stable (developed against 1.97+), via [rustup](https://rustup.rs) — provides `cargo`,
  `rustfmt` and `clippy`.
- **Node.js** 22+ and **npm** 10+.
- **cargo-llvm-cov** for the coverage gate: `cargo install cargo-llvm-cov`.
- The Tauri toolchain for your OS (WebView + C toolchain): see the
  [Tauri v2 prerequisites](https://v2.tauri.app/start/prerequisites/). On Debian/Ubuntu that is
  roughly `libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev
  libayatana-appindicator3-dev librsvg2-dev`.

## Build

Compile the Rust workspace (core + desktop app):

```sh
cargo build
```

Install the UI dependencies and build the frontend bundle (the app embeds `ui/dist`):

```sh
npm --prefix ui ci
npm --prefix ui run build
```

## Run

Frontend only, in Vite's dev server (hot-reloading UI at the printed `localhost` URL — note the
Tauri commands won't respond outside the desktop shell):

```sh
npm --prefix ui run dev
```

To produce distributable bundles (installers), use the Tauri CLI from the app crate — this is what
CI does on a release:

```sh
cargo install tauri-cli --version "^2"
npm --prefix ui run build        # ui/dist must exist first
cargo tauri build                # bundles land in target/release/bundle/
```

## Test

```sh
cargo test                       # Rust unit + integration tests
npm --prefix ui run test         # Vitest frontend suite
```

## Lint, format & coverage

```sh
cargo fmt --all --check
cargo clippy -p studdup-core --all-targets -- -D warnings
cargo llvm-cov -p studdup-core --fail-under-lines 70
```

Line coverage on `studdup-core` is well above the 70% gate.

## Releasing

Releases are automated with [release-please](https://github.com/googleapis/release-please). Merging
Conventional-Commit changes to `main` opens a release PR; merging that PR tags the release and the
workflow builds and attaches the per-OS bundles. Use **merge commits** (not squash) so the
individual `feat:`/`fix:` commits reach `main` — a squash collapses them into one non-conventional
subject and release-please sees nothing to release.

## More

- [`ARCHITECTURE.md`](ARCHITECTURE.md) — the layer map, the stage-as-offset invariant, the database
  schema, and step-by-step guides for adding a new method or technique.
- [`AGENTS.md`](AGENTS.md) — conventions and invariants for any contributor (human or AI agent).
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — how to propose and land a change.
- `.specs/` — the spec-driven record: requirements, decisions (AD-NNN) and lessons.
