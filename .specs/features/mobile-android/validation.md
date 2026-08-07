# Mobile (Android) Port — Validation

**Branch:** `feat/mobile-android` · **Diff range:** `origin/main..HEAD` (15 commits: T1–T14 + 1 chore)
**Verifier:** standalone fallback run by the orchestrator (the independent Verifier sub-agent could
**not** be dispatched — the monthly API spend limit was hit mid-Batch-2). **Author ≠ verifier was NOT
achieved** for this pass; treat the sensor/mutation results below as *not run*.
**Verdict:** **PASS (build/test gate)** with **1 open precondition** on CI signing (below).

---

## Gate re-run (orchestrator, local — not API-dependent)

| Gate | Result |
| --- | --- |
| `cargo fmt --all -- --check` | ✅ clean |
| `cargo clippy -p studdup-core -p studdup --all-targets -- -D warnings` | ✅ clean (both crates) |
| `cargo test` | ✅ all Rust suites pass |
| `npm --prefix ui run test` | ✅ **147 passed** (22 files) |
| `npm --prefix ui run build` (type-check + bundle) | ✅ built |
| `cargo llvm-cov -p studdup-core --fail-under-lines 70` | ✅ 90.94% (recorded by Batch 1; core untouched after) |

---

## Per-AC evidence (spec-anchored)

| Req | Evidence | Status |
| --- | --- | --- |
| MOB-01/02 | `lib.rs` `run()` `#[cfg_attr(mobile, mobile_entry_point)]`; `main.rs` thin; `Cargo.toml` `[lib]`+`[[bin]]`; desktop build/test green | ✅ host-verified |
| DATA-01/02 | DB open+migrate moved to Tauri `setup`; Android path `app_data_dir()/srs.db` | ⚠️ code-verified; device run NOT possible here |
| DATA-03 | `paths.rs` unit tests assert desktop resolver unchanged (`%APPDATA%/studdup`, XDG, `~/.local/share`) | ✅ unit-verified |
| DATA-04 | `lib.rs::fatal_db_error` returns err on mobile (no `process::exit`), keeps exit on desktop | ⚠️ code-verified |
| RWD-01 | `boardGridColumns`, sheet reflow; type-check build green | ✅ logic-verified; visual pending browser/device |
| RWD-02/03 | `boardGridColumns(viewport)` unit-tested (phone 1-col / tablet 2-col / desktop 4-col); `BoardColumn` `stacked` page-scroll | ✅ helper unit-verified |
| RWD-04 | `ModalShell` phone sheet, z-index above fixed BottomNav, ESC/outside-click | ⚠️ code-verified; visual pending |
| RWD-05/06/07 | `chromeFor(viewport)` unit-tested (phone→bottombar, tablet→rail, desktop→sidebar); existing shell tests green | ✅ unit-verified |
| RWD-08 | sun/moon toggle in collapsed rail footer | ⚠️ code-verified; visual pending |
| CI-01/03/05 | `android` job (JDK/SDK/NDK/targets, build, `.apk` upload), `fail-fast:false`, gated on release_created | ⚠️ YAML valid; APK build NOT runnable here |
| CI-02 | keystore decoded from secrets → `keystore.properties`; signing documented in SETUP.md | ⚠️ **see open finding** |
| CI-04 | `tauri.conf.json $.version` synced by release-please | ✅ config-verified |
| DOC-01/02 | README Android install row + SETUP Android build/signing sections | ✅ docs present |

Legend: ✅ verified in this environment · ⚠️ verified by code/config inspection only (Android
runtime + visual fidelity require CI / a device / the browser preview, out of this environment's reach).

---

## Open finding (must resolve before the first real Android release)

**F1 — CI produces an *unsigned* APK unless `gen/android` is committed with the signing patch.**
The `android` job runs `tauri android init` when `studdup/gen/android` is absent (current state). A
freshly-generated `build.gradle.kts` has **no `signingConfigs` block**, so the `keystore.properties`
the job writes is ignored and `tauri android build` yields a debug/unsigned APK — which will not
install as a release artifact, yet still gets uploaded to the release.
**Resolution (AD-017 intent):** the maintainer runs `cargo tauri android init` locally once, applies
the `signingConfigs` block from SETUP.md to `studdup/gen/android/app/build.gradle.kts`, and **commits
`gen/android`**. Then CI's `if [ ! -d gen/android ]` skips init and the committed signing config is
used. *Optional hardening:* make the job fail loudly if `gen/android` is missing while signing secrets
are present, instead of silently uploading an unsigned APK.
**Status:** documented precondition, not a code defect. Tracked here + in SETUP.md.

---

## Not run (spend-limit)

- **Discrimination sensor / mutation pass** — NOT executed (would require the Verifier sub-agent).
- **Independent author≠verifier review** — NOT achieved.
- **On-device smoke test** and **browser-preview visual check** against the handoff — pending
  (need the Android toolchain / a running app).

**Recommended:** once the spend limit is raised, run the full Verifier (spec-anchored outcome check +
discrimination sensor) as an independent pass; and do the browser-preview visual verification of the
phone/tablet breakpoints against `design/handoff/project/*.dc.html`.
