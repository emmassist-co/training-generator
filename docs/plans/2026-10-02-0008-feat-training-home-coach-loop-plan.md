---
artifact_contract: ce-unified-plan/v1
product_contract_source: ce-plan-bootstrap
execution: code
origin: user request to plan the next hosted Flue training-agent product step after PR 2
---

# Training Home and Coach Loop Plan

## Goal Capsule

**Objective:** The hosted training generator opens as a useful training home, guides the user from next-session generation into live training, logs the result, and turns safe lessons into durable profile context for the next cycle.

**Means:** Add a D1-backed home/history surface, enrich live sessions, and expose the same coach-loop actions through UI APIs and Flue tools (KTD1, KTD2, KTD3).

**Authority:** The Product Contract owns user-visible behavior. The Planning Contract owns how to build it. Existing local static/TL1 flows stay valid fallback paths unless a requirement says otherwise.

**Stop conditions:** Stop and ask if implementation would require a destructive D1 migration, a production write/deploy without approval, or a change that bypasses proposal/approval for durable profile or session mutations.

**Execution profile:** Code implementation in the Flue v2 Worker worktree, with deterministic local tests first and deployed end-to-end checks before claiming completion.

## Product Contract

### Summary

Replace the chat-first landing page with a training home. The chat remains available as the coach, but the default experience becomes: choose a profile, see today’s training state, generate or resume a session, train on the live page, complete it, and let the coach learn from the result.

### Problem Frame

The hosted agent can already create sessions, store them in D1, run a protected chat, and render live session pages. The missing product layer is the daily loop. Today the user must know to chat, ask the right prompt, follow a returned link, and trust that history will matter later. The next step should make the right action obvious when the app opens.

### Key Decisions

- **KD1: Home replaces chat as the root page.** Keep `/chat` as the coach surface, but route `/` to the training home so the product starts with the training loop. Governs R1, R2, R3, R8.
- **KD2: D1 is canonical for the hosted loop.** UI state may cache locally for comfort, but home, history, live progress, and coach context read from D1. Governs R2, R5, R6, R7, R9.
- **KD3: Approval gates durable changes.** The UI and agent may propose session edits or profile learning, but applying them requires explicit user action. Governs R4, R7, R10, R11.
- **KD4: Profile-generic UI.** The home must load available profiles instead of hard-coding `alexandre` and `catarina`. Governs R1, R8.

### Actors

- **Trainee:** chooses a profile, starts sessions, logs work, approves changes, and asks the coach questions.
- **Training coach agent:** reads context, proposes plans and changes, explains decisions, and records approved events through tools.
- **Hosted Worker/D1:** owns state, APIs, pages, auth, and deterministic store behavior.
- **Plan reviewer subagent/tooling:** critiques risky or non-trivial plans before they become saved sessions.

### Requirements

- **R1:** The root route shows a training home with profile selection, active/planned session status, recent sessions, and clear quick actions.
- **R2:** Home data comes from a deterministic server API that returns profiles, today’s recommendation, active or planned sessions, and recent history for the chosen profile.
- **R3:** The home supports the core actions: generate next session, resume or start active session, open coach, open history, and log completed work.
- **R4:** Session edits from the UI or agent use a proposal-first flow; the session mutates only after approval.
- **R5:** The live session page replays saved D1 events on load so checked exercises, notes, and completion state survive reloads and devices.
- **R6:** The live session page captures richer training facts: exercise completion, notes, perceived difficulty or pain flags, set-level load/reps when supplied, and session completion.
- **R7:** Durable profile learning uses first-class proposal/apply actions; safe low-risk summaries can be suggested automatically, but constraints, injuries, or durable preferences need approval.
- **R8:** Profile selection is data-driven from D1 profiles, with the last selected profile remembered only as a client convenience.
- **R9:** History is available as a hosted page and API list, with completed sessions readable and planned/active sessions resumable.
- **R10:** The coach can read the same home/session/history/profile-learning state that the UI uses, so agent answers and visible screens do not drift.
- **R11:** Existing Basic Auth protection remains in force across new pages and APIs until Cloudflare Access replaces it.
- **R12:** The local static generator/render/publish/log flow remains intact as a fallback during the hosted migration.

