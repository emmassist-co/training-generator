# Agent-Native Architecture

This repo is an agent-native training generator, not just a pile of helper scripts.

## What that means here

- the agent is a first-class operator, not an afterthought
- the main workflows are exposed as repo-local skills
- the user and the agent share the same local files for state, config, rendered artifacts, and publish outputs
- the phone runtime returns a compact machine log, `TL1`, that an agent can parse directly, including bounded interaction telemetry

## Capability Map

| Outcome | Repo surface |
|---|---|
| Discover the main workflows and prompts | `.codex/skills/discover-training-workflows/`, `tools/help_training_generator.mjs`, `npm run help` |
| Plan the next session from local history | `.codex/skills/create-training-plan/` |
| Render session JSON into HTML or PDF | `.codex/skills/render-training-artifacts/`, `tools/training_rendering.py`, `tools/render_training_plan.py`, `npm run render:html`, `npm run plan:pdf` |
| List or delete rendered HTML/PDF artifacts | `tools/manage_training_artifacts.mjs`, `npm run artifacts:list`, `npm run artifacts:delete` |
| Stage a page into the local Cloudflare site tree | `tools/stage_training_page_publish.mjs`, `npm run html:stage` |
| Deploy the local site tree to Cloudflare Pages | `tools/deploy_cloudflare_pages_site.mjs`, `npm run html:deploy-site` |
| Publish a session page to the user's Cloudflare Pages site | `.codex/skills/publish-html-to-cloudflare/`, `tools/cloudflare_pages_site.mjs`, `tools/publish_html_to_cloudflare.mjs`, `npm run html:publish` |
| List already-published training pages | `tools/publish_html_to_cloudflare.mjs --list-published`, `npm run html:list-published` |
| Delete one published training page | `tools/delete_published_training_page.mjs`, `npm run html:delete-published -- --path <page-id>` |
| Test the interactive training page | `.codex/skills/test-training-session-runtime/` |
| Parse or validate a copied `TL1` log with telemetry | `tools/training_state.py validate-tl1`, `npm run state:validate-log` |
| Log a completed workout into local history | `.codex/skills/log-training-session/`, `tools/training_state.py log-session` |
| Run a hosted Flue training conversation | `src/app.ts`, `src/agents/training-coach.ts`, `npm run worker:build` |
| Import/export local state for hosted D1 use | `tools/import_training_state_to_d1.mjs`, `tools/export_d1_training_state.mjs` |
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

## Hosted Agent Path

The hosted path uses Flue v2 on Cloudflare Workers. Flue owns the conversation stream and generated Durable Object storage, while D1 stores product data the training generator needs across sessions: profile snapshots, planned sessions, exercise rows, event history, telemetry, and accepted mid-run changes.

The agent contract is proposal-first. It can answer questions and suggest swaps, but a session mutation should move through a structured proposal and a user-approved apply step. D1 events preserve what changed, why it changed, and which version of the session the change affected.

## Known Limits

- The tool layer is still workflow-heavy, not fully primitive-heavy.
- The runtime HTML itself is still a large template surface, even though the CLI paths are now split into smaller primitives.
- The static phone runtime is shared back to the agent through `TL1`; hosted live sync is implemented through the Flue/D1 path.
- The `TL1` payload now carries bounded timing and adherence telemetry so later planning can learn from real session behavior without adding a backend.
- Hosted deployment still requires user-owned Cloudflare setup and explicit approval before production writes.

## Direction

The intended direction is:

- keep the high-level skills
- keep files as the durable shared surface
- gradually split monolithic workflows into smaller primitives where that improves composability
- keep the public identity product-generic: training generator, training session, publish, log
