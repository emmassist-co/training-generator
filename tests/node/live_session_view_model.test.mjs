import test from "node:test";
import assert from "node:assert/strict";
import { buildLiveSessionViewModel } from "../../src/session/live-session-view-model.mjs";

test("live session view model derives replayed state and media safely", () => {
  const model = buildLiveSessionViewModel({
    id: "s<script>",
    profile_id: "alex",
    title: "Lift <Heavy>",
    status: "active",
    active_version: 3,
    exercises: [
      {
        id: "ex-1",
        exercise_id: "Cable Row/Alt",
        name: "Cable Row",
        prescription: { sets: 3, reps: 10, load: "50 kg", rest_seconds: 75 },
        images: ["Cable_Row/0.jpg"],
        alternatives: [{ name: "Dumbbell Row" }],
      },
      {
        id: "ex-2",
        exercise_id: "Hamstring Curl",
        name: "Hamstring Curl",
        prescription: { duration: "45s", rest: "60s" },
      },
    ],
    events: [
      { id: "done-1", type: "exercise_completion_updated", payload: { session_exercise_id: "ex-1", completed: true }, created_at: "2026-01-01T00:00:00Z" },
      { id: "note-1", type: "note_added", payload: { note: "First note" }, created_at: "2026-01-01T00:01:00Z" },
      { id: "note-2", type: "note_added", payload: { note: "Latest note" }, created_at: "2026-01-01T00:02:00Z" },
      { id: "set-1", type: "set_logged", payload: { session_exercise_id: "ex-1", reps: "10", load: "50" }, created_at: "2026-01-01T00:03:00Z" },
      { id: "p-1", type: "proposal_created", reason: "Machine busy", payload: { patch: { type: "replace_exercise", session_exercise_id: "ex-1", name: "Dumbbell Row" } }, created_at: "2026-01-01T00:04:00Z" },
      { id: "p-2", type: "proposal_created", payload: { patch: { type: "update_prescription", session_exercise_id: "ex-2", prescription: { reps: 12 } } }, created_at: "2026-01-01T00:05:00Z" },
      { id: "accept-2", type: "proposal_accepted", payload: { proposal_id: "p-2" }, created_at: "2026-01-01T00:06:00Z" },
    ],
  });

  assert.equal(model.session.title, "Lift <Heavy>");
  assert.equal(model.session.is_completed, false);
  assert.equal(model.progress.completed_count, 1);
  assert.deepEqual(model.progress.completed_exercise_ids, ["ex-1"]);
  assert.equal(model.notes.latest, "Latest note");
  assert.equal(model.proposals.length, 1);
  assert.equal(model.proposals[0].id, "p-1");
  assert.equal(model.exercises[0].prescription_text, "3 sets · 10 reps · 50 kg · 75s rest");
  assert.deepEqual(model.exercises[0].metrics.map((metric) => metric.key), ["sets", "reps", "load", "rest"]);
  assert.equal(model.exercises[0].logged_set_count, 1);
  assert.equal(model.exercises[0].media.image, "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cable_Row/0.jpg");
  assert.equal(model.exercises[1].media.image, "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Hamstring%20Curl/0.jpg");
});

test("live session view model marks completed sessions read-only", () => {
  const model = buildLiveSessionViewModel({ id: "s2", status: "completed", exercises: [] });
  assert.equal(model.session.is_completed, true);
  assert.equal(model.session.profile_id, "default");
  assert.equal(model.progress.exercise_count, 0);
});
