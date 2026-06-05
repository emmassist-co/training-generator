---
name: compound-training-feedback
description: Convert user feedback on a proposed or completed training session into durable planning preferences for future sessions. Use when the user reacts to exercises, loads, session structure, boredom, progression pace, or substitutions and you want that preserved in local state.
---

# Compound Training Feedback

Use this skill after the user gives feedback on a generated plan, a rendered session, or a completed session and you want future planning to remember it.

Read [references/feedback-profile-format.md](./references/feedback-profile-format.md) before updating state.

## Authority

The agent interprets the feedback.

- The helper script only stores the feedback profile.
- Do not dump the raw user message into state.
- Convert feedback into compact durable preference signals that another planning pass can actually use.

## Workflow

1. Read the current planning context:

```bash
python3 tools/training_state.py summarize-state
python3 tools/training_state.py read-feedback-profile
```

2. Turn the user message into two things:
- `summary_notes`: short sticky notes about how the user likes training to feel or flow
- `signals`: structured preference signals such as exercise likes/dislikes, load appetite, session-length preference, progression pace, boredom/novelty preference, or setup-friction avoidance

3. Write a compact patch JSON file and save it:

```bash
python3 tools/training_state.py update-feedback-profile --input /tmp/training-feedback.json
```

4. Explain what changed and how future plans should adapt.

## Signal Rules

- Keep signals short and durable.
- Prefer stable preferences over one-off noise.
- Capture exercise-level likes/dislikes when the user names a movement.
- Capture load preferences when the user signals too heavy, too light, too aggressive, or ready for more.
- Capture session-structure preferences when the user signals too long, too chaotic, too repetitive, too dense, or too fiddly.
- Capture progression preferences when the user wants more repetition of proven movements or more novelty/rotation.
- If feedback is ambiguous, prefer a narrower signal rather than a broad sweeping rule.

## Output Shape

Use this patch shape:

```json
{
  "summary_notes": [
    "Prefers short lower-body sessions with minimal setup friction."
  ],
  "signals": [
    {
      "category": "exercise",
      "target": "Barbell Hip Thrust",
      "preference": "avoid",
      "note": "Too much setup friction when the gym is busy.",
      "source": "plan-feedback"
    },
    {
      "category": "load",
      "target": "Lower-body compounds",
      "preference": "lighter",
      "note": "Wants controlled progressions before adding aggressive load.",
      "source": "plan-feedback"
    }
  ]
}
```

Allowed `category` values:
- `exercise`
- `load`
- `session`
- `progression`
- `equipment`
- `other`

Common `preference` values:
- `prefer`
- `avoid`
- `lighter`
- `harder`
- `shorter`
- `longer`
- `repeat`
- `rotate`
- `simpler`

## Required Follow-Through

Do not stop at summarizing the feedback.

1. Save the patch into local state with `update-feedback-profile`.
2. Confirm the profile changed.
3. Explain what future planning should do differently because of it.

