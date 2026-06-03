---
title: Productize Training Generator for User-Owned Cloudflare Deployment
type: feat
status: active
date: 2026-06-03
---

# Productize Training Generator for User-Owned Cloudflare Deployment

## Summary

Turn this repo from a personal rehab-oriented workspace into a generic training-generator template that users can deploy on their own Cloudflare accounts, run with their own AI + skills, and use to generate, publish, complete, and log mobile training sessions.

## Problem Frame

The current repo proves the end-to-end flow for one operator: generate a session, render phone-first HTML, publish it to Cloudflare Pages, complete it in the gym, and copy back a compact log. What is missing is product separation. The repo identity, state model, skills, naming, and docs are still tightly coupled to one private rehab context, one operator account, and one shared Pages setup. That makes the current result hard for another user to adopt without first understanding which parts are product and which parts are personal residue.

## Scope Boundaries

In scope:
- package the current flow as a generic training generator
- let each user deploy to their own Cloudflare account
- keep AI generation skill-driven and repo-local
- preserve the mobile HTML runtime, QR flow, and compact copy-back log
- provide a minimal public-ready repo baseline so an outsider can install and verify it

Out of scope:
- turning this into a multi-tenant hosted SaaS
- building a backend service for shared user accounts or synced history
- building provider-specific orchestration for every AI vendor in v1
- solving payments, org management, or remote analytics

## Requirements

### Product Identity And Packaging

R1. The public repo must present itself as a generic training generator, not as a condition-specific product.

R2. Condition-specific guidance, state, and constraints must move behind an example profile or private seed data path so the core product is reusable for broader training use cases.

R3. The repo must make the product boundary obvious: reusable engine, installable skills, example profiles, and local user data must be separable by directory and docs.

### User-Owned Deployment

R4. A new user must be able to connect their own Cloudflare account, create or reuse their own Pages project, and publish generated training pages without editing internal scripts by hand.

R5. Publishing must keep the current useful URL shape: a stable site root with readable date-first session paths and QR code output for each published page.

R6. The deployment flow must not assume the maintainer's existing Pages project, Pages domain, or local Wrangler cache.

### AI And Skills Workflow

R7. The core generation flow must remain AI-first: a skill can generate structured training data, render HTML, publish it, and return the public URL plus QR code.

R8. The public skill set must be installable and understandable by another operator without requiring knowledge of the maintainer's personal knee history.

R9. The log copied back from the mobile page must remain compact and machine-friendly, and must include a stable training/session identifier that downstream logging skills can map back to the source plan.

### Repo Readiness And Verification

R10. The repo must include a minimal public baseline: `README.md`, root license, clearer `.gitignore`, and CI checks that validate the core local flow without requiring a real Cloudflare deploy.

R11. The public docs must explain what is local user state, what is template/example content, and what a user must configure in their own account.

R12. The repo must provide at least one deterministic smoke path that a contributor can run locally to prove rendering and publish payload generation without live AI or live Cloudflare writes.

## Key Technical Decisions

KTD1. Reframe the repo as a template-style product with optional profile packs rather than trying to generalize the current rehab-oriented workspace in place.
Rationale: the current repo already mixes product runtime with one operator's rehab heuristics, state, and voice. A template/product split makes the reusable surface explicit and avoids baking one injury model into every public instruction path.

KTD2. Keep Cloudflare Pages Direct Upload as the default deployment target for v1.
Rationale: the current flow already uses `wrangler pages project create` and `wrangler pages deploy`, which is the simplest path for user-owned static/mobile HTML publishing. It avoids introducing Worker routing or a server-side control plane before the product needs one. This is consistent with current Cloudflare Pages Direct Upload guidance for uploading prebuilt assets with Wrangler.

KTD3. Treat publish configuration as user-owned workspace config, not code constants.
Rationale: `training`, `training-c6r.pages.dev`, and the current shared site assumptions are personal defaults. Public users need a stable config file or env-based contract so the same publisher can target their own Pages project and section layout safely.

KTD4. Preserve the current HTML session runtime as the core UX surface, but make its copy, branding, storage keys, and metadata generic.
Rationale: the gym-use interaction model is the strongest proven artifact in the repo. Rewriting it would discard the validated part. The actual problem is product identity and configuration, not the mobile session runtime pattern itself.

KTD5. Split "training engine state" from "example profile state".
Rationale: `data/training_state.json` currently contains private rehab-oriented constraints and recent sessions. Public users need a clean schema and a sample dataset, while maintainers still need a place for personal state that is not committed or presented as product truth.

KTD6. Provide skill-driven orchestration as repo-local skills, not machine-global dependencies.
Rationale: users should be able to clone the repo and get the main generation/publish/log flows from the repo itself. This matches the existing repo-local skill approach and avoids hidden personal setup.

