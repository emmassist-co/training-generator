# Flue visual system

- **Status:** approved visual specification; mobile, desktop, and state references approved on 2026-10-04, extended product-wide on 2026-10-05
- **Direction:** Editorial Performance (Direction A)
- **Scope:** all hosted Flue surfaces. The approved live-session references remain the visual source; route-specific layouts adapt the same system without copying the workout composition.
- **Reference authority, in order after final approval:** `approved-mobile.png`, `approved-desktop.png`, `approved-states.png`; then the matching HTML for measured values; then `visual-brief.md` for behavior and accessibility constraints.
- **Content authority:** the references approve composition and treatment, not their sample exercise, prescription, guidance, notes, or status text. Runtime data and the view model remain authoritative.

### Product-wide surfaces

- Home, coach, history, and live sessions share one Hono JSX shell, wordmark, self-hosted type, color tokens, hairlines, focus treatment, and navigation behavior.
- Home uses exercise imagery as its main active-session field. It must keep a visible acid field and title if an image fails.
- History is a ruled editorial archive, not a stack of cards. Coach is a task rail plus one conversation scroll owner and one composer.
- Each route gets a distinct desktop and mobile composition. Do not stretch a phone layout or restore the former blue-card, mint-glass, gradient, pill, or broad-shadow treatments.
- Page structure belongs in TSX components. Browser behavior belongs in separate client modules; do not add new full-document HTML template strings.

## 1. System signature

Editorial Performance combines five cues: condensed athletic display type, a near-black editorial field, bone-white text, narrowly used acid lime, hairline rules, and an acid-lime exercise-image plate. The current-set logger is always the main task. Image, progress, prescription, recovery, and support regions reinforce it rather than compete with it.

### Wordmark

Use the approved uppercase `FLUE` lock-up, not plain body text:

- Barlow Condensed 800, bone white, uppercase, `-.045em` tracking.
- Mobile: `29px` type on `24px` line height. Desktop: `32px` type on `26px` line height.
- Build `FLU` plus a separately addressable final `E`. Skew the `E` `-9deg`, add `.035em` left space, cut its middle with a ground-color bar at `.32em`, `-.05em`, `.62em × 2px`, then draw the short bone-white bar at `.3em`, `.07em`, `.42em × 2px`, shifted `.12em` right.
- Keep the accessible name `Flue`. If shipped as SVG, expose one name and hide internal paths. Do not let fallback text expose a broken decorative `E`; use the approved vector lock-up until the font is ready.

The cut-and-skew `E`, condensed headings, lime image plate, and hairline composition form the identity. At least two must remain when the wordmark is absent.

## 2. Color and contrast

### Tokens

| Token | Value | Use |
| --- | --- | --- |
| `--ink` | `#f3f4ec` | Primary text, values, active controls |
| `--muted` | `#9a9d94` | Secondary copy, labels, helper text |
| `--dim` | `#666a63` | Inactive route data and nonessential marks; accessible component boundary where needed |
| `--ground` | `#10120f` | Page and control ground |
| `--surface` | `#171a16` | Hover or local state surface only; not a card layer |
| `--rule` | `#353932` | Decorative and grouping hairlines only |
| `--accent` | `#d9ff5a` | Primary set action, live marker, active rest, image plate, positive confirmation |
| `--accent-hover` | `#e2ff7a` | Pointer hover on the primary action |
| `--accent-ink` | `#10120f` | Text and icons on acid lime |
| `--danger` | `#ff806b` | Failed writes, errors, and pain selection |
| `--placeholder` | `#7b7f77` | Placeholder text on ground |

Acid lime is not decoration. Use it only for the active logging action, live/active state, positive confirmation, current movement tick, image treatment, and small factual progress cues. Danger is only for errors and pain. Use text, icon, shape, or placement with every state color.

### WCAG pairs

Ratios use WCAG relative luminance calculations for the exact hex values above.

| Pair | Ratio | Approved use |
| --- | ---: | --- |
| `ink` on `ground` | `17.00:1` | All text and icons |
| `ink` on `surface` | `15.86:1` | Text in a local hover/state surface |
| `muted` on `ground` | `6.84:1` | Normal secondary text |
| `muted` on `surface` | `6.38:1` | Normal secondary text |
| `placeholder` on `ground` | `4.61:1` | Placeholder text |
| `accent` on `ground` | `16.50:1` | Focus, live, active rest, positive marks |
| `accent` on `surface` | `15.39:1` | Accent state marks on surface |
| `accent-ink` on `accent` | `16.50:1` | Primary button copy and icon |
| `danger` on `ground` | `7.67:1` | Error text and mark |
| `danger` on `surface` | `7.15:1` | Error text and mark |
| `dim` on `ground` | `3.41:1` | Large text, inactive nonessential content, and non-text boundaries only |
| `dim` on `surface` | `3.18:1` | Non-text boundaries only |
| `rule` on `ground` | `1.60:1` | Decorative/grouping rules only; never the sole control boundary or state cue |

