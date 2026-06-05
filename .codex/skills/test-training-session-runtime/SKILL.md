---
name: test-training-session-runtime
description: Open a rendered or published training page and smoke-test the interactive workout runtime. Use when the user wants proof that counters, timers, swaps, completion, and copy behavior still work.
---

# Test Training Session Runtime

Use this skill when a training page needs an agent-operated runtime check.

Prefer the in-app browser when available.

## Workflow

1. Open the target HTML or URL.
2. Verify the main operator loop:
   - start session
   - jump to current exercise
   - complete and undo a set if the page is set-based
   - start and reset a timer if the page is time-based
   - swap an exercise and confirm the active card updates
   - mark an exercise done and confirm it collapses
   - reopen it and confirm it can be completed again
   - end training
   - copy the log or confirm the expected copy failure state on `file://`
   - when the log is available, confirm it now carries bounded telemetry in addition to the existing completion summary
3. Report only real observed behavior, not what the code suggests should happen.

## Rules

- If testing a `file://` page, clipboard failure is acceptable when the page reports it cleanly.
- If you find a runtime bug, fix it and rerun the smoke path before closing the task.
- Treat the rendered page as the truth surface, not the JSON or script source alone.
