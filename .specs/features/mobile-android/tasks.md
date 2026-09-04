# Mobile (Android) Port — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute
flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source
of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier,
discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Design**: `.specs/features/mobile-android/design.md`
**Status**: All 14 tasks committed on `feat/mobile-android`; build/test gate green. Independent
Verifier NOT run (API spend limit) — see `validation.md` (standalone fallback + open finding F1 on CI
signing). Phase 3 (T8 `c31d106`, T9 `5bb62a9`, T10 `3cfca23`) · Phase 4 (T11 `228e9f2`, T12 `9349460`,
T13 `b74efc6`, T14 `a9eda81`).

> **Progress — Batch 1 (T1–T7), branch `feat/mobile-android`:** all done, one atomic commit each,
> full build gate green (core coverage 90.94%, UI 144 tests).
> T1 `f899b7a` · T2 `cc954cf` · T3 `9d6a8c8` · T4 `4fef40b` · T5 `95e2f96` · T6 `f0f4e81` · T7 `456c86f`
> (+ `9345516` chore: Cargo.lock 0.4.0 sync). Notes for Batch 2: `useViewport.ts` exports `viewportFor`,
> `PHONE_MAX`(640), `TABLET_MAX`(1024); phone `main` reserves `paddingBottom: calc(58px + safe-area)`
> and the board still scrolls internally → T9 must switch phone board to page-scroll; `BottomNav` is
> `position:fixed z-index:50` → T10 sheets must sit above it; version stays `0.4.0`; `gen/android` not
> generated yet (T13 needs maintainer `tauri android init`).

> **Environment boundary (read first).** This dev environment can run `cargo` and `npm` (host build +
> tests), so Phases 1–3 are fully gate-able here. It **cannot** run the Android toolchain
> (`tauri android build`, `tauri android init` need Android SDK/NDK/JDK). Phase 4 therefore produces
> config/workflow/gradle/docs whose local gate is *validity + desktop build unaffected*; the real APK
> build + device smoke test are verified in **CI / on the maintainer's device**. Tasks that need the
> Android toolchain are marked **[maintainer/CI]**.

---

## Test Coverage Matrix

> Generated from codebase + project guidelines. Guidelines found: `AGENTS.md` (Building/testing/linting
> + Testing conventions + ≥70% core coverage gate), `.github/workflows/ci.yml`, `CONTRIBUTING.md`,
> `SETUP.md`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Core domain / scheduler | unit (co-located `#[cfg(test)]`) | 1:1 to spec ACs; every edge case | `studdup-core/src/**` | `cargo test` |
| Core repository / api | integration | key query paths + errors | `studdup-core/tests/*.rs` | `cargo test` |
| App crate (Tauri bridge `studdup/`) | none — thin bridge, **build + clippy gate**; any extractable pure helper gets a unit test | (build gate) | `studdup/src/*.rs` | `cargo clippy -p studdup --all-targets -- -D warnings && cargo build && cargo test` |
| Frontend pure logic (viewport, grid, chrome, placement, validation) | unit (Vitest) | all branches + edge cases | `ui/src/**/*.test.ts` | `npm --prefix ui run test` |
| Frontend presentational components | none — covered by the type-check **build**, NOT snapshots (AGENTS.md) | (build gate) | `ui/src/**/*.tsx` | `npm --prefix ui run build` |
| CI / config / gradle / docs | none — validity gate only; APK build verified in CI/device | (build gate) | `.github/**`, `studdup/gen/android/**`, `*.md` | see Build gate |

## Gate Check Commands

> From `AGENTS.md` + `ci.yml`. Confirm before Execute.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick (Rust) | after Rust unit/integration-only tasks | `cargo test` |
| Quick (UI) | after UI pure-logic-only tasks | `npm --prefix ui run test` |
| Full | after tasks spanning Rust + UI | `cargo test && npm --prefix ui run test` |
| Build | phase completion / presentational / config tasks | `cargo fmt --all -- --check && cargo clippy -p studdup-core --all-targets -- -D warnings && cargo clippy -p studdup --all-targets -- -D warnings && cargo build && npm --prefix ui run build && npm --prefix ui run test && cargo llvm-cov -p studdup-core --fail-under-lines 70` |

---

## Execution Plan

