# Validation Report — Study Methods & Techniques (P1 MVP)

**Feature:** `.specs/features/study-methods/`
**Branch:** `feat/study-methods`
**Verifier:** independent (author ≠ verifier), evidence-or-zero, read-only over the real tree.
**Date:** 2026-07-29
**Scope:** P1 MVP only. P2 (Início/HOME, Feynman, Active Recall, techniques catalog) and P3 (Leitner
session) are deferred and were NOT assessed as gaps.

**Verdict: PASS ✅ with one ranked gap** (EXAM-02.5 exam auto-conclusion is unwired — see Ranked Gaps).
All build gates green; 5/5 discrimination mutants killed. The single gap is a missing orchestration path,
not a regression, and its primitives exist and are unit-tested.

---

## 1. Task Completion Check

`tasks.md` shows **T1–T37 all `✅ complete`** with commit hashes. Phases 0–11 executed in order. GUI-
interactive done-when items (T2/T3 window launch, T23 drag persistence) are marked `[~]` deferred to user
UAT, consistent with tauri-cli not being installed. No task left open.

---

## 2. Spec-Anchored AC Check (P1)

Evidence cited by `file:line` + assertion. "Logic ✓" = pure/orchestration logic tested; "UAT" = interactive/
presentational, build-gate only (deferred to user acceptance), underlying logic verified where present.

| Req | AC (short) | Evidence | Status |
| --- | --- | --- | --- |
| METH-02 | method-scoped board + persisted selection | `tests/api.rs:290` board filtered; `tests/cards.rs` method-scoped load; `ui/src/store.test.ts` activeMethod persists/restored | Verified |
| METH-03 | create requires method, defaults to active | `api.rs:169` create_card requires `method`; NovoCard defaults to `activeMethod` (T25) | Verified (logic) |
| METH-04 | no control to change method post-create | EditarCard shows method read-only (T26 presentational) | UAT |
| METH-05 | spaced ladder 0/1/2/5/15/30, `due=start+stage` | `scheduler/spaced.rs:141` due=start+offset; `:216` advances each stage; `:236` Day30→Done archives | Verified |
| EXAM-01 | require name+date, reject past date | `tests/api.rs:334` `ExamDateInPast` + `EmptyExamName`; today accepted | Verified |
| EXAM-02 | back-loaded distribution formula + N-table | `scheduler/exam.rs:230` `session_count_table`; `:200` bounded/increasing/back-loaded | Verified |
| EXAM-03a | `S=30 → [0,13,20,25,30]` (exact) | `scheduler/exam.rs:155` `assert_eq!(offsets, [0,13,20,25,30])`; `tests/api.rs:398` same via materialized sessions | Verified |
| EXAM-03b | complete advances cursor; last→archived | `scheduler/exam.rs:290` archives on last; `tests/api.rs:416` advances-then-archives | Verified |
| EXAM-02.5 | **date passes → conclude + archive remaining + record history** | `should_conclude` (`exam.rs:129`) + `set_exam_concluded` (`exams.rs:35`) exist & unit-tested, **but no api/command invokes them** | **Needs-Fix (partial)** |
| EXAM-04 | exam detail (days-remaining, completed/total); delete cascade | `tests/api.rs:488` days_remaining+progress; `:459` delete cascades cards+sessions | Verified |
| KAN-01 | 4 columns, place by due, overdue→Hoje | `components/columns.ts:37` + `columns.test.ts` (8 tests incl. overdue→Hoje, archived→Concluídos) | Verified |
| KAN-02 | drag Hoje→Amanhã = +1, persist | `lib/dnd.ts:34` resolveDrag postpone +1; `tests/api.rs:207` postpone +1 stage-unchanged | Verified (logic); drag = UAT |
| KAN-03 | drag→Concluídos = complete | `lib/dnd.ts:37` complete; `dnd.test.ts` (10 tests) | Verified (logic) |
| KAN-01§5 / edge | same-column no-op; drop-outside revert | `lib/dnd.ts:35-36` noop outside/same-column; `dnd.test.ts` | Verified |
| KAN-04 | exam grouping under headings | QuadroProva/ExamsRail (T24/T30 presentational) | UAT |
| HIST-01 | per-method history scope | `tests/api.rs:538` `for_method` returns only that method | Verified |
| HIST-02 | unified, labeled by method+technique | `tests/api.rs:572` all=both; method/technique persisted per event | Verified (see Deviation 2) |
| HIST-03 | filter by method/technique + count | `routes/historyFilter.test.ts` (9 tests, AND-narrow + count) | Verified |
| HIST-04 | event payload: type/from-to/date/method/technique | `tests/events.rs`; `tests/api.rs:581` focused_secs+self_rating+technique | Verified |
| HIST-05 | revive → fresh Day0 in original method, `revived` event | `tests/api.rs:248` fresh Day0 + `:267` one revived event | Verified |
| MIG-01 | open existing file, not a fresh one | `tests/migration.rs:184` fresh vs `:60` existing both handled; path resolution T16 (bridge) | Verified (logic); path wiring = UAT |
| MIG-02 | forward schema, `method='spaced'`, preserve all fields | `tests/migration.rs:60` asserts method=spaced, technique=None, id/title/links/stage/dates intact | Verified |
| MIG-03 | backup-first; abort untouched on backup failure | `migration.rs:239` backup-fail leaves v0 + no `method` col; `tests/migration.rs:72` backup exists | Verified |
| MIG-04 | idempotent (already-applied → no-op) | `tests/migration.rs:114` second run `!ran`, no backup | Verified |
| MIG-05 | failure leaves original unmodified, names backup path | `migration.rs:239` + `MigrationError::Backup` carries path | Verified (logic) |
| TECH-01 | select one technique or none | `tests/api.rs:277` edit sets technique; picker presentational | Verified (data) |
| TECH-02 | Pomodoro focus→break, notify, auto-break | `sessions/pomodoroTimer.test.ts` (9 tests: focus→break auto @ zero, pause holds); notify on edge `Pomodoro.tsx:63` | Verified (logic; see Deviation 1) |
| TECH-03 | record focused seconds on completion | `tests/api.rs:581` `focused_secs == Some(1500)` | Verified |
| TECH-09 | per-technique defaults, est 5–180, rhythm derives est | `lib/sessionEstimate.test.ts:18` 50/10→50; `tests/api.rs:101` est bounds 5–180 | Verified |
| TECH-EST | est on active card / actual on completed | `sessionEstimate.test.ts:83` active `~N min` vs completed `N min estudados` | Verified |
| STACK-01 | Tauri port preserves scheduler behavior | every `test_scheduler.cpp`/`test_date.cpp` assertion ported (spaced.rs/date.rs) | Verified |
| STACK-02 | Rust suite covers scheduler+date, ≥70% | coverage 91.53% lines; scheduler exam.rs/spaced.rs = 100% | Verified |
| DOC-01/02/03 | README / ARCHITECTURE / AGENTS present | all three exist at repo root (T35–37) | Verified (presence) |

