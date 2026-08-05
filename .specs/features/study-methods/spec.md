# Study Methods & Techniques Specification

## Problem Statement

Studdup today knows exactly one way to study: a fixed spaced-repetition ladder (0/1/2/5/15/30) for
open-ended learning. That excludes the most common real study situation — *there is an exam on date Y and
I must cover this material before then*. Worse, even inside the ladder the app tells the user **when** to
study and then abandons them: on day 5 the user is left to figure out **how** to study on their own.

This feature introduces two orthogonal axes — the **method** (when) and the **technique** (how) — a kanban
board as the primary workspace, per-method and unified history, and a documentation layer that lets both
humans and AI agents contribute to the project. It is delivered on a new stack (Tauri: Rust + web UI)
because the current Dear ImGui frontend cannot carry the visual quality the product now requires.

## Goals

- [ ] User can choose between two study **methods** — Spaced Repetition and Exam Prep — from the main menu.
- [ ] User can attach a study **technique** (Pomodoro, Leitner, Feynman, Active Recall) to a card and be
      guided through it when the session starts.
- [ ] Each method has its own history; a unified history shows everything studied, labeled by method and
      technique.
- [ ] Existing user study data survives the stack migration with zero loss.
- [ ] A new contributor — human or LLM — can understand the architecture and add a new method or technique
      by reading the docs alone.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Mobile / web-hosted builds | Desktop-only is the stated constraint for now. |
| Cloud sync, accounts, multi-user | Single-user local app; no auth or network dimension exists. |
| Adaptive algorithms (SM-2, FSRS) | The product thesis is that a fixed, unmissable ladder is enough (AD-003). |
| Additional methods beyond the two | Deliberately capped at two to validate the abstraction first. |
| Additional techniques beyond the four | Same reason; the docs describe how to add a fifth. |
| Card sharing / import / export | No user need expressed. |
| Statistics dashboards, streaks, gamification, charts | Punitive/score-driven; conflicts with the calm, non-punitive tone. Distinct from the orientation-only Início overview (HOME story), which carries no scoring. |
| Rich-text or attachments in cards | Cards stay title + two links, as today. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Which technique tools ship first | Pomodoro is P1; Feynman and Active Recall are P2; Leitner is P3 | Pomodoro is technique-agnostic (a timer helps any material), so it delivers the "how do I study" value at the lowest cost. Leitner is last because it needs its own card-content model (front/back), unlike the others. | n |
| Fate of the C++ codebase | Kept on a `legacy/cpp` branch and removed from `main`; the C++ `Scheduler` is the behavioral reference for the Rust port | Keeps the reference recoverable without maintaining two apps. Big-bang cutover, since parallel maintenance of two frontends over one database is a data-corruption risk. | n |
| A card belongs to exactly one method, fixed at creation | Yes — no migration between methods | Separate histories fall out for free, existing-card migration is trivial (all become Spaced Repetition), and no progress-translation rules between incompatible stage vocabularies are needed. | y (implied by AD-001) |
| Technique is per card, not per session | Per card, chosen at creation, editable later | Chosen by the user. History still records the technique on each event, so per-session reporting stays possible later. | y |
| Cards without a technique | Allowed; technique is optional and defaults to none | Forcing a technique choice at creation adds friction to the fast-capture path the app currently has. | n |
| Estimated session length shown on cards (from design mock) | Per-technique default, editable per card (5–180 min); Pomodoro rhythm picked from 25/5, 50/10, 90/20, or custom (default 25/5). Completed cards show actual focused time instead. See TECH-09. | The mock displays minutes on every card; a fixed value would be wrong for most users, and the user asked for editable defaults plus Pomodoro presets. | y |
| Exam distribution shape | Back-loaded — reviews get denser as the exam approaches | Matches how exam preparation actually intensifies. Precise formula defined in EXAM-02. | n |
| Timezone / day boundary | Local timezone, day boundary at local midnight, as today | Preserves current `Date::today()` behavior; no user-visible change. | y |
| Deleting an exam | Deletes the exam and all its cards, behind an explicit confirmation naming the card count | Orphan exam-prep cards would have no schedule anchor and would be unrepresentable. | n |

**Open questions:** none — all resolved or logged above.

---

## User Stories

