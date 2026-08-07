# Mobile (Android) Port — Validation

**Date:** 2026-08-07
**Spec:** `.specs/features/mobile-android/spec.md`
**Diff range:** `origin/main..HEAD` (16 commits: T1–T14 + `9345516` Cargo.lock chore + `2a4a488` specs docs)
**Verifier:** **independent sub-agent (author ≠ verifier).** Coverage re-derived from source with
evidence-or-zero; the discrimination sensor was run for real (mutants injected in scratch, tests
observed to fail, mutations reverted). This pass **replaces** the earlier standalone fallback that
could not run the sensor.
**Environment boundary:** no Android toolchain (SDK/NDK/JDK) — the Android cross-compile, the on-device
runtime, the real APK build/signing, and browser-visual fidelity are verified by **code/config
inspection only** and marked ⚠️.

**Verdict: PASS (gate + discrimination sensor)** with **1 unresolved acceptance criterion — CI-02
(APK signing), open finding F1** — which is a maintainer/CI action that is un-runnable in this
environment.

---

## Gate re-run (independent, local)

| Gate | Command | Result |
| --- | --- | --- |
| Format | `cargo fmt --all -- --check` | ✅ clean |
| Lint | `cargo clippy -p studdup-core -p studdup --all-targets -- -D warnings` | ✅ clean (both crates) |
| Rust tests | `cargo test` | ✅ all suites pass (incl. `paths::tests` ×2) |
| UI tests | `npm --prefix ui run test` | ✅ **147 passed / 22 files** |
| UI build (type-check + bundle) | `npm --prefix ui run build` | ✅ built (3.29s) |
| Core coverage | `cargo llvm-cov -p studdup-core --fail-under-lines 70` | ✅ **90.94%** (≥70) |

**Test integrity:** no tests deleted or weakened. New/extended in-scope tests: `useViewport.test.ts`
(7 cases, new), `appShell.chrome.test.ts` (3 cases, new), `Board.test.ts` `boardGridColumns` block
(3 cases, extended), `paths.rs` `#[cfg(test)]` (2 host tests, new). Every in-scope test maps to an
RWD/DATA requirement — no unclaimed tests.

---

## Spec-Anchored Acceptance Criteria