`dim` fails 4.5:1 for normal text. Production must promote essential inactive copy to `muted`. `rule` fails 3:1, so any boundary needed to identify a non-disabled control must use `dim`, `ink`, `accent`, or `danger` as appropriate. Disabled controls are exempt from contrast minimums but still need a text or icon cue.

## 3. Typography

### Families, weights, source, and loading

| Role | Family | Weights | Source and license | Fallback |
| --- | --- | --- | --- | --- |
| Display, values, labels, actions, wordmark | Barlow Condensed | 600, 700, 800 | Google Fonts upstream (`ofl/barlowcondensed`), SIL Open Font License 1.1 | `"Arial Narrow", sans-serif` |
| Body, helper text, notes | DM Sans | 400–600 | Google Fonts upstream (`ofl/dmsans`), SIL Open Font License 1.1 | `sans-serif` |

Self-host Latin-subset WOFF2 files and retain the OFL notices. The concept HTML embeds three static Barlow Condensed files and one DM Sans variable file with `font-display: block` for deterministic captures. Production must use `font-display: swap`, preload the display face used by the wordmark/first exercise heading, and avoid a Google Fonts runtime request. Use tabular numerals for timers, set values, progress counts, and route position.

Do not synthesize missing weights. If a production variable file replaces the three static Barlow files, pin the same 600/700/800 weights and verify line breaks against the references.

### Type scale

The references use a role-based scale rather than a single modular scale.

| Role | Mobile | Desktop | Family / weight |
| --- | --- | --- | --- |
| Exercise title | `53px`, `.76` line height, `-.05em` | `86px`, `.77`, `-.055em` | Barlow Condensed 700 |
| Compact state exercise title | `49px`, `.76` | — | Barlow Condensed 700 |
| Actual value | `53px`, `.68`, `-.04em` (`49px` in compact state sheets) | `68px/76px`, `-.045em` | Barlow Condensed 600 |
| Current-set title | `17px/20px`, `.11em` | `34px/34px`, `.035em` | Barlow Condensed 700 |
| Primary action | `20px`, `.075em` | `21px`, `.075em` | Barlow Condensed 800 |
| Section title | `17px/20px` | `20px`, `.08em` | Barlow Condensed 700 |
| Prescription value | `19px/24px` | `18px` | Barlow Condensed 600 |
| Timer | `18px`, `.04em` | `18px`, `.04em` | Barlow Condensed 600 |
| Wordmark | `29px/24px` | `32px/26px` | Barlow Condensed 800 |
| Icon glyph / arrow | `25px` | `24–25px` | Display or SVG equivalent |
| Status / position | `14px/16px` | `13–15px` | Barlow Condensed 600 |
| Labels / units / action suffix | `13–14px` | `12–15px` | Barlow Condensed 600 |
| Micro label | `10–11px`, `13–14px` line height | `11–12px`, `15–18px` | Display 600 or body 400 |
| Body / field copy | `13–14px` | `12–14px` | DM Sans 400–600 |

Display labels and actions are uppercase. Body copy uses sentence case. Tracking ranges from `.06em` to `.12em` for uppercase labels; do not apply this tracking to body copy. Long names and localized labels may wrap; never shrink below the listed text sizes to force a single line.

## 4. Spacing, rules, and shape

- Base unit: `4px`. Use `4px` for control gaps and optical separation, `8px` for the main rhythm, then `12`, `16`, `20`, `24`, `32`, and `40px` as composed multiples.
- Mobile outer rule: `20px` from each viewport edge. Use `max(20px, env(safe-area-inset-left/right))` where a device inset is larger.
- Desktop outer rule: `40px`. The approved masthead and workspace align to it.
- Mobile masthead: `76px`; bottom navigation: `68px`; main starts with `16px` block padding.
- Desktop masthead: `80px`; workspace starts `30px` below it and ends with `24px` bottom padding.
- Hairlines are `1px`. Use them to divide regions, rows, and values. Accent/progress ticks are `2px`. Error and read-only callouts use a `3px` left state bar plus hairlines.
- Default radius is `2px` for fields and buttons. Most editorial regions have no radius. The rotated `20–22px` square check and the `8px` live diamond are the signature shapes.
- Use inset lines for structure, not drop shadows. The primary button may keep its approved `2px` dark inset bottom edge. No ambient shadow, glow, glass, or gradient depth.
- Optical exceptions measured in the references—`10px` local gaps, `17px` progress spacing, and the desktop `30px` column gap—may remain. Do not create a second spacing system from them.

