---
name: onboard-training-user
description: Establish the user's core training profile before generating sessions. Use when the workspace is new, the local state still has example data, or the user wants the agent to learn their goals, constraints, equipment, and preferences first.
---

# Onboard Training User

Use this skill before training generation when the user profile is missing, generic, or obviously stale.

Read [references/onboarding-profile-format.md](./references/onboarding-profile-format.md) before updating state.

## Goal

Ask the smallest set of important onboarding questions, convert the answers into durable `profile` and `preferences` state, and leave the workspace ready for session generation.

## Authority

The agent owns the interview and the interpretation.

- Do not ask a giant intake questionnaire.
- Ask only what materially changes plan quality.
- Save structured profile facts into local state.
- If the user gives enough to move forward, stop asking and update state.

## Workflow

1. Read the current profile first:

```bash
python3 tools/training_state.py read-profile
```

2. Ask only the highest-signal questions that are still missing.

Prioritize:
- primary training goals
- current injuries, pain points, or hard constraints
- available equipment or training environment
- preferred session length and weekly frequency
- training background or current level

Optional only if useful:
- body weight / height
- movements they strongly like or dislike
- motivation style, novelty preference, or adherence risks

3. Convert the answers into a patch JSON with:
- `profile`
- `preferences`

4. Save it:

```bash
python3 tools/training_state.py update-profile --input /tmp/training-profile.json
```

5. Confirm what was learned and say the workspace is now ready for plan generation.

## Questioning Rules

- Keep questions compact.
- Ask in plain language, not schema language.
- Prefer 3 to 6 high-value questions over a long intake.
- If the user already answered something indirectly, infer it and move on.
- If the current profile is example data, replace it with real user facts instead of preserving generic placeholders.

## Output Shape

Use this patch shape:

```json
{
  "profile": {
    "name": "Alex",
    "training_focus": ["strength", "weight loss", "consistency"],
    "constraints": ["left knee pain with deep flexion", "avoid jumping"],
    "notes": "Home gym on weekdays, commercial gym on weekends."
  },
  "preferences": {
    "planning_style": "simple, progressive, and phone-friendly",
    "session_duration_min": 45,
    "weekly_frequency": 4,
    "equipment_access": ["dumbbells", "bench", "cable machine"],
    "motivation_policy": "prefers repeating proven exercises before rotating"
  }
}
```

## Required Follow-Through

Do not stop at asking questions.

1. Save the updated profile with `update-profile`.
2. Confirm the saved shape at a high level.
3. Tell the user the next useful prompt, usually session generation.