### P1: Choose a study method ⭐ MVP

**User Story**: As a student, I want to pick which study method a card uses, so that material with a
deadline is scheduled differently from material I'm learning freely.

**Why P1**: This is the feature's core premise. Without it there is no second method and nothing to
separate histories by.

**Acceptance Criteria**:

1. WHEN the user opens the main menu THEN the system SHALL display exactly two selectable methods,
   "Repetição Espaçada" and "Prova", with the currently active method visually marked.
2. WHEN the user selects a method THEN the system SHALL show only cards belonging to that method in the
   board, and SHALL persist the selection so it is restored on next launch.
3. WHEN the user creates a card THEN the system SHALL require a method and SHALL default it to the
   currently active method.
4. WHEN a card has been created THEN the system SHALL NOT offer any control to change its method.
5. WHEN the user selects the Spaced Repetition method THEN the system SHALL schedule its cards on the
   ladder Day 0 → 1 → 2 → 5 → 15 → 30 → Done, with `dueDate = startDate + stage` (AD-003).
6. WHEN a method has no cards THEN the system SHALL display an empty state naming that method and
   offering a create-card action.

**Independent Test**: Create one card in each method, switch methods in the menu, and confirm each board
shows only its own card and that the selection survives a restart.

---

### P1: Exam prep with automatic distribution ⭐ MVP

**User Story**: As a student with an exam on a known date, I want to register the exam and its contents
and have the app spread the study sessions until that date, so that I stop planning by hand.

**Why P1**: This is the second method — without it, the method selector has nothing meaningful to select.

**Acceptance Criteria**:

1. WHEN the user creates an exam THEN the system SHALL require a name and a target date, and SHALL reject
   a target date earlier than today with a message stating the date must be today or later.
2. WHEN a card is added to an exam THEN the system SHALL generate its session dates as follows. Let
   `S = examDate − today` in days and `N` the session count from the table below. For `i` in `0..N−1`,
   `offset_i = round(S × (i / (N−1)) ^ 0.62)`, clamped to `S`, with duplicate offsets pushed forward by one
   day. Session count: `S ≤ 0 → N=1`; `1–3 → N=2`; `4–7 → N=3`; `8–20 → N=4`; `21–45 → N=5`; `S > 45 → N=6`.
3. WHEN `S = 30` THEN the system SHALL generate exactly the offsets `[0, 13, 20, 25, 30]` — demonstrating
   the back-loaded shape (gaps 13, 7, 5, 5).
4. WHEN the user completes a session THEN the system SHALL advance the card to its next generated session
   date, and WHEN the last session is completed THEN the system SHALL mark the card done and archived.
5. WHEN the exam date passes with sessions still pending THEN the system SHALL mark the exam as concluded,
   archive its remaining cards, and record the outcome in history.
6. WHEN the user views an exam THEN the system SHALL display its name, target date, days remaining, and
   the count of completed versus total sessions across all its cards.
7. WHEN the user deletes an exam THEN the system SHALL require a confirmation that names the exam and the
   number of cards to be deleted, and on confirmation SHALL delete the exam and all its cards.

**Independent Test**: Create an exam 30 days out with one card, and confirm the generated session dates
are today +0, +13, +20, +25, +30.

---

### P1: Kanban board as the primary workspace ⭐ MVP

**User Story**: As a student, I want to see my cards as a board I can drag them across, so that I grasp my
workload spatially and reschedule without opening dialogs.

**Why P1**: It replaces the existing agenda; there is no primary view without it.

**Acceptance Criteria**:

1. WHEN the board renders THEN the system SHALL display four columns — "Hoje", "Amanhã", "Próximos",
   "Concluídos" — and SHALL place each card by comparing its due date to today, with overdue cards in
   "Hoje".
2. WHEN a card is overdue THEN the system SHALL show an overdue badge stating the whole number of days
   overdue.
3. WHEN the user drags a card from "Hoje" to "Amanhã" THEN the system SHALL shift its due date by
   +1 day without changing its stage, and SHALL persist the change before the drag animation settles.
4. WHEN the user drags a card into "Concluídos" THEN the system SHALL treat it as completing that session,
   applying the same transition as the Complete action.
5. WHEN the user drops a card back into the column it came from THEN the system SHALL make no change and
   record no history event.
