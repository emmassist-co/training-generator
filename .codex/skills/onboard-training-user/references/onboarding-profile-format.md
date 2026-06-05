# Onboarding Profile Format

The onboarding skill writes into two existing top-level state objects:

- `profile`
- `preferences`

Keep `profile` for stable user facts:
- goals
- constraints
- training history
- body facts when relevant
- general environment notes

Keep `preferences` for planning behavior:
- session duration
- weekly frequency
- equipment access
- planning style
- motivation / novelty / adherence preferences

Guidance:
- Prefer coarse equipment labels such as `commercial gym`, `basic gym`, `home gym`, or `limited equipment` over long machine inventories.
- Use recommended defaults when the user does not know a detail yet.
- The goal is to make planning possible quickly, not to finish a perfect intake form.

Use compact, durable wording. The profile should help the planner make better tradeoffs later, not preserve a verbatim transcript.