### Key Flows

1. **Open home:** user visits `/`, passes Basic Auth, chooses or confirms a profile, and sees today’s state plus quick actions.
2. **Generate:** user clicks “Generate next session” or asks in coach; the agent reads context, reviews the plan when needed, saves a D1 session, and returns a session link.
3. **Train:** user opens `/sessions/:id`; the page marks or confirms start, records progress events, supports notes, and offers a coach handoff for swaps or questions.
4. **Adapt mid-session:** user requests a swap; the coach proposes a change; the UI displays it; approval applies it and increments the session version.
5. **Complete and learn:** user completes the session; D1 stores completion and telemetry; the coach or deterministic learner proposes durable profile lessons; approved lessons affect future context.
6. **Review history:** user opens history, sees recent sessions, opens details, and can seed future planning from a prior session.

### Acceptance Examples

- **AE1:** Given `alexandre` has a planned session, when he opens `/`, then the home shows a resume card linking to `/sessions/<id>` and does not ask him to start from chat.
- **AE2:** Given a new profile exists in D1, when the home loads profiles, then that profile appears without a code change.
- **AE3:** Given an exercise checkbox and note were saved on a session page, when the page reloads, then the same checkbox and note state render from D1 events.
- **AE4:** Given the user says a machine is unavailable, when the coach suggests a replacement, then the session stays unchanged until the user approves the proposal.
- **AE5:** Given the user completes a session and approves “skip long finishers” as a preference, when the next plan reads context, then that feedback appears in `planning_feedback_profile` or its successor.
- **AE6:** Given the user opens `/chat`, then the current hosted chat still works and stores server-side conversations.

### Success Criteria

- The app can be used without knowing the right chat prompt: home shows the next useful action.
- Agent-created, UI-started, UI-logged, and history-read sessions all use the same D1 records.
- Reloading the live page loses no saved training progress.
- Durable profile changes have an auditable proposal/approval trail.
- The deployed Worker passes end-to-end checks for home, generation, live logging, proposal approval, completion, history, and coach context.

### Scope Boundaries

#### In Scope

- New home and history pages.
- New home/session/history APIs needed by those pages.
- Store methods for active/planned lookup, session listing, event replay, and profile-learning proposals.
- Live session UX improvements for logging and coach handoff.
- Flue tools needed for parity with the UI.
- Tests and deployed verification for the hosted flow.

#### Deferred to Follow-Up Work

- Replacing Worker Basic Auth with Cloudflare Access, blocked by current `auth.forbidden` permissions.
- Native mobile app packaging.
- Full analytics dashboards.
- Automated periodization across multi-month blocks beyond profile-aware next-session generation.
- Payments, sharing, or multi-user team features.

#### Non-Goals

- Removing the local static/TL1 generator.
- Letting the model mutate workouts or durable profile constraints without approval.
- Building the whole product around ACP; the current path remains Flue SDK chat plus hosted pages.

### Dependencies

- Existing Flue v2 Worker routes in `src/app.ts`.
- D1 schema from `migrations/0001_training_domain.sql`, `0002_exercise_catalog.sql`, and `0003_chat_conversations.sql`.
- Existing training store implementations in `src/db/training-store.mjs`.
- Existing live session route and API modules.
- Existing Flue tools and reviewer subagent in `src/agents/training-coach.ts` and `src/tools/*`.

## Planning Contract

### Key Technical Decisions

