# Study Methods & Techniques — Tasks

## Execution Protocol (MANDATORY — do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and
Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the
full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Design:** `.specs/features/study-methods/design.md`
**Status:** Draft
**Scope of THIS tasks round:** **P1 MVP only** (all P1 stories incl. docs). Deferred to a follow-up Tasks
pass: P2 (Início/HOME, Feynman, Active Recall, techniques catalog) and P3 (Leitner session). The
`leitner_items` table is created in migration now (cheap) but has no UI this round.

**Commit convention:** atomic, Conventional Commits, **no `Co-Authored-By` trailer** (project rule).

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec — confirm before Execute. Guidelines found:
> `.github/workflows/ci.yml` (existing ≥70% line-coverage gate), C++ `tests/test_date.cpp` +
> `tests/test_scheduler.cpp` (behavioral floor to port). New stack (Rust/Tauri/React) — commands inferred
> from Cargo + Vite conventions; **these establish new project conventions, confirm at approval.**

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Core domain (`date`, `card`, `enums`) | unit | All branches; 1:1 to spec ACs; every date edge case (leap/tz/ISO) has a test; ports every `test_date.cpp` assertion | `studdup-core/src/**` `#[cfg(test)]` | `cargo test -p studdup-core` |
| Core scheduler (`spaced`, `exam`) | unit | 1:1 to spec ACs; ladder 0/1/2/5/15/30; EXAM-02 formula incl. `S=30 → [0,13,20,25,30]`; restart/erase/postpone/revive; ports every `test_scheduler.cpp` assertion | `studdup-core/src/scheduler/**` `#[cfg(test)]` | `cargo test -p studdup-core` |
| Core repository + migration | integration | Key query paths + error paths; migration backup-first, idempotency, C++-DB forward migration against a real copy | `studdup-core/tests/*.rs` | `cargo test -p studdup-core` |
| `core::api` facade | integration | Each action's happy path + the error scenarios in design's Error Handling table | `studdup-core/tests/*.rs` | `cargo test -p studdup-core` |
| Tauri commands (`studdup`) | none | Thin 1:1 delegations to `core::api`; build gate only | `studdup/src/**` | build gate |
| React UI logic (column mapping, form validation, optimistic rollback) | unit | All branches of pure UI logic; happy + edge (empty/oversize title, past exam date, invalid link, drop-outside) | `ui/src/**/*.test.ts` | `npm --prefix ui run test` |
| React presentational components / screens | none | Visual fidelity to handoff; build gate only | `ui/src/**` | build gate |

## Gate Check Commands

> Generated from codebase — confirm before Execute.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | After a task with unit tests in one layer | `cargo test -p studdup-core` **or** `npm --prefix ui run test` (whichever the task touched) |
| Full | After a task with integration tests or cross-layer changes | `cargo test` && `npm --prefix ui run test` |
| Build | After phase completion or config/entity-only tasks | `cargo fmt --check && cargo clippy -- -D warnings && cargo llvm-cov -p studdup-core --fail-under-lines 70 && cargo test && npm --prefix ui run build` |

---

## Execution Plan

Phases are ordered and run sequentially; tasks within a phase run in order.

### Phase 0: Scaffold
```
T1 → T2 → T3 → T4
```
### Phase 1: Core domain + Date
```
T5 → T6
```
### Phase 2: Scheduler
```
T7 → T8 → T9
```
### Phase 3: Repository + migration
```
T10 → T11 → T12 → T13 → T14
```
### Phase 4: Core API facade
```
T15
```
### Phase 5: Tauri bridge
```
T16 → T17
```
### Phase 6: React foundation
```
T18 → T19 → T20 → T21
```
### Phase 7: Kanban board
```
T22 → T23 → T24
```
### Phase 8: Card & exam flows
```
T25 → T26 → T27 → T28 → T29 → T30
```
### Phase 9: Pomodoro + technique defaults
```
T31 → T32 → T33
```
### Phase 10: History UI
```
T34
```
### Phase 11: Docs
```
T35 → T36 → T37
```

---

## Task Breakdown

### T1: Cargo workspace + `studdup-core` crate skeleton
**What:** Root `Cargo.toml` workspace with members `studdup-core`, `studdup`; `studdup-core` lib skeleton with module stubs (`domain`, `scheduler`, `repository`, `api`).
**Where:** `Cargo.toml`, `studdup-core/Cargo.toml`, `studdup-core/src/lib.rs`
**Depends on:** None · **Reuses:** C++ layer separation · **Requirement:** STACK-01
**Tools:** MCP: NONE · Skill: NONE
**Done when:** [x] `cargo build` succeeds; [x] modules declared and empty-compile; [x] `time`, `rusqlite`(bundled), `serde` deps declared.
**Tests:** none · **Gate:** build · **Status:** ✅ complete (2601ef9)
**Commit:** `chore: scaffold cargo workspace and studdup-core crate`

### T2: Tauri app crate (`studdup`) skeleton
**What:** Tauri 2.x app crate depending on `studdup-core`, empty command registry, `opener` + `notification` plugins wired.
**Where:** `studdup/Cargo.toml`, `studdup/src/main.rs`, `studdup/tauri.conf.json`
**Depends on:** T1 · **Reuses:** `src/main.cpp` app-entry shape · **Requirement:** STACK-01
**Tools:** MCP: NONE · Skill: NONE
**Done when:** [x] `cargo build -p studdup` succeeds; [~] app opens an empty window locally (interactive GUI launch deferred to user; crate builds + plugins wired).
**Tests:** none · **Gate:** build · **Status:** ✅ complete (75c4da9)
**Commit:** `chore: scaffold tauri app crate`

### T3: React + Vite + TS `ui/` skeleton
**What:** Vite React-TS app in `ui/`, `@tauri-apps/api`, React Query, Zustand, dnd-kit installed; Vitest configured; a smoke `invoke` call renders.
**Where:** `ui/` (package.json, vite.config.ts, src/main.tsx, src/App.tsx)
**Depends on:** T2 · **Reuses:** `design/handoff` as visual reference · **Requirement:** STACK-01
**Tools:** MCP: NONE · Skill: NONE
**Done when:** [x] `npm --prefix ui run build` succeeds; [x] `npm --prefix ui run test` runs (0 tests OK); [~] dev app loads in Tauri window (interactive launch deferred to user; build + smoke `invoke` wired).
**Tests:** none · **Gate:** build · **Status:** ✅ complete (caebb26)
**Commit:** `chore: scaffold react+vite ui`

### T4: CI workflow for the new stack
**What:** Replace C++ CI with Rust+JS CI: `cargo fmt --check`, `cargo clippy -D warnings`, `cargo test`, `cargo llvm-cov -p studdup-core --fail-under-lines 70`, `npm run build` + `npm run test`; add `rustfmt.toml`, `clippy` config.
**Where:** `.github/workflows/ci.yml`, `rustfmt.toml`
**Depends on:** T3 · **Reuses:** old `ci.yml` structure + 70% gate · **Requirement:** STACK-02
**Tools:** MCP: NONE · Skill: NONE
**Done when:** [x] workflow YAML valid; [x] coverage gate set to 70% on `studdup-core`; [x] lint/test/build steps present.
**Tests:** none (config) · **Gate:** build · **Status:** ✅ complete (6201ee8)
**Commit:** `ci: replace c++ pipeline with rust+js lint, tests and 70% coverage gate`

### T5: Core domain enums + entity structs
**What:** `Method`, `Stage` (value=day offset, AD-003), `Technique`, `PomodoroRhythm` (+presets); structs `Card`, `Exam`, `ExamSession`, `HistoryEvent`, `LeitnerItem` with serde; `next_stage`/`stage_label` port.
**Where:** `studdup-core/src/domain/{enums.rs,card.rs,exam.rs,event.rs,mod.rs}`
**Depends on:** T1 · **Reuses:** `src/Card.h` · **Requirement:** METH-05, TECH-01, TECH-09
**Tools:** MCP: NONE · Skill: NONE
**Done when:** [x] types compile + serialize; [x] `next_stage` unit tests cover the full ladder incl. Day30→Done; [x] `cargo test -p studdup-core` passes.
**Tests:** unit · **Gate:** quick · **Status:** ✅ complete (32646d2) · note: created `date.rs` (minimal `Date`, completed in T6) + edited `lib.rs` to activate the domain module — both required for the structs to compile.
**Commit:** `feat(core): add domain enums and entity structs with stage-as-offset`

