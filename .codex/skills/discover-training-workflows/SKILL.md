---
name: discover-training-workflows
description: Show the main workflows, prompts, and first steps in this training-generator workspace. Use when the user asks what the repo can do, how to start, what to ask the agent, or how the pieces fit together.
---

# Discover Training Workflows

Use this skill when the user needs capability discovery.

Run:

```bash
node tools/help_training_generator.mjs
```

If the user wants structured output for another tool or workflow, run:

```bash
node tools/help_training_generator.mjs --json
```

## Rules

- Prefer showing the shortest path to the next useful action.
- If the user has not initialized the workspace yet, lead with `npm run init`.
- If the user already has a rendered session JSON or HTML file, point them to render/publish workflows instead of the planning workflow.
- After an owner-install handoff, do not stop at capability listing. Give a short tour centered on the generator's capabilities and workflow, point at the first local files to edit, and use one demo session flow only as proof that the generator works end to end.