KTD7. Add deterministic render/publish smoke tests before broadening AI-provider support.
Rationale: the highest immediate risk is packaging a flow that looks installable but cannot be verified without the maintainer's environment. Deterministic tests protect the stable runtime first; AI provider abstraction can layer on after that surface is trustworthy.

## High-Level Technical Design

The target architecture is:

1. `profiles/` holds example training profiles or constraints packs.
2. `data/` holds user-local state, with committed examples separated from ignored personal state.
3. `tools/` stays the execution layer:
   - training-state/query helpers
   - HTML renderer
   - Cloudflare publisher
4. `.codex/skills/` becomes the user-facing orchestration layer:
   - create/generate training
   - publish to Cloudflare
   - log completed session
   - bootstrap own Cloudflare account
5. `output/` stays generated-artifact only and remains ignored where appropriate.

End-to-end flow:

1. User installs repo and dependencies.
2. User initializes local config for AI provider choice, Cloudflare Pages project, and optional profile pack.
3. Generation skill creates structured session JSON.
4. Renderer converts JSON to mobile HTML with compact client-side tracking/logging.
5. Publisher deploys the rendered site to the user's own Pages project and returns URL + QR.
6. Gym user completes the session in the browser and copies back a compact `TL1` log.
7. Logging skill stores the session against local state using the training/session identifier.

## Implementation Units

U1. Rename and recast the public product surface.
- Files:
  - `package.json`
  - `README.md`
  - `AGENTS.md`
  - `.codex/skills/create-training-plan/SKILL.md`
  - `.codex/skills/publish-html-to-cloudflare/SKILL.md`
  - `.codex/skills/deploy-training-site-on-cloudflare/SKILL.md`
  - `.codex/skills/log-training-session/SKILL.md`
- Test files:
  - `tests/docs/public-surface.test.mjs`
- Approach:
  - remove condition-specific naming from package metadata, docs, and public skill copy
  - keep rehab as an example/private profile, not as the product headline
  - tighten terminology around "training generator", "session", "publish", and "log"
- Verification scenarios:
  - README first screen describes a generic training generator and user-owned Cloudflare deployment
  - no public skill description requires one injury context to make sense
  - package metadata no longer exposes old repo-specific naming

U2. Split personal state from reusable state schema.
- Files:
  - `tools/training_state.py`
  - `data/training_state.json`
  - `data/examples/`
  - `.gitignore`
  - `.codex/skills/create-training-plan/references/state-and-db.md`
  - `.codex/skills/log-training-session/references/state-and-log-format.md`
- Test files:
  - `tests/python/test_training_state_schema.py`
- Approach:
  - rename the helper and state model to generic training terms
  - define a clean committed example state file plus ignored user-local state path
  - preserve source training ids and session history semantics while removing condition-specific mandatory fields from the core schema
- Verification scenarios:
  - a new clone can load the example state without private data
  - a user-local state file can override the example path without code edits
  - session logging still preserves source training ids and compact log ingestion

U3. Make the renderer product-generic without losing the proven gym UX.
- Files:
  - `tools/render_training_plan.py`
  - `output/training-plans/` (sample regenerated artifacts only if explicitly needed)
- Test files:
  - `tests/python/test_render_training_plan.py`
  - `tests/fixtures/sample-training-plan.json`
- Approach:
  - remove condition-specific branding, storage keys, and hero copy
  - preserve sticky tracker, timers, collapse/reopen behavior, copy-log flow, and QR compatibility
  - make session metadata and log payloads generic enough for different plan types
- Verification scenarios:
  - rendering a sample plan produces generic session copy and a stable training id
  - time-based exercises still show timers
  - rep-based exercises still support done/reopen/collapse flows
  - copied `TL1` payload remains compact and includes enough info for logging

U4. Externalize Cloudflare publish configuration.
- Files:
  - `tools/publish_html_to_cloudflare.mjs`
  - `.codex/skills/publish-html-to-cloudflare/SKILL.md`
  - `.codex/skills/deploy-training-site-on-cloudflare/SKILL.md`
  - `.env.example`
  - `config/training-generator.example.json`
- Test files:
  - `tests/node/publish_html_to_cloudflare.test.mjs`
- Approach:
  - replace hardcoded project/section/personal-domain assumptions with config resolution
  - keep readable date-first paths and QR generation
  - support dry-run and fixture-backed verification without a live deploy
- Verification scenarios:
  - publisher resolves project and section from config/env instead of source constants
  - dry-run returns the expected page path and QR output path for a sample plan
  - live deploy instructions clearly point to a user's own Pages project

U5. Add a first-run bootstrap path for user-owned accounts.
- Files:
  - `README.md`
  - `scripts/init-training-generator.mjs`
  - `.codex/skills/deploy-training-site-on-cloudflare/SKILL.md`
  - `config/training-generator.example.json`