**Result: all P1 ACs matched by evidence except EXAM-02.5 (exam auto-conclusion), which is partial.**

---

## 3. Edge Cases (P1)

| Edge case | Evidence | Status |
| --- | --- | --- |
| Exam target date today → exactly one session today | `scheduler/exam.rs:164` `s0_yields_single_session_today` | ✓ |
| Exam date > 5 years → rejected | `tests/api.rs:367` `ExamDateTooFar`; 5y exact accepted | ✓ |
| Empty/whitespace title → rejected | `tests/api.rs:68`; `modals/validation.test.ts` | ✓ |
| Title > 200 chars → rejected (200 ok, 201 rejected) | `tests/api.rs:82` boundary asserted | ✓ |
| Double-complete same day → idempotent (one event, one advance) | `tests/api.rs:161` spaced; exam path guarded `api.rs:292` | ✓ |
| Drag released outside any column → revert, no change | `lib/dnd.ts:35`; `dnd.test.ts` | ✓ |
| Same-column drop → no-op, no history | `lib/dnd.ts:36`; `dnd.test.ts` | ✓ |
| Migration backup-first / idempotent / abort-on-failure | `tests/migration.rs` (4 tests) + `migration.rs:239` | ✓ |

All P1 edge cases covered.

---

## 4. Build Gate (mandatory)

Environment: Rust via `$USERPROFILE/.cargo/bin`; Node 22 / npm 10.9. tauri-cli not installed (desktop bundle
not built — consistent with author note 4).

