# Training Generator Design

## Durable product principles

These rules apply across the product. Surface-specific briefs may add detail, but they should not weaken them.

- **Fast, calm, and direct:** show the next useful action without decorative noise.
- **Phone-first, not phone-only:** make touch use the baseline and give wider screens a deliberate layout.
- **One clear focus:** the main task must outrank navigation, status, and supporting detail.
- **State is explicit:** saving, success, failure, empty, disabled, and read-only states must be clear in words or form, not color alone.
- **Structured training data stays intact:** visual work must not blur prescribed values, actual results, notes, effort, proposals, or completion into display-only text.
- **Accessible by default:** support keyboard use, visible focus, readable contrast, reduced motion, zoom, safe areas, and at least 44 by 44 CSS-pixel touch targets.
- **Restraint over generic polish:** avoid decorative gradients, glow, repeated pills, and nested cards unless each use has a clear job.

## Chat-specific guidance

This section describes the current coach chat. It is not a shared visual system for every product surface.

### Structure

- Use a full-screen shell: the header and composer stay fixed while the message stream owns scrolling.
- Keep the header compact and the composer visible.
- Align user messages right on a stronger surface and coach messages left on a quieter surface.
- Keep message labels on one compact line above their content.
- Render coach Markdown rather than showing raw syntax.

### Interaction

- `Cmd/Ctrl + Enter` submits.
- `Cmd/Ctrl + K` focuses the prompt.
- `Esc` clears a prompt that has text.
- Disable send while the prompt is empty or a request is pending.
- Show request progress and timing in the transcript; show errors there rather than in browser alerts.

### Current chat treatment

The chat currently uses a dark training-room treatment, restrained borders, system sans type, and a green action accent. Those are chat implementation choices, not an approved live-session brand direction.

## Live-session-specific guidance

The live session has a separate, image-first design gate. Its visual direction is **not approved yet**, and production session UI must not change until the required mobile and desktop references receive approval.

The baseline brief in [`docs/design/live-session/visual-brief.md`](docs/design/live-session/visual-brief.md) defines:

- the observable Flue attributes that concepts must express;
- gym-use hierarchy and state priorities;
- patterns that reviewers should reject;
- stable renderer, runtime, request, replay, and read-only contracts;
- accessibility limits that the approved direction must meet.

The current dark, mint, rounded-card session is evidence to review, not the target system. Later work may reuse shared product principles, but it must derive live-session type, color, spacing, surfaces, imagery, icons, and motion from approved reference images rather than from this file.

## Shared anti-goals

- No generic purple AI gradients or arbitrary glow.
- No hidden loading, save, error, or read-only state.
- No full-page scroll fight inside an app shell.
- No visual reorder that changes the meaning or scope of a training write.
- No claim that a draft concept or current production treatment is approved brand direction.
