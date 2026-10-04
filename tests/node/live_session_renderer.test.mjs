import test from "node:test";
import assert from "node:assert/strict";
import { renderSessionPage } from "../../src/routes/session-page.mjs";

function occurrenceCount(text, token) {
  return text.split(token).length - 1;
}

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
      prescription: { sets: 3, reps: 10, load: "Set 1 at 50 kg if smooth, then keep knee calm and cap work conservatively.", rest_seconds: 75 },
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
  assert.match(html, /Log set/);
  assert.match(html, /Set 1 of 3/);
  assert.match(html, /Current set/);
  assert.doesNotMatch(html, /Reps done counter/);
  assert.doesNotMatch(html, /Load used counter/);
  assert.match(html, /Rest timer/);
  assert.match(html, /Plan note/);
  assert.match(html, /value="50 kg"/);
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
  assert.doesNotMatch(html, /id="bottomAddSet"/);
  assert.match(html, /id="bottomDone" disabled/);
  assert.doesNotMatch(html, />Apply change</);
  assert.match(html, /session\.status === 'completed'/);
});

test("live session renderer keeps current-set controls before optional media and details", () => {
  const html = renderSessionPage({
    id: "s3",
    profile_id: "alex",
    title: "Mobile Focus",
    status: "active",
    active_version: 1,
    exercises: [{
      id: "ex-1",
      exercise_id: "Cable_Row",
      name: "Cable Row",
      prescription: { sets: 3, reps: 10, load: "50 kg" },
      images: ["Cable_Row/0.jpg"],
      rationale: "Build posterior chain capacity.",
    }],
    events: [],
  });

  const statusIndex = html.indexOf('class="session-status-bar"');
  const contextIndex = html.indexOf('class="exercise-context"');
  const setIndex = html.indexOf('<section class="set-console"');
  const logIndex = html.indexOf('>Log set</button>');
  assert.ok(statusIndex < contextIndex);
  assert.ok(contextIndex < setIndex);
  assert.ok(setIndex < logIndex);
  assert.ok(setIndex < html.indexOf('<details class="details-panel"'));
  assert.ok(setIndex < html.indexOf("Build posterior chain capacity."));
  assert.match(html, /data-action-key="set:ex-1"/);
  assert.match(html, /data-current-set-label/);
  assert.match(html, /nextSetNumber/);
  assert.match(html, /All ' \+ totalSets \+ ' sets logged/);
  assert.match(html, /Add extra set/);
  assert.match(html, /const advanced = await markExercise/);
  assert.doesNotMatch(html, /id="bottomAddSet"/);
  assert.doesNotMatch(html, /querySelector\('#bottomAddSet'\)/);
  assert.doesNotMatch(html, /key \+ ':' \+ completed \+ ':'/);
  assert.match(html, /data-error/);
  assert.match(html, /rest-row/);
  assert.match(html, /timer-active/);
});

test("live session renderer keeps unique and repeated behavior hooks scoped", () => {
  const html = renderSessionPage({
    id: "hook-baseline",
    profile_id: "alex",
    title: "Hook baseline",
    status: "active",
    active_version: 4,
    exercises: [
      { id: "ex-a", name: "Cable Row", prescription: { sets: 3, reps: 10 } },
      { id: "ex-b", name: "Split Squat", prescription: { sets: 2, reps: 8 } },
    ],
    events: [
      { id: "proposal-a", type: "proposal_created", reason: "Station busy", payload: { patch: { type: "replace_exercise", session_exercise_id: "ex-a", name: "Dumbbell Row" } } },
      { id: "proposal-b", type: "proposal_created", reason: "Load unavailable", payload: { patch: { type: "update_prescription", session_exercise_id: "ex-b", prescription: { reps: 10 } } } },
    ],
  });
  const markup = html.slice(0, html.indexOf('<script type="module">'));

  for (const id of [
    "exerciseStage", "statusPill", "completedCount", "elapsedPill", "progressLabel",
    "progressPercent", "progressFill", "proposalPanel", "notes", "toast", "saveNote",
    "complete", "prevExercise", "bottomExerciseName", "bottomStatus", "nextExercise", "bottomDone",
  ]) {
    assert.equal(occurrenceCount(markup, `id="${id}"`), 1, `expected one #${id}`);
  }

  for (const hook of [
    "data-exercise-id", "data-current-set-label", "data-set-count", "data-reps", "data-load",
    "data-exercise-note", "data-error", "data-log-set", "data-done", "data-rest-row", "data-timer",
  ]) {
    assert.equal(occurrenceCount(markup, hook), 2, `expected ${hook} once per exercise`);
  }
  assert.equal(occurrenceCount(markup, "data-proposal-id"), 2);
  assert.equal(occurrenceCount(markup, "data-apply-proposal"), 2);
  assert.equal(occurrenceCount(markup, "data-reject-proposal"), 2);
  assert.equal(occurrenceCount(markup, "data-effort="), 3);

  const exerciseA = markup.match(/<article[^>]*data-exercise-id="ex-a"[\s\S]*?<\/article>/)?.[0] || "";
  const exerciseB = markup.match(/<article[^>]*data-exercise-id="ex-b"[\s\S]*?<\/article>/)?.[0] || "";
  assert.match(exerciseA, /data-action-key="set:ex-a"/);
  assert.match(exerciseA, /Log a set for Cable Row/);
  assert.doesNotMatch(exerciseA, /set:ex-b/);
  assert.match(exerciseB, /data-action-key="set:ex-b"/);
  assert.match(exerciseB, /Log a set for Split Squat/);
  assert.doesNotMatch(exerciseB, /set:ex-a/);
});

test("live session renderer has an empty workout state", () => {
  const html = renderSessionPage({ id: "empty", status: "active", active_version: 1, exercises: [] });
  assert.match(html, /No exercises in this session yet/);
  assert.doesNotMatch(html, /id="bottomAddSet"/);
  assert.match(html, /Ask coach/);
});

test("live session renderer labels extra sets after planned sets are logged", () => {
  const html = renderSessionPage({
    id: "s4",
    status: "active",
    active_version: 1,
    exercises: [{ id: "ex-1", name: "Row", prescription: { sets: 1, reps: 8 } }],
    events: [{ id: "set-1", type: "set_logged", payload: { session_exercise_id: "ex-1", reps: "8" } }],
  });

  assert.match(html, /All 1 sets logged/);
  assert.match(html, />Add extra set<\/button>/);
});