| Gate | Result |
| --- | --- |
| `cargo fmt --check` | ✅ clean (exit 0) |
| `cargo clippy -- -D warnings` | ✅ clean (exit 0) |
| `cargo llvm-cov -p studdup-core --fail-under-lines 70` | ✅ **91.53% lines** (≥70); scheduler 100%, api 91.01%, migration 92.82% |
| `cargo test` (workspace) | ✅ **104 passed, 0 failed** (lib 51, api 26, cards 6, events 4, exams 4, migration 4, schema 5, settings 4) |
| `npm --prefix ui run build` | ✅ 141 modules, built in 3.45s |
| `npm --prefix ui run test` | ✅ **93 passed, 0 failed** (11 files) |

**Totals: Rust 104 passed / 0 failed; UI 93 passed / 0 failed; 0 skipped.** No pre-existing vs post counts
differ (verifier is read-only; no code changed).

---

## 5. Discrimination Sensor (5 mutations, scratch-only, all reverted)

Mutations injected into new high-risk code, covering test(s) confirmed to FAIL, then reverted. Tree restored
clean (`git status` shows only untracked `.specs/`).

| # | Target | Mutation | Covering test(s) | Result |
| --- | --- | --- | --- | --- |
| a | `scheduler/exam.rs:11` distribution exponent | `0.62 → 0.70` | `s30_yields_back_loaded_offsets`, `tests/api.rs::…materializes…` | **KILLED** |
| b | `scheduler/spaced.rs:94` postpone re-anchor | `add_days(days) → add_days(0)` | `postpone_shifts_due_by_n_days`, `postpone_card_shifts_due_date…` | **KILLED** |
| c | `repository/migration.rs:172` card method default | `'spaced' → 'exam'` | `migrates_cpp_db…defaulting_method`, `migration_is_idempotent` | **KILLED** |
| d | `components/columns.ts:39` bucket boundary | `diff <= 0 → diff < 0` | `columns.test.ts` (2), `Board.test.ts` (1) | **KILLED** |
| e | `lib/sessionEstimate.ts:30` est-from-rhythm | `focus_min → break_min` | `sessionEstimate.test.ts` (5) | **KILLED** |

**5 injected, 5 killed, 0 survived.** The tests discriminate correct from incorrect behavior on the highest-
risk paths, including the two spec-precise values (`[0,13,20,25,30]`, 50/10→50).

---

## 6. Code Quality Spot-Check

Reviewed the Exam story's tests (`tests/api.rs`, `scheduler/exam.rs`): assertions target concrete values
(exact offset vectors, exact archive/progress tuples, cursor-only postpone), not shallow `is_ok()`. Boundary
values are tested on both sides (200/201 title, 5/180 est, 5y/5y+1 exam date, N-table edges 0/1/3/4/7/8/20/21/
45/46). No scope creep beyond P1 observed: P2/P3 (Início, Feynman/Active-Recall/Leitner sessions, catalog) are
absent or stubbed as intended; the `leitner_items` table is created by migration but carries no UI, per plan.

---

## 7. Requirement Traceability (proposed statuses — spec.md not edited)

| Requirement | Proposed status |
| --- | --- |
| METH-01, METH-04 | Verified (UAT — presentational, logic minimal) |
| METH-02, METH-03, METH-05 | Verified |
| EXAM-01, EXAM-02, EXAM-04 | Verified |
| EXAM-03 | **Verified for advance/archive-on-last; Needs-Fix for date-passed auto-conclusion (EXAM-02.5)** |
| KAN-01, KAN-02, KAN-03 | Verified |
| KAN-04 | Verified (UAT) |
| HIST-01..05 | Verified (HIST-02 legibility caveat, Deviation 2) |
| MIG-01..05 | Verified (MIG-01 path wiring is UAT) |
| TECH-01, TECH-02, TECH-03, TECH-09, TECH-EST | Verified (TECH-02 notify caveat, Deviation 1) |
| STACK-01, STACK-02 | Verified |
| DOC-01, DOC-02, DOC-03 | Verified (presence; independent-test "clean-checkout follow-along" is UAT) |

---

## 8. Author-Reported Deviations (assessed)

1. **Pomodoro notify via WebView `Notification`, not the Tauri plugin.** TECH-02.3 "notify the user AND
   auto-begin break": the auto-break transition is fully tested (`pomodoroTimer.test.ts`); the notify fires
   on the focus→break edge (`Pomodoro.tsx:63`), best-effort, guarded by `permission === 'granted'`. Met at
   the logic level; the actual OS toast is UAT. **Acceptable.**
