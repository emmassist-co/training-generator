# Agent-Native Architecture

This repo is an agent-native training generator, not just a pile of helper scripts.

## What that means here

- the agent is a first-class operator, not an afterthought
- the main workflows are exposed as repo-local skills
- the user and the agent share the same local files for state, config, rendered artifacts, and publish outputs
- the phone runtime returns a compact machine log, `TL1`, that an agent can parse directly

## Capability Map

| Outcome | Repo surface |
|---|---|
| Discover the main workflows and prompts | `.codex/skills/discover-training-workflows/`, `tools/help_training_generator.mjs`, `npm run help` |
| Plan the next session from local history | `.codex/skills/create-training-plan/` |
| Render session JSON into HTML or PDF | `.codex/skills/render-training-artifacts/`, `tools/render_training_plan.py`, `npm run render:html`, `npm run plan:pdf` |
| List or delete rendered HTML/PDF artifacts | `tools/manage_training_artifacts.mjs`, `npm run artifacts:list`, `npm run artifacts:delete` |
| Publish a session page to the user's Cloudflare Pages site | `.codex/skills/publish-html-to-cloudflare/`, `tools/publish_html_to_cloudflare.mjs`, `npm run html:publish` |
| List already-published training pages | `tools/publish_html_to_cloudflare.mjs --list-published`, `npm run html:list-published` |
| Delete one published training page | `tools/publish_html_to_cloudflare.mjs --delete-published --path <page-id>` |
| Test the interactive training page | `.codex/skills/test-training-session-runtime/` |
| Parse or validate a copied `TL1` log | `tools/training_state.py validate-tl1`, `npm run state:validate-log` |
| Log a completed workout into local history | `.codex/skills/log-training-session/`, `tools/training_state.py log-session` |
| Summarize the current shared planning context | `tools/training_state.py summarize-context`, `npm run state:summarize-context` |
| Read raw local state, profile, or exercise records | `tools/training_state.py read-state`, `read-profile`, `list-exercises`, `read-exercise` |
| Read, update, or delete logged sessions | `tools/training_state.py list-sessions`, `read-session`, `update-session`, `delete-session` |

## Shared Workspace

The durable state is intentionally file-based:

- local user history: `data/local/training-state.json`
- local publish config: `config/training-generator.local.json`
- rendered plans: `output/training-plans/`
- published site tree: `output/cloudflare-pages/site/`

The browser runtime is still local-device state, but it now keys progress by `trainingId` instead of only by page title so two same-title sessions do not collide as easily.

## Where User Profile Lives

The user profile is stored in the same local state file as the training history:

- `profile`: core person-specific context and constraints
- `preferences`: planning and coaching preferences
- `sessions`: completed history

This is deliberate. The planning agent should read one shared local file instead of trying to merge a separate hidden profile system with a separate workout log.

## Current Strengths

- Strong action parity for the main plan -> render -> publish -> log loop.
- Skills define high-level outcomes in natural language.
- The repo works without a hidden app server or agent-only database.
- Cloudflare ownership stays with the user.

## Known Limits

- The tool layer is still workflow-heavy, not fully primitive-heavy.
- Some workflows are still monolithic, especially render and publish.
- The phone runtime is shared back to the agent through `TL1`, not live sync.

## Direction

The intended direction is:

- keep the high-level skills
- keep files as the durable shared surface
- gradually split monolithic workflows into smaller primitives where that improves composability
- keep the public identity product-generic: training generator, training session, publish, log