## 5. Exercise imagery

### Source and license

The approved reference is `yuhonas/free-exercise-db`, `Seated_Cable_Rows/0.jpg`, released under the Unlicense/public domain dedication. The HTML embeds an optimized `520 × 346` JPEG derivative (`27,868` bytes). Keep source, author/repository, file path, license, and derivative notes with every production asset. Do not treat generated exercise text or generated imagery as authoritative.

### Crop and treatment

- **Mobile:** plate `152px` high in the default reference (`136px` in compact state sheets). Media occupies the right `280px`; mask `polygon(14% 0, 100% 0, 100% 100%, 0 100%)`. Use `object-fit: cover`, `object-position: 34% 49%`, scale `1.14`.
- **Desktop:** plate `390px` high across the work column; mask `polygon(10% 0, 100% 0, 100% 100%, 0 100%)`. Use `object-position: 48% 47%`, scale `1.06`.
- Convert to acid-lime duotone by placing the image over `accent`, applying `grayscale(1) contrast(1.45) brightness(.88)` mobile or `contrast(1.5) brightness(.84)` desktop, `mix-blend-mode: multiply`, and opacity `.90` mobile / `.91` desktop.
- Overlay a `4px × 4px` halftone: ground at `.42` mobile or `.46` desktop from `0–1px`, transparent by `1.25px`. Add the approved ground fade: mobile `rgba(16,18,15,.7)` to transparent by `24%`; desktop `.92` at `0%`, `.66` at `23%`, transparent by `58%`, plus a bottom fade `.82` to transparent by `34%`.
- Add the right-edge registration mask: `16px` mobile / `18px` desktop, repeating ground stripes `2px` on / `6px` off, opacity `.70` / `.68`.
- Keep the exercise title above the image and the small ground-backed acid caption at its bottom-right. Media must not push the logger below the first useful view.

Art-direct each exercise crop. Do not rely on one global focal point. Store crop focal point and scale as asset metadata. Alt text must name the demonstrated movement/position without inventing coaching claims.

If an image fails, keep the plate height, diagonal mask, title, movement index, and caption position. Replace the image with the acid field plus halftone and visible `Image unavailable` text; keep the useful accessible label. Do not retry in a way that blocks fields or logging.

## 6. Icons

Use one small geometric outline set per surface:

- SVG uses `currentColor`, square or minimally rounded ends, no illustrative detail, and no independent shadows.
- Use `1.5px` strokes beside regular body text and `2px` beside semibold/bold display text.
- Standard visible size is `20–24px`; the containing target is at least `44 × 44px` mobile and `48 × 48px` in the approved desktop controls.
- Use arrows for previous/next and action direction, plus/minus for steppers, play/pause/reset for rest, a diamond check for saved/completed, a triangle/exclamation for error, and a square lock mark for read-only.
- Filled treatment is reserved for active state. Icons never replace nonstandard labels; icon-only controls require stable accessible names.
- The concept uses text glyphs for capture. Production may replace them with SVGs if their weight, optical position, and meaning match.

## 7. Controls and states

### Fields

- Default fields are integrated into ruled rows, not boxed cards. Background is transparent; value is `ink`; label is `muted`; note placeholder is `placeholder`.
- Numeric fields use large condensed tabular values. Reps and load stay in two columns divided by one vertical rule; units sit on the baseline. Steppers sit on the outer side of each value and keep a `44 × 44px` mobile or `48 × 48px` desktop target.
- Focus uses a `2px solid accent` outline, offset `2px` mobile / `3px` desktop. Focus must never be removed by the field's base `outline` reset.
- Invalid/error field state uses `danger` for its label/state mark and a danger underline or outline, plus local text. Keep the entered value in `ink`.
- Disabled fields show the saved value, a `Read-only` or `Unavailable` label, and a lock mark. Do not signal disabled state only with opacity.

### Buttons

- Primary set action: full work-column width, `56px` high (`54px` only in compact state sheets), acid fill, ground text, Barlow Condensed 800, action at left and set number/arrow at right.
- Pointer hover changes only the fill to `#e2ff7a`. Press scales mobile set/stepper/navigation controls to `.96`; the approved desktop reference uses `.97`. Keep feedback to `120ms ease` and transition only `transform`, `background-color`, or `color` as needed.
- Secondary actions are transparent with an `ink` or accessible `dim` boundary, explicit text, and no pill shape.
- Disabled buttons retain their label, replace the write verb where useful with `Unavailable` or `Read-only`, include a lock/status mark, use `dim` copy/boundary, and set `cursor: not-allowed`. They do not scale on press.

