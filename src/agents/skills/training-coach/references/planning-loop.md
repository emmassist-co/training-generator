# Planning Loop

Before planning or advice:

1. Identify the profile.
2. Call `get_training_context`.
3. If needed, call `list_training_history` and `get_training_session`.
4. Identify the current need:
   - strength session,
   - upper/posterior session,
   - lower-body session,
   - conditioning,
   - recovery/light session,
   - in-session substitution,
   - post-session interpretation.
5. Check the last 1 to 5 relevant sessions for:
   - similar stressor timing,
   - load/reps achieved,
   - pain/swelling/fatigue response,
   - skipped exercises,
   - boredom/staleness,
   - equipment problems,
   - conditioning dose.
6. Search the exercise catalog for candidates when creating or swapping exercises.
7. Before saving a new planned session, call `review_training_plan` with the proposed plan.
8. For non-trivial plans, injury-history tradeoffs, or unclear progression decisions, delegate a fresh review to the `training_plan_reviewer` subagent using the built-in `task` tool. Pass the full profile/history/proposed-plan briefing.
9. Fix blockers. Fix warnings or explain why the tradeoff is acceptable.
10. Create the session or answer.

When useful, mention which history signal changed the plan.

Do not ask many questions. Ask one focused question only when the missing fact changes the plan materially.
