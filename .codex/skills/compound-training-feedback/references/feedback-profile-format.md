# Planning Feedback Profile

The local training state can store durable planning preferences in:

- `planning_feedback_profile.summary_notes`
- `planning_feedback_profile.signals`

`summary_notes` are short sticky reminders about how the user wants training to feel.

`signals` are structured preference entries:

```json
{
  "category": "exercise",
  "target": "Barbell Hip Thrust",
  "preference": "avoid",
  "note": "Too much setup friction when the gym is busy.",
  "source": "plan-feedback",
  "updated_at": "2026-06-05T12:00:00"
}
```

Guidance:
- Use `exercise` when feedback is about a named movement or swap target.
- Use `load` when feedback is about intensity, loading pace, or effort tolerance.
- Use `session` when feedback is about session length, density, simplicity, or enjoyment.
- Use `progression` when feedback is about novelty versus repetition, pace of change, or progression appetite.
- Keep notes short enough that they can be re-read during planning.