### Loading / pending

- Prevent duplicate writes immediately.
- Replace the action label with `Sending set…`; keep the set number; use `ink` fill with `ground` text.
- Add a `2px` pending line on `rule` with an `accent` segment occupying `45%`. Motion may slide this segment, but the text is the primary cue.
- Preserve reps, load, and note. Announce one polite saving status; do not move focus.

### Error

- Restore the action as an outlined `Try log set again` button.
- Place the error directly below it: subtle danger-tinted surface (`rgba(255,128,107,.055)`), `3px` danger left bar, triangle/exclamation mark, trace such as `Sending… → Not saved`, plain error title, and text confirming values remain.
- Use `role="alert"` only when the async failure appears. Global status may echo it but cannot replace this local message.

### Saved / post-log

- Place a rotated outlined diamond check next to `Set N saved` and the saved reps/load. Keep copy near the action.
- The next set number advances while the prescribed total stays fixed. A polite status announcement is enough; do not repeatedly announce the timer.

### Rest

- Idle rest shows `Rest`, the planned time, and a play control.
- Active rest adds the text `Running` in accent, a tabular countdown, and a pause control. Color is not the only cue.
- Reset remains labeled and at least `44 × 44px`. Never pulse the whole row.

### All planned sets / extra set

- Position copy becomes `All N logged`; logger heading becomes `Extra set`; helper says planned work is complete; primary action becomes `Add extra set`; suffix uses the next actual set number.
- Show the factual saved-set row and `Plan complete · N of N saved`. Never increase the prescribed total.

### Completed / read-only

- Header status changes from live diamond to outlined diamond check plus `Completed · duration`.
- Logger becomes `Set history` with visible `Read-only` text. Replace steppers and write fields with final values and lock marks. Render the note as `Saved note`, not an editable field.
- Remove or disable every set, note, timer, effort, proposal, and completion write. A ruled callout with accent left bar and diamond check reads `Session completed · Read-only` and explains that changes are unavailable.
- Non-mutating previous/next navigation may remain and is labeled `Review exercise`.

### Empty and selected effort states

- Empty optional notes keep their label and placeholder; empty saved-set/history regions use a plain ruled row such as `No sets logged yet`, not an empty card.
- A selected effort option uses an accessible `dim`/`ink` boundary, explicit selected text or check, and `aria-pressed`; pain uses `danger` plus the word `Pain` and a state mark. Selection is never color-only.

## 8. Responsive composition and scrolling

### Mobile shell: below `768px`

Use a `100dvh` three-row shell: `76px` masthead, one `minmax(0, 1fr)` main region, and `68px` exercise navigation. The main region is the only vertical scroll owner. At the approved `390px` width its normal content width is `350px`; at `320px`, use fluid `1fr 1px 1fr` metric columns rather than retaining the fixed `175/1/174px` capture columns.

Order is status, exercise position, image plate/title, prescription, current-set logger, local feedback/rest, then support content. The bottom row participates in grid layout; it is not a fixed overlay.

### Compact: `768px–1023px`

Keep `20px` outer rules. Use one page scroll owner and a composed two-region layout: route/progress is a horizontal header strip; current exercise and logger form the main region; prescription, media, details, proposals, and session finish follow in a secondary region. Do not center and stretch the phone capture.

### Desktop: `1024px` and above

Use the approved three-region composition with `40px` outer rules and `30px` gaps:

- left route: `220px`;
- center work: `minmax(0, 1fr)`;
- right context: `340px`.

At the `1440 × 1200` reference this leaves a `740px` center work region. Left holds route, factual progress, and bottom exercise navigation. Center holds the image plate and dominant set logger. Right holds prescription, media, details, then session finish anchored after support content. These are editorial regions split by rules, not equal dashboard cards.

The workspace is the only vertical scroll owner on short desktop viewports; columns move together. Do not create separate route, work, and context scrollbars.

### Safe area, keyboard, and zoom

- Include `viewport-fit=cover`; use `100dvh`; apply top/bottom safe-area padding to shell edges and `max(base outer rule, safe-area inset)` inline.
- When the on-screen keyboard contracts the visual viewport, the shell contracts with it. Keep the focused field in the main scroll owner using `scroll-padding-block`; do not translate or fix the logger over content. The bottom navigation may remain as the grid row only if it does not cover the focused field.
- At `200%` zoom and `320px` width, allow labels, long names, guidance, proposal reasons, units, and notes to wrap. No horizontal page scroll.