Phases run sequentially; tasks run in order within a phase.

### Phase 1: Rust app crate builds for Android (host-gate-able)

```
T1 → T2 → T3
```

### Phase 2: Responsive foundation + navigation shells

```
T4 → T5 → T6 → T7
```

### Phase 3: Responsive board + touch sheets

```
T8 → T9 → T10
```

### Phase 4: CI Android build, signing, version sync, docs  [maintainer/CI verified]

```
T11 → T12 → T13 → T14
```

---

## Task Breakdown

### T1: Split `studdup` into lib + bin with a Tauri mobile entry point

**What**: Add `studdup/src/lib.rs` exposing `pub fn run()` annotated `#[cfg_attr(mobile,
tauri::mobile_entry_point)]` that builds the Tauri app (plugins + the existing `invoke_handler!`
registry); slim `main.rs` to call `studdup_lib::run()`; add `[lib] crate-type = ["staticlib",
"cdylib", "rlib"]` + `[[bin]]` to `studdup/Cargo.toml`.
**Where**: `studdup/src/lib.rs` (new), `studdup/src/main.rs` (modify), `studdup/Cargo.toml` (modify)
**Depends on**: None
**Reuses**: the whole builder + `generate_handler!` list currently in `main.rs`; `state::AppState`
**Requirement**: MOB-01, MOB-02

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `run()` exists with the mobile-entry-point attribute; `main.rs` only calls it (keeps
      `windows_subsystem` attr).
- [ ] Desktop still builds and runs: `cargo build` + `cargo test` pass.
- [ ] `cargo clippy -p studdup --all-targets -- -D warnings` clean.
- [ ] Test count: existing Rust suite still green (no deletions).

**Tests**: none (thin bridge — build+clippy gate) · **Gate**: build

---

### T2: Platform-branched DB path + open/migrate in the Tauri `setup` hook

**What**: Move DB open + migration out of `main()` into a `setup` closure in `run()`; resolve the path
per platform — desktop `paths::default_db_path()` (unchanged), Android
`app.path().app_data_dir()?.join("srs.db")` (create dir); on `init_state` error surface a fatal
managed-error state (no `process::exit` on mobile). Add a `paths::mobile_db_path(&Path)` helper and a
unit test asserting (a) the mobile join, and (b) the desktop resolver is byte-for-byte unchanged
(`%APPDATA%/studdup` / `$XDG_DATA_HOME` / `~/.local/share/studdup`).
**Where**: `studdup/src/lib.rs` (modify), `studdup/src/paths.rs` (modify + `#[cfg(test)]`),
`studdup/src/state.rs` (reuse; maybe a fatal-flag variant)
**Depends on**: T1
**Reuses**: `state::init_state`, `paths::default_db_path`
**Requirement**: DATA-01, DATA-02, DATA-03, DATA-04

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Setup hook opens+migrates via the platform-resolved path; desktop path identical to before.
- [ ] Unit test covers desktop-path-unchanged (DATA-03) + mobile path join.
- [ ] Fatal-on-error path does not `process::exit` on mobile (surfaced state/log).
- [ ] `cargo test` + `cargo clippy -p studdup ... -D warnings` pass.
- [ ] Test count: +≥2 unit tests in `paths.rs`.

**Tests**: unit (paths helper) · **Gate**: quick (Rust)

---

### T3: Rename bundle identifier to `com.studdup.app` + mobile config

**What**: Change `identifier` `com.studdup.desktop` → `com.studdup.app` in `tauri.conf.json`; add the
minimal mobile config bits Tauri v2 needs (e.g. `app` / bundle already fine; ensure no
desktop-only-required fields break mobile). No behavior change on desktop.
**Where**: `studdup/tauri.conf.json` (modify)
**Depends on**: T1
**Reuses**: existing config
**Requirement**: MOB-01 (identifier per AD-017)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Identifier is `com.studdup.app`; JSON valid; `cargo build` still succeeds (config parses).
- [ ] No desktop regression (`npm --prefix ui run build` + `cargo build`).

**Tests**: none (config) · **Gate**: build

---

### T4: `useViewport()` hook + pure `viewportFor(width)` helper

