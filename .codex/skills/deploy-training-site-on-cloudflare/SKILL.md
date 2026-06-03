---
name: deploy-training-site-on-cloudflare
description: Set up this training-generator workspace on a new computer for Cloudflare Pages publishing, including local install, Wrangler auth, Pages project creation or reuse, and first deploy verification. Use when the user wants the operator to connect Cloudflare and make publishing work on a fresh machine.
---

# Deploy Training Site On Cloudflare

Use this skill when this repo needs to be made deployable from a new computer, not just when publishing one already-generated page.

If the session has the `cloudflare` or `wrangler` skills available, open them first for current CLI and platform truth. Use this skill as the repo-specific runbook.

Default target:
- Pages project: user-owned and defined in local config
- page URL shape: `https://<project>.pages.dev/training/YYYY-MM-DD-readable-slug-sortableid/`

## Goal

By the end:
- local dependencies are installed,
- Wrangler is authenticated,
- the configured Pages project exists or is reused,
- `npm run html:publish` works from this repo,
- a real public URL and QR image path have been returned.

## Workflow

1. Bootstrap the repo:

```bash
cd /Users/alexandre/dev/acl
npm install
```

2. Verify Wrangler is callable:

```bash
cd /Users/alexandre/dev/acl
npx wrangler --version
```

3. Check Cloudflare auth:

```bash
cd /Users/alexandre/dev/acl
npx wrangler whoami
```

4. If not authenticated, log in:

```bash
cd /Users/alexandre/dev/acl
npx wrangler login
```

5. Check whether the Pages project already exists:

```bash
cd /Users/alexandre/dev/acl
npx wrangler pages project list --json
```

6. If the configured project does not exist, create it:

```bash
cd /Users/alexandre/dev/acl
npx wrangler pages project create <your-project-name> --production-branch main
```

7. Verify the local publisher wiring:

```bash
cd /Users/alexandre/dev/acl
npm run html:publish -- --dry-run
```

8. Do a real smoke deploy:

```bash
cd /Users/alexandre/dev/acl
npm run html:publish -- --title "Smoke Test"
```

9. Return the stable `pageUrl` and local `qrCodePath` from the JSON output.

## Rules

- Reuse the user's configured Pages project when it already exists.
- Do not create a new Pages project just because the deploy is happening from a different computer.
- Prefer the repo helper over handwritten Wrangler deploy commands for routine publishing.
- Return `pageUrl` and `qrCodePath`, not only `deploymentUrl`.
- If Cloudflare auth or project state differs from this skill, trust live Wrangler output over static assumptions.

## Repo Facts

- Publisher entrypoint: `/Users/alexandre/dev/acl/tools/publish_html_to_cloudflare.mjs`
- NPM command: `npm run html:publish`
- Shared site tree: `/Users/alexandre/dev/acl/output/cloudflare-pages/site`
- Local publishing skill: `/Users/alexandre/dev/acl/.codex/skills/publish-html-to-cloudflare/SKILL.md`

## Troubleshooting

- If `whoami` fails, fix auth before doing anything else.
- If `pages project list` shows a different production domain than local config expects, use the live domain.
- If `npm run html:publish -- --dry-run` fails, fix the local repo or Node setup before touching Cloudflare state.
- If a path slug is invalid, use lowercase letters, numbers, hyphens, or underscores.
