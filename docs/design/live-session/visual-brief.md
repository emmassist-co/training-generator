# Flue live-session visual brief

- **Status:** Editorial Performance direction approved
- **Scope:** live training session only
- **Approved direction:** Direction A, including its prominent acid-lime exercise-image treatment and polished 20px/4px/8px spacing system
- **Approval record:** The user selected Direction A over Direction B, required imagery to become central to the look, requested a spacing/alignment pass, and then approved the polished mobile reference on 2026-10-04.
- **Next gate:** produce and approve the final desktop composition and required state references before changing production UI.

## Selected visual direction

Editorial Performance is the governing direction. It uses condensed athletic typography, near-black editorial space, bone-white type, a narrow acid-lime semantic accent, hairline structure, and an art-directed exercise image plate. Exercise imagery is a core brand element, not a secondary thumbnail: each exercise receives a prominent, repeatable crop and treatment while the current-set logger remains the primary task.

Direction B remains a rejected exploration and must not be blended into implementation unless the user later changes this decision.

## Audience and setting

The user is training in a gym, often standing, moving, short of time, and using one hand. Light may be poor, attention is split, hands may be tired, and the network may be slow. The screen must work at a glance without making the session feel crude or generic. A coach will later consume the structured results, so fast input cannot come at the cost of data meaning.

## Baseline evidence and findings

### Available screenshots

The repository has mobile proof at:

- `docs/proof/pr-2-home-loop/02-session-before.png`
- `docs/proof/pr-2-home-loop/03-session-logged.png`
- `docs/proof/pr-2-home-loop/04-session-completed.png`

These images show an earlier renderer: a dark page, large rounded containers, mint status pills, system type, stacked inputs, and a large mint completion button. They are useful evidence of the generic patterns to remove, but they do not show every control now present in source. No current 1440×1200 live-session screenshot exists in the repository, so there is no desktop visual baseline to approve or imitate.

### Current source

`src/session/LiveTrainingSession.tsx` and `src/session/live-session-styles.mjs` add a current-set console, metric tiles, rest controls, saved-set chips, details, proposals, notes, and fixed desktop navigation. The behavior is stronger than the older screenshots, but the presentation adds more rounded panels inside rounded panels, repeated border treatments, pills, mint labels, and metric tiles. Desktop uses the same central stack and a fixed bottom bar rather than a composition designed for wide space.

### Review findings

- **High:** The same rounded border and dark translucent surface mark the page shell, exercise, logger, timer, details, proposals, notes, metrics, and navigation. Importance depends on nesting rather than a clear composition.
- **High:** Mint acts as label, status, border tint, background tint, timer emphasis, progress, and primary action. It does not yet have a strict semantic role.
- **High:** The available proof has no desktop reference, while current desktop CSS mainly widens and centers the mobile stack.
- **Medium:** System type, uppercase micro-labels, repeated pills, and familiar dark-card geometry do not form a distinct Flue identity.
- **Medium:** Repeated metric tiles and saved-set pills split related prescription data into small bordered objects that compete with the set logger.
- **Medium:** The fixed desktop bottom bar and many nested surfaces make overlap and scroll ownership hard to judge from source alone.
- **Low:** The older completed screenshot still looks actionable. Current source improves this with disabled or omitted writes and read-only copy, but the final direction needs a clearer intentional completed state.

## Observable Flue attributes

A concept must express all five attributes. These describe what a reviewer can see and use; they do not select a typeface, color, or layout before image review.

1. **Performance-led**
   - Within one glance, the exercise, current set, actual reps/load fields, optional set note, and one logging action form a single dominant work area.
   - Prescription and progress support that task rather than competing with it.
   - A concept fails if a decorative hero, media block, dashboard, or navigation draws attention before the set logger.

2. **Precise**
   - Planned and actual values use consistent alignment, labels, units, and spacing.
   - Prescribed totals never appear to increase when extra work is logged.
   - Rules, edges, and emphasis have repeatable roles; decoration does not imply state.
   - A concept fails if it looks polished but makes `Set 2 of 3`, entered load, saved state, or an extra set easy to confuse.

3. **Calm under load**
   - The default state has one strong action and a restrained state palette.
   - Pending, success, error, pain, and completed states remain distinct without turning the whole screen into an alert.
   - Dense or long content can wrap without disrupting the main action.
   - A concept fails if most labels glow, animate, or use the accent, or if state relies on subtle color shifts.

4. **Athletic, not gamified**
   - Type scale, rhythm, image treatment, and control response should feel suited to active training and professional coaching.
   - Progress is factual; it does not use points, streaks, trophies, fake competition, or celebratory clutter.
   - A concept fails if it resembles a generic admin dashboard, AI chat, game HUD, or neon fitness template.

