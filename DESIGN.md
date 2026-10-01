# Training Coach Design

## Design read

A hosted training agent for daily use: fast, calm, and direct. It should feel like a focused command room, not a marketing page.

## Product feel

- **Full-screen app shell**: header and composer stay fixed; only the message stream scrolls.
- **Dark training room**: near-black surfaces, quiet grid glow, green action accent.
- **Coach-first chat**: readable bubbles, clear state, no decorative clutter.
- **Keyboard-native**: `Cmd/Ctrl + Enter` sends, `Cmd/Ctrl + K` focuses the prompt, `Esc` clears the prompt.
- **Phone-first**: thumb-safe controls, no page scroll fights, composer always visible.

## Visual language

- Background: deep charcoal with soft green radial light.
- Surfaces: glassy black panels with restrained borders, not heavy cards.
- Accent: mint green for selected profile, send state, and live status only.
- Type: system sans for speed and native feel; compact labels in uppercase.
- Radius: large shell radius, medium message radius, pill controls.

## Layout rules

1. `html` and `body` do not scroll.
2. `main` fills `100dvh`.
3. Header is compact and never consumes workout space.
4. Message stream owns overflow and scroll position.
5. Composer stays visible at the bottom.
6. Mobile keeps the same structure with tighter padding.

## Message rules

- User messages align right with a stronger surface.
- Coach messages align left with a softer surface.
- Message labels stay on one compact line above content.
- Markdown renders for coach replies: bold, inline code, links, lists, quotes, and fenced code.
- Loading shows a temporary working bubble plus status timing.

## Interaction rules

- `Cmd/Ctrl + Enter`: submit.
- `Cmd/Ctrl + K`: focus prompt.
- `Esc`: clear prompt when it has text.
- Send button disables while empty or while waiting.
- Status shows `thinking · Ns` during long requests.
- Errors render in the transcript, not as browser alerts.

## Anti-goals

- No generic purple AI gradients.
- No full-page scroll.
- No hidden loading state.
- No stacked blank lines between label and message.
- No markdown shown as raw syntax when it should render.