**What**: New `ui/src/lib/useViewport.ts`: `viewportFor(width): 'phone'|'tablet'|'desktop'`
(`<640`/`<1024`/else) and a `useViewport()` hook subscribing to `resize` (SSR-safe → `'desktop'`).
Unit-test the pure `viewportFor` at the breakpoint edges (639/640/1023/1024/360/1440).
**Where**: `ui/src/lib/useViewport.ts` (new), `ui/src/lib/useViewport.test.ts` (new)
**Depends on**: None
**Reuses**: the resize-listener pattern in `AppShell.tsx`
**Requirement**: RWD-01 (infra for all RWD)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `viewportFor` returns correct bucket at all listed edges.
- [ ] `useViewport` is SSR/no-`window` safe.
- [ ] `npm --prefix ui run test` passes; test count +≥1 file (≥6 cases).

**Tests**: unit · **Gate**: quick (UI)

---

### T5: `BottomNav` component (phone navigation)

**What**: New `ui/src/components/BottomNav.tsx` — a fixed bottom tab bar of `ROUTES` with Novo Card
emphasized, ≥44px targets, `env(safe-area-inset-bottom)` padding, active-item accent. Built to the
`ShellCelular.dc.html` handoff.
**Where**: `ui/src/components/BottomNav.tsx` (new)
**Depends on**: T4
**Reuses**: `ROUTES`, `NavGlyph`, `NovoCardButton` styling, `tokens.css`
**Requirement**: RWD-05

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Renders all routes + emphasized Novo Card; matches handoff; ≥44px targets; safe-area padding.
- [ ] `npm --prefix ui run build` (type-check) passes.

**Tests**: none (presentational — build gate) · **Gate**: build

---

### T6: `AppShell` selects chrome by viewport (sidebar / rail / bottom bar)

**What**: Switch `AppShell` from the `narrow` boolean to `useViewport()`: `desktop` → existing
sidebar; `tablet` → existing collapsed rail; `phone` → `<BottomNav>` with no left rail and
full-width content. Extract a pure `chromeFor(viewport): 'sidebar'|'rail'|'bottombar'` and unit-test
it. Method switcher stays promoted at every breakpoint (AD-009). No desktop regression.
**Where**: `ui/src/components/AppShell.tsx` (modify), `ui/src/components/appShell.chrome.ts` (+ test)
**Depends on**: T4, T5
**Reuses**: existing Sidebar/rail, `MethodSwitcher`
**Requirement**: RWD-05, RWD-06, RWD-07

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `chromeFor` maps phone→bottombar, tablet→rail, desktop→sidebar (unit-tested).
- [ ] Desktop layout unchanged; existing UI tests still green.
- [ ] `npm --prefix ui run test` + `npm --prefix ui run build` pass; test count +≥1 file.

**Tests**: unit (chrome selector) · **Gate**: full

---

### T7: Theme toggle in the collapsed rail (RWD-08 fix)

**What**: Add a compact sun/moon theme toggle to the collapsed `Sidebar` rail footer that flips
`light`↔`dark` via the existing `onChooseTheme`, so Claro/Escuro no longer vanishes when the sidebar
collapses (tablet + desktop-collapsed). Phone needs nothing (Configurações already hosts it).
**Where**: `ui/src/components/AppShell.tsx` (modify — collapsed `Sidebar`)
**Depends on**: T6
**Reuses**: `onChooseTheme`, `resolveTheme`, the expanded-sidebar `ThemePill` styling
**Requirement**: RWD-08

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Collapsed rail shows a working theme toggle; desktop expanded sidebar unchanged.
- [ ] `npm --prefix ui run build` passes.

**Tests**: none (presentational — build gate) · **Gate**: build

---

### T8: `boardGridColumns(viewport)` + Board container reflow

**What**: New pure `boardGridColumns(viewport)` → desktop `repeat(4,minmax(0,1fr))`, tablet
`repeat(2,minmax(0,1fr))`, phone single column; drive the Board container with it via `useViewport()`.
Placement logic (`groupByColumn`/`placeCard`/`placeAtDue`) untouched. Unit-test the helper.
**Where**: `ui/src/components/Board.tsx` (modify), `ui/src/components/Board.test.ts` (extend)
**Depends on**: T4
**Reuses**: `columns.ts`, existing placement helpers
**Requirement**: RWD-02, RWD-03

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `boardGridColumns` returns correct template per viewport (unit-tested).
- [ ] Existing `Board.test.ts` placement tests still green (unchanged behavior).
- [ ] `npm --prefix ui run test` passes; test count +≥3 cases.

