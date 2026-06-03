---
name: publish-html-to-cloudflare
description: Publish a generated HTML page from this training-generator workspace to a Cloudflare Pages site and return a public URL. Use when the user wants an HTML artifact available at a link, especially under /training/YYYY-MM-DD-readable-slug-sortableid/.
---

# Publish HTML To Cloudflare

Use this skill when an HTML artifact from this repo should become a public URL on a Cloudflare Pages site.
Use it by default after a training plan is approved and should be easy to open on phone.

Default target:
- project: from config or env
- section: `training`
- URL shape: `https://<project>.pages.dev/training/YYYY-MM-DD-readable-slug-sortableid/`

Naming default:
- keep the session name or day in the URL
- prefer a short human-readable session title
- if the rendered HTML already has a good `<title>`, let that drive the slug

## Workflow

1. Make sure the HTML artifact already exists, or create it first.

Typical source:
- `/Users/alexandre/dev/acl/output/training-plans/<slug>.html`

2. Publish it with the repo helper:

```bash
cd /Users/alexandre/dev/acl
npm run html:publish -- --html-file /absolute/path/to/file.html
```

3. If the user wants a specific path, pass it explicitly:

```bash
cd /Users/alexandre/dev/acl
npm run html:publish -- --path session-a1b2c3 --html-file /absolute/path/to/file.html
```

4. Read the JSON output and return:
- the public `pageUrl`
- the local `qrCodePath` image for the user to scan

5. In the final response, prefer:
- the Cloudflare `pageUrl` first,
- the local QR image rendered in markdown when useful.

## Rules

- Prefer the default generated path unless the user asks for a specific slug or full path.
- The default path should stay date-first and sortable, with a readable slug and a time-sortable id suffix.
- When publishing a training plan HTML file, preserve the session or day name in the slug by default.
- Prefer the HTML `<title>` as the slug source, then fall back to the source filename if needed.
- Avoid generic fallback names like `generated-page` or `session` when a session/day name is available.
- If needed, pass `--title` so the published path stays readable.
- Keep the default section as `training` unless the user explicitly wants another top-level bucket.
- Return the stable path URL (`pageUrl`), not just the raw deployment URL.
- Return the QR code image path along with the URL when publishing a training page.
- Do not create a new Cloudflare Pages project for routine publishes unless the user is explicitly bootstrapping a fresh account.
- Do not switch back to preview-subdomain publishing unless the user explicitly asks for isolated preview URLs.

## Notes

- The helper script updates the shared site tree at `/Users/alexandre/dev/acl/output/cloudflare-pages/site`.
- Publishing redeploys the production Pages site so older `/training/<id>/` pages stay available.
- The site index is at the configured base URL root.
- The helper writes the QR code image into the published page directory as `qr.png`.

## Troubleshooting

- If publish fails, rerun:

```bash
cd /Users/alexandre/dev/acl
npx wrangler whoami
```

- If auth is missing, log in with Wrangler before retrying.
- If the path is malformed, use only lowercase letters, numbers, hyphens, or underscores.
