---
date: 2026-06-05
topic: lightweight-training-telemetry
---

# Lightweight Training Telemetry Requirements

## Summary

Add lightweight passive telemetry to the rendered training session so the runtime can capture interaction-derived timing and adherence signals, then return that data through the existing copy-back log flow for durable local storage. This is an instrumentation-first change: collect useful session evidence now without yet changing plan generation behavior automatically.

---

## Problem Frame

The current training page already knows more than it exports. During a session, the browser runtime tracks session start and end, exercise focus, completion state, timer state, swaps, difficulty, and notes in local device state. But the copied `TL1` log only returns a thin completion summary, which means future planning can only learn from a narrow slice of what actually happened in the workout.

The missing value is not another journaling surface or a hosted analytics system. The missing value is a better capture of what the user actually did in the rendered session: how long exercises took, how sets paced out, how long the user rested, when they drifted between exercises, and whether the session behavior suggests friction or loose adherence. The current product shape already has the right seam for this: local browser state plus compact copy-back logging.

---

## Key Decisions

- **Instrumentation first, adaptation later.** The first version exists to preserve useful session evidence for later analysis, not to automatically rewrite future training plans yet.

- **Keep the current local-first workflow.** Telemetry stays inside the rendered runtime until the user copies the session log back into chat. No backend, live sync, or hosted analytics surface is introduced in this phase.

- **Prefer compact exported telemetry over verbose replay logs.** The exported payload should preserve meaningful timing and adherence signal without breaking the current copy/paste workflow or turning local device storage into an unbounded event sink.

---

## Requirements

**Runtime Capture**

- R1. The rendered training session must capture passive timing telemetry for the session and for each exercise, using user interactions that already occur during normal session use rather than requiring a new manual logging workflow.

- R2. The captured telemetry must include enough information to reconstruct, at minimum, session elapsed time, per-exercise elapsed time, per-exercise active windows, and timing relationships between exercise completion and the next exercise start.

- R3. When the user completes sets through the existing runtime controls, the captured telemetry must preserve enough information to derive set pacing and rest timing between sets for exercises that use set-based progression.

- R4. When the user uses timers through the existing runtime controls, the captured telemetry must preserve enough information to distinguish prescribed timer duration from actual interaction timing around that timer.

- R5. The runtime must preserve adherence-relevant interaction signals that already express behavior during the session, including swaps, reopens, manual completion state changes, and exercise-order drift when the user moves away from the default flow.

**Copy-Back Log**

- R6. The copied session log must include the new telemetry in a machine-friendly form that remains compatible with the current copy-back workflow: one copied payload that an agent can paste back into chat and parse reliably.

- R7. The copied payload must remain compact enough that the workflow still feels like lightweight copy/paste logging rather than exporting a large raw activity dump.

- R8. The copied payload must preserve the stable training/session identifier so telemetry can be joined to the original rendered plan and stored against the correct completed session.

**Durable Local Storage**

- R9. The logging flow must save the new telemetry into local durable training history in a form that supports later pattern analysis across sessions, not only one-off inspection of a single workout.

- R10. The durable saved shape must preserve both high-value derived timing metrics and enough underlying context that future analysis is not locked into one early interpretation of what mattered.

- R11. Telemetry storage must remain product-generic: it cannot assume one injury context, one sport, or one coaching framework in order to make sense.

**Operational Constraints**

- R12. Telemetry collection must remain local-device friendly. The runtime cannot depend on a network connection, a server round-trip, or a background sync mechanism to preserve the captured session data.

- R13. The telemetry design must be storage-efficient enough for browser-local persistence during normal session usage on a phone.

- R14. The new telemetry must not displace the existing human-meaningful completion signals already in the flow, including difficulty rating and freeform notes.

---

## Acceptance Examples

- AE1. **Covers R1, R2, R6.** A user starts a session, works through three exercises, and copies the final log. The copied payload includes session elapsed time plus per-exercise timing data that can later show how long each exercise actually occupied in the workout.

- AE2. **Covers R3, R7, R9.** A user taps through four finished sets on a strength movement. The copied payload preserves enough timing signal to later derive how the set pace and between-set rest unfolded, while still remaining compact enough to use in the current copy/paste flow.

- AE3. **Covers R4, R5, R10.** A user starts and pauses a timer, swaps one prescribed movement for an alternative, then reopens a completed exercise. The saved session record preserves those interaction signals so future analysis can distinguish simple completion from a friction-heavy session.

- AE4. **Covers R12, R13.** A user completes the session on a phone without connectivity. The runtime still preserves the telemetry locally until the user copies the log out.

---

## Success Criteria

- The rendered runtime captures materially richer session-behavior evidence than the current `TL1` summary without adding a new manual logging burden.

- The copied payload remains small and reliable enough that the current phone-page-to-chat workflow still feels lightweight.

- A future planner or analysis step can inspect completed sessions and identify recurring timing or adherence patterns across workouts without needing a backend reconstruction project first.

---

## Scope Boundaries

- Future automatic training adaptation based on these signals is deferred.

- Hosted analytics, dashboards, live syncing, and multi-device telemetry are out of scope.

- Rich freeform journaling beyond the current notes/rating surface is out of scope.

- Perfect behavioral interpretation is out of scope. This phase is about collecting enough evidence to support better interpretation later.

---

## Dependencies / Assumptions

- The rendered session runtime remains the primary interaction surface for completing workouts.

- The copy-back log remains the durable bridge between browser-local session state and the local training history file.

- The current logging workflow can evolve its stored session shape without requiring a separate backend product surface.

---

## Sources / Research

- `README.md` for the product workflow, `TL1` copy-back contract, and local-first workspace model
- `tools/training_rendering.py` for the current session runtime state, local storage behavior, and copied log shape
- `tools/training_state.py` for the current `TL1` parsing and durable training-history storage seam
- `.codex/skills/log-training-session/SKILL.md` and `.codex/skills/log-training-session/references/state-and-log-format.md` for the current logging contract and planning-facing saved session expectations