- **KTD1: Add a separate home route module instead of expanding the chat page.** Keep `src/routes/chat-page.mjs` focused on coach chat, and add `src/routes/home-page.mjs` plus a home API for dashboard data. This lowers risk because the chat page is already a large inline HTML/CSS/JS string. Supports KD1 and governs R1, R2, R3.
- **KTD2: Add deterministic home/session list store methods before UI work.** Implement active/planned lookup, recent history, and event-derived live state in memory and D1 stores first, then build routes on top. Governs R2, R5, R9, R10.
- **KTD3: Model profile learning as proposal/apply records or events, not free-form chat memory.** Reuse the approval pattern from session changes so profile updates are visible, testable, and reversible. Governs R7, R10.
- **KTD4: Keep Flue as the agent layer and Hono APIs as the UI action layer.** UI calls deterministic APIs; coach uses Flue tools backed by the same store methods. This keeps browser actions testable without live AI. Governs R3, R4, R10.
- **KTD5: Treat production deploy and production D1 changes as explicit release steps.** Local tests and dry-run deploys come first; live deploy/import/test requires user approval under the production-data rule. Governs R11.

### High-Level Technical Design

#### Component topology

```text
Browser
  ├─ /                         -> home page UI
  ├─ /chat                     -> coach chat UI
  ├─ /history                  -> history page UI
  └─ /sessions/:id             -> live session UI
        │
        ▼
Hono Worker routes
  ├─ /api/home                 -> dashboard data
  ├─ /api/sessions             -> list/read/events/complete/start
  ├─ /api/profile-learning     -> propose/apply profile signals
  ├─ /api/conversations        -> server-side chat transcript
  └─ /agents/training          -> Flue TrainingCoach
        │
        ▼
Shared store layer
  ├─ D1TrainingStore
  ├─ MemoryTrainingStore
  └─ D1ConversationStore
        │
        ▼
Cloudflare D1
```

#### Daily loop sequence

```text
Open home
  -> GET /api/home?profile_id=P
  -> show active/planned/history/recommendation
  -> generate, resume, log, or chat
  -> session events write to D1
  -> completion writes summary and telemetry
  -> profile learning proposal is created
  -> approved learning updates profile context
  -> next home/context read uses the updated signal
```

#### Session state machine

```text
planned
  -> active      when the user opens/starts the live page or the coach marks start
  -> completed   when completion is saved
  -> planned     if only previewed and not started
completed
  -> read-only history view, except notes/profile-learning proposals remain allowed
```

#### Approval data flow

```text
User signal or coach insight
  -> propose session/profile change
  -> store proposal as event or proposal row with status=pending
  -> UI renders pending proposal
  -> user approves or rejects
  -> apply approved patch or profile merge
  -> record audit event
  -> refresh home/session/context
```

### System-Wide Impact

- **Data lifecycle:** D1 becomes the visible source for home, history, session progress, and approved learning.
- **Agent parity:** Every visible coach-loop action needs either an existing tool or a new tool backed by the same route/store behavior.
- **Auth:** New routes inherit the current Worker-level Basic Auth.
- **Testing:** Browser-free tests should cover store and route behavior; live AI remains a deployed smoke test, not a unit-test dependency.
- **Operations:** Production D1 migrations or data backfills require explicit approval before execution.

### Risks and Mitigations

- **Risk: home logic duplicates agent logic.** Mitigate by adding shared store helpers and keeping the home API deterministic rather than asking the model for dashboard state.
- **Risk: profile learning stores unsafe or over-broad claims.** Mitigate with proposal/apply, categories, and confirmation for constraints, injuries, and lasting preferences.
- **Risk: inline page modules become hard to maintain.** Mitigate by adding focused route modules and small client helpers instead of growing `chat-page.mjs` further.
- **Risk: event replay conflicts with localStorage fallback.** Mitigate by making D1 the authority and using localStorage only for selected profile/conversation pointers.
- **Risk: migration touches production data.** Mitigate with additive schema, local tests, dry-run deploy, backup/export, and explicit user approval.

### Assumptions