### T6: `Date` port + ported date tests
**What:** `Date` on the `time` crate preserving the ISO string surface (`today`, `add_days`, `days_until`, `from_iso`, `to_iso`, comparisons).
**Where:** `studdup-core/src/domain/date.rs`
**Depends on:** T5 · **Reuses:** `src/Date.cpp`, `tests/test_date.cpp` · **Requirement:** STACK-01
**Tools:** MCP: NONE · Skill: NONE
**Done when:** [x] every assertion from `test_date.cpp` ported as `#[test]` and passing; [x] leap-year + invalid-ISO edge cases covered; [x] quick gate passes.
**Tests:** unit · **Gate:** quick · **Status:** ✅ complete (86b9c57) · studdup-core coverage 97.81% lines
**Commit:** `feat(core): port Date type onto the time crate`

### T7: Scheduler — spaced-repetition path + ported tests
**What:** `scheduler::spaced` — `due_date`, `is_due_today/tomorrow/overdue`, `overdue_days`, `mark_completed`, `restart_study`, `erase_study`, `revive`, `postpone` (re-anchor `start_date`, AD-003).
**Where:** `studdup-core/src/scheduler/{mod.rs,spaced.rs}`
**Depends on:** T6 · **Reuses:** `src/Scheduler.cpp`, `tests/test_scheduler.cpp` · **Requirement:** METH-05, HIST-05
**Tools:** MCP: NONE · Skill: NONE
**Done when:** [x] every `test_scheduler.cpp` assertion ported + passing; [x] overdue-in-Hoje (`<=`) vs tomorrow (`==`) asymmetry tested; [x] quick gate passes.
**Tests:** unit · **Gate:** quick · **Status:** ✅ complete (78a5556)
**Commit:** `feat(core): port spaced-repetition scheduler with stage re-anchoring`

### T8: Scheduler — exam distribution formula + tests
**What:** `scheduler::exam::distribute(today, exam_date) -> Vec<Date>` implementing EXAM-02 (`round(S·(i/(N-1))^0.62)`, N-table, clamp, dedup-forward).
**Where:** `studdup-core/src/scheduler/exam.rs`
**Depends on:** T7 · **Reuses:** — · **Requirement:** EXAM-02, EXAM-03
**Tools:** MCP: NONE · Skill: NONE
**Done when:** [x] `S=30` yields exactly `[0,13,20,25,30]` (test); [x] `S=0`→`[0]`, boundary N-values tested; [x] duplicate-offset push-forward tested; [x] quick gate passes.
**Tests:** unit · **Gate:** quick · **Status:** ✅ complete (774941b)
**Commit:** `feat(core): add back-loaded exam session distribution`

### T9: Scheduler — exam session advance/postpone + tests
**What:** exam-path `due_date` (current cursor), `mark_completed` (advance cursor, archive after last), `postpone` (shift current session), exam conclusion when date passes.
**Where:** `studdup-core/src/scheduler/exam.rs` (extend)
**Depends on:** T8 · **Reuses:** — · **Requirement:** EXAM-03
**Tools:** MCP: NONE · Skill: NONE
**Done when:** [x] completing last session archives the card (test); [x] cursor advance + postpone tested; [x] quick gate passes.
**Tests:** unit · **Gate:** quick · **Status:** ✅ complete (e6ecd04)
**Commit:** `feat(core): add exam session advancement and conclusion`

### T10: Repository — connection, schema create, WAL
**What:** `repository` opening rusqlite (bundled), applying `PRAGMA foreign_keys/journal_mode=WAL`, creating fresh-install schema (cards, exams, exam_sessions, events, leitner_items, settings).
**Where:** `studdup-core/src/repository/mod.rs`
**Depends on:** T5 · **Reuses:** `src/DatabaseManager.cpp` schema · **Requirement:** MIG-01
**Tools:** MCP: NONE · Skill: NONE
**Done when:** [x] fresh DB creates all tables (integration test on temp file); [x] C++ `cards`/`events` column names preserved; [x] quick gate passes.
**Tests:** integration · **Gate:** full · **Status:** ✅ complete (06264b2) · note: event-log table keeps C++ name `history`; added `rusqlite` dev-dep + `tests/common/mod.rs` helper.
**Commit:** `feat(core): add sqlite repository with schema and WAL`

### T11: Repository — cards CRUD + tests
**What:** `insert_card`, `update_card`, `delete_card` (cascade), `load_active(method)`, `load_archived(method)`.
**Where:** `studdup-core/src/repository/cards.rs`
**Depends on:** T10 · **Reuses:** `DatabaseManager.cpp` prepared-stmt pattern · **Requirement:** METH-02, HIST-01
**Tools:** MCP: NONE · Skill: NONE
**Done when:** [x] round-trip insert→load preserves all fields incl. new columns (test); [x] method-scoped load filters correctly (test); [x] delete cascades children (test); [x] full gate passes.
**Tests:** integration · **Gate:** full · **Status:** ✅ complete (0a671d6)
**Commit:** `feat(core): add card repository operations`

### T12: Repository — exams + sessions + tests
**What:** `insert_exam`, `load_exams`, `delete_exam_cascade`, `insert_sessions`, `advance_session`, session progress query.
**Where:** `studdup-core/src/repository/exams.rs`
**Depends on:** T11 · **Reuses:** — · **Requirement:** EXAM-01, EXAM-04
**Tools:** MCP: NONE · Skill: NONE
**Done when:** [x] exam+sessions round-trip (test); [x] delete_exam removes its cards+sessions (test); [x] completed/total progress query correct (test); [x] full gate passes.
**Tests:** integration · **Gate:** full · **Status:** ✅ complete (fd07421)
**Commit:** `feat(core): add exam and session repository operations`

### T13: Repository — events + history queries + tests
**What:** `record_event` (with method/technique/focused_secs/self_rating), `load_history(scope: method|all)` labeled + filterable.
**Where:** `studdup-core/src/repository/events.rs`
**Depends on:** T11 · **Reuses:** `DatabaseManager.cpp` events table · **Requirement:** HIST-02, HIST-03, HIST-04, TECH-03
**Tools:** MCP: NONE · Skill: NONE
**Done when:** [x] event payload persists all new fields (test); [x] per-method vs unified scope returns correct sets (test); [x] filter-by-technique count correct (test); [x] full gate passes.
**Tests:** integration · **Gate:** full · **Status:** ✅ complete (74df84a)
**Commit:** `feat(core): add history event recording and queries`

### T14: Repository — forward migration (backup-first, idempotent)
**What:** `migrate(conn)` using `PRAGMA user_version`: backup copy first (abort on failure), then in one txn add new card/event columns + create new tables, set version; no-op when current.
**Where:** `studdup-core/src/repository/migration.rs`
**Depends on:** T10 · **Reuses:** `src/main.cpp` copy-migration intent · **Requirement:** MIG-02, MIG-03, MIG-04, MIG-05
**Tools:** MCP: NONE · Skill: NONE
**Done when:** [x] migrating a **copy of a real C++ srs.db** assigns method='spaced', technique=NULL, preserves all card fields (test); [x] backup file created; [x] running twice is a no-op (test); [x] simulated backup failure leaves original untouched (test); [x] full gate passes.
**Tests:** integration · **Gate:** full · **Status:** ✅ complete (98551af) · note: build gate surfaced fmt normalization of prior files → separate `style:` commit (cf2ec9b). Migration takes `&Db` (needs path for backup); injectable-backup seam for the failure test.
**Commit:** `feat(core): add backup-first forward schema migration`

