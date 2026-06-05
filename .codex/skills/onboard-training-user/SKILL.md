---
name: onboard-training-user
description: Establish the user's core training profile before generating sessions. Use when the workspace is new, the local state still has example data, or the user wants the agent to learn their goals, constraints, equipment, and preferences first.
---

# Onboard Training User

Use this skill before training generation when the user profile is missing, generic, or obviously stale.

Read [references/onboarding-profile-format.md](./references/onboarding-profile-format.md) before updating state.

## Goal

Ask the smallest set of important onboarding questions, convert the answers into durable `profile` and `preferences` state, and leave the workspace ready for session generation.

Default to a short guided intake, not an open-ended interview. The user should not need to design their own training ontology.

## Authority

The agent owns the interview and the interpretation.

- Do not ask a giant intake questionnaire.
- Ask only what materially changes plan quality.
- Prefer strong defaults and recommended answers over blank prompts.
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
- preferred session length and weekly frequency
- training background or current level

Ask about equipment only if it will materially change planning. Do not assume the user knows how to inventory a gym.

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
- Prefer 3 to 5 high-value questions over a long intake.
- If the user already answered something indirectly, infer it and move on.
- If the current profile is example data, replace it with real user facts instead of preserving generic placeholders.
- Offer recommended defaults when the user may not know the answer.
- If you need equipment context, ask for environment type first, not an inventory list. Examples: `commercial gym`, `basic gym`, `home gym`, `limited equipment`.

Recommended defaults:
- planning style: `simple, progressive, and phone-friendly`
- session duration: `45 minutes`
- weekly frequency: `3 to 4 sessions`
- equipment access when unclear: `commercial gym` or `basic gym`, whichever best matches the user's description
- motivation policy: repeat proven movements before rotating for novelty

Good question style:
- `Main goal right now: strength, weight loss, general fitness, or a mix?`
- `Any injuries or movements I should protect against?`
- `What kind of place are you training in most of the time: commercial gym, basic gym, home gym, or very limited equipment?`
- `Should I assume about 45-minute sessions and 3 to 4 days per week, or do you want something else?`

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
    "equipment_access": ["commercial gym"],
    "motivation_policy": "prefers repeating proven exercises before rotating"
  }
}
```

## Required Follow-Through

Do not stop at asking questions.

1. Save the updated profile with `update-profile`.
2. Confirm the saved shape at a high level.
3. Tell the user the next useful prompt, usually session generation.
