# Training Generator

Generate training sessions with AI, render them into phone-first HTML, publish them to your own Cloudflare Pages site, and log completions back into local state.

## What This Repo Does

- generates structured training sessions from local state and AI prompts
- renders a mobile-friendly session page with timers, counters, swap controls, and compact completion logging
- publishes each session to a stable Cloudflare Pages path with a QR code
- stores completed-session history locally for future planning

## Product Boundary

This repo is a generic training generator, not a single-condition product.

- reusable engine: `tools/`, `.codex/skills/`, config templates
- example content: `data/examples/`
- local user state: ignored files under `data/local/` or a configured state path
- generated artifacts: `output/`

The current example data in this repo comes from a rehab-oriented use case, but that is example input, not the public product identity.

## Quick Start

```bash
npm install
npm run init
```

Then:

```bash
npm test
npm run html:publish:dry-run -- --title "Smoke Session"
```

## Cloudflare Setup

This repo uses Cloudflare Pages Direct Upload with Wrangler.

1. Log in:

```bash
npx wrangler login
```

2. Create or reuse your Pages project:

```bash
npx wrangler pages project create
```

3. Save your project settings in `config/training-generator.local.json`.

4. Publish a rendered HTML file:

```bash
npm run html:publish -- --html-file /absolute/path/to/session.html
```

## Local Config

Copy the example config:

```bash
cp config/training-generator.example.json config/training-generator.local.json
```

Key fields:
- `pagesProject`: your Cloudflare Pages project name
- `pagesSection`: top-level route bucket, default `training`
- `pagesBaseUrl`: optional override for deterministic dry runs or custom domains
- `statePath`: optional local training-state file path

You can also use environment variables:
- `TRAINING_GENERATOR_CONFIG`
- `CLOUDFLARE_PAGES_PROJECT`
- `CLOUDFLARE_PAGES_BASE_URL`
- `TRAINING_GENERATOR_STATE_PATH`

## Core Commands

```bash
npm run init
npm test
npm run html:publish -- --html-file /absolute/path/to/session.html
npm run html:publish:dry-run -- --title "Smoke Session"
npm run plan:pdf -- --input /absolute/path/to/session.html --output /absolute/path/to/session.pdf
```

## Skills Workflow

Repo-local skills cover the main flow:
- generate a training session
- publish the resulting HTML to Cloudflare
- log a completed session
- bootstrap Cloudflare setup on a fresh machine

The intended operator flow is:
1. generate session JSON + HTML
2. publish to Cloudflare
3. open the session on phone
4. complete it and copy the compact `TL1` log
5. paste that log back into chat to update local state

## Verification

`npm test` is the baseline public verification path. It checks:
- public product surface
- config/init scaffolding
- publish dry-run behavior

It does not require:
- live AI access
- a real Cloudflare deploy
- a real training history file

## Limits

- This is a local-user workspace, not a hosted multi-user app.
- Cloudflare auth and Pages project ownership remain user responsibilities.
- AI-provider strategy is intentionally thin in this repo; the stable contract is the artifact flow, not one specific model vendor.
