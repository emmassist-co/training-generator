# Training Generator Workspace

This repo is a reusable training-generator workspace.

## Purpose

Use this repo to:
- generate structured training sessions with AI,
- render them into phone-first HTML,
- publish them to a user-owned Cloudflare Pages site,
- copy back compact training logs for local history.

This repo is not limited to any one rehab or sport context. Specific training constraints should live in local state or profile packs, not in the repo identity.

## Behavior

- Be sharp, short, and practical.
- Prefer product-generic wording in public files, skills, and generated defaults.
- Treat local profile/state as user-owned data, not repo truth.
- Prefer repo-local skills over machine-global setup.
- Keep generated artifacts out of broad edits unless the task explicitly needs regeneration.

## Product Rules

- The public identity is `training generator`, `training session`, `publish`, and `log`.
- Do not present one injury context, rehab track, or one operator's body history as the default product story.
- If a workflow depends on profile-specific constraints, name them as an example pack or local configuration.
- Prefer stable deterministic local verification paths before live AI or live Cloudflare operations.

## Implementation Rules

- Prefer clear, easy-to-reason code over cleverness.
- Keep Cloudflare configuration user-owned and externalized.
- Preserve the mobile session runtime unless there is a clear UX or product reason to change it.
- Keep copied training logs compact and machine-friendly.
