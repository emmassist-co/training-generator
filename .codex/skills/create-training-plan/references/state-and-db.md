# State And Exercise Library

- Example state file: `/Users/alexandre/dev/acl/data/training_state.json`
- Local state override: `TRAINING_GENERATOR_STATE_PATH` or `/Users/alexandre/dev/acl/data/local/training-state.json`
- Exercise library: `/Users/alexandre/dev/acl/free-exercise-db/dist/exercises.json`
- Shared helper: `/Users/alexandre/dev/acl/tools/training_state.py`

Use the active state as the source of truth for:
- profile and constraints,
- recent training load,
- previous session focus,
- what the next session should avoid repeating too aggressively,
- weight trend,
- motivation trend,
- exercise progression history.

Use the exercise DB as a candidate library, not as automatic truth.
The skill should still filter for the active profile and reject bad tradeoffs.

Useful commands:

```bash
python3 /Users/alexandre/dev/acl/tools/training_state.py summarize-state
python3 /Users/alexandre/dev/acl/tools/training_state.py show-recent --limit 5
python3 /Users/alexandre/dev/acl/tools/training_state.py search-exercises --include-muscles glutes hamstrings calves abdominals --allowed-risk prefer caution --limit 12
python3 /Users/alexandre/dev/acl/tools/training_state.py search-exercises --include-muscles quadriceps adductors abductors --allowed-risk caution --categories strength stretching --limit 12
```

Interpret helper output conservatively:
- `prefer`: broadly compatible with lower-stress training goals
- `caution`: possible, but needs dose, range, tempo, or fatigue control
- `avoid`: poor tradeoff for the active profile
