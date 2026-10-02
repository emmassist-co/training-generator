import test from "node:test";
import assert from "node:assert/strict";
import { renderSessionPage } from "../../src/routes/session-page.mjs";

test("live session renderer uses TSX landmarks and one serialized runtime payload", () => {
  const html = renderSessionPage({
    id: "s<script>",
    profile_id: "alex",
    title: "Replay <Session>",
    status: "active",
    active_version: 1,
    summary: "Use the rich live page.",
    exercises: [{
      id: "ex-1",
      exercise_id: "Cable_Row",
      name: "Row <strong>",
      prescription: { sets: 3, reps: 10, load: "50 kg", rest_seconds: 75 },
      images: ["Cable_Row/0.jpg"],
      equipment: "cable",
      alternatives: ["Dumbbell Row"],
    }],
    events: [
      { id: "p1", type: "proposal_created", reason: "Machine busy", payload: { patch: { type: "replace_exercise", session_exercise_id: "ex-1", name: "Dumbbell Row" } }, created_at: "2026-01-01" },
    ],
  });

  assert.match(html, /^<!doctype html><html lang="en">/);
  assert.match(html, /<h1>Replay &lt;Session&gt;<\/h1>/);
  assert.match(html, /<h2>Row &lt;strong&gt;<\/h2>/);
  assert.match(html, /Log this set/);
  assert.match(html, /Reps done counter/);
  assert.match(html, /Load used counter/);
  assert.match(html, /Rest timer/);
  assert.match(html, /href="\/chat\?profile_id=alex&amp;session_id=s%3Cscript%3E"/);
  assert.match(html, /Pending coach changes/);
  assert.match(html, /Apply change/);
  assert.match(html, /window\.__LIVE_SESSION__ = /);
  assert.equal(html.match(/window\.__LIVE_SESSION__/g)?.length, 2);
});

test("completed live session renderer removes proposal writes and disables bottom actions", () => {
  const html = renderSessionPage({
    id: "s2",
    profile_id: "alex",
    title: "Completed",
    status: "completed",
    active_version: 1,
    exercises: [{ id: "ex-1", name: "Row", prescription: { sets: 3, reps: 10 } }],
    events: [
      { id: "p1", type: "proposal_created", reason: "Old proposal", payload: { patch: { type: "update_prescription", session_exercise_id: "ex-1", prescription: { reps: 12 } } }, created_at: "2026-01-01" },
    ],
  });

  assert.match(html, /completed sessions are read-only/);
  assert.match(html, /id="bottomAddSet" disabled/);
  assert.match(html, /id="bottomDone" disabled/);
  assert.doesNotMatch(html, />Apply change</);
  assert.match(html, /if \(session\.status === 'completed'\) return;/);
});