- The existing D1 schema can be extended additively; destructive changes are not needed.
- Home recommendation can start deterministic and simple: active session first, planned session second, else suggest generating the next session from context.
- The first version of richer logging can accept partial set-level data; it does not need a polished analytics model.
- Basic Auth remains acceptable until Cloudflare Access credentials are fixed.

### Sources

- `src/app.ts` currently routes `/` and `/chat` to the chat page and mounts session/API/agent routes.
- `src/routes/chat-page.mjs` contains the current protected hosted chat UI and hard-coded profile chips.
- `src/routes/session-page.mjs` records exercise completion, notes, and completion events.
- `src/routes/session-api.mjs` exposes single-session read, event log, and complete actions.
- `src/db/training-store.mjs` already supports profiles, session snapshots, history listing, events, proposals, patches, and completions.
- `src/agents/training-coach.ts` exposes the current Flue tools and persistent active-session state.
- Subagent review found the main gaps: no home API, active state is conversation-local, no first-class profile learning tool, no history page/API list, and hard-coded profiles.

## Implementation Units

### U1. Add store support for home, active sessions, event replay, and history lists

**Goal:** Give routes and tools deterministic state primitives before adding UI.

**Requirements:** R2, R5, R8, R9, R10. KTD2.

**Files:** `src/db/training-store.mjs`, `tests/node/d1-training-store.test.mjs`, related memory-store tests.

**Approach:** Add shared methods for listing profiles, resolving the current active or planned session for a profile, listing recent sessions with filters, deriving live session state from events, and marking a planned session active. Implement the same contract in memory and D1 stores.

**Test scenarios:**
- Profile with active, planned, and completed sessions returns the active session first.
- Profile with no active session but a planned session from today returns that planned session.
- Profile with only completed sessions returns no active session and a recent-history list.
- Event replay derives checked exercises and saved notes from `session_events` in timestamp order.
- Unknown profile returns a clear empty result, not another profile’s data.

**Verification:** Targeted node tests for store behavior, then full `npm test`.

### U2. Add home and session-list APIs

**Goal:** Expose the home dashboard and history data through deterministic JSON routes.

**Requirements:** R1, R2, R3, R8, R9, R11. KTD1, KTD2, KTD4.

**Files:** `src/routes/home-api.mjs` or equivalent, `src/routes/session-api.mjs`, `src/app.ts`, route tests under `tests/node/`.

**Approach:** Add `GET /api/home?profile_id=...` returning profiles, selected profile, today recommendation, active/planned session, recent sessions, and quick-action hints. Extend `GET /api/sessions` for profile-scoped history filters. Validate query params and return normalized error shapes.

**Test scenarios:**
- `GET /api/home?profile_id=alexandre` returns only Alexandre profile state and recent sessions.
- Missing profile id uses a documented default or returns selectable profiles plus no private default leakage.
- Invalid limit/status filters return 400 with a clear error.
- `GET /api/sessions?profile_id=P&status=completed&limit=3` returns the newest three completed sessions.
- Auth middleware still protects the new routes when `TRAINING_CHAT_PASSWORD` is set.

**Verification:** Route tests plus `npm test`.

### U3. Build the training home page and keep chat as `/chat`

**Goal:** Make `/` the practical starting point for the hosted product.

**Requirements:** R1, R2, R3, R8, R11, R12. KTD1, KTD4.

**Files:** `src/routes/home-page.mjs`, `src/app.ts`, `src/routes/chat-page.mjs` only for shared links or profile handoff, rendering tests if present.

**Approach:** Render a mobile-first full-screen home with profile selector, today card, active/planned session card, recent sessions, and quick actions. Keep `/chat` working. Use D1-backed APIs for data and localStorage only for the selected profile convenience.

**Test scenarios:**
- Visiting `/` renders home shell content and loads `/api/home` with the selected profile.
- Choosing a different profile refreshes home data and stores the client preference.
- “Resume session” links to `/sessions/:id` for the active/planned session.
- “Open coach” links to `/chat` with the same selected profile.
- With no active session, the primary action invites session generation rather than showing an empty dead end.