6. WHEN a column has no cards THEN the system SHALL render the column with a visible empty placeholder
   rather than collapsing it.
7. WHEN the board is in Exam Prep method THEN the system SHALL group cards by exam within each column,
   under a labeled exam heading.

**Independent Test**: Drag a card from "Hoje" to "Amanhã", restart the app, and confirm it is still in
"Amanhã" with an unchanged stage.

---

### P1: Per-method and unified history ⭐ MVP

**User Story**: As a student, I want each method to have its own history plus one place that shows
everything, so that I can review progress within a method or across my whole study life.

**Why P1**: Explicitly requested and it is what makes the two methods legible as separate practices.

**Acceptance Criteria**:

1. WHEN the user opens history while a method is active THEN the system SHALL show only that method's
   archived cards and events.
2. WHEN the user opens the unified history THEN the system SHALL show entries from all methods, each
   labeled with its method and, when set, its technique.
3. WHEN the user filters the unified history by method or technique THEN the system SHALL show only
   matching entries and SHALL display the resulting count.
4. WHEN the system records any card event THEN it SHALL persist the event type, the from/to stage, the
   date, the method, and the technique in effect at that moment.
5. WHEN the user revives an archived card from history THEN the system SHALL return it to its original
   method as a fresh first session, and SHALL record a `revived` event.
6. WHEN history has no entries THEN the system SHALL display an empty state explaining that completed
   studies will appear there.

**Independent Test**: Complete one card per method, open each method's history and see one entry, then
open the unified history and see both, correctly labeled.

---

### P1: Data migration from the C++ app ⭐ MVP

**User Story**: As an existing user, I want my study cards and history to survive the rewrite, so that I
do not lose progress I have already accumulated.

**Why P1**: Data loss is irreversible and would destroy trust in the app's core promise.

**Acceptance Criteria**:

1. WHEN the app starts and finds a database at the existing platform user-data path THEN the system SHALL
   open that same file rather than creating a new one.
2. WHEN the database predates this feature THEN the system SHALL apply a forward schema migration that
   assigns every existing card the Spaced Repetition method and a null technique, preserving id, title,
   both links, start date, stage, created-at, last-completed-at and archived flag exactly.
3. WHEN the migration runs THEN the system SHALL first write a timestamped backup copy of the database
   alongside it, and SHALL abort the migration without modifying the original if the backup fails.
4. WHEN the migration has already been applied THEN the system SHALL detect this and SHALL NOT run it
   again.
5. WHEN the migration fails for any reason THEN the system SHALL leave the original database unmodified
   and SHALL show the user an error naming the backup file's location.

**Independent Test**: Run the new app against a copy of a real pre-migration database and confirm every
card appears under Spaced Repetition with its stage and dates intact, and that a backup file exists.

---

### P1: Pomodoro study session ⭐ MVP

**User Story**: As a student who does not know how to actually study a topic today, I want the app to run
a focused Pomodoro session for me, so that I start instead of stalling.

**Why P1**: This is the concrete answer to the "you told me when, not how" gap — the feature's second
premise. Pomodoro is chosen first because it helps any material regardless of subject.

**Acceptance Criteria**:

1. WHEN the user creates or edits a card THEN the system SHALL let them select one technique from
   Pomodoro, Leitner, Feynman, Active Recall, or none.
2. WHEN the user starts a session on a card whose technique is Pomodoro THEN the system SHALL run a focus
   countdown followed by a break countdown, using this card's configured focus/break lengths (default
   25/5 minutes — see TECH-09).
3. WHEN a focus countdown reaches zero THEN the system SHALL notify the user and SHALL automatically begin
   the break countdown.
4. WHEN the user pauses a countdown THEN the system SHALL hold the remaining time and SHALL resume from
   that exact remaining time.
5. WHEN the user closes the session before the focus countdown completes THEN the system SHALL ask whether
   to mark the card completed, and SHALL leave the card unchanged if the user declines.
6. WHEN a session ends and the user marks the card completed THEN the system SHALL record the elapsed
   focused seconds on the history event.
7. WHEN a card has no technique THEN the system SHALL offer a plain Complete action with no session screen.

