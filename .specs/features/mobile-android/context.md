# Mobile (Android) Port — Context

**Gathered:** 2026-08-06
**Spec:** `.specs/features/mobile-android/spec.md`
**Status:** Ready for design

---

## Feature Boundary

Ship an **Android build** of the existing Studdup app from the same monorepo: same `studdup-core`
(Rust) and React UI, packaged as a signed APK by CI and attached to each GitHub release, staying
fully local-first (per-device SQLite, no backend). Includes the responsive work needed to make the
existing screens usable on a phone. Excludes iOS, cloud sync, Play Store, and any domain/scheduling
change.

---

## Implementation Decisions

### Platform & distribution (discussed, confirmed)

- **Android only** this cycle. iOS deferred (needs Mac + paid Apple account).
- Distribution is a **self-signed release APK attached to GitHub Releases** for sideload. Play Store
  deferred.
- Signing uses a **maintainer-generated keystore** stored as CI secrets (base64 keystore + key/store
  passwords). Generating the key is a maintainer action, not a code task.

### Data path (agent decision, locked)

- **Desktop keeps `paths::default_db_path()`** exactly as-is (env-based `%APPDATA%/studdup` etc.) so
  existing users' data and the MIG-01 legacy-copy behavior are untouched.
- **Android resolves the DB via Tauri's path API** (`app_data_dir`) inside the Tauri `setup` hook —
  because on Android there is no `APPDATA`/`HOME`/`XDG` and the current code would fall to a relative
  `data/srs.db`.
- Implication for structure: DB open + migration must move from `main()` (pre-builder) into a
  platform-aware setup step so the mobile path resolver is available. Desktop path selection stays
  identical in observable behavior.

### App structure (agent decision, locked)

- Restructure the `studdup` crate into **lib + bin**: a `run()` function annotated with the Tauri
  **mobile entry point**, called by both `main.rs` (desktop) and the generated Android project.
- Commit the generated `studdup/gen/android` project (holds gradle/signing config + plugin
  registration) for reproducible, reviewable CI builds.

### Identifier (pending user sign-off)

- Proposed rename `com.studdup.desktop` → `com.studdup.app` (shared as the Android `applicationId`).
  Safe because desktop data is env-based, not identifier-bound, and no updater is configured.

### Responsive UI (deferred to Design)

- The concrete mobile navigation pattern and phone board layout (stacked sections vs. a column
  switcher vs. tabs) are **design decisions**, captured in `design-brief.md` / `design-prompts.md`.
  The spec only fixes the invariants: no horizontal overflow, all four columns reachable, touch-sized
  targets, no desktop regression.

### Agent's Discretion

- Min Android version (default `minSdk 24`), Rust Android target list, and CI action versions —
  agent picks current, working defaults during Design/Tasks.

### Declined / Undiscussed Gray Areas → Assumptions

- All gray areas are either resolved above or logged in the spec's Assumptions & Open Questions table.
  None were declined.

---

## Specific References

- The user cited **Obsidian's model** as the north star for monetization: local-first and free, with
  cross-device **sync as the paid tier** — which is why no backend is built now and the local SQLite
  design is preserved unchanged.

---

## Deferred Ideas

- iOS build (separate cycle; new AD when it happens).
- Cloud sync / account tier (the future paid feature; will need its own spec + backend design).
- Google Play Store distribution (AAB, dev account, store listing).
- Data export/backup on mobile (uninstall currently deletes the local DB).
