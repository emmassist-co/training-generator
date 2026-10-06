# Live-session reference comparison

- **Status:** local implementation proof complete
- **Reference approval:** mobile, desktop, and state references approved on 2026-10-04
- **Build under review:** `5424164` plus the U5 proof corrections listed below
- **Production:** not deployed; these captures use generated local fixtures and intercepted local requests only

## Active session

| View | Approved reference | Local implementation |
| --- | --- | --- |
| Mobile · 390 × 844 | [approved-mobile.png](./approved-mobile.png) | [active-mobile-390x844.png](./implementation/active-mobile-390x844.png) |
| Desktop · 1440 × 1200 | [approved-desktop.png](./approved-desktop.png) | [active-desktop-1440x1200.png](./implementation/active-desktop-1440x1200.png) |

The build preserves the approved signature: condensed display type, near-black field, acid-lime image plate and one primary action, hairline structure, fixed mobile shell, and the desktop route/work/context composition. Runtime copy and exercise data differ from concept copy by design; `visual-system.md` names runtime data as the content authority.

## State proof

Approved state authority: [approved-states.png](./approved-states.png)

| State | Local implementation capture | Result |
| --- | --- | --- |
| Set saved and active rest | [post-log-active-rest-mobile.png](./implementation/post-log-active-rest-mobile.png) | Matches the saved diamond, local status, running text, timer, and pause behavior. |
| Planned sets complete / extra set | [extra-set-mobile.png](./implementation/extra-set-mobile.png) | Keeps the prescribed total fixed and changes the action to `Add extra set`. |
| Pending / loading / disabled | [pending-mobile.png](./implementation/pending-mobile.png) | Keeps values, disables the one write action, shows `Sending set…`, and exposes a restrained progress line. |
| Error with retained values | [error-values-kept-mobile.png](./implementation/error-values-kept-mobile.png) | Restores an outlined retry action and places an announced danger callout next to it. |
| Completed / read-only | [completed-read-only-mobile.png](./implementation/completed-read-only-mobile.png) | Replaces write fields with saved values and locks while review navigation remains available. |
| Empty session | [empty-mobile.png](./implementation/empty-mobile.png) | Uses one plain editorial empty region and a coach route rather than an empty card. |
| Long name and guidance | [long-copy-mobile.png](./implementation/long-copy-mobile.png) | Long title uses a taller image plate, metrics reflow to their actual count, and support copy wraps. |
| Exercise guide | [exercise-guide-mobile.png](./implementation/exercise-guide-mobile.png) | Shows equipment, target areas, ordered setup cues, points to watch, extra form images, and swap ideas below the logger. |

## Automated browser matrix

Run the checks without changing tracked captures:

```sh
node --import tsx --test tests/node/live_session_visual.test.mjs
```

Refresh the reviewed captures only when the visual change is intentional:

```sh
UPDATE_VISUALS=1 node --import tsx --test tests/node/live_session_visual.test.mjs
```

The deterministic test:

- serves Hono JSX output directly and intercepts every asset and API request;
- uses the approved public-domain exercise-image derivative and local licensed fonts;
- fails on uncaught page errors or console errors;
- checks 320 × 568, 390 × 844, 430 × 932, and 1440 × 1200;
- checks horizontal overflow, shell/navigation overlap, primary-action reachability, the exact 220/740/340 desktop columns, and all visible enabled targets at 44 × 44 CSS pixels or larger;
- checks primary, secondary, placeholder, primary-action, and focus-indicator contrast against the WCAG thresholds in `visual-system.md`;
- checks the primary mobile focus path, desktop route focus order, and the visible 2px acid focus outline;
- checks reduced motion with Playwright's `reducedMotion: "reduce"` emulation;
- uses a nonzero safe-area proxy by applying 24px top, 32px left, 28px right, and 18px bottom insets to the same shell regions that consume `env(safe-area-inset-*)` in production, then reruns overlap and reachability checks;
- uses a 200% zoom proxy with the long-name and verbose-guidance fixture by applying `html { zoom: 2 }` to a 640 × 1136 viewport, which gives the mobile flow a 320 × 568 effective visual area; this checks CSS reflow, action reachability, and clipping, not operating-system magnification;
- uses a keyboard-height proxy by focusing the set-note field and contracting the viewport from 390 × 844 to 390 × 520; it does not claim that desktop Chromium opened a mobile keyboard;
- executes post-log/rest, extra-set, pending, error, completed/read-only, empty, and long-copy fixtures without production state.

## Deviation log

| Observation | Impact | Disposition |
| --- | --- | --- |
| Long exercise names collided with the media caption and could clip inside the default 152px plate. | High for affected exercise names. | **Corrected.** Names over 24 characters use the same treatment on a 216px mobile plate; the test asserts title/caption separation. |
| A prescription with only two visible metrics retained a three-column grid, making verbose reps collide with rest. | High for long or missing prescription values. | **Corrected.** The strip now uses the count of visible metrics and allows mobile values to wrap. |
| Post-log feedback updated while the saved-set row still said `No sets logged yet`. | High because the state contradicted the stored action. | **Corrected.** A successful log now appends the structured set summary in place before rest starts; browser tests assert the stale empty copy is gone. |
| Completed and resumed sessions showed `00:00` instead of persisted elapsed time. | Medium because the status line lost useful review context. | **Corrected.** The view model derives elapsed seconds from persisted timestamps and the completed capture shows `42:06`. |
| Inactive desktop route labels used the low-contrast decorative tone. | Medium for route scanning. | **Corrected.** Route names and set details use the AA body-muted tone, with desktop contrast checks. |
| Actual-reps defaults can contain a longer text prescription such as `8–12 each side`. | Medium. | **Corrected for layout.** The integrated input keeps its full value and uses a compact value size instead of widening the page; native input scrolling preserves the full editable text. |
| Concept fixtures use fixed sample content while the build shows runtime feedback, saved-set, and support copy. | Low; no visual-system change. | **Expected.** The approved content-authority rule requires runtime data and existing contracts to win. |
| The state board compresses several states into one presentation sheet; production captures show each state at the full 390 × 844 viewport. | Low; proof is more legible. | **Expected.** Treatment, hierarchy, color, and status cues match; geometry follows the approved responsive shell. |
| Production exercise photos still come from the existing catalog URL rather than a new bundled responsive-image pipeline. | No current composition mismatch; possible network/performance risk. | **Open non-visual follow-up.** The fallback is tested and keeps the approved plate. Asset delivery can move behind a cache without changing markup or session data. |

No unexplained high-impact visual deviation remains in the local captures. The remaining image-delivery note does not block visual review, but it should stay visible in rollout checks.