**Tests**: unit · **Gate**: quick (UI)

---

### T9: `BoardColumn` stacked variant (phone sections)

**What**: Give `BoardColumn` a `stacked` mode (phone): drop the inner `overflowY:auto`/`minHeight:0`
so each column grows to its content and the page scrolls; keep the sticky header + empty-state
placeholder. Order stays Hoje→Amanhã→Próximos→Concluídos. Built to `QuadroCelular.dc.html`.
**Where**: `ui/src/components/Board.tsx` (modify)
**Depends on**: T8
**Reuses**: `EmptyState`, existing column chrome
**Requirement**: RWD-02

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Phone shows 4 stacked full-width sections, no horizontal overflow; tablet 2-col; desktop 4-col.
- [ ] `npm --prefix ui run build` + `npm --prefix ui run test` pass.

**Tests**: none (presentational — build gate; helper covered in T8) · **Gate**: build

---

### T10: Touch sheet sizing in `ModalShell` (phone modals)

**What**: Add a phone "sheet" branch to `ModalShell` (full-width bottom/edge sheet, internal scroll,
≥44px controls, dismiss by touch — outside-click/ESC already exist) driven by `useViewport()`; applies
to Detalhe/Adiar/NovoCard/NovaProva/Excluir. Built to the `Sheet*.dc.html` handoff. Desktop modals
unchanged.
**Where**: `ui/src/components/ModalShell.tsx` (modify)
**Depends on**: T4
**Reuses**: `ModalShell`, `useEscapeToClose`
**Requirement**: RWD-01, RWD-04

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Phone renders modals as full-width sheets, no horizontal overflow, ≥44px controls; desktop
      modals unchanged.
- [ ] `npm --prefix ui run build` passes.

**Tests**: none (presentational — build gate) · **Gate**: build

---

### T11: Android app-version sync in release-please  [maintainer/CI]

**What**: Ensure the Android app version tracks the workspace version bumped by release-please — via
`tauri.conf.json $.version` (already synced) and, once `gen/android` exists, a
`gen/android/app/tauri.properties` / gradle version updater in `release-please-config.json` extra-files
if needed.
**Where**: `.github/release-please-config.json` (modify)
**Depends on**: T3
**Reuses**: existing `extra-files` pattern
**Requirement**: CI-04

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Config is valid JSON; Android version derives from the same source as desktop.

**Tests**: none (config) · **Gate**: build (JSON validity + `cargo build`)

---

### T12: Android build job in the release workflow  [maintainer/CI]

