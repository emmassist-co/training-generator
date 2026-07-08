# Agent-Native Planning Refactor

## Goal

Make training plan generation more agent-native by moving exercise selection, progression, and tradeoff decisions out of hardcoded generator logic and into model reasoning over shared local context.

Keep rendering, publishing, logging, and validation deterministic.

## Current mismatch

The repo says the agent should do the planning, but the baseline generator still contains planning policy in code:

- `tools/generate_training_plan.py` chooses session title, goal, exercise list, and progression logic directly.
- `tools/training_state.py` contains useful retrieval and validation helpers, but some helper vocabulary still nudges the planner toward a fixed rehab-style bias.
- the repo-local skill already frames the Python layer as retrieval infrastructure, but the shipped baseline script still acts like a planner.

This creates a split brain:

- docs and skills say "the model plans"
- code still says "the script plans"

## Target architecture

### 1. Keep tools primitive

The model should have tools for:

- reading current training context
- reading recent sessions
- reading sticky planning feedback
- searching candidate exercises
- validating a draft plan structurally
- rendering HTML/PDF
- publishing or deleting artifacts
- logging a completed session

The model should not have a tool whose main job is "decide the next workout".

### 2. Inject dynamic planning context

Before the planning turn, assemble a compact context payload from local state:

- current profile
- preferences
- planning feedback profile
- recent sessions
- recent focus counts
- available equipment if known
- candidate exercise shortlist for likely muscles or intent
- publish/runtime constraints if relevant

This should be the same shared truth the user and agent both inspect.

### 3. Make the prompt own the planning policy

The planning skill or system prompt should define:

- what makes a good next session
- how to balance progression vs novelty
- how to use recent history
- how to respect sticky preferences
- how to react to boredom, pain, fatigue, adherence, and motivation signals

That prose should replace coded branching like:

- "if lower-body bias then emit posterior-chain template"
- "if recent constraint exists append this note"
- fixed exercise bundles hardcoded in Python

### 4. Keep deterministic checks narrow

Validation should confirm structure and grounding, not author the plan by proxy.

Good checks:

- plan references real recent sessions
- plan includes concrete influences from history
- each exercise has prescription clarity
- alternatives are explicit
- required fields exist

Avoid checks that silently reintroduce planning policy, such as:

- requiring one narrow style of session bias
- preferring one movement family globally
- encoding domain conclusions that the model should decide case by case

## Concrete repo changes

### A. Replace `generate_training_plan.py` with a context builder

Current file:

- `tools/generate_training_plan.py`

Change it from "generate next plan" into one of:

1. `build_training_planning_context.py`
2. a new `training_state.py planning-context` command

Its output should be compact JSON like:

```json
{
  "profile": {},
  "preferences": {},
  "planning_feedback_profile": {},
  "recent_sessions": [],
  "recent_focus_counts": {},
  "recommended_attention": [
    "Do not repeat the same dominant stressor blindly.",
    "Prefer a plan the user is likely to complete and log."
  ],
  "candidate_exercises": {
    "posterior_chain": [],
    "upper_push": [],
    "upper_pull": [],
    "conditioning_low_impact": []
  }
}
```

The model then writes the actual session JSON.

### B. Keep retrieval logic, but separate it from judgment

`tools/training_state.py` is already close to a good primitive layer. Keep:

- `summarize-context`
- `read-profile`
- `read-feedback-profile`
- `list-sessions` / recent session reads
- `search-exercises`
- `evaluate-plan`

Improve it by:

- renaming commands toward neutral retrieval language
- making search return strong metadata, not recommendations disguised as truth
- keeping risk labels explainable and lightweight

The helper can say:

- "this exercise matches these muscles"
- "this has plyometric markers"

It should avoid saying:

- "this is the right next movement for today"

### C. Rewrite the planning skill around prompt-native execution

Current file:

- `.codex/skills/create-training-plan/SKILL.md`

Keep its authority section, but tighten the workflow:

1. gather context
2. gather candidate exercises
3. reason about the next session in prose
4. write structured plan JSON
5. run deterministic eval
6. render artifact

Reduce emphasis on the baseline generator. Treat it as optional legacy scaffolding or remove it entirely.

### D. Add a single planning-context tool surface

The model currently has to compose several reads manually. That is workable, but one well-designed context tool would help:

Example:

```bash
python3 tools/training_state.py planning-context --history-limit 5 --include-candidates
```

This is still agent-native if it only aggregates state and candidates. It becomes non-agent-native only if it starts deciding the session itself.

### E. Make examples less policy-shaping

The current examples and README language still bias the repo toward one rehab-style planning lane. Keep the engine generic:

- examples should demonstrate different session types
- docs should describe planning principles, not one default body story
- the planner should infer style from local state, not from repo voice

## Suggested phases

### Phase 1: remove the biggest anti-pattern

- deprecate `tools/generate_training_plan.py` as the default planner
- add `planning-context` output to `tools/training_state.py`
- update the planning skill to use context + search + model reasoning first

### Phase 2: strengthen prompt-native planning

- create a reusable planning prompt template or reference doc
- define judgment criteria for progression, variety, fatigue, confidence, and adherence
- include examples of good `planning_context.influences`

### Phase 3: tighten eval without re-encoding policy

- keep structural checks
- add groundedness checks for whether the plan reflects recent state and sticky feedback
- remove any checks that imply one hardcoded training ideology

## Practical bar for "more agent-native"

You are there when:

- changing plan behavior mostly means editing prompt prose, not Python branching
- adding a new session style does not require a new generator function
- the same tool layer can support radically different planning styles from different local profiles
- the model can explain why this session is right today using shared context, not hidden code paths

## Recommended first move

First, replace the default use of `tools/generate_training_plan.py` with a neutral planning-context command and update `.codex/skills/create-training-plan/SKILL.md` to treat model-authored plan creation as the main path.

That gives the model more room to think without sacrificing deterministic retrieval, eval, rendering, or publishing.