5. **Recognizably Flue**
   - The wordmark treatment, typography, composition, accent signature, surface logic, icon family, and imagery rules must work as one system.
   - At least two of those cues must remain recognizable when the word “Flue” is hidden.
   - A concept fails if swapping the wordmark and accent color would make it indistinguishable from a stock dark UI kit.

## Explicit anti-patterns

Reject a concept that depends on any of these:

- card-within-card stacks as the main hierarchy;
- a rounded container around every region;
- repeated bordered metric tiles for simple prescription text;
- pill-shaped treatment for most labels, values, filters, and saved sets;
- mint or another accent used as general decoration rather than for active logging, live state, and positive confirmation;
- arbitrary glow, glass blur, gradients, or shadows that do not convey depth or state;
- default system typography with no deliberate scale, weight, width, or spacing logic;
- a large marketing hero above the current exercise;
- a mobile column merely stretched and centered on desktop;
- icons used as decoration or without clear labels where meaning is not standard;
- disabled or completed state shown only through lower opacity;
- media that pushes current-set logging below the first useful view;
- more than one primary set-log action for the active exercise;
- a prescribed total that changes after extra sets.

## Gym-use hierarchy

Use this order to settle visual conflicts. DOM and keyboard order should follow it where the interaction remains meaningful.

1. **Do the current set**
   - exercise name and position in the session;
   - fixed planned set state such as `Set 2 of 3` or `All 3 sets logged`;
   - actual reps and load;
   - optional per-set note;
   - one `Log set` or `Add extra set` action.
2. **Recover and confirm**
   - saved or failed set feedback near the action;
   - logged-set summary;
   - rest timer and its start, pause, and reset state.
3. **Understand the prescription**
   - prescribed reps, load, rest, and concise plan guidance.
4. **Move through the workout**
   - previous/next exercise, exercise completion, and overall progress.
5. **Get support or adapt**
   - form guidance, media, swaps, coach link, and pending proposals.
6. **Reflect and finish**
   - effort flags, session notes, completion, and the completed/read-only summary.

Proposals and session-wide notes must remain available, but they must not interrupt the repeated set loop. On desktop, supporting regions may sit beside the primary work area; they should not become equal-size dashboard cards.

## Behavior baseline that visual work must preserve

### View-model and replay

- `buildLiveSessionViewModel()` remains the presentation boundary.
- Replayed `exercise_completion_updated` events set exercise completion.
- The latest `note_added` or `note_saved` text fills session notes.
- Unresolved `proposal_created` events remain visible until a matching accept or reject event.
- `set_logged` events remain scoped by `session_exercise_id` (with the existing `exercise_id` fallback), preserve reps, load, optional note, and set number, and feed saved-set and current-set state.
- `current_set.total` and `planned_set_total` come from `prescription.sets` and remain fixed. At or beyond that count, the label remains `All N sets logged` and the action becomes `Add extra set`.
- Sessions without a prescribed set count remain unbounded and use `Set N` plus `Log set`.
- Exercise image lookup and fallback data must remain available; generated reference text is not authoritative content.

### Stable unique hooks

Keep each of these IDs unique while the matching feature exists. Runtime code reads or updates them directly.

| Hook | Current contract |
| --- | --- |
| `#exerciseStage` | exercise-stage live region |
| `#statusPill` | session status and planned-to-active update |
| `#completedCount` | completed exercise count |
| `#elapsedPill` | elapsed time |
| `#progressLabel`, `#progressPercent`, `#progressFill` | overall progress text and fill |
| `#proposalPanel` | pending proposal region |
| `#notes`, `#saveNote` | session note value and save action |
| `#toast` | global save/status feedback |
| `#complete` | session completion action |
| `#prevExercise`, `#nextExercise`, `#bottomDone` | exercise navigation and done-plus-next |
| `#bottomExerciseName`, `#bottomStatus` | active exercise and global action status |

Visual work may rename presentational classes. It must either keep these behavior hooks or update the runtime and characterization tests in the same approved implementation unit.

### Stable repeated hooks and scope

Each exercise root remains addressable by `.exercise-card[data-index][data-exercise-id]`. Within that root:

- `[data-current-set-label][data-set-total]` exposes current and fixed planned-set state;
- `[data-set-count]` exposes the saved count;
- `[data-reps]`, `[data-load]`, and `[data-exercise-note]` hold actual set values;
- `[data-log-set][data-action-key="set:<exercise-id>"]` is the one set-write control;
- `[data-error][role="status"]` is local write feedback;
- `[data-done][data-completed]` controls exercise completion;
- `[data-rest-row]`, `[data-timer]`, `[data-action="toggle-timer"]`, and `[data-action="reset-timer"]` scope rest controls.