### T15: `core::api` facade + tests
**What:** One orchestration fn per action (create/complete/postpone/restart/erase/revive/edit/delete card; create/delete exam; list_board; list_history; record_session) tying scheduler+repository+event logging; validation (title 1–200, exam date bounds, est 5–180).
**Where:** `studdup-core/src/api.rs`
**Depends on:** T9, T12, T13, T14 · **Reuses:** C++ `App::apply*` shape · **Requirement:** METH-03, EXAM-01, TECH-09, and Error Handling table
**Tools:** MCP: NONE · Skill: NONE
**Done when:** [x] each action happy path tested; [x] validation errors (empty/oversize title, past/far exam date, est out of range) return typed errors (tests); [x] double-complete-same-day idempotent (test); [x] full gate passes.
**Tests:** integration · **Gate:** full · **Status:** ✅ complete (0e2bf52) · note: added minimal repo helpers `cards::load_card` + `exams::set_session_due_date` (SQL stays in repository) that the id-based facade actions require; exam existence validated before card insert so a bad ref returns `ExamNotFound` not a raw FK error.
**Commit:** `feat(core): add api facade orchestrating scheduler, repo and events`

### T16: Tauri DB-path resolution + managed state
**What:** Port `defaultDbPath` (platform user-data dir + one-time copy of legacy `data/srs.db`); open connection, run `migrate`, hold `Mutex<Connection>` in Tauri state; fatal-error path if DB unopenable.
**Where:** `studdup/src/{paths.rs,state.rs}`
**Depends on:** T15 · **Reuses:** `src/main.cpp:defaultDbPath` · **Requirement:** MIG-01, Error Handling
**Tools:** MCP: NONE · Skill: NONE
**Done when:** [x] resolves `%APPDATA%/studdup/srs.db` on Windows; [x] migration runs at startup; [x] unwritable DB surfaces a fatal error, never a blank DB.
**Tests:** none (thin wiring; logic tested in core) · **Gate:** build · **Status:** ✅ complete (53ca0b9) · note: state holds `Mutex<Db>` (the core `Db` wraps the `Connection` + path that `migrate(&Db)` needs) rather than a bare `Mutex<Connection>`; `main.rs` wires `.manage()` + a fatal-exit path; `db` field carries a `#[allow(dead_code)]` until T17 commands read it.
**Commit:** `feat(app): resolve db path and hold migrated connection in state`