- Test files:
  - `tests/node/init_training_generator.test.mjs`
- Approach:
  - add an init command that gathers minimal settings: Pages project name, optional section prefix, preferred AI provider metadata, and local state path
  - generate local config from an example template instead of telling users to edit multiple files manually
  - keep Wrangler auth/live project creation as explicit operator steps
- Verification scenarios:
  - a fresh repo can generate a local config file from the template
  - init output names the exact remaining manual steps: `wrangler login`, project create/reuse, first smoke publish
  - no generated config includes maintainer-specific values by default

U6. Turn the repo-local skills into a coherent public workflow.
- Files:
  - `.codex/skills/create-training-plan/SKILL.md`
  - `.codex/skills/publish-html-to-cloudflare/SKILL.md`
  - `.codex/skills/deploy-training-site-on-cloudflare/SKILL.md`
  - `.codex/skills/log-training-session/SKILL.md`
  - `.codex/skills/create-training-plan/agents/openai.yaml`
  - `.codex/skills/log-training-session/agents/openai.yaml`
- Test files:
  - `tests/docs/skills-workflow.test.mjs`
- Approach:
  - make the skill set read like an installable workflow for any operator
  - remove references that assume one person's rehab history or one machine path is product truth
  - document the inputs/outputs between generate, render, publish, and log
- Verification scenarios:
  - a new operator can read only the skill docs and understand the flow
  - each skill names the artifact it consumes and produces
  - generation and logging skills still preserve compatibility through the `TL1` payload

U7. Add public-baseline documentation, license, and CI.
- Files:
  - `LICENSE`
  - `README.md`
  - `.github/workflows/ci.yml`
  - `.gitignore`
  - `package.json`
- Test files:
  - `.github/workflows/ci.yml`
  - `tests/node/repo_smoke.test.mjs`
- Approach:
  - add a root license and README with quickstart, architecture, and limits
  - add CI that runs deterministic smoke checks for renderer, publisher dry-run, and doc/config sanity
  - ignore local state, local config, and secret-bearing env files clearly
- Verification scenarios:
  - `npm test` exists and passes on a clean clone without Cloudflare auth
  - CI validates the non-secret local setup and deterministic artifact path
  - secret-bearing local files are ignored by default

## System-Wide Impact

- Renaming the helper and schema affects both generation and logging skills; the plan must preserve compatibility for `TL1` logs and existing rendered session ids.
- Generic branding changes touch the rendered mobile experience, docs, config, and skill prompts at once; the wording needs to stay internally consistent or contributors will not know which layer they are changing.
- Moving to user-owned Cloudflare config shifts failure modes from "maintainer forgot auth" to "user has incomplete init/config/auth state"; the docs and init path need explicit guardrails.

## Risks & Dependencies

- Cloudflare account setup remains an operator dependency. The public repo can automate config and project targeting, but it cannot remove the need for `wrangler login` and Pages project creation/reuse.
- The current repo root `AGENTS.md` can drift into condition-specific language and conflict with a public generic identity if left unchecked.
- Existing local data and generated artifacts may still embed old rehab language. Avoid mass-editing generated outputs; prefer fixing the renderer and regenerating samples intentionally.
- AI-provider abstraction can sprawl. Keep v1 focused on a provider-agnostic skill contract, not a full provider plugin matrix.

## Documentation / Operational Notes

- README should have three short tracks:
  - use the repo as-is with example data
  - connect your own AI workflow
  - publish to your own Cloudflare Pages project
- Include one deterministic sample render and one deterministic publish dry-run command in the README.
- Keep personal state and generated deploy artifacts out of the public baseline by default.

## Sources / Research

- `tools/render_training_plan.py` - current mobile session runtime, training id generation, and compact copy-log behavior
- `tools/publish_html_to_cloudflare.mjs` - current Pages publish flow, QR generation, and hardcoded project defaults
- `tools/training_state.py` - current personal state/query/log helper coupled to example rehab heuristics
- `.codex/skills/create-training-plan/SKILL.md` - current generation workflow and prior coupling to condition-specific phrasing
- `.codex/skills/publish-html-to-cloudflare/SKILL.md` - current publish contract and path conventions
- `.codex/skills/deploy-training-site-on-cloudflare/SKILL.md` - current account bootstrap runbook
- Cloudflare Pages Direct Upload docs - current Wrangler flow for `pages project create` and `pages deploy`
- Cloudflare Pages preview/custom-domain docs - current distinction between production deploys, preview deploys, and branch aliases

## Open Questions

- Should the public repo ship one generic example profile only, or multiple example packs such as `strength`, `rehab`, and `conditioning`? This changes how much profile abstraction should be built in U2 versus deferred.
- Should the init flow write a JSON config file, `.env.local`, or both? The choice should be driven by where AI-provider and Cloudflare settings are easiest to understand without leaking secrets into committed files.