**Independent Test**: Start a Pomodoro session, pause it, resume it, complete it, and confirm the history
event records the technique and the focused duration.

---

### P1: Per-technique session defaults, editable per card ⭐ MVP

**User Story**: As a student, I want each technique to come with a sensible default session length that I
can change per card — and for Pomodoro, pick or customize the focus/break rhythm — so that the estimate on
each card reflects how I actually plan to study it.

**Why P1**: The board shows an estimated duration on every active card (TECH-EST); that number has to come
from somewhere, and a fixed one would be wrong for most users. This is the data model behind that estimate.

**Acceptance Criteria**:

1. WHEN a card is assigned a technique THEN the system SHALL set the card's estimated session length to
   that technique's default (Pomodoro one focus block; Active Recall 20 min; Feynman 20 min; Leitner
   15 min; none has no estimate).
2. WHEN the user edits a card THEN the system SHALL let them override the estimated session length within
   5–180 minutes, and SHALL reject values outside that range.
3. WHEN the card's technique is Pomodoro THEN the system SHALL let the user choose the focus/break rhythm
   from presets 25/5, 50/10 and 90/20, or enter a custom pair, defaulting to 25/5.
4. WHEN a Pomodoro rhythm is set THEN the system SHALL derive the card's estimated length from it, and the
   session (TECH-02) SHALL use exactly that focus/break pair.
5. WHEN the user changes the global default for a technique in settings THEN the system SHALL apply it only
   to cards created afterwards, never retroactively to existing cards.
6. WHEN an active card is shown on the board THEN the system SHALL display its estimated session length
   beside the technique; and WHEN a completed card is shown THEN the system SHALL instead display the
   actual focused time recorded for that session (TECH-03).

**Independent Test**: Create a Pomodoro card, change its rhythm to 50/10, and confirm the card's estimate
reads 50 min and the session runs a 50-minute focus block.

---

### P2: Início — cross-method orientation overview

**User Story**: As a student, I want a single landing screen that tells me what to do right now across
*both* methods, so that I am not forced to switch methods to discover my total workload.

**Why P2**: The method switcher scopes the board to one method at a time, so no existing screen answers
"what's on my plate overall?". This is orientation, not analytics — the app is fully usable without it, so
it is not MVP, but it removes real friction the two-axis model introduced.

**Non-goal (tone guard):** this screen shows *what is due*, never *how well you're doing*. No streaks, no
scores, no charts, no history rollups. If a metric would make a user feel judged, it does not belong here.

**Acceptance Criteria**:

1. WHEN the user opens the app THEN the system SHALL show the Início overview as the landing screen, and
   SHALL provide a way to reach it from anywhere in the app.
2. WHEN the overview renders THEN the system SHALL show the count of cards due today summed across *all*
   methods, not only the active method.
3. WHEN the overview renders THEN the system SHALL list every upcoming exam with its name and whole-number
   days remaining, soonest first, and SHALL exclude concluded exams.
4. WHEN the user activates the "estudar agora" action THEN the system SHALL open a session for a card due
   today, or, when nothing is due, SHALL show a calm all-clear state and SHALL NOT fabricate work.
5. WHEN the user selects a due item or an exam on the overview THEN the system SHALL navigate to that
   item's board or exam, switching the active method if required.
6. WHEN nothing is due and no exam is upcoming THEN the system SHALL show an empty all-clear state, never
   an error or an empty table.

**Independent Test**: With one card due today in each method, open the app and confirm the Início overview
reports a due count of 2 without changing the active method.

---

### P2: Feynman and Active Recall sessions

**User Story**: As a student, I want the app to guide me through explaining a topic from memory and
checking myself against the source, so that I practice retrieval rather than rereading.

**Why P2**: High value, but the app is already useful with Pomodoro; these need their own editors and
comparison views.

**Acceptance Criteria**:

1. WHEN the user starts an Active Recall session THEN the system SHALL hide the content link, prompt the
   user to write what they remember, and SHALL reveal the content link only after they submit.
2. WHEN the user starts a Feynman session THEN the system SHALL prompt for a plain-language explanation as
   if teaching a beginner, and SHALL then display it side by side with the source material.
3. WHEN the user finishes either session THEN the system SHALL ask for a self-rating on a three-point
   scale — did not remember / partially / solid — and SHALL store it on the history event.
