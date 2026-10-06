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
      images: ["Cable_Row/0.jpg", "Cable_Row/1.jpg"],
      equipment: "cable",
      muscles: ["middle back", "biceps"],
      instructions: ["Sit tall and brace your feet.", "Pull toward your lower ribs."],
      rationale: "Keep your torso still.",
      alternatives: ["Dumbbell Row"],
    }],
    events: [
      { id: "p1", type: "proposal_created", reason: "Machine busy", payload: { patch: { type: "replace_exercise", session_exercise_id: "ex-1", name: "Dumbbell Row" } }, created_at: "2026-01-01" },
    ],
  });

  assert.match(html, /^<!doctype html><html lang="en">/);
  assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"\/>/);
  assert.match(html, /rel="preload" href="\/fonts\/barlow-condensed-700\.woff2"/);
  assert.match(html, /aria-label="Flue"/);
  assert.match(html, /class="session-shell"/);
  assert.match(html, /class="workspace-scroll"/);
  assert.match(html, /<h1>Replay &lt;Session&gt;<\/h1>/);
  assert.match(html, /<h2>Row &lt;strong&gt;<\/h2>/);
  assert.match(html, /Log set/);
  assert.match(html, /Set 1 of 3/);
  assert.match(html, /Current set/);
  assert.doesNotMatch(html, /Reps done counter/);
  assert.doesNotMatch(html, /Load used counter/);
  assert.match(html, />Rest /);
  assert.match(html, /class="plan-copy"/);
  assert.match(html, /Exercise guide/);
  assert.match(html, /How to do it/);
  assert.match(html, /Pay attention/);
  assert.match(html, /Target areas/);
  assert.match(html, /middle back · biceps/);
  assert.match(html, /Form reference/);
  assert.match(html, /Step 1 of 2/);
  assert.match(html, /Cable_Row\/1\.jpg/);
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

  const markup = html.slice(html.indexOf("<body>"), html.indexOf('<script type="module">'));
  assert.match(markup, /Session completed · Read-only/);
  assert.match(markup, /Review exercise/);
  assert.doesNotMatch(markup, /data-log-set/);
  assert.doesNotMatch(markup, /data-done/);
  assert.doesNotMatch(markup, /data-action="toggle-timer"/);
  assert.doesNotMatch(markup, /data-effort=/);
  assert.doesNotMatch(markup, /id="saveNote"/);
  assert.doesNotMatch(markup, /id="complete"/);
  assert.doesNotMatch(markup, />Apply change</);
  assert.match(markup, /id="nextExercise"/);
  assert.doesNotMatch(markup, /id="nextExercise" disabled/);
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

  const markup = html.slice(html.indexOf("<body>"), html.indexOf('<script type="module">'));
  const statusIndex = markup.indexOf('class="masthead session-status-bar"');
  const contextIndex = markup.indexOf('class="exercise-position"');
  const setIndex = markup.indexOf('<section class="set-console');
  const logIndex = markup.indexOf('>Log set</span>');
  assert.ok(statusIndex < contextIndex);
  assert.ok(contextIndex < setIndex);
  assert.ok(setIndex < logIndex);
  assert.ok(setIndex < markup.indexOf('<section class="context-region'));
  assert.ok(setIndex < markup.indexOf("Build posterior chain capacity."));
  assert.match(html, /data-action-key="set:ex-1"/);
  assert.match(html, /data-current-set-label/);
  assert.match(html, /nextSetNumber/);
  assert.match(html, /All ' \+ totalSets \+ ' logged/);
  assert.match(html, /Add extra set/);
  assert.match(html, /markExercise\(card/);
  assert.doesNotMatch(html, /id="bottomAddSet"/);
  assert.doesNotMatch(html, /querySelector\('#bottomAddSet'\)/);
  assert.doesNotMatch(html, /key \+ ':' \+ completed \+ ':'/);
  assert.match(html, /data-error[^>]*role="alert"/);
  assert.match(html, /data-set-feedback[^>]*role="status"/);
  assert.match(html, /data-pending-line/);
  assert.match(html, /rest-row/);
  assert.match(html, /timer-active/);
  assert.equal(occurrenceCount(markup, "data-log-set"), 1);
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
  const markup = html.slice(html.indexOf("<body>"), html.indexOf('<script type="module">'));

  for (const id of [
    "exerciseStage", "statusPill", "completedCount", "elapsedPill", "progressLabel",
    "progressPercent", "progressFill", "proposalPanel", "notes", "toast", "saveNote",
    "complete", "prevExercise", "bottomExerciseName", "bottomStatus", "nextExercise",
  ]) {
    assert.equal(occurrenceCount(markup, `id="${id}"`), 1, `expected one #${id}`);
  }

  for (const hook of [
    "data-exercise-id", "data-current-set-label", "data-set-count", "data-reps", "data-load",
    "data-exercise-note", "data-error", "data-log-set", "data-done", "data-rest-row", "data-timer",
  ]) {
    const token = hook === "data-timer" || hook === "data-error" ? `${hook}=` : hook;
    assert.equal(occurrenceCount(markup, token), 2, `expected ${hook} once per exercise`);
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
  assert.match(html, /class="empty-session/);
  assert.match(html, /Ask coach/);
});

test("live session renderer handles missing prescription, long copy, and media fallback", () => {
  const html = renderSessionPage({
    id: "edge-cases",
    status: "active",
    active_version: 1,
    exercises: [{
      id: "ex-missing",
      name: "A deliberately long movement name that must wrap without changing the data",
      prescription: {},
      rationale: "Long guidance remains available and wraps in the support region without moving the logger out of semantic order. ".repeat(4),
    }, {
      id: "ex-media",
      name: "Row",
      images: ["missing/0.jpg"],
      prescription: { reps: 8 },
    }],
    events: [],
  });
  const markup = html.slice(html.indexOf("<body>"), html.indexOf('<script type="module">'));

  assert.match(markup, /Prescription details unavailable/);
  assert.match(markup, /A deliberately long movement name/);
  assert.match(markup, /Long guidance remains available/);
  assert.match(markup, /Image unavailable/);
  assert.match(markup, /class=&quot;fallback&quot;|classList\.add\(&#39;fallback&#39;\)/);
  assert.equal(occurrenceCount(markup, "data-log-set"), 2);
});

test("live session renderer labels extra sets after planned sets are logged", () => {
  const html = renderSessionPage({
    id: "s4",
    status: "active",
    active_version: 1,
    exercises: [{ id: "ex-1", name: "Row", prescription: { sets: 1, reps: 8 } }],
    events: [{ id: "set-1", type: "set_logged", payload: { session_exercise_id: "ex-1", reps: "8" } }],
  });

  assert.match(html, /All 1 logged/);
  assert.match(html, /data-set-total="1"/);
  assert.match(html, />Add extra set<\/span>/);
  const markup = html.slice(html.indexOf("<body>"), html.indexOf('<script type="module">'));
  assert.equal(occurrenceCount(markup, "data-log-set"), 1);
});