2. **History rows label "Card #<id>" (no title join).** HIST-02 requires entries "labeled with method and
   technique" — those ARE present. Card-title legibility is a UX nicety not mandated by the AC. **Acceptable,
   noted.**
3. **Hand-kept `ui/src/lib/bindings.ts` (not ts-rs generated).** Design-sanctioned. Wire format matches the
   serde output the api uses (field-less enums → PascalCase strings; `ApiError` adjacently tagged). UI build
   + 93 tests pass against it. **Acceptable.**
4. **tauri-cli absent → desktop shell not bundled.** GUI-interactive ACs satisfied via pure-logic tests +
   build; treated as UAT, not failures. Underlying logic is tested in every case. **Acceptable.**

---

## 9. Ranked Gaps

1. **EXAM-02.5 — exam auto-conclusion is not wired (Needs-Fix, P1).** When an exam's date passes with
   sessions still pending, the spec requires the system to (a) mark the exam concluded, (b) archive its
   remaining cards, and (c) record the outcome in history. The primitives exist and are unit-tested
   (`scheduler::exam::should_conclude` at `exam.rs:129`; `repository::exams::set_exam_concluded` at
   `exams.rs:35`), **but nothing calls them** — there is no `core::api` action, no Tauri command, and no
   startup/board sweep that performs the conclusion, and no integration test asserts it. Effect: a passed
   exam stays `concluded = 0`, its cards remain active (piling up in "Hoje" as overdue), and no conclusion
   event is logged. The UI only shows a cosmetic "Encerrada" state (ExamsRail) without the data-level
   transition. *Suggested fix:* add `api::conclude_lapsed_exams(conn, today)` that, for each
   `should_conclude` exam, archives its still-active cards, records an `archived`/conclusion event per card,
   and calls `set_exam_concluded`; invoke it at board load / startup; add an integration test (exam date
   passed, one pending card → card archived + exam concluded + history event).

No other P1 gaps found.

---

## 10. Summary

The P1 MVP is in strong shape: every P1 acceptance criterion except EXAM-02.5 is backed by a concrete,
value-precise test; all build gates pass (Rust 104, UI 93, coverage 91.53%, scheduler 100%); and the
discrimination sensor killed all 5 injected faults. The one genuine gap is the missing exam auto-conclusion
orchestration (EXAM-02.5) — its building blocks are written and tested but never invoked. Recommend landing
that wiring + an integration test before calling the Exam story fully complete; everything else is
Verified (with GUI-interactive items deferred to user UAT as planned).

---

## 11. Re-verification addendum (fix→re-verify iteration 1)

**Date:** 2026-07-29 · **By:** orchestrator (independent of the T38 fix author)

