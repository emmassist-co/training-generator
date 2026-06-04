# Session Logging Format

- Example state file: `/Users/alexandre/dev/acl/data/training_state.json`
- Local state override: `TRAINING_GENERATOR_STATE_PATH` or `/Users/alexandre/dev/acl/data/local/training-state.json`
- Shared helper: `/Users/alexandre/dev/acl/tools/training_state.py`

The active local state file stores both:
- the user profile and planning preferences
- the completed training history

Every logged session should add one object to `sessions`.

Required fields for each session:
- `date`: `YYYY-MM-DD`
- `session_type`: short label such as `strength`, `conditioning`, `mobility`, `recovery`
- `focus`: list such as `["glutes", "hamstrings", "conditioning"]`
- `summary`: one-line description of what was done
- `body_response`: short response label such as `good`, `neutral`, `worse`, or `mixed`
- `pain_during_10`: integer `0-10`
- `swelling_after`: `none`, `mild`, `moderate`, or `high`
- `confidence_note`: short note about stability, trust, or hesitation

Optional fields:
- `source_training_id`
- `body_weight_kg`
- `motivation_pre_session`: `high`, `medium`, or `low`
- `session_enjoyment`: `high`, `medium`, or `low`
- `duration_min`
- `exercises`: array of exercise entries with `name`, `sets`, `reps`, `load`, `notes`
- `conditioning`: free text
- `next_session_constraints`: array of short constraints learned from this session

Recommended workflow:

1. Read recent state first:

```bash
python3 /Users/alexandre/dev/acl/tools/training_state.py summarize-state
```

2. Convert the user's free-form description into one structured session object.
   If the user pasted a compact `TL1 {...}` log from the training page, parse it first and map its `id` into `source_training_id`.
3. Save that object into a temp JSON file.
4. Append it with:

```bash
python3 /Users/alexandre/dev/acl/tools/training_state.py log-session --input /tmp/session.json
```

5. Report back the updated state implications for future planning.

Also update high-level trend sections in the main state file when the user gives enough signal:
- append weight entries to `weight_history`,
- append motivation observations to `motivation_history`,
- update `exercise_progression_notes` when a movement clearly progressed, regressed, or got replaced for a reason.