4. WHEN the user reopens a card THEN the system SHALL show their previous written attempts in reverse
   chronological order.
5. WHEN the user closes a session with unsaved written text THEN the system SHALL warn before discarding.

**Independent Test**: Run an Active Recall session, confirm the content link is hidden until submission,
and confirm the self-rating persists to history.

---

### P2: Techniques catalog and guidance

**User Story**: As a student unfamiliar with these techniques, I want the app to explain each one, so that
I can choose deliberately instead of guessing.

**Why P2**: It makes the technique picker meaningful, but the picker functions without it.

**Acceptance Criteria**:

1. WHEN the user opens the techniques catalog THEN the system SHALL list all four techniques, each with a
   one-line summary and a short description of when it works best.
2. WHEN the user views a technique in the picker THEN the system SHALL show its one-line summary inline.
3. WHEN a card's session starts THEN the system SHALL display a brief reminder of how to apply that card's
   technique, dismissible and suppressible via a "do not show again" control.

**Independent Test**: Open the catalog and confirm all four techniques are described.

---

### P3: Leitner session

**User Story**: As a student memorizing discrete facts, I want box-based flashcard review, so that items I
get wrong come back sooner.

**Why P3**: It requires a front/back content model the other techniques do not need, which is why it is
last.

**Acceptance Criteria**:

1. WHEN a card's technique is Leitner THEN the system SHALL let the user add front/back item pairs to it.
2. WHEN the user reviews an item and marks it correct THEN the system SHALL promote it one box, to a
   maximum of box 5.
3. WHEN the user reviews an item and marks it wrong THEN the system SHALL return it to box 1.
4. WHEN a Leitner session starts THEN the system SHALL present only items whose box interval is due,
   where boxes 1–5 map to intervals of 1, 2, 4, 8 and 16 days.

**Independent Test**: Mark an item wrong and confirm it returns to box 1 and is due the next day.

---

### P1: Documentation layer ⭐ MVP

**User Story**: As a contributor — human or AI agent — I want documentation that explains the project's
context and invariants, so that I can extend it without breaking its design.

**Why P1**: Explicitly requested, and with an AI-assisted workflow the docs are what prevent the agent
from violating invariants like stage-as-offset.

**Acceptance Criteria**:

1. WHEN a developer reads `README.md` THEN it SHALL state what Studdup is, both study methods, the four
   techniques, and give prerequisites plus working build, run and test commands.
2. WHEN a developer reads `ARCHITECTURE.md` THEN it SHALL document the layer map, the stage-as-offset
   invariant (AD-003), the database schema, and step-by-step instructions for adding a new method and a
   new technique.
3. WHEN any AI agent reads `AGENTS.md` THEN it SHALL find project conventions, commit format, test and
   lint commands, and the invariants that must not be broken — expressed vendor-neutrally, with no
   instruction specific to Claude or any single tool.
4. WHEN a command appears in any of these documents THEN it SHALL have been executed successfully in the
   project before being documented.

**Independent Test**: A contributor follows only `README.md` on a clean checkout and reaches a running
app and a passing test suite.

---

## Edge Cases

- WHEN an exam's target date is today THEN the system SHALL generate exactly one session, dated today.
- WHEN an exam is created with a target date more than 5 years out THEN the system SHALL reject it as
  implausible and state the accepted range.
- WHEN a card title is empty or whitespace-only THEN the system SHALL reject the save and explain why.
- WHEN a card title exceeds 200 characters THEN the system SHALL reject it and state the limit.
- WHEN a link field contains a string that is not a resolvable `http`/`https` URL or an existing local file
  path THEN the system SHALL save it but SHALL mark it visually as unopenable.
- WHEN the user opens a link THEN the system SHALL open it in the OS default handler and SHALL never
  execute it as a shell command.
- WHEN the app is left running across local midnight THEN the system SHALL recompute "today" and reflow
  the board without requiring a restart.
- WHEN the database file is locked or unwritable at startup THEN the system SHALL show a clear error naming
  the path and SHALL NOT silently fall back to a fresh empty database.
- WHEN two sessions of the same card are completed within the same day THEN the system SHALL advance the
  stage only once and SHALL record only one `completed` event.
