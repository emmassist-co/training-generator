# PR 2 hosted home loop proof

This folder contains agent-browser proof from the deployed Worker after applying D1 migration `0004_profile_learning.sql` and deploying Worker version `e87e6a32-0ed3-4ec2-a0af-6f682e4c208c`.

Evidence:
- `01-home.png`: protected `/` training home with D1-backed active/planned session.
- `02-session-before.png`: live `/sessions/:id` page.
- `03-session-logged.png`: exercise completion, set log, effort flag, and note saved.
- `04-session-completed.png`: session completed from browser UI.
- `05-history.png`: `/history` shows completed session.
- `08-chat-session-events.png`: coach reads completed session event types.
- `09-chat-count.png`: coach reads completed session status and event count.
- `live-home-loop.webm`: browser video for home → session → log → complete → history.
- `chat-session-events.webm`: browser video for coach reading hosted D1 session state.
- `browser-errors.txt`, `chat-browser-errors.txt`: captured agent-browser page errors. Empty means no page errors were reported.

D1 verification also confirmed these session events: `session_started`, `exercise_completion_updated`, `set_logged`, `effort_flag_logged`, `note_added`, `session_completed`.