**What**: Add an `android` job to `.github/workflows/release-please.yml`: setup JDK 17, Android
SDK/NDK, `rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android
x86_64-linux-android`, build the UI (`npm ci && npm run build`), run the Tauri Android build (APK),
resolve the release id from the tag (reuse existing step), upload the `*.apk`. `fail-fast: false` so
it never blocks the desktop matrix.
**Where**: `.github/workflows/release-please.yml` (modify)
**Depends on**: T11
**Reuses**: the `Resolve release id from tag` + `releaseId` upload steps already present
**Requirement**: CI-01, CI-03, CI-05

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Job added with `fail-fast: false`; YAML parses; desktop jobs unchanged.
- [ ] Uploads a `*.apk` asset (verified in CI on the maintainer's next tagged release).

**Tests**: none (workflow) · **Gate**: build (YAML validity + desktop build unaffected)

---

### T13: APK signing config + `gen/android` prerequisites  [maintainer/CI]

**What**: Add the release-signing config to `gen/android/app/build.gradle.kts` reading CI secrets
(`ANDROID_KEY_BASE64` decoded to a keystore, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`,
`ANDROID_STORE_PASSWORD`); add a focused `.gitignore` for gradle build outputs
(`gen/android/app/build`, `gen/android/.gradle`); document the one-time maintainer step
`npm --prefix ui ... && cd studdup && cargo tauri android init` and the `keytool` keystore command.
**Where**: `studdup/gen/android/app/build.gradle.kts` (modify — after init), `.gitignore` (modify),
`SETUP.md` (modify)
**Depends on**: T12
**Reuses**: —
**Requirement**: CI-02

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Signing config reads secrets (no plaintext key committed); `.gitignore` excludes gradle outputs.
- [ ] Maintainer steps (`tauri android init`, `keytool`, adding the 4 GitHub secrets) documented.
- [ ] APK installs on a device (verified by the maintainer — device smoke test).

**Tests**: none (gradle/config) · **Gate**: build (file validity)

---

### T14: Docs — Android install (README) + build (SETUP)

**What**: README download table gains an **Android APK** row with sideload instructions (enable
"install unknown apps", unsigned-publisher caveat); SETUP.md gains an Android section (Android
Studio/SDK/NDK, JDK, Rust targets, `tauri android dev/build`).
**Where**: `README.md` (modify), `SETUP.md` (modify)
**Depends on**: T13
**Reuses**: existing README/SETUP structure
**Requirement**: DOC-01, DOC-02

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] README shows the Android install row; SETUP has the Android build section with exact commands.

**Tests**: none (docs) · **Gate**: build (links/format)

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4

Phase 1:  T1 ──→ T2 ──→ T3
Phase 2:  T4 ──→ T5 ──→ T6 ──→ T7
Phase 3:  T8 ──→ T9 ──→ T10
Phase 4:  T11 ──→ T12 ──→ T13 ──→ T14
```

Strictly sequential; one task at a time.

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1 lib+bin split | 1 crate wiring (2 files + manifest) | ✅ cohesive |
| T2 DB path setup hook | 1 concern (path+open) + helper test | ✅ |
| T3 identifier rename | 1 config change | ✅ |
| T4 useViewport | 1 hook + 1 helper | ✅ |
| T5 BottomNav | 1 component | ✅ |
| T6 AppShell chrome | 1 selector + shell wiring | ✅ |
| T7 rail theme toggle | 1 control | ✅ |
| T8 boardGridColumns | 1 helper + container | ✅ |
| T9 BoardColumn stacked | 1 variant | ✅ |
| T10 ModalShell sheet | 1 sizing branch | ✅ |
| T11 version sync | 1 config | ✅ |
| T12 android job | 1 workflow job | ✅ |
| T13 signing | 1 gradle config + ignore | ✅ |
| T14 docs | 2 doc files, cohesive | ✅ |

## Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagram | Status |
| --- | --- | --- | --- |
| T1 | None | start | ✅ |
| T2 | T1 | T1→T2 | ✅ |
| T3 | T1 | T2→T3 (Phase order; T3 needs only T1) | ✅ within phase |
| T4 | None | start of Ph2 | ✅ |
| T5 | T4 | T4→T5 | ✅ |
| T6 | T4, T5 | T5→T6 | ✅ |
| T7 | T6 | T6→T7 | ✅ |
| T8 | T4 | start of Ph3 | ✅ (T4 in Ph2, backward) |
| T9 | T8 | T8→T9 | ✅ |
| T10 | T4 | T9→T10 (Phase order; needs T4) | ✅ backward |
| T11 | T3 | start of Ph4 | ✅ backward |
| T12 | T11 | T11→T12 | ✅ |
| T13 | T12 | T12→T13 | ✅ |
| T14 | T13 | T13→T14 | ✅ |

All dependencies point backward or within-phase. ✅

## Test Co-location Validation

| Task | Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | app crate (bridge) | none (build gate) | none | ✅ |
| T2 | app crate helper (`paths.rs`) | unit if extractable | unit | ✅ |
| T3 | config | none | none | ✅ |
| T4 | FE pure logic | unit | unit | ✅ |
| T5 | FE presentational | none (build) | none | ✅ |
| T6 | FE pure logic (chrome selector) | unit | unit | ✅ |
| T7 | FE presentational | none (build) | none | ✅ |
| T8 | FE pure logic (grid helper) | unit | unit | ✅ |
| T9 | FE presentational | none (build) | none | ✅ |
| T10 | FE presentational | none (build) | none | ✅ |
| T11–T14 | config/workflow/gradle/docs | none | none | ✅ |

No violations. Presentational `none` is valid per AGENTS.md (components covered by the type-check
build, not snapshots); the pure logic each visual task leans on is unit-tested in T4/T6/T8.
