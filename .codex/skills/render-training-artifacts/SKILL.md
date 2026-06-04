---
name: render-training-artifacts
description: Render existing training session JSON into phone-first HTML and optional PDF. Use when the user already has a session payload and wants artifacts without re-planning the workout.
---

# Render Training Artifacts

Use this skill when the session JSON already exists and the job is to turn it into artifacts.

Default outputs:
- HTML training page
- optional PDF export
- optional publish step after the user approves sharing

## Workflow

1. Confirm the source JSON path.

2. Render HTML:

```bash
npm run render:html -- --input /absolute/path/to/session.json --output /absolute/path/to/session.html
```

3. If the user wants PDF too:

```bash
npm run plan:pdf -- --input /absolute/path/to/session.html --output /absolute/path/to/session.pdf
```

4. If the user wants a public phone link, publish the HTML with the local publishing skill.

## Rules

- Do not redesign the session here. This skill is for artifact generation, not planning.
- Prefer readable output filenames that match the session title or day.
- Return local file links first. If published, also return the Cloudflare URL and QR path.
