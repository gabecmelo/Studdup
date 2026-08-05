# LESSONS — auto-maintained by scripts/lessons.py

> Machine-owned. Do NOT hand-edit. Changes are overwritten on the next `lessons.py` write.
> Canonical state lives in `.specs/lessons.json`. Edit lessons only via the script.
> promote_threshold=2 distinct features · window_days=45 · quarantine_threshold=2

## Confirmed (load these at Specify/Design)

Corroborated across multiple features. Safe to apply as guidance.

_none_

## Candidates (under observation — do NOT load as guidance yet)

Seen once or not yet corroborated. Tracked, not trusted.

### L-001 — For orchestration/side-effect ACs, add an integration test that drives the real caller or read path; unit-tested primitives can all pass while nothing invokes them, leaving the AC unmet.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `core/api` · harmful: 0
- features: study-methods
- evidence: EXAM-01 AC#5 / api.rs:465 (core/api)
- last seen: 2026-07-29T04:17:56Z

### L-002 — When an AC names a concrete UI observation as its independent test (e.g. AR hides the source until submit), extract the gating predicate into pure logic (recallPhase.ts::isSourceRevealed) and value-test it, so the invariant is sensor-testable rather than JSX-inspection-only.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `ui/sessions` · harmful: 0
- features: study-methods
- evidence: TECH-04.1 / ui/src/sessions/ActiveRecall.tsx (ui/sessions)
- last seen: 2026-07-31T04:07:11Z

### L-003 — On Windows (case-insensitive FS) a pure module must not differ only by case from a sibling component (activeRecall.ts vs ActiveRecall.tsx): imports resolve ambiguously and tsc breaks though vitest passes. Name the pure module distinctly and run npm build (tsc), not just test, before committing UI.
- signal: `gate_fail` · recurrence: 1 feature(s) · scope: `ui` · harmful: 0
- features: study-methods
- evidence: ui/src/sessions/recallPhase.ts vs ActiveRecall.tsx (ui)
- last seen: 2026-07-31T04:07:11Z

### L-004 — Presentational wiring (a button that must open a modal, a screen's outer padding) is build-gate-only in this project, so tsc/tests stay green while the feature is dead or edge-glued; a short UAT smoke pass — click every primary action, eyeball each screen's margins against a known-good screen — catches what the gate cannot.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `ui` · harmful: 0
- features: study-methods
- evidence: AppShell NovoCardButton / QuadroProva padding (ui)
- last seen: 2026-07-31T04:30:23Z

### L-005 — Execute workers (and inline commits) must run cargo fmt --all -- --check AND cargo clippy -- -D warnings before committing Rust, not just cargo test: a test-only gate leaves fmt/clippy violations that only surface in CI. Put fmt+clippy in the task's own gate for any Rust-touching task.
- signal: `gate_fail` · recurrence: 1 feature(s) · scope: `core` · harmful: 0
- features: study-methods
- evidence: .github/workflows/ci.yml cargo fmt --all --check (core)
- last seen: 2026-08-02T00:24:11Z

### L-006 — When a UI path builds a domain object to send to a Rust command, every field must satisfy the backend deserializers even if the handler overwrites it: Date rejects '' at serde argument-deserialization, so create_card failed before running. Seed placeholder-but-valid values (today for dates), and smoke-test any newly-wired command end to end — tsc/tests stay green while serde rejects at runtime.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `ui` · harmful: 0
- features: study-methods
- evidence: ui NovoCardModal create_card empty-date (ui)
- last seen: 2026-08-02T01:54:15Z

### L-007 — Do not re-derive a value the backend already computes with a method-specific formula: exam cards were placed by the spaced ladder (start_date+offset) and froze; place/display each method by its own source of truth (exam=session cursor due date).
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `ui/placement,method-dispatch` · harmful: 0
- features: study-methods
- evidence: ui/src/components/Board.tsx:placeCard (ui/placement,method-dispatch)
- last seen: 2026-08-04T02:10:26Z

### L-008 — Relative-offset date pickers (Amanhã/+2d) must compute from today, not from a possibly-overdue current due date, or an overdue item postpones into the past; convert the chosen absolute target to a delta at the boundary.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `ui/dates,scheduling` · harmful: 0
- features: study-methods
- evidence: ui/src/components/modals/Adiar.tsx (ui/dates,scheduling)
- last seen: 2026-08-04T02:10:36Z

## Quarantined (failed when applied — ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