- WHEN a drag is released outside any column THEN the system SHALL return the card to its origin with no
  change.
- WHEN a board holds more than 500 cards THEN the system SHALL keep column scrolling responsive by
  virtualizing off-screen cards.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| METH-01 | P1: Choose a study method | Design | Pending |
| METH-02 | P1: Choose a study method | Design | Pending |
| METH-03 | P1: Choose a study method | Design | Pending |
| METH-04 | P1: Choose a study method | Design | Pending |
| EXAM-01 | P1: Exam prep | Design | Pending |
| EXAM-02 | P1: Exam prep — distribution formula | Design | Pending |
| EXAM-03 | P1: Exam prep — session advance & conclusion | Design | Pending |
| EXAM-04 | P1: Exam prep — exam detail & deletion | Design | Pending |
| KAN-01 | P1: Kanban — columns & placement | Design | Pending |
| KAN-02 | P1: Kanban — drag to reschedule | Design | Pending |
| KAN-03 | P1: Kanban — drag to complete | Design | Pending |
| KAN-04 | P1: Kanban — exam grouping | Design | Pending |
| HIST-01 | P1: History — per method | Design | Pending |
| HIST-02 | P1: History — unified & labeled | Design | Pending |
| HIST-03 | P1: History — filtering | Design | Pending |
| HIST-04 | P1: History — event payload | Design | Pending |
| HIST-05 | P1: History — revive | Design | Pending |
| MIG-01 | P1: Data migration — same file | Design | Pending |
| MIG-02 | P1: Data migration — forward schema | Design | Pending |
| MIG-03 | P1: Data migration — backup & abort safety | Design | Pending |
| TECH-01 | P1: Technique selection on card | Design | Pending |
| TECH-02 | P1: Pomodoro session | Design | Pending |
| TECH-03 | P1: Session completion records duration | Design | Pending |
| TECH-09 | P1: Per-technique defaults & Pomodoro rhythm, editable | Design | Pending |
| TECH-EST | P1: Estimated length on active cards / actual time on completed | Design | Pending |
| HOME-01 | P2: Início — landing & reachability | - | Pending |
| HOME-02 | P2: Início — cross-method due count | - | Pending |
| HOME-03 | P2: Início — upcoming exams list | - | Pending |
| HOME-04 | P2: Início — estudar agora / all-clear | - | Pending |
| TECH-04 | P2: Active Recall session | - | Pending |
| TECH-05 | P2: Feynman session | - | Pending |
| TECH-06 | P2: Self-rating persisted | - | Pending |
| TECH-07 | P2: Techniques catalog | - | Pending |
| TECH-08 | P3: Leitner boxes | - | Pending |
| STACK-01 | P1: Tauri port preserves scheduler behavior | Design | Pending |
| STACK-02 | P1: Rust test suite covers scheduler & date | Design | Pending |
| DOC-01 | P1: README | - | Pending |
| DOC-02 | P1: ARCHITECTURE | - | Pending |
| DOC-03 | P1: AGENTS (vendor-neutral) | - | Pending |

**ID format:** `[CATEGORY]-[NUMBER]`

**Coverage:** 39 total. **P1 requirements (METH, EXAM, KAN, HIST, MIG, TECH-01/02/03/09/EST, STACK, DOC):
✅ Verified** per `validation.md` (30/31 ACs value-precise on first pass; EXAM-01 AC#5 fixed in T38 `ea33b43`
and re-verified — sensor-killed, gate green, 91.66% coverage). **P2/P3 (HOME-01..04, TECH-04..08):
deferred** to the next Tasks pass — intentionally not implemented this round.

---

## Success Criteria

- [ ] A user can create a card under either method and reach a running study session in under 30 seconds.
- [ ] Every pre-existing card and history event from the C++ database is present after migration, with a
      verifiable backup on disk.
- [ ] The Rust port reproduces the C++ scheduler's behavior for the full ladder, including restart, erase,
      postpone and revive, proven by ported unit tests.
- [ ] Line coverage on the scheduling and date modules stays at or above the existing 70% gate.
- [ ] A contributor reaches a running app and a passing test suite using `README.md` alone.
- [ ] An AI agent given only `AGENTS.md` produces a change that respects the stage-as-offset invariant.