**Verification:** Route/render tests, local browser smoke, `npm run worker:build`.

### U4. Add hosted history page

**Goal:** Let the user browse and reopen past sessions without asking the coach.

**Requirements:** R3, R9, R10, R12. KTD1, KTD2, KTD4.

**Files:** `src/routes/history-page.mjs`, `src/routes/session-api.mjs`, `src/app.ts`, tests under `tests/node/`.

**Approach:** Add `/history` with profile-aware filters and a list of recent sessions. Completed sessions open in read-focused session detail; planned/active sessions open the live session page for resume.

**Test scenarios:**
- History page loads completed and planned sessions for the chosen profile.
- Filtering by completed sessions hides active/planned sessions.
- Opening a completed session does not offer destructive training controls by default.
- Opening a planned session preserves resume behavior.
- Empty history shows a clear “generate or log a session” action.

**Verification:** Route/render tests and browser smoke.

### U5. Enrich the live session page with D1 replay and better logging controls

**Goal:** Make the session page the canonical training execution surface.

**Requirements:** R4, R5, R6, R10, R11. KTD2, KTD4.

**Files:** `src/routes/session-page.mjs`, `src/routes/session-api.mjs`, `src/client/session-state.mjs`, `src/client/session-patches.mjs`, store tests.

**Approach:** Load event-derived state from the server, not just localStorage. Add explicit start/resume behavior, set-level logging fields where useful, pain/difficulty quick flags, save states, and a coach link that carries session/profile context. Keep changes lightweight and phone-first.

**Test scenarios:**
- Reloading a session after checking an exercise preserves the checked state from D1.
- Saving a note renders it after reload.
- Starting a planned session updates status or records a start event once.
- Logging load/reps for a set stores a typed event and does not break completion.
- Pain/difficulty quick flags create session events visible to the coach context.
- Completed sessions render read-only controls except allowed notes or learning actions.

**Verification:** Unit tests for event replay, route tests for new event types, browser smoke for live page.

### U6. Add profile-learning proposal and apply flow

**Goal:** Let the system learn durable training preferences safely.

**Requirements:** R7, R10, R11. KTD3, KTD4.

**Files:** new migration if proposal persistence needs tables, `src/db/training-store.mjs`, `src/routes/profile-learning-api.mjs`, `src/tools/training-context.mjs` or new tool module, `src/agents/training-coach.ts`, tests.

**Approach:** Add a proposal/apply path for profile signals. Keep proposal records auditable. Merge approved low-risk preferences into the existing profile feedback structure or a compatible successor. Require explicit approval for constraints, injuries, durable dislikes, and recurring pattern claims.

**Test scenarios:**
- Proposing a profile signal stores it as pending and does not change context.
- Rejecting a proposal leaves `planning_feedback_profile` unchanged.
- Applying an approved low-risk preference updates context and records an audit event.
- Applying a constraint without approval fails.
- The coach can read approved profile learning through `get_training_context`.

**Verification:** Store tests, tool tests, route tests, `npm test`.

### U7. Add agent tools for home/action parity

**Goal:** Let the coach act through the same state model the UI shows.

**Requirements:** R3, R4, R7, R9, R10. KTD3, KTD4.

**Files:** `src/agents/training-coach.ts`, `src/tools/session-tools.mjs`, new profile-learning tool module, `tests/node/training-agent-tools.test.mjs`, `tests/node/training-agent-eval.test.mjs`.

**Approach:** Add tools for active/planned session listing, start session, list session proposals if needed, reject session change, propose/apply profile update, and history-driven context. Update coach instructions and skill references so the agent uses approval gates.

**Test scenarios:**
- Coach tool can list active/planned sessions for a profile.
- `start_session` marks the session started without creating duplicates on repeat.
- `reject_session_change` records rejection and leaves active version unchanged.
- `propose_profile_update` returns a pending proposal only.
- `apply_profile_update` requires a pending approved proposal id.
- Eval prompt for risky durable learning expects the coach to ask for approval instead of silently updating.