The single ranked gap (EXAM-01 AC#5, exam auto-conclusion) was fixed in **T38 — commit `ea33b43`**
(`fix(core): wire exam auto-conclusion for lapsed exams`): `api::conclude_lapsed_exams(conn, today)`
archives each lapsed exam's active cards, records an `archived` history event per card, and calls
`set_exam_concluded`; the sweep is folded (idempotently) into the `list_exams` and `list_board` (ExamPrep)
read paths, so the board reflects conclusion without a manual action.

**Re-verification (all independently re-run):**
- **Gate:** `cargo fmt --check` clean; `cargo clippy --workspace --all-targets -D warnings` clean;
  `cargo test` = 108 Rust passed, 0 failed; `npm --prefix ui run test` = 93 passed; `npm run build` green;
  `cargo llvm-cov -p studdup-core` = **91.66% lines / 95.65% functions** (gate ≥70).
- **Discrimination sensor (new code):** inverted the `should_conclude` guard in `api::conclude_lapsed_exams`
  in a scratch edit → **5 tests failed** (`lapsed_exam_is_concluded_cards_archived_and_history_recorded`,
  `list_exams_read_path_sweeps_lapsed_exams`, `list_board_read_path_sweeps_lapsed_exam_cards`,
  `list_exams_reports_days_remaining_and_session_progress`, `not_yet_lapsed_exam_is_left_untouched`).
  Mutant killed; tree restored clean.

**Verdict:** EXAM-01 AC#5 now **Verified**. All P1 acceptance criteria pass. Fix→re-verify loop closed at
iteration 1. GUI-interactive items remain deferred to user UAT (needs `tauri-cli` to launch/bundle).

---

## P2/P3 PASS VERIFICATION

**Date:** 2026-07-30 · **Verifier:** independent (author ≠ verifier) · **Diff range:** `5719261^..HEAD`
(19 commits `5719261`..`c51493b`, tasks T39–T57). Scope: P2/P3 ACs only — HOME-01..05, TECH-04..08,
plus decisions AD-011 (attempts table, schema v2) and AD-012 (Leitner intervals 1/2/4/8/16).

### Verdict: **PASS** (with low/medium spec-precision gaps in untested React component behaviors)

The data/logic layer (Rust core + extracted pure-TS helpers) is thoroughly value-precise tested; the
marquee value ACs (Leitner intervals literally 1/2/4/8/16; self-rating literally 0/1/2 persisted via
`record_session`; attempts newest-first) are asserted on exact values. The gap is that several
JSX-only behaviors (AR hide-until-submit, Feynman side-by-side, unsaved-close warning, catalog render)
have no automated test — they are correct by code inspection, consistent with the project's deliberate
"test the pure logic, not the JSX" strategy.

### Gate (run by verifier)

| Gate | Result |
| --- | --- |
| `cargo test` | **140 passed, 0 failed** (lib 59, api 39, attempts 4, cards 6, events 5, exams 6, leitner 7, migration 5, schema 5, settings 4) |
| `npm --prefix ui run test` | **127 passed, 0 failed** (18 files) |
| `npm --prefix ui run build` | **clean** (tsc --noEmit + vite build, 163 modules, 0 errors) |

### Per-AC evidence

| AC | Test / source | Value-precise? |
| --- | --- | --- |
| HOME-01 land on Início + reachable | `ui/src/routes/routes.test.ts:11` (`DEFAULT_ROUTE==="inicio"`, RouteView→Inicio) | yes |
| HOME-02 cross-method due count | `ui/src/routes/Inicio.tsx:46-48` (`spacedDue+examDue`), helper `dueToday` folds both boards through `placeCard` (tested in `Board.test.ts`) | **no direct test of the cross-method SUM** |
| HOME-03 upcoming exams soonest-first, exclude concluded | `Inicio.tsx:49-51` (`.filter(!concluded && days_remaining>=0).sort`); data source ordering/conclusion tested in `api.rs:522` (`list_exams_orders_by_soonest_target_date`) + lapsed-sweep tests | data layer yes; **UI filter/sort untested** |
| HOME-04 estudar-agora / all-clear | `ui/src/lib/dueCards.test.ts` (`firstDueCard`, 6 cases incl. null/archived/overdue); wired in `Board.tsx:256`; store intent `store.test.ts:45` | yes (pick logic) |
| HOME-05 select exam → navigate + switch method | `Inicio.tsx:77-80` (`setActiveMethod("ExamPrep")`+navigate); store switch `store.test.ts:24` | partial (no Inicio-level test) |
| TECH-04.1 AR hides content link until submit | `ui/src/sessions/ActiveRecall.tsx:41,84-106` (link rendered only in `compare` phase, reached only via submit) | **no test — inspection only** |
| TECH-04.4 previous attempts reverse-chrono | `attempts.rs` repo (`ORDER BY created_at DESC, id DESC`) + `tests/attempts.rs:24` + `api.rs:746`; rendered `DetalheCard.tsx:338` | yes |
| TECH-04.5 unsaved-close warning | `ActiveRecall.tsx:49-53` (`requestExit` guards on `phase==="write" && hasText`); Feynman analogous | **no test — inspection only** |
| TECH-05 Feynman side-by-side w/ source | `ui/src/sessions/Feynman.tsx` (compare view) | **no test — inspection only** |
| TECH-06 three-point self-rating persisted | `selfRating.ts`/`selfRating.test.ts` (values `[0,1,2]`); persisted `api.rs:583` (`record_session(...,Some(2))` → `ev.self_rating==Some(2)`) | yes |
| TECH-07.1 catalog lists all four + when-best | `ui/src/routes/Tecnicas.tsx:16-49` (4-entry `TECNICAS` w/ resumo+quando+como) | **no length test** (`reminder.test.ts` does assert all 4 techniques have how-to) |
| TECH-07.2 picker inline summary | `TechniqueChip.tsx` / picker | **no test — inspection only** |
| TECH-07.3 session reminder dismissible & suppressible | `reminder.ts`/`reminder.test.ts` (key `reminder.<t>.hidden`, only `"1"` suppresses, all 4 how-tos) | yes |
| TECH-08.1 add front/back | `api.rs:823` (`add_leitner_item` box 1 due today) + `leitner.rs` repo | yes |
| TECH-08.2 correct → +1 box max 5 | `scheduler/leitner.rs` + `leitner.rs` unit tests (`correct_promotes_one_box_with_its_interval`, `correct_caps_at_box_five`) + `api.rs:892` | yes |
| TECH-08.3 wrong → box 1 | `wrong_resets_to_box_one_due_tomorrow`, `api.rs:903` | yes |
| TECH-08.4 due-only, intervals 1/2/4/8/16 | `promotion_chain_matches_the_interval_table`, `due_when_due_date_is_today_or_earlier`, `list_due_leitner_items` (`api.rs:875`) | yes (literal 1/2/4/8/16) |
| Session dispatch by technique (T52/T57) | `dispatch.ts`/`dispatch.test.ts` (all 4 + none) | yes |
| AD-011 attempts table / schema v2 | `tests/schema.rs`, `tests/migration.rs`, `attempts.rs` FK-cascade test | yes |
| AD-012 Leitner intervals | as TECH-08.4 | yes |

### Discrimination sensor — 6 mutations, **6/6 killed**, tree reverted clean

| # | Mutation (new code) | Result |
| --- | --- | --- |
| 1 | `scheduler/leitner.rs`: invert `correct` branch (`if !correct`) | **KILLED** — `correct_promotes_one_box…`, `promotion_chain…`, +3 (5 failed) |
| 2 | `scheduler/leitner.rs`: box-3 interval `4→5` | **KILLED** — `promotion_chain_matches_the_interval_table` (2 failed) |
| 3 | `repository/attempts.rs`: `ORDER BY … DESC → ASC` | **KILLED** — `attempts_load_newest_first`, `record_attempt_persists_and_lists_newest_first` |
| 4 | `sessions/dispatch.ts`: `Feynman → "none"` | **KILLED** — `dispatch.test.ts > maps Feynman to the feynman screen` |
| 5 | `lib/dueCards.ts`: flip earliest-due comparison `< → >` | **KILLED** — `dueCards.test.ts` (2 failed: most-overdue, soonest-due) |
| 6 | `sessions/selfRating.ts`: solid value `2→3` | **KILLED** — `selfRating.test.ts` (2 failed: 0/1/2 map, ordered values) |

`git status --short` after revert: only `?? .specs/` (tree clean, no mutation residue).

### Ranked gaps (all LOW/MEDIUM — none block PASS; code inspected correct, gates green)

1. **[MEDIUM] TECH-04.1 AR hide-until-submit has no automated test.** The spec's own independent test
   for this story is "confirm the content link is hidden until submission," yet coverage is inspection-only
   (`ActiveRecall.tsx` gates the link behind the `compare` phase). A mutant that renders the link in the
   `write` phase would survive. Recommend a component/render test asserting the content link is absent
   pre-submit and present post-submit.
2. **[LOW] HOME-02 cross-method due-count sum untested.** `spacedDue+examDue` in `Inicio.tsx` has no test
   asserting the summed value (spec independent test: "due count of 2"). Underlying `placeCard` is tested;
   the addition is not.
3. **[LOW] HOME-03 UI filter/sort untested.** The `!concluded && days_remaining>=0` sort in `Inicio.tsx`
   is inspection-only; the data-layer ordering/conclusion is well tested in `api.rs`.
4. **[LOW] TECH-05 Feynman side-by-side, TECH-04.5 unsaved-close warning, TECH-07.2 picker inline summary,
   TECH-07.1 catalog four-entry render** — JSX-only, inspection-verified, no render tests. Consistent with
   the project's pure-logic testing strategy.

**Bottom line:** All P2/P3 value ACs that live in testable logic are value-precise and sensor-killed;
gates fully green; no regressions. Gaps are missing render-level tests for JSX behaviors, not defects.