## 9. Motion

- Default interactive transition: `120ms ease`, limited to the exact properties that change. Never use `transition: all`.
- Press feedback is the approved `.96` mobile / `.97` desktop scale. Do not scale disabled controls or large layout regions.
- Pending-line motion, if used, is the only looping animation. Use a linear transform and keep `Sending set…` visible. Timers update text without pulsing.
- Saved, error, rest, selection, and completed states have static text/icon/shape cues; motion is never required to understand them.
- Do not animate first paint, viewport reflow, image crop, numeric value entry, or theme/color swaps.
- Under `prefers-reduced-motion: reduce`, remove looping and spatial motion, set scroll behavior to `auto`, and make state changes immediate. The capture HTML's `.01ms` transition override is acceptable; production may use `transition: none`.

## 10. Explicit anti-patterns

Do not ship:

- card-within-card hierarchy or rounded containers around every region;
- bordered metric tiles for simple prescription values;
- pills for labels, values, filters, saved sets, or most status;
- accent used as general decoration, or danger used for non-error emphasis;
- glows, glass blur, ornamental gradients, or ambient shadows;
- default system type in place of the deliberate condensed/body pairing;
- a marketing hero or media that delays the logger;
- a phone column stretched and centered on desktop;
- decorative or unlabeled nonstandard icons;
- disabled/completed state shown only by opacity;
- more than one primary write action for the active exercise;
- a planned-set total that grows when an extra set is logged;
- fixed controls covering content, multiple nested scroll owners, or horizontal page scroll;
- auto-playing exercise media, celebratory particles, points, streaks, trophies, or game HUD styling.

## 11. Implementation exceptions

The approved HTML files are capture fixtures, not production shell code:

1. Their fixed `390 × 844` and `1440 × 1200` canvases and `overflow: hidden` must become the responsive, scroll-safe rules above.
2. Their embedded data-URI fonts and `font-display: block` must become licensed self-hosted WOFF2 with `swap`.
3. Their embedded JPEG must become a cached production asset with retained attribution/license metadata and a real failure fallback.
4. `rule` and normal-size `dim` text in the captures do not meet the required WCAG ratios. Apply the contrast corrections in section 2 without changing the approved hierarchy.
5. Text glyph icons may become accessible SVGs. Preserve weight, geometry, target size, and labels.
6. The state fixture's `700ms` demo timeout only makes a screenshot. Runtime pending duration follows the request; never delay success or failure for visual timing.
7. Intermediate-width composition is not pictured. Use the compact rule above and do not infer new dashboard cards.
8. The reference's sample copy is not product content and must not enter production defaults.

## 12. Performance budget

- Fonts: at most `140KB` compressed total for the initial Latin subset. The fixture embeds `129,940` bytes across four WOFF2 files; production must not exceed the budget or make an external font request.
- Current exercise image: target `≤60KB` compressed on mobile and `≤100KB` on desktop; provide intrinsic dimensions, reserve plate space, use responsive AVIF/WebP with a JPEG fallback, and decode asynchronously. The approved derivative is `27,868` bytes.
- Initial visual-system CSS: `≤16KB` gzip. No CSS-in-JS runtime is needed for this treatment.
- Added JavaScript for visual effects: `0KB`; use CSS for the 120ms transitions and pending line. Do not add an animation or icon library solely for this screen.
- Preload only the critical display font and the current exercise image. Lazy-load later exercise media and video poster/content.
- Avoid filters on continuously changing layers. The duotone plate is static; pre-render a treated derivative if blend/filter paint cost causes missed frames on a mid-range phone.
- Performance target: no layout shift from fonts/media, primary logger usable before optional media finishes, and LCP within `2.5s` on a typical mobile connection.

## Source measurements

Measured values come from:

- `docs/design/live-session/concepts/direction-a.html` — mobile tokens, wordmark, 390px composition, fields, action, focus, press, image treatment, and reduced motion.
- `docs/design/live-session/concepts/approved-desktop.html` — 1440px three-region composition, 40px outer rule, desktop type, crop, controls, hover, and press.
- `docs/design/live-session/concepts/approved-states.html` — danger token and pending, error, saved, active-rest, extra-set, and completed/read-only treatments.
- `docs/design/live-session/approved-mobile.png`, `approved-desktop.png`, and `approved-states.png` — final visual authority.
- `docs/design/live-session/visual-brief.md` — hierarchy, anti-patterns, behavior, and accessibility constraints.