**Verification:** Tool tests, agent eval tests, `npm test`.

### U8. Update docs, config examples, and fallback guidance

**Goal:** Keep operators and future agents aligned with the hosted loop and fallback paths.

**Requirements:** R11, R12. KTD5.

**Files:** `README.md`, `docs/agent-native.md`, `docs/training-coach-knowledge.md`, `src/agents/skills/training-coach/references/*.md`, `DESIGN.md` if UI rules change.

**Approach:** Document the home-first hosted flow, D1 canonical state, profile-learning approval model, live testing standard, and local static fallback. Keep product-generic wording.

**Test scenarios:**
- Documentation names `/` as home and `/chat` as coach fallback.
- Documentation states production deploy/D1 writes need approval.
- Training coach skill tells the agent to use proposal/apply for durable learning.
- Fallback local generation/logging commands remain documented.

**Verification:** Manual doc review plus `npm run render:module-check` if docs touch rendering-related modules.

### U9. Verify locally, deploy with approval, and run live end-to-end checks

**Goal:** Prove the full hosted loop before reporting completion.

**Requirements:** R1 through R12. KTD5.

**Files:** No product files unless verification reveals fixes; test artifacts under temp or ignored output paths.

**Approach:** Run local deterministic tests, build, dry-run deploy, request approval for production migrations/deploy, then test live protected Worker actions through browser/API and inspect D1 state. Clean test rows after verification.

**Test scenarios:**
- Local `npm test` passes.
- `npm run worker:build` passes with only known warnings.
- Dry-run deploy succeeds.
- Live home loads behind auth and shows D1-backed profile/home data.
- Live generation creates a session and the home shows it as active/planned.
- Live session page logs exercise, note, difficulty/pain, and completion events.
- Live coach proposes a swap and applies it only after approval.
- Live profile learning proposal does not affect context until approved.
- Live history shows the completed test session.
- Test data is removed or clearly marked according to the cleanup plan.

**Verification:** Command logs captured to artifact files for long output; short summaries in chat; production checks only after approval.

## Verification Contract

### Local gates

- `npm test`
- `npm run render:module-check`
- `npm run worker:build`
- Targeted node tests for store, routes, tools, and evals while developing.
- `npm run state:export-d1` only when checking D1 export behavior; do not treat it as required for every UI-only edit unless touched code warrants it.

### Deployed gates

Run only after explicit approval for production writes/deploys.

- Deploy Worker and any approved D1 migrations.
- Authenticate to the protected Worker.
- Verify `/`, `/chat`, `/history`, `/sessions/:id`, `/api/home`, `/api/sessions`, and `/agents/training` flows.
- Verify D1 rows for events, sessions, proposals, and approved profile learning.
- Clean or mark test data after checks.

### Behavioral gates

- The agent reads context before planning.
- Non-trivial or risky plans run through deterministic review or the reviewer subagent before save.
- Session and profile changes are proposal-first and approval-gated.
- Completed training logs become hosted D1 history.
- The final report must not say “done” until deployed actions work end-to-end.

## Definition of Done

- `/` is a protected training home, and `/chat` remains a protected coach page.
- Home uses D1-backed profiles and dashboard data, not hard-coded profile chips.
- The user can generate or resume a session from home, train on the live page, complete it, and see it in history.
- Live session progress survives reload through D1 event replay.
- Session changes and durable profile learning use proposal/approval flows.
- The coach has tools and instructions for home/action parity.
- Local tests and build pass.
- Production migration/deploy steps, if needed, were approved before execution.
- Live deployed end-to-end checks pass for home, chat, session logging, swap approval, completion, history, and profile learning.
- Abandoned experiments, temp code, debug logs, and unneeded generated artifacts are removed or ignored.