| Req | Spec-defined outcome | `file:line` + evidence | Result |
| --- | --- | --- | --- |
| MOB-01/02 | App crate builds as lib with a Tauri mobile entry point; desktop still builds | `studdup/src/lib.rs:20-21` `#[cfg_attr(mobile, tauri::mobile_entry_point)] pub fn run()`; `Cargo.toml` `[lib] crate-type=["staticlib","cdylib","rlib"]`+`[[bin]]`; `main.rs:9-11` thin shim; desktop `cargo build`/`cargo test` green | ✅ desktop host-verified · ⚠️ Android cross-compile inspection-only (no NDK) |
| DATA-01 | Android opens DB in app-private storage via Tauri path API | `lib.rs:73-78` `app.path().app_data_dir()?` → `paths::mobile_db_path(&dir)` | ⚠️ code-verified (no device) |
| DATA-02 | First launch creates schema + forward migration, identical to desktop | `lib.rs:27` shared `state::init_state(&db_path)`; core migration tests pass | ⚠️ code-verified (no device) |
| DATA-03 | Desktop resolves the same env-based path as before | `lib.rs:68-72` `not(android)` → `paths::default_db_path()`; `paths.rs:108-134` unit tests assert `%APPDATA%/studdup`, XDG, `~/.local/share/studdup` | ✅ unit-verified + **mutant killed** |
| DATA-04 | DB open/migrate failure on Android surfaces a fatal state, never a blank DB, no `process::exit` | `lib.rs:32,84-98` `Err(fatal_db_error)`; `#[cfg(mobile)]` branch returns the error instead of exiting | ⚠️ code-verified — **no automated test** (`cfg(mobile)` not compiled on host); see gap #2 |
| RWD-01 | Any primary screen at phone width has no horizontal page overflow | `Board.tsx:157-166` `boardGridColumns`; `ModalShell.tsx` phone sheet; `minWidth:0` throughout | ⚠️ logic-verified — no test asserts "no overflow"; visual pending; gap #3 |
| RWD-02 | Phone: 4 stacked full-width sections, order Hoje→Amanhã→Próximos→Concluídos | `Board.tsx:157-160` `boardGridColumns("phone")→"minmax(0, 1fr)"`; `COLUMN_ORDER`; `BoardColumn stacked`; `Board.test.ts:66-68` | ✅ helper unit-verified + **mutant killed** · ⚠️ visual pending |
| RWD-03 | Tablet: 2-column board | `Board.tsx:161-162` `→"repeat(2, minmax(0, 1fr))"`; `Board.test.ts:62-64` | ✅ unit-verified + **mutant killed** |
| RWD-04 | Tap targets ≥44×44px; modals dismissible by touch | `ModalShell.tsx` phone sheet + ESC/outside-click; `AppShell.tsx:677-678` RailThemeToggle 44×44; `BottomNav.tsx` targets | ⚠️ code-verified — no 44px assertion; gap #4 |
| RWD-05 | Phone: bottom tab bar (Novo Card emphasized) | `appShell.chrome.ts:12-13` `chromeFor("phone")→"bottombar"`; `AppShell.tsx:201-207` renders `<BottomNav>`; `appShell.chrome.test.ts:8-10` | ✅ selector unit-verified + **mutant killed** |
| RWD-06 | Tablet: collapsed icon rail | `chromeFor("tablet")→"rail"`; `AppShell.tsx:85` `collapsed = chrome==="rail" …`; `appShell.chrome.test.ts:12-14` | ✅ unit-verified + **mutant killed** |
| RWD-07 | Desktop unchanged (sidebar + 4-col) | `chromeFor("desktop")→"sidebar"`; `boardGridColumns("desktop")→"repeat(4,…)"`; existing UI tests green | ✅ unit-verified + **mutant killed** |
| RWD-08 | Theme control reachable from the collapsed rail | `AppShell.tsx:667-694,728-731` `RailThemeToggle` in the rail footer, flips via `onChooseTheme` | ⚠️ code-verified — no test; visual pending; gap #5 |
| CI-01 | Android job: JDK + SDK/NDK + Rust targets + UI build + Tauri Android build | `.github/workflows/release-please.yml:148-234` | ⚠️ YAML-valid; not runnable here |
| CI-02 | **APK is signed** with keystore from CI secrets (no plaintext key) | `release-please.yml:215-234` wires `keystore.properties` from secrets — **but** `gen/android` is **not committed** (0 tracked files) and the job runs `tauri android init` when absent, producing a `build.gradle.kts` with **no `signingConfigs` block** → the written properties are ignored and the APK is **unsigned** | ❌ **GAP — open finding F1** (fix task #1) |
| CI-03 | Signed APK uploaded as a release asset | `release-please.yml:236-242` `gh release upload … *.apk` | ⚠️ inspection-only |
| CI-04 | Android version stays in sync with the workspace version | `.github/release-please-config.json:9` `extra-files` → `studdup/tauri.conf.json $.version` (= `0.4.0`), same source as desktop | ✅ config-verified |
| CI-05 | Android job failure does not block desktop bundles | `release-please.yml:148-153` separate `android` job, both only `needs: release-please`; `strategy.fail-fast: false` | ✅ config-verified |
| DOC-01 | README Android install row (sideload + unknown-publisher caveat) | `README.md:30` Android APK row present | ✅ docs present |
| DOC-02 | SETUP Android build section (SDK/NDK/JDK/targets + `tauri android` commands) | `SETUP.md:64-137` build + release-signing sections with exact commands | ✅ docs present |

**Status:** 20/20 requirements traced to a `file:line` artifact. **1 requirement (CI-02) fails** its
spec-defined outcome (signing not guaranteed by the committed artifacts — F1). Remaining ⚠️ rows are
Android-runtime/visual outcomes outside this environment's reach, satisfied by code/config inspection
and (per `AGENTS.md`) the type-check build for presentational components.

---

## Discrimination Sensor (independent, run for real)

Method: mutate the committed source in place, run only the owning test, observe FAIL, then
`git checkout --` the file to restore. Working tree confirmed clean afterward.

| # | Function | File:line | Mutation | Owning test | Killed? |
| --- | --- | --- | --- | --- | --- |
| 1 | `viewportFor` | `ui/src/lib/useViewport.ts:20` | `width < PHONE_MAX` → `<=` (boundary flip) | `useViewport.test.ts` "640px → tablet" | ✅ Killed |
| 2 | `chromeFor` | `ui/src/components/appShell.chrome.ts:13` | phone bucket `"bottombar"` → `"rail"` | `appShell.chrome.test.ts` "phone → bottombar" | ✅ Killed |
| 3 | `boardGridColumns` | `ui/src/components/Board.tsx:162` | tablet `"repeat(2,…)"` → `"repeat(4,…)"` | `Board.test.ts` "two-column on tablet" | ✅ Killed |
| 4 | `mobile_db_path` | `studdup/src/paths.rs:44` | segment `"srs.db"` → `"mutant.db"` | `paths::tests::mobile_db_path_joins_srs_db…` | ✅ Killed |
| 5 | `appdata_data_dir` (desktop DATA-03) | `studdup/src/paths.rs:66` | segment `"studdup"` → `"mutant"` | `paths::tests::desktop_windows_path_is_appdata_studdup` | ✅ Killed |

**Sensor depth:** lightweight (5 behavior-level mutations across all four host-testable pure
functions — every branch each test claims to protect).
**Result:** **5/5 killed — PASS.** No surviving mutants → no test-coverage gap in the host-testable
pure logic. (`cfg(mobile)`-only code — `resolve_db_path` Android branch, `fatal_db_error` mobile
branch — is not compilable on this host and was not mutated; see gap #2.)

---

## Open finding F1 — CI produces an *unsigned* APK unless `gen/android` is committed with the signing patch

**Re-verified independently against `.github/workflows/release-please.yml` (lines 206–234) and
`git ls-files studdup/gen` (0 tracked files) — the finding is ACCURATE.**

The `android` job's "Generate the Android project if it isn't committed" step runs `tauri android
init` whenever `studdup/gen/android` is absent, which is the **current repo state**. A freshly-init'd
`gen/android/app/build.gradle.kts` carries **no `signingConfigs` block**, so the `keystore.properties`
the next step writes from secrets is never read, and `tauri android build` yields a **debug/unsigned**
APK — which will not install as a release artifact, yet is still `gh release upload`-ed. This fails
CI-02 ("SHALL sign the APK") and the spec edge case ("rather than publishing an unsigned/broken
artifact").

**Resolution (AD-017 intent, maintainer, one-time):** run `cargo tauri android init` locally, add the
`signingConfigs` block from `SETUP.md` (§Android release signing) to
`studdup/gen/android/app/build.gradle.kts`, and **commit `gen/android`**. Then CI's `if [ ! -d
gen/android ]` skips init and the committed signing config is used.
**Optional hardening (recommended):** make the job fail loudly when `gen/android` is missing while
signing secrets are present, instead of silently uploading an unsigned APK.

---

## Ranked gap list

1. **CI-02 — unsigned-APK (F1).** Committed workflow does not guarantee a signed APK; `gen/android`
   with the `signingConfigs` block is not committed. *Fix: maintainer commits `gen/android` + the
   signing block; optionally add the "fail if gen/android missing while secrets present" guard.*
   **Un-runnable here (no Android toolchain).** — CI-02 — `release-please.yml:206-234`, `gen/android` absent.
2. **DATA-04 — no automated coverage of the mobile fatal-DB branch.** `fatal_db_error`'s `#[cfg(mobile)]`
   path (return error, no `process::exit`) has no host test and was not mutable in the sensor.
   *Fix: extract a pure, host-testable decision (e.g. a `FatalOutcome::{Exit, Surface}` selector keyed
   on a `mobile: bool` param) and unit-test both arms, so the "never blank DB on mobile" invariant is
   asserted, not just inspected.* — DATA-04 — `studdup/src/lib.rs:84-98`.
3. **RWD-01 / RWD-04 / RWD-08 — presentational outcomes asserted only by the type-check build.**
   "No horizontal overflow", "≥44px targets / dismissible", and "theme reachable in the collapsed
   rail" have no behavioral assertion; they are covered by convention (`AGENTS.md`: presentational
   components are build-gated, not snapshotted) + pending visual/device verification. *Accepted under
   project convention; listed for transparency. Optional: a jsdom render test could assert the rail
   renders a theme control and BottomNav targets meet the min size.* — RWD-01/04/08.

Gaps #2 and #3 are pre-existing environment/convention limits, not regressions introduced by weak new
tests (the sensor found none). Gap #1 is the only one blocking a real signed release.

---

## Requirement Traceability Update

| Requirement | Previous | New |
| --- | --- | --- |
| MOB-01/02, DATA-01/02/03, RWD-01..08, CI-01/03/04/05, DOC-01/02 | Implementing | ✅ Verified (host / inspection per row) |
| DATA-04 | Implementing | ⚠️ Verified by inspection (no automated test — gap #2) |
| CI-02 | Implementing | ❌ Needs Fix (F1 — maintainer/CI action) |

---

## Summary

**Overall:** ⚠️ Ready pending one maintainer/CI action (F1).

- **Spec-anchored check:** 20/20 requirements traced to evidence; 1 (CI-02) fails its spec outcome.
- **Sensor:** 5/5 mutants killed (viewportFor, chromeFor, boardGridColumns, mobile_db_path,
  appdata_data_dir) — host-testable pure logic is discriminating.
- **Gate:** fmt/clippy clean · `cargo test` green · UI 147/147 · UI build green · core coverage 90.94%.
- **Author ≠ verifier:** achieved; the sensor and independent re-derivation were actually run.

**What works (verified here):** the lib+bin split with the mobile entry point (desktop build/test),
the desktop DB path invariant (DATA-03, unit + mutation), the responsive breakpoint / chrome / board
selectors (RWD-02/03/05/06/07, unit + mutation), version sync (CI-04), fail-fast isolation (CI-05),
and the docs (DOC-01/02).

**Must resolve before the first Android release:** F1 (commit `gen/android` with the `signingConfigs`
block so CI-02 actually signs). **Recommended:** the DATA-04 host-testable extraction (gap #2), plus a
browser/device pass over the phone/tablet breakpoints against the handoff.