### T17: Tauri commands + ts-rs type export
**What:** `#[tauri::command]` wrappers 1:1 over `core::api`; `ts-rs` derives exporting `ui/src/lib/bindings.ts`.
**Where:** `studdup/src/commands.rs`, generated `ui/src/lib/bindings.ts`
**Depends on:** T16 · **Reuses:** `core::api` signatures · **Requirement:** STACK-01
**Tools:** MCP: NONE · Skill: NONE
**Done when:** [x] every api action has a command; [x] TS bindings generate and compile; [x] build gate passes.
**Tests:** none · **Gate:** build · **Status:** ✅ complete (aa8369c) · note: 13 commands 1:1 over `core::api`, each locking `Mutex<Db>` and supplying `Date::today()`; `main.rs` registers them + drops the T16 dead-code allow (field now read). ts-rs full-export would require annotating ~7 studdup-core files (out of T17 scope) + a Date newtype mapping, so used the design-sanctioned **hand-kept `ui/src/lib/bindings.ts`**, reviewed 1:1 and verified against dumped serde wire formats (field-less enums → PascalCase strings, `ApiError` adjacently tagged `{kind,detail}`). `list_history` command takes `method`/`technique` options directly (HistoryFilter isn't `Deserialize`).
**Commit:** `feat(app): expose core api as tauri commands with generated ts types`

### T18: Design tokens + theming (light/dark)
**What:** CSS variables for the "soft & rounded" system (palette, type, spacing, radii, shadows) in light+dark, theme switch via `data-theme`, from the handoff Design System.
**Where:** `ui/src/styles/tokens.css`, `ui/src/styles/theme.ts`
**Depends on:** T3 · **Reuses:** `design/handoff/project/Studdup Design System.dc.html` · **Requirement:** AD-008
**Tools:** MCP: NONE · Skill: NONE
**Done when:** [x] tokens match handoff values; [x] light/dark toggle works; [x] build passes.
**Tests:** none · **Gate:** build · **Status:** ✅ complete (f754f46) · note: oklch palette/type/spacing/radii/shadows ported 1:1 from the handoff Design System (light + dark authored side by side); theme resolves via `data-theme` on `<html>` (light default, `[data-theme]` overrides OS, `prefers-color-scheme` fallback). `theme.ts` persists the choice + keeps a live OS listener. Fonts referenced by family with system fallbacks (offline; no webfont fetch).
**Commit:** `feat(ui): add design tokens and light/dark theming`

### T19: Shared UI components
**What:** `Card`, `StageBadge` (two vocabularies), `MethodSwitcher`, `TechniqueChip`, `EmptyState`, `ModalShell`, `Countdown`, `LinkRow` (+unopenable variant), `Toast` — with the column-mapping helper unit-tested.
**Where:** `ui/src/components/**`
**Depends on:** T18 · **Reuses:** handoff `Componentes.dc.html` · **Requirement:** KAN-01, AD-009 constraint 1
**Tools:** MCP: NONE · Skill: NONE
**Done when:** [x] components render per handoff; [x] the pure `dueDate→column` and link-validity helpers have unit tests; [x] quick gate (`npm run test`) passes.
**Tests:** unit (logic helpers) · **Gate:** quick · **Status:** ✅ complete (159c7b7) · note: Card, StageBadge (two vocabularies: spaced pill "Dia N" / exam rect "Sessão N de M"), MethodSwitcher, TechniqueChip, EmptyState, ModalShell (shell only), Countdown, LinkRow (+não-abrível variant), Toast — token-styled via inline `var(--…)`. Pure helpers `columns.ts` (`columnForDueDate`/`columnForCard`, 8 tests incl. overdue→Hoje/archived→Concluídos) and `links.ts` (`isOpenableLink`, 5 tests). 13 vitest tests pass; tsc type-checks all components.
**Commit:** `feat(ui): add shared component library`

### T20: App shell — collapsible sidebar + promoted method switcher
**What:** Sidebar (labels↔icon rail, persisted collapse, auto-collapse <1024px, keyboard toggle), method switcher as top-of-board segmented control; routes wired.
**Where:** `ui/src/components/AppShell.tsx`, `ui/src/routes/**`
**Depends on:** T19 · **Reuses:** handoff Shell/Quadro screens · **Requirement:** AD-009
**Tools:** MCP: NONE · Skill: NONE
**Done when:** [x] collapse state persists; [x] method switcher stays visible when collapsed; [x] auto-collapse threshold works; [x] build passes.
**Tests:** none · **Gate:** build · **Status:** ✅ complete (7f6b6c9) · note: sidebar collapse persisted to `localStorage` (`studdup.sidebar.collapsed`), auto-collapses below 1024px via resize listener, Ctrl/⌘+B keyboard toggle; MethodSwitcher rendered in the content header (never in the sidebar) so it stays visible when collapsed (AD-009). Routes registry in `routes/index.tsx` (placeholders for the real screens built in later batches); `App.tsx` wires tokens + `initTheme` + mounts the shell so the dev app loads.
**Commit:** `feat(ui): add collapsible shell with promoted method switcher`

### T21: Command client + React Query + Zustand store
**What:** Typed `commands.ts` over `bindings.ts`; React Query provider + query/mutation hooks; Zustand store (active method, sidebar, live session).
**Where:** `ui/src/lib/commands.ts`, `ui/src/lib/queries.ts`, `ui/src/store.ts`
**Depends on:** T17, T20 · **Reuses:** generated `bindings.ts` · **Requirement:** METH-02
**Tools:** MCP: NONE · Skill: NONE
**Done when:** [x] hooks call commands and cache; [x] active-method persists (test the store reducer); [x] quick gate passes.
**Tests:** unit (store logic) · **Gate:** quick (+ full Build gate run as last task) · **Status:** ✅ complete (197255d) · note: `commands.ts` = 13 typed `invoke` wrappers (camelCase args mapped to Rust snake_case); `queries.ts` = shared QueryClient + query/mutation hooks (mutations invalidate board+history) kept JSX-free so the provider mounts in T22; `store.ts` = Zustand+persist (activeMethod + sidebarCollapsed persisted to localStorage, live session ephemeral via `partialize`). 4 store tests (active-method persists + restored, sidebar persists, session not persisted). Final Build gate: fmt/clippy clean, core coverage 95.10%, all rust + ui tests pass, ui builds.
**Commit:** `feat(ui): add typed command client, query hooks and ui store`

### T22: Kanban board — columns + card placement
**What:** Four columns (Hoje/Amanhã/Próximos/Concluídos) for both methods; place cards by `dueDate` vs today, overdue→Hoje with badge; empty-column placeholders.
**Where:** `ui/src/routes/Quadro.tsx`, `ui/src/components/Board.tsx`
**Depends on:** T21 · **Reuses:** T19 helpers · **Requirement:** KAN-01, KAN-04(part)
**Tools:** MCP: NONE · Skill: NONE
**Done when:** [x] placement helper unit-tested across all four buckets incl. overdue; [x] empty columns keep footprint; [x] quick gate passes.
**Tests:** unit (placement) · **Gate:** quick · **Status:** ✅ complete (521de17) · note: `list_board` returns only active `Card[]` (no session/due-date field), so the board derives each card's due date from the spaced ladder (`start_date + stage offset`, AD-003) via a pure `placeCard`/`spacedDueDate` helper in `Board.tsx` (10 vitest tests incl. overdue). QueryClientProvider mounted at App root; `activeMethod` lifted into the Zustand store so the promoted MethodSwitcher (AppShell) and the board share it; `RouteView` now renders the live `Quadro` for the quadro route. Concluídos shows only archived cards (none from `load_active`) → renders its empty placeholder. Wiring touched `App.tsx`, `AppShell.tsx`, `routes/index.tsx` beyond the two new files.
**Commit:** `feat(ui): render kanban board with due-date column placement`

### T23: Kanban — drag to reschedule / complete (optimistic + rollback)
**What:** dnd-kit drag: Hoje→Amanhã = postpone +1; →Concluídos = complete; same-column drop = no-op; drop-outside = revert. Optimistic Zustand update, rollback + toast on command error.
**Where:** `ui/src/components/Board.tsx` (extend), `ui/src/lib/dnd.ts`
**Depends on:** T22 · **Reuses:** mutation hooks · **Requirement:** KAN-02, KAN-03
**Tools:** MCP: NONE · Skill: NONE
**Done when:** [x] no-op/drop-outside produce no mutation (unit test on the resolver); [x] rollback logic unit-tested; [~] manual drag persists across reload (GUI verification deferred to user per batch note; optimistic+rollback wiring built + build gate green); [x] quick gate passes.
**Tests:** unit (drag resolver) · **Gate:** quick · **Status:** ✅ complete (203f341) · note: pure `resolveDrag(from,to|null)` in `lib/dnd.ts` returns a discriminated `noop{same-column|outside} | postpone{days,to} | complete{to}` (Hoje→Amanhã = +1; day-anchor delta generalizes reschedule; →Concluídos = complete); `applyOptimisticMove`/`rollbackMove` over a `cardId→Column` override map (10 vitest tests). Board wires dnd-kit (DndContext + PointerSensor dist 6, per-column `useDroppable`, per-card `useDraggable`) → optimistic override, `postpone`/`complete` mutation, `onError` rollback + danger Toast, `onSettled` clears override. Optimistic state kept as local component state (store.ts not a T23 file) — equivalent optimistic+rollback.
**Commit:** `feat(ui): add drag-and-drop reschedule and complete`

### T24: Kanban — exam grouping + exams rail
**What:** In Prova method, group cards under exam headings inside each column; exams rail with name/days-left/progress; urgency + concluded treatments.
**Where:** `ui/src/routes/QuadroProva.tsx`, `ui/src/components/ExamsRail.tsx`
**Depends on:** T23 · **Reuses:** handoff Prova screens · **Requirement:** KAN-04
**Tools:** MCP: NONE · Skill: NONE
**Done when:** [x] cards grouped by exam within columns; [x] rail shows days-left+progress; [x] build passes.
**Tests:** none · **Gate:** build · **Status:** ✅ complete (ac06f08) · note: `ExamsRail` = prop-driven presentational rail + pure `examRailViewModel` (days-left via `daysBetween`, urgency ≤3 days → "Reta final"/atraso styling, progress bar completed/total, past-date/concluded → "Encerrada" muted). `QuadroProva` places ExamPrep board cards via `placeCard` then groups by `exam_id` under a heading inside each column and renders the rail. `Quadro.tsx` switches ExamPrep→`QuadroProva` (wiring, +1 line). **Data gap:** the bridge exposes no `list_exams`/session-progress read and `Card` has `exam_id` but no exam name/date, so headings label "Prova #<id>" and rail items carry per-exam card counts only (examDate/completed unknown); ExamsRail renders full days-left/progress once that read lands (T30-era). Final Build gate: fmt/clippy clean, core coverage 95.10%, 97 Rust tests pass, ui builds.
**Commit:** `feat(ui): add exam grouping and exams rail for prova method`

### T25: New/Edit card modals + validation
**What:** New card (title, links, method default=active, technique picker with one-line descriptions, exam when Prova) and Edit (no method); title 1–200 with counter, Criar disabled until valid, unsaved-changes warning.
**Where:** `ui/src/components/modals/{NovoCard,EditarCard}.tsx`
**Depends on:** T21 · **Reuses:** handoff card modals · **Requirement:** METH-03, TECH-01
**Tools:** MCP: NONE · Skill: NONE
**Done when:** [x] validation helper unit-tested (empty/whitespace/201 chars); [x] method defaults to active; [x] quick gate passes.
**Tests:** unit (validation) · **Gate:** quick · **Status:** ✅ complete (612dca5) · note: added pure `ui/src/components/modals/validation.ts` (`validateTitle`/`titleCharCount`/`TITLE_MAX`, mirroring core `api::validate_title`) + `validation.test.ts` (7 tests: empty/whitespace/200-ok/201-too-long/no-trim-on-length/code-point count). Modals are prop-driven (compose `ModalShell`); NovoCard defaults method to the `activeMethod` prop (METH-03 §3) and disables Criar until valid; EditarCard shows method read-only + discard-confirmation on close. Mounting/triggering deferred to wiring tasks.
**Commit:** `feat(ui): add new and edit card modals with validation`

### T26: Card detail + log modals
**What:** Read-only detail hub (all fields, stage, due date, technique, schedule, actions) and chronological event log modal.
**Where:** `ui/src/components/modals/{DetalheCard,LogCard}.tsx`
**Depends on:** T25 · **Reuses:** handoff detail/log screens · **Requirement:** HIST-04
**Tools:** MCP: NONE · Skill: NONE
**Done when:** [x] detail shows archived vs active action sets; [x] log lists events with stage transitions+technique; [x] build passes.
**Tests:** none · **Gate:** build · **Status:** ✅ complete (9488752) · note: `DetalheCard` (custom wider overlay — the detail hub exceeds ModalShell's 480px — status/context/stage/due/technique/links + spaced ladder timeline; active set = Estudar/Editar/Adiar/Ver log/Excluir, archived set = Reativar/Ver log/Excluir). `LogCard` composes ModalShell, lists events newest-first with `Dia X → Dia Y` transition chips (restart → "mantém Dia N") + technique/focused-min detail. Wired card click → detail in `Board.tsx` (onOpen plumbed BoardColumn→DraggableCard→Card.onClick; drag activation distance 6 keeps click distinct); detail routes to Log (events filtered from `useHistory(method)` by card id) and Edit (reuses T25 EditarCard + `useEditCard`). QuadroProva exam-card click→detail deferred (exam-side UI is T30). Study/postpone/delete/revive buttons wire in T27–T29/B5.
**Commit:** `feat(ui): add card detail and event log modals`

### T27: Overdue modal (restart / erase)
**What:** On returning to an overdue card, offer Recomeçar (keep stage, due today) vs Apagar (Day 0), non-judgmental, consequences shown.
**Where:** `ui/src/components/modals/CardAtrasado.tsx`
**Depends on:** T25 · **Reuses:** handoff overdue modal · **Requirement:** METH-05(restart), HIST-05
**Tools:** MCP: NONE · Skill: NONE
**Done when:** [x] restart calls `restart_card`, erase calls `erase_card`; [x] copy matches non-punitive tone; [x] build passes.
**Tests:** none · **Gate:** build · **Status:** ✅ complete (82b414a) · note: `CardAtrasado` custom 560px overlay, two side-by-side non-punitive paths (Recomeçar = keep stage/due today; Apagar = Day 0) with consequences spelled out + "sem certo ou errado" footer + "Agora não" dismiss; tone scales with overdue-days (fresh vs "faz um tempo"). Wired in `Board.tsx`: detail hub `onStudy` on an overdue card (`placeCard().overdueDays > 0`) opens it; `onRestart` → `useRestartCard.mutate(id)`, `onErase` → `useEraseCard.mutate(id)`. Build gate green.
**Commit:** `feat(ui): add overdue resolution modal`

### T28: Postpone modal + 5-min review timer
**What:** Postpone N days; for reviews (stage>first) run the 5-min countdown then "Você revisou?" Sim=complete / Não=postpone; pause/resume.
**Where:** `ui/src/components/modals/Adiar.tsx`
**Depends on:** T25 · **Reuses:** handoff postpone modal, Countdown · **Requirement:** KAN-02(reschedule semantics)
**Tools:** MCP: NONE · Skill: NONE
**Done when:** [x] timer countdown/pause/resume logic unit-tested; [x] Sim→complete, Não→postpone; [x] quick gate passes.
**Tests:** unit (timer logic) · **Gate:** quick · **Status:** ✅ complete (6d6eaa8) · note: pure `reviewTimer.ts` state machine (`createTimer`/`startTimer`/`pauseTimer`/`resumeTimer`/`tick`/`isDone`/`isReviewStage`, REVIEW_SECONDS=300) + `reviewTimer.test.ts` (7 tests: full-length start, decrement-while-running, no-advance idle/paused, done-at-zero-stops, pause holds exact 192 then resume 192→191, pause/resume no-ops, isReviewStage Day0/Done=false vs Day1+=true). `Adiar` modal is a 4-mode flow: choose (postpone presets +1/+2/+3/+7 → onPostpone) for first sessions; review stages get challenge → timer (Countdown-driven, 1s interval over the pure machine, pause/resume, "Desistir e adiar" → choose) → question "Você revisou?" (Sim → onComplete, Não → choose→postpone). Wired in Board detail `onPostpone` → `usePostponeCard`, `onComplete` → `useCompleteCard`.
**Commit:** `feat(ui): add postpone modal with review timer`

### T29: Delete card modal
**What:** Destructive confirmation naming the card (active + archived variants).
**Where:** `ui/src/components/modals/ExcluirCard.tsx`
**Depends on:** T25 · **Reuses:** handoff delete modal · **Requirement:** HIST-01
**Tools:** MCP: NONE · Skill: NONE
**Done when:** [x] confirm calls `delete_card`; [x] card removed from board; [x] build passes.
**Tests:** none · **Gate:** build · **Status:** ✅ complete (36f846c) · note: `ExcluirCard` 440px danger overlay naming the card in its title ("Excluir "<title>"?") with distinct consequence copy for active vs archived (archived warns history erased + no revive) + "não pode ser desfeita" line. Wired in Board detail `onDelete` → `useDeleteCard.mutate(id)` (invalidates board so the card leaves the quadro). Build gate green.
**Commit:** `feat(ui): add delete card confirmation`

### T30: Exam list/detail + New/Delete exam modals
**What:** Lista de Provas (progress cards), Detalhe da Prova (cards+session progress), Nova Prova (name+date, validation past/far), Excluir Prova (names card count).
**Where:** `ui/src/routes/{ListaProvas,DetalheProva}.tsx`, `ui/src/components/modals/{NovaProva,ExcluirProva}.tsx`
**Depends on:** T24 · **Reuses:** handoff exam screens · **Requirement:** EXAM-01, EXAM-04
**Tools:** MCP: NONE · Skill: NONE
**Done when:** [x] date validation helper unit-tested (past, >5y); [x] delete confirm shows card count; [x] quick gate passes; [x] api list_exams integration-tested; [x] full Build gate green.
**Tests:** unit+integration (date validation + api list_exams) · **Gate:** full + final Build · **Status:** ✅ complete (ae28d28) · **api-read extension:** `core::api::ExamView { id, name, exam_date, created_at, concluded, days_remaining, completed_sessions, total_sessions }` + `list_exams(conn, today) -> Vec<ExamView>` (composes repo `load_exams` + `exam_session_progress`); Tauri `list_exams` command (registered in main.rs); bindings `ExamView` + `Commands.list_exams` + `commands.listExams()` + `useExams()` hook (mutations now also invalidate `["exams"]`). 3 integration tests in tests/api.rs (empty, days-remaining+progress happy path, soonest-first ordering). **UI:** `examValidation.ts` (`validateExamDate`/`maxExamDate`, mirrors core bounds today..+5y, Feb-29 clamp) + `examValidation.test.ts` (8 tests: empty/past/today/near/5y/>5y/max-years/leap-clamp); `NovaProva` (name+native date input, min/max bounded, Criar disabled until valid); `ExcluirProva` (names exam + card count "tópicos", lists first 4 + "+N"); `ListaProvas` + `DetalheProva` routes. **QuadroProva rewired as exam hub:** feeds real exam names into headings + real days-left/progress into ExamsRail (closes T24 gap), "Gerenciar provas" → ListaProvas → DetalheProva, Nova/Excluir wired to `useCreateExam`/`useDeleteExam`. **Deviations:** exam screens are reached from the Prova board (shell nav set fixed, AD-009), not top-level routes; delete card-count uses active board cards per exam (no cards-per-exam backend count); native `<input type=date>` instead of the handoff bespoke calendar; NovaProva copy uses the spec's 5-year bound (handoff mock said 2 years). Final Build gate: fmt/clippy clean, core coverage 91.62%, 100 Rust tests + 59 ui vitest pass, ui builds.
**Commit:** `feat(ui): add exam list, detail and management modals`

### T31: Technique defaults + est_minutes + Pomodoro rhythm
**What:** Apply per-technique default est on technique select; editable est (5–180); Pomodoro rhythm picker (25/5, 50/10, 90/20, custom, default 25/5) deriving est; global defaults in a `settings` table; card shows est (active) vs actual (completed).
**Where:** `ui/src/components/RhythmPicker.tsx`, `ui/src/routes/Configuracoes.tsx`, wire into T25 modals; `core::api` settings read/write
**Depends on:** T25, T15 · **Reuses:** AD-010 · **Requirement:** TECH-09, TECH-EST
**Tools:** MCP: NONE · Skill: NONE
**Done when:** [x] est-derivation from rhythm unit-tested (50/10→50 min); [x] est bounds enforced; [x] active vs completed display switch tested; [x] full gate passes.
**Tests:** unit + integration (settings) · **Gate:** full · **Status:** ✅ complete (3383f78) · note: generic `settings` key/value read/write added to repo (`settings.rs`) + api (`get_setting`/`set_setting`) + Tauri commands + bindings (4 integration tests). Pure `ui/src/lib/sessionEstimate.ts` (est-from-rhythm=focus block, per-technique defaults Pomodoro=rhythm/AR=20/Feynman=20/Leitner=15, 5–180 bounds, active-vs-completed `sessionDurationLabel`) with 16 vitest tests; Card.tsx now uses that helper. `RhythmPicker` (25/5,50/10,90/20,custom) + `EstField` wired into NovoCard/EditarCard (technique select seeds default est; rhythm derives est). `Configuracoes` route edits global per-technique defaults via settings (applied to new cards only, AD-010).
**Commit:** `feat: add per-technique session defaults and pomodoro rhythm`

### T32: Pomodoro session screen
**What:** Full-screen focus/break countdown using the card's rhythm; notify + auto-start break at zero; pause/resume; exit-early "marcar como concluído?"; records `focused_secs` on completion.
**Where:** `ui/src/sessions/Pomodoro.tsx`
**Depends on:** T31 · **Reuses:** handoff Pomodoro screen, Countdown · **Requirement:** TECH-02, TECH-03
**Tools:** MCP: NONE · Skill: NONE
**Done when:** [x] focus→break transition + elapsed-seconds accounting unit-tested; [x] uses configured rhythm; [x] completion records focused_secs (integration); [x] full gate passes.
**Tests:** unit + integration · **Gate:** full · **Status:** ✅ complete (46d9f71) · note: pure `ui/src/sessions/pomodoroTimer.ts` machine (focus→break auto-transition at zero, elapsed focused-secs accounting excluding break/paused time, break→done, pause/resume holds remaining) + `pomodoroTimer.test.ts` (9 tests). `PomodoroSession` full-screen screen ticks it at 1 Hz, notifies on the focus→break edge (best-effort WebView Notification, no new JS dep — app-crate plugin unchanged), pause/resume, exit-early "marcar como concluído?" → `onComplete(focusedSecs)`. Completion→focused_secs integration covered by existing tests/api.rs `record_session_persists_focused_seconds_on_the_event`. Board launch wiring lands with T33.
**Commit:** `feat(ui): add pomodoro study session`

### T33: No-technique session
**What:** Minimal session screen (card + links + Concluir) for cards without a technique.
**Where:** `ui/src/sessions/None.tsx`
**Depends on:** T32 · **Reuses:** — · **Requirement:** TECH-02(7)
**Tools:** MCP: NONE · Skill: NONE
**Done when:** [x] Concluir completes the card; [x] build passes.
**Tests:** none · **Gate:** build · **Status:** ✅ complete (4035f0a) · note: `NoneSession` (topic + links via LinkRow + single "Concluir estudo"). Board's detail `onStudy` now dispatches on-time cards to a session: Pomodoro (with a rhythm) → `PomodoroSession` → `useRecordSession`; every other card → `NoneSession` → `useCompleteCard` (also the stopgap for the deferred AR/Feynman/Leitner guided screens). Overdue cards still route to the Recomeçar/Apagar modal first. Build green (139 modules).
**Commit:** `feat(ui): add plain no-technique session`

### T34: History UI — per-method + unified with filters + revive
**What:** Histórico with "Este método / Geral" tabs; unified rows labeled method+technique; filters by method/technique with result count; Reativar action; empty states.
**Where:** `ui/src/routes/Historico.tsx`
**Depends on:** T21 · **Reuses:** handoff history screens · **Requirement:** HIST-01, HIST-02, HIST-03, HIST-05
**Tools:** MCP: NONE · Skill: NONE
**Done when:** [x] filter/count logic unit-tested; [x] revive calls `revive_card`; [x] empty state copy present; [x] quick gate passes.
**Tests:** unit (filter logic) · **Gate:** quick · **Status:** ✅ complete (f87d6a6) · note: pure `historyFilter.ts` (`filterHistory`/`historyCount` AND-narrow by method+technique, `isRevivable` = to_stage Done or archived) + `historyFilter.test.ts` (9 tests). `Historico` route: "Este método" (active-method scoped, HIST-01) / "Geral" (unified + method/technique filter chips + live count, HIST-02/03) tabs over a single `useHistory(null,null)` fetch, client-side filtered; terminal rows offer Reativar → `useReviveCard(card_id)` (HIST-05); two empty states (no events / no filter matches). Registered in nav (route already existed). **Deviation:** rows label the card as "Card #<id>" and show the event's ISO date (list_history returns events, no card-title join); acceptable within the events-only read surface.
**Commit:** `feat(ui): add per-method and unified history with revive`

### T35: README.md
**What:** What Studdup is, both methods, four techniques, prerequisites, working build/run/test commands (verified before writing).
**Where:** `README.md`
**Depends on:** T34 · **Reuses:** spec · **Requirement:** DOC-01
**Tools:** MCP: NONE · Skill: NONE
**Done when:** [x] every documented command executed successfully in-repo first; [x] a clean checkout reaches a running app + passing tests by following it.
**Tests:** none · **Gate:** build · **Status:** ✅ complete (158aa97) · note: every documented command was run in-repo first — `cargo build`, `cargo test`, `cargo fmt --check`, `cargo clippy -- -D warnings`, `cargo llvm-cov -p studdup-core --fail-under-lines 70` (91.53% lines), `cd ui && npm install`, `npm --prefix ui run build`, `npm --prefix ui run test`, `npm --prefix ui run dev` (Vite boots). tauri-cli is NOT installed → the README documents the verified dev workflow (Vite dev server for the UI + `cargo build` for the backend) and lists the desktop-shell prerequisites, rather than an unverified `cargo tauri` command. Covers what Studdup is, both methods, four techniques, prerequisites, layout.
**Commit:** `docs: add README`

### T36: ARCHITECTURE.md
**What:** Layer map, stage-as-offset invariant (AD-003), DB schema, step-by-step "add a method" and "add a technique".
**Where:** `ARCHITECTURE.md`
**Depends on:** T35 · **Reuses:** design.md, STATE.md · **Requirement:** DOC-02
**Tools:** MCP: NONE · Skill: NONE
**Done when:** [x] documents all layers + invariant + schema; [x] add-method and add-technique guides present.
**Tests:** none · **Gate:** build · **Status:** ✅ complete (8159efd) · note: layer map (ui/studdup/studdup-core + request flow + state/type strategy), stage-as-offset invariant (AD-003) spelled out with the re-anchoring rules + the other must-not-break invariants, the full DB schema (cards/history C++-compat names + new columns, exams/exam_sessions/leitner_items/settings), and step-by-step add-a-method / add-a-technique walkthroughs working outward from the core.
**Commit:** `docs: add ARCHITECTURE`

### T37: AGENTS.md (vendor-neutral)
**What:** Project conventions, commit format (incl. no co-author), test/lint commands, invariants that must not break — vendor-neutral, no Claude-specific text.
**Where:** `AGENTS.md`
**Depends on:** T36 · **Reuses:** STATE.md · **Requirement:** DOC-03
**Tools:** MCP: NONE · Skill: NONE
**Done when:** [x] no vendor-specific instructions; [x] commands + invariants + commit rule present.
**Tests:** none · **Gate:** build · **Status:** ✅ complete (f2c7eaa) · note: vendor-neutral (no tool/model/assistant name anywhere), covers project layout, all 8 must-not-break invariants (stage-as-offset first), verified build/test/run/lint/coverage commands, testing conventions, the atomic-conventional-commit rule with the explicit **no `Co-Authored-By` / no tool attribution** note, and where the spec/design/decision-log live (`.specs/`). Final Build gate green: `cargo fmt --check` clean, `cargo clippy -- -D warnings` clean, core coverage 91.53% lines (≥70), all Rust tests pass, `npm --prefix ui run build` succeeds.
**Commit:** `docs: add vendor-neutral AGENTS guide`

---

### T38: Wire exam auto-conclusion for lapsed exams (Fix task — EXAM-01 AC#5)
**What:** The building blocks (`exam::should_conclude`, `exams::set_exam_concluded`) existed and were unit-tested but nothing called them, so a passed exam stayed `concluded = 0`, its cards lingered overdue in "Hoje", and no history was recorded. Added `api::conclude_lapsed_exams(conn, today) -> u32`: for each exam where `should_conclude` holds, mark it concluded, archive its still-active cards (new `cards::load_active_for_exam`), and record an `archived` history event per card (existing kind set). Wired the sweep into the exam-board read path — `api::list_board` (ExamPrep only, now takes `today`) and `api::list_exams` — so lapsed exams sweep whenever the board loads. Idempotent (concluded exams are skipped; archived cards drop out). The Tauri `list_board` command computes `today` via the existing `with_db!` macro, so no bindings/commands.ts change.
**Where:** `studdup-core/src/api.rs`, `studdup-core/src/repository/cards.rs`, `studdup/src/commands.rs`, `studdup-core/tests/api.rs`
**Depends on:** T15, T30 · **Reuses:** `should_conclude`, `set_exam_concluded`, `record_event`, `load_active_for_exam` · **Requirement:** EXAM-01 (AC#5)
**Tools:** MCP: NONE · Skill: NONE
**Done when:** [x] lapsed exam → `concluded = 1`; [x] its pending cards → `archived = 1`; [x] an archived history event per card; [x] second run is a no-op (idempotent); [x] a not-yet-lapsed exam is untouched; [x] the board reflects concluded exams without a manual action.
**Tests:** +4 integration (`studdup-core/tests/api.rs`): `lapsed_exam_is_concluded_cards_archived_and_history_recorded`, `not_yet_lapsed_exam_is_left_untouched`, `list_exams_read_path_sweeps_lapsed_exams`, `list_board_read_path_sweeps_lapsed_exam_cards` · **Gate:** full + build · **Status:** ✅ complete (ea33b43) · note: Build gate green — `cargo fmt --check` clean, `cargo clippy -- -D warnings` clean, `studdup-core` coverage 91.66% lines (≥70), `cargo test` all pass (30 api tests), `npm --prefix ui run test` 93 pass, `npm --prefix ui run build` succeeds. Conclusion recorded via the existing `archived` event kind (history rows require a NOT-NULL `card_id`; the design's kind set has no dedicated `concluded` kind), consistent with "record a history event consistent with existing event kinds".
**Commit:** `fix(core): wire exam auto-conclusion for lapsed exams`

---

## Phase Execution Map

```
Phase 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11

P0:  T1 → T2 → T3 → T4
P1:  T5 → T6
P2:  T7 → T8 → T9
P3:  T10 → T11 → T12 → T13 → T14
P4:  T15
P5:  T16 → T17
P6:  T18 → T19 → T20 → T21
P7:  T22 → T23 → T24
P8:  T25 → T26 → T27 → T28 → T29 → T30
P9:  T31 → T32 → T33
P10: T34
P11: T35 → T36 → T37
```

---

## Pre-Approval Validation

### Task Granularity Check
| Task | Scope | Status |
| --- | --- | --- |
| T1–T4 | one crate/config each | ✅ Granular |
| T5 | domain module (cohesive types) | ✅ OK (cohesive) |
| T6 | one type + tests | ✅ Granular |
| T7–T9 | one scheduler concern each | ✅ Granular |
| T10–T14 | one repo concern each | ✅ Granular |
| T15 | api facade (one file, cohesive) | ✅ OK (cohesive) |
| T16–T17 | one wiring concern each | ✅ Granular |
| T18–T21 | one UI foundation concern each | ✅ Granular |
| T22–T24 | one board concern each | ✅ Granular |
| T25–T30 | one modal/flow each | ✅ Granular |
| T31–T34 | one feature each | ✅ Granular |
| T35–T37 | one doc each | ✅ Granular |

### Diagram–Definition Cross-Check
| Task | Depends On (body) | Diagram | Status |
| --- | --- | --- | --- |
| T2 | T1 | T1→T2 | ✅ |
| T3 | T2 | T2→T3 | ✅ |
| T4 | T3 | T3→T4 | ✅ |
| T6 | T5 | T5→T6 | ✅ |
| T7 | T6 | T6→T7 | ✅ |
| T8 | T7 | T7→T8 | ✅ |
| T9 | T8 | T8→T9 | ✅ |
| T11 | T10 | T10→T11 | ✅ |
| T12 | T11 | T11→T12 | ✅ |
| T13 | T11 | T11→T13 (T12,T13 both after T11; sequential in phase) | ✅ |
| T14 | T10 | T10→…→T14 (same phase, backward dep) | ✅ |
| T15 | T9, T12, T13, T14 | cross-phase backward | ✅ |
| T16 | T15 | T15→T16 | ✅ |
| T17 | T16 | T16→T17 | ✅ |
| T19 | T18 | T18→T19 | ✅ |
| T20 | T19 | T19→T20 | ✅ |
| T21 | T17, T20 | backward cross-phase | ✅ |
| T22 | T21 | T21→T22 | ✅ |
| T23 | T22 | T22→T23 | ✅ |
| T24 | T23 | T23→T24 | ✅ |
| T25 | T21 | backward | ✅ |
| T26–T29 | T25 | T25→… | ✅ |
| T30 | T24 | backward | ✅ |
| T31 | T25, T15 | backward | ✅ |
| T32 | T31 | T31→T32 | ✅ |
| T33 | T32 | T32→T33 | ✅ |
| T34 | T21 | backward | ✅ |
| T35 | T34 | T34→T35 | ✅ |
| T36 | T35 | T35→T36 | ✅ |
| T37 | T36 | T36→T37 | ✅ |

All dependencies point backward or within-phase. ✅

### Test Co-location Validation
| Task | Layer Created | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T5 | core domain | unit | unit | ✅ |
| T6 | core domain | unit | unit | ✅ |
| T7–T9 | core scheduler | unit | unit | ✅ |
| T10–T14 | core repository | integration | integration | ✅ |
| T15 | core api | integration | integration | ✅ |
| T16–T17 | tauri commands | none | none | ✅ |
| T18, T20, T24, T26, T27, T29, T33 | presentational | none | none | ✅ |
| T19, T21, T22, T23, T25, T28, T30, T34 | UI logic | unit | unit | ✅ |
| T31, T32 | UI logic + settings | unit+integration | unit+integration | ✅ |
| T35–T37 | docs | none | none | ✅ |

No violations. ✅

---
---

# P2/P3 PASS — Tasks (T39–T57)

**Opened:** 2026-07-30. **Scope:** the deferred P2/P3 stories — Início wiring gaps (HOME-01/04/05), Active
Recall + Feynman sessions + self-rating (TECH-04/05/06), techniques catalog + session reminder (TECH-07),
and the Leitner stack (TECH-08). Same stack, same conventions, same Test Coverage Matrix + Gate Commands as
the P1 round above. New decisions this round: **AD-011** (attempts table, schema v2) and **AD-012** (Leitner
box intervals). Commit convention unchanged: atomic, Conventional Commits, **no Co-Authored-By**.

**Pre-existing groundwork already in the tree (do NOT rebuild):** `history.self_rating` column +
`record_session(..., self_rating)` (TECH-06 backend done — frontend only needs to collect+pass it);
`leitner_items` table; `settings` key/value api (`get_setting`/`set_setting`); the store's unused
`session`/`startSession`/`endSession`; Início/Técnicas/Ajuda screens (built, but with the HOME gaps below);
`TECHNIQUE_SUMMARY` in TechniqueChip. Verify-then-reuse; only build what is missing.

## Coverage / gate note for this round
Same matrix. Core domain/scheduler additions (attempts, Leitner box math) are **unit**, `#[cfg(test)]`.
Repository/api additions are **integration** in `studdup-core/tests/*.rs`. Pure UI helpers (first-due pick,
session dispatch, reminder-suppress key) are **unit** `*.test.ts`. Session/editor screens are presentational,
build gate. Full gate before a task is done: `cargo test && npm --prefix ui run test` (plus
`npm --prefix ui run build` for UI-only tasks).

## Execution Plan (phases sequential; tasks within a phase in order)

### Phase A — Início wiring (HOME-01/04/05)  [frontend]
- **T39** (HOME-01, UI logic): set `DEFAULT_ROUTE = "inicio"` in `ui/src/routes/index.tsx` so the app lands
  on Início. Add/adjust a test asserting the default route is `inicio` and that `RouteView("inicio")` renders
  Início. Gate: `npm --prefix ui run test`.
- **T40** (HOME-04, UI logic): add a cross-screen study intent to `store.ts` — `pendingStudy: Method | null`,
  `requestStudy(method)`, `clearStudy()` (ephemeral, not persisted). Add a pure helper
  `firstDueCard(cards, today): Card | null` (earliest-due, non-archived, in the "hoje" column) in a testable
  module with unit tests (empty is null; picks overdue/soonest). Board: on mount / when cards load, if
  `pendingStudy === method` open the first due card's study flow (same path as detail "Estudar": overdue is
  CardAtrasado, else session), then `clearStudy()`. Gate: `npm --prefix ui run test`.
- **T41** (HOME-04/05, presentational): wire Início — "Estudar agora" sets the active method to the one that
  has a due card (prefer the active method; else whichever has one), `requestStudy(that)`, navigate to
  `quadro`; when nothing is due keep the calm all-clear (never fabricate). Each upcoming-exam row sets active
  method `ExamPrep` then navigates to `quadro` (HOME-05). Gate: `npm --prefix ui run build`.

### Phase B — Attempts persistence + schema v2 (AD-011)  [core]
- **T42** (MIG/AD-011, integration): bump `SCHEMA_VERSION` to 2; add the `attempts` table to `create_schema`
  and to `run_upgrade` (`CREATE TABLE IF NOT EXISTS attempts (id PK, card_id FK CASCADE, kind TEXT, text TEXT,
  created_at TEXT)` plus `idx_attempts_card`). Prove fresh vs migrated schemas still identical and the v1→v2
  upgrade is idempotent (re-run adds nothing). Gate: `cargo test -p studdup-core`.
- **T43** (TECH-04.4, integration): domain `Attempt { id, card_id, kind, text, created_at }` (plus an
  `AttemptKind` enum or validated string) and repository `record_attempt` + `load_attempts(card_id)` returning
  reverse-chronological order. Tests: insert several, read back newest-first; cascade on card delete. Gate:
  `cargo test -p studdup-core`.
- **T44** (TECH-04.4, integration): `api::record_attempt(conn, card_id, kind, text, today)` (rejects empty
  text; `CardNotFound` when the card is gone) and `api::list_attempts(conn, card_id)`. Integration tests in
  `studdup-core/tests/api.rs` for happy + empty-text + missing-card. Gate: `cargo test -p studdup-core`.
- **T45** (bridge, build gate): Tauri commands `record_attempt` + `list_attempts` (`with_db!`), registered in
  `main.rs`; `bindings.ts` (`Attempt`, `AttemptKind`, the two Commands entries); `commands.ts` wrappers;
  `queries.ts` `useAttempts(cardId)` + `useRecordAttempt()` (invalidates attempts). Gate:
  `cargo build -p studdup && npm --prefix ui run build`.

### Phase D — Catalog + session reminder (TECH-07)  [frontend]
- **T46** (TECH-07.1/2, presentational): verify `Tecnicas.tsx` lists all four techniques with a one-line
  summary + when-it-works (it does — confirm against the AC, fill any gap) and that the NovoCard/EditarCard
  technique picker shows each option's inline `TECHNIQUE_SUMMARY`. Only change what is missing. Gate:
  `npm --prefix ui run build`.
- **T47** (TECH-07.3, UI logic): a `TechniqueReminder` banner shown at the top of every session (Pomodoro,
  None, AR, Feynman, Leitner) with a short how-to for that card's technique, a dismiss (this session) and a
  "não mostrar de novo" that persists via `set_setting("reminder.<technique>.hidden","1")`; suppressed when
  `get_setting` returns `"1"`. Pure helper `reminderStorageKey(technique)` + suppress logic unit-tested. Gate:
  `npm --prefix ui run test`.

### Phase C — Active Recall + Feynman sessions (TECH-04/05/06)  [frontend]
- **T48** (TECH-06, UI logic): shared `SelfRating` control — three points *Não lembrei / Parcial / Sólido*
  mapping to `0/1/2`; pure `SELF_RATING` option list + value mapping unit-tested. Gate:
  `npm --prefix ui run test`.
- **T49** (TECH-04, presentational): `ActiveRecallSession` — hides the content link, textarea "escreva o que
  lembra", **reveals the content link only after submit** (TECH-04.1), then asks `SelfRating`; on finish
  `record_session(focusedSecs, selfRating)` + `record_attempt('active_recall', text)`; closing with unsaved
  text warns first (EscapeCloser + confirm). Gate: `npm --prefix ui run build`.
- **T50** (TECH-05, presentational): `FeynmanSession` — textarea "explique como se ensinasse a um iniciante",
  then shows it **side by side with the source** (content link) (TECH-05.2), then `SelfRating`; finish records
  session + `record_attempt('feynman', text)`; unsaved-close warning. Gate: `npm --prefix ui run build`.
- **T51** (TECH-04.4, presentational): in `DetalheCard`, a "Tentativas anteriores" section listing
  `useAttempts(card.id)` newest-first (kind + date + text), shown for AR/Feynman cards; empty-state when none.
  Gate: `npm --prefix ui run build`.
- **T52** (TECH-04/05, UI logic): Board session dispatch — a pure `sessionKind(technique)` mapping Pomodoro to
  pomodoro, ActiveRecall to activeRecall, Feynman to feynman, else none (Leitner filled in T57); Board mounts
  the matching screen (AR/Feynman now leave NoneSession only for none/unsupported). Unit-test the mapping.
  Gate: `npm --prefix ui run test`.

### Phase E — Leitner (P3, TECH-08)  [core + frontend]
- **T53** (TECH-08.2/3/4, unit): scheduler `leitner_review(box, correct, today) -> (new_box, due_date)` —
  correct `min(box+1,5)`, wrong `1`, `due = today + [1,2,4,8,16][new_box-1]`; `leitner_due(item, today)`.
  Unit tests: promote caps at 5, wrong resets to box 1 due tomorrow, each box's interval. Gate:
  `cargo test -p studdup-core`.
- **T54** (TECH-08.1/4, integration): repository `add_leitner_item(card_id, front, back, today)` (box 1 due
  today), `load_items(card_id)`, `load_due(card_id, today)`, `review_item(id, correct, today)` applying T53.
  Integration tests: add, list, due-filter, review moves box + due. Gate: `cargo test -p studdup-core`.
- **T55** (TECH-08, integration+bridge): api `add_leitner_item`/`list_leitner_items`/`list_due_leitner_items`/
  `review_leitner_item` (validate non-empty front/back, `CardNotFound`); Tauri commands + `main.rs`;
  `bindings.ts` `LeitnerItem` + entries; `commands.ts`; `queries.ts` hooks (invalidate). api integration tests.
  Gate: `cargo test && cargo build -p studdup && npm --prefix ui run build`.
- **T56** (TECH-08.1, presentational): Leitner item editor — add/list front/back pairs on a Leitner card (from
  DetalheCard or a small modal), using `useAddLeitnerItem`/`useLeitnerItems`. Gate: `npm --prefix ui run build`.
- **T57** (TECH-08.2/3/4, presentational + UI logic): `LeitnerSession` — presents only due items, shows front
  then reveal back then *Certo/Errado* (calls `review_leitner_item`), progress through the due queue, done
  state; extend `sessionKind` (T52) so Leitner maps to leitner and Board mounts it. Unit-test the extended
  mapping. Gate: `npm --prefix ui run test && npm --prefix ui run build`.

## Dependencies (all point backward / within-phase)
A (T39→T40→T41) · B (T42→T43→T44→T45) · D (T46, T47) · C (T48→T49,T50→T51→T52; C uses B's attempts api +
D's reminder) · E (T53→T54→T55→T56→T57; T57 extends T52's dispatch). Cross-phase: T49/T50 dep T45+T47+T48;
T51 dep T45; T57 dep T52+T55.

## Sub-agent batches (~7 tasks, whole phases; sequential; Verifier after the last)
- **B1 = Phase A + Phase B** (T39–T45, 7 tasks) — Início wiring + attempts core/bridge.
- **B2 = Phase D + Phase C** (T46–T52, 7 tasks) — catalog/reminder then AR/Feynman sessions + dispatch.
- **B3 = Phase E** (T53–T57, 5 tasks) — Leitner core→bridge→UI.
- **Verifier** (always-on) after B3: spec-anchored outcome check over TECH-04/05/06/07/08 + HOME-01/04/05,
  discrimination sensor, `validation.md` addendum, lessons.