Each proposal root uses `[data-proposal-id]`, with `[data-apply-proposal]` and `[data-reject-proposal]` inside it. Effort controls use `[data-effort="too_easy"]`, `[data-effort="too_hard"]`, and `[data-effort="pain"]`. Repeated hooks must stay inside the exercise or proposal they affect; a visual duplicate must not create a second write target.

### Request and payload contracts

All paths are relative to the current origin and use the encoded session or proposal ID.

| Action | Route | Body that must remain structured |
| --- | --- | --- |
| Start | `POST /api/sessions/:id/start` | `idempotency_key` |
| Set | `POST /api/sessions/:id/events` | `type: set_logged`, active `version`, and payload with `session_exercise_id`, `set_number`, `reps`, `load`, optional `note`; deterministic set idempotency key |
| Exercise completion | same event route | `type: exercise_completion_updated`; payload with exercise ID, boolean `completed`, and `completed_ids` |
| Session note | same event route | `type: note_added`; payload with `note` |
| Effort | same event route | `type: effort_flag_logged`; payload with `kind` |
| Apply proposal | `POST /api/sessions/:id/proposals/:proposalId/apply` | `approved_by: user` |
| Reject proposal | `POST /api/sessions/:id/proposals/:proposalId/reject` | rejection `reason` |
| Complete | `POST /api/sessions/:id/complete` | completion timestamp, notes, and completed exercise IDs |

The pending guard must continue to suppress duplicate writes. A failed set write must keep entered values, restore the control, and place feedback in the exercise's own error region.

### Completed/read-only contract

- A completed render makes set fields, per-set notes, done controls, and timer controls non-writing; it omits proposal apply/reject and session note/effort/completion writes.
- The current runtime also guards every mutation and disables controls after a successful completion.
- Store and API boundaries remain authoritative. Every page-exposed write to a completed session returns HTTP `409` with `error: "session_read_only"`, and no event, version, exercise, or session state changes.
- A future approved composition may expose non-mutating navigation in a completed session, but it must not weaken the server boundary or make a write control appear usable.

## State requirements

The approved references must show active logging and also define pending, error, disabled, loading, empty, active rest, saved/post-log, all-planned-sets-logged, extra-set, and completed/read-only states. Each state needs a text, icon, shape, or placement cue in addition to color. Errors and save feedback stay near the action that caused them; global status may echo them but cannot be the only cue.

## Accessibility constraints

- Every interactive target is at least 44 by 44 CSS pixels, including timer and navigation controls.
- Keyboard focus is always visible and has at least 3:1 contrast against adjacent colors. Focus order follows the task hierarchy and does not jump to hidden exercise controls.
- Normal text reaches WCAG 2.2 AA contrast of at least 4.5:1; large text and non-disabled component boundaries or state indicators reach at least 3:1.
- Labels remain programmatically tied to fields. Icon-only controls need stable accessible names.
- Saving, saved, error, and completion feedback uses an appropriate status announcement without repeated or disruptive announcements.
- Color is never the only signal for pain, error, success, selection, disabled, active rest, or completion.
- The shell supports `100dvh`, top and bottom safe-area insets, one clear scroll owner, on-screen keyboard contraction, and no fixed control covering content.
- At 200% browser zoom and at 320 CSS pixels wide, controls and labels reflow without clipping or horizontal page scroll.
- Reduced-motion preference removes nonessential movement. No required meaning depends on animation.
- Exercise media keeps useful alt text or a labeled fallback and never blocks the logging flow if it fails.
- Long exercise names, plan guidance, proposal reasons, units, and notes wrap without colliding with actions.

## Concept rejection check

Before asking for approval, answer yes to each question:

1. Can a user find the current set inputs and one logging action before any secondary feature?
2. Does the screen remain identifiable through at least two system cues when the wordmark is hidden?
3. Does accent color have a narrow, stated semantic role?
4. Are planned total, actual values, save state, and read-only state unambiguous?
5. Does the concept avoid the listed nested-card, pill, metric-tile, glow, and stretched-mobile patterns?
6. Can the same system produce a fresh desktop composition and every required state without changing behavior hooks or payload meaning?
7. Can it meet the listed touch, focus, contrast, zoom, safe-area, keyboard, and reduced-motion constraints?

A “no” rejects the concept even if the image looks polished.
