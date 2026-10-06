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
        prescription: { sets: 3, reps: 10, load: "Set 1 at 50 kg if smooth, then keep knee calm and cap work conservatively.", rest_seconds: 75 },
        images: ["Cable_Row/0.jpg", "Cable_Row/1.jpg", "Cable_Row/1.jpg"],
        equipment: "cable",
        muscles: ["middle back", "biceps"],
        instructions: ["Sit tall with the feet braced.", "Pull the handle toward the lower ribs."],
        rationale: "Build controlled pulling strength.",
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
      { id: "set-1", type: "set_logged", payload: { session_exercise_id: "ex-1", set_number: 1, reps: "10", load: "50", note: "Keep ribs down" }, created_at: "2026-01-01T00:03:00Z" },
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
  assert.deepEqual(model.exercises[0].prescription_notes, ["Set 1 at 50 kg if smooth, then keep knee calm and cap work conservatively."]);
  assert.deepEqual(model.exercises[0].metrics.map((metric) => metric.key), ["sets", "reps", "load", "rest"]);
  assert.equal(model.exercises[0].metrics.find((metric) => metric.key === "load").value, "50 kg");
  assert.equal(model.exercises[0].input_load, "50");
  assert.equal(model.exercises[0].logged_set_count, 1);
  assert.equal(model.exercises[0].current_set.number, 2);
  assert.equal(model.exercises[0].current_set.total, 3);
  assert.equal(model.exercises[0].current_set.label, "Set 2 of 3");
  assert.equal(model.exercises[0].current_set.position_label, "Set 2 of 3");
  assert.equal(model.exercises[0].current_set.primary_action_label, "Log set");
  assert.equal(model.exercises[0].current_set.planned_set_total, 3);
  assert.equal(model.exercises[0].current_set.target_reps, 10);
  assert.equal(model.exercises[0].current_set.target_load, "50 kg");
  assert.deepEqual(model.exercises[0].saved_sets, [{ reps: "10", load: "50", note: "Keep ribs down", label: "Set 1" }]);
  assert.deepEqual(model.runtime.session.set_logs, [{
    id: "set-1",
    session_exercise_id: "ex-1",
    set_number: 1,
    reps: "10",
    load: "50",
    note: "Keep ribs down",
    created_at: "2026-01-01T00:03:00Z",
  }]);
  assert.equal(model.exercises[0].plan_note.compact, "Set 1 at 50 kg if smooth, then keep knee calm and cap work conservatively.");
  assert.equal(model.exercises[0].media.image, "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cable_Row/0.jpg");
  assert.deepEqual(model.exercises[0].media.gallery, [
    "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cable_Row/0.jpg",
    "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cable_Row/1.jpg",
  ]);
  assert.deepEqual(model.exercises[0].guidance, {
    equipment: "cable",
    target_areas: ["middle back", "biceps"],
    muscle_map: {
      groups: ["middle back", "biceps"],
      front_ids: ["biceps-left", "biceps-right"],
      back_ids: ["traps-mid-left", "traps-lower-left", "traps-mid-right", "traps-lower-right", "lats-upper-left", "lats-mid-left", "lats-upper-right", "lats-mid-right"],
      unmapped: [],
    },
    instructions: ["Sit tall with the feet braced.", "Pull the handle toward the lower ribs."],
    attention: ["Set 1 at 50 kg if smooth, then keep knee calm and cap work conservatively."],
    rationale: "Build controlled pulling strength.",
  });
  assert.equal(model.exercises[1].media.image, "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Hamstring%20Curl/0.jpg");
});

test("live session view model uses the exercise rationale as attention guidance for a standard load", () => {
  const model = buildLiveSessionViewModel({
    id: "standard-guidance",
    status: "active",
    exercises: [{
      id: "ex-1",
      name: "Cable Row",
      prescription: { sets: 3, reps: 10, load: "50 kg" },
      rationale: "Keep the torso still and stop before form changes.",
    }],
    events: [],
  });

  assert.deepEqual(model.exercises[0].guidance.attention, ["Keep the torso still and stop before form changes."]);
  assert.equal(model.exercises[0].guidance.rationale, null);
});

test("live session view model marks completed sessions read-only and preserves duration", () => {
  const model = buildLiveSessionViewModel({
    id: "s2",
    status: "completed",
    started_at: "2026-10-04T09:47:54.000Z",
    completed_at: "2026-10-04T10:30:00.000Z",
    exercises: [],
  });
  assert.equal(model.session.is_completed, true);
  assert.equal(model.session.profile_id, "default");
  assert.equal(model.session.elapsed_seconds, 2526);
  assert.equal(model.runtime.session.elapsed_seconds, 2526);
  assert.equal(model.progress.exercise_count, 0);
  assert.equal(model.progress.has_exercises, false);
});

test("live session view model marks canceled sessions read-only", () => {
  const model = buildLiveSessionViewModel({
    id: "canceled-session",
    status: "aborted",
    started_at: "2026-10-06T10:00:00.000Z",
    completed_at: "2026-10-06T10:05:00.000Z",
    exercises: [{ id: "ex-1", name: "Row", prescription: { sets: 2, reps: 8 } }],
  });

  assert.equal(model.session.is_completed, false);
  assert.equal(model.session.is_canceled, true);
  assert.equal(model.session.is_read_only, true);
  assert.equal(model.session.elapsed_seconds, 300);
});

test("live session view model treats planned set count as fixed", () => {
  const model = buildLiveSessionViewModel({
    id: "s3",
    status: "active",
    exercises: [{ id: "ex-1", name: "Row", prescription: { sets: 2, reps: 8 } }],
    events: [
      { id: "set-1", type: "set_logged", payload: { session_exercise_id: "ex-1", reps: "8" } },
      { id: "set-2", type: "set_logged", payload: { session_exercise_id: "ex-1", reps: "8" } },
    ],
  });

  assert.equal(model.exercises[0].current_set.total, 2);
  assert.equal(model.exercises[0].current_set.is_complete, true);
  assert.equal(model.exercises[0].current_set.label, "Extra set");
  assert.equal(model.exercises[0].current_set.position_label, "All 2 logged");
  assert.equal(model.exercises[0].current_set.primary_action_label, "Add extra set");
});

test("live session view model preserves fixed planned total after extra sets", () => {
  const model = buildLiveSessionViewModel({
    id: "s4",
    status: "active",
    exercises: [{ id: "ex-1", name: "Row", prescription: { sets: 3, reps: 8 } }],
    events: [
      { id: "set-1", type: "set_logged", payload: { session_exercise_id: "ex-1", reps: "8" } },
      { id: "set-2", type: "set_logged", payload: { session_exercise_id: "ex-1", reps: "8" } },
      { id: "set-3", type: "set_logged", payload: { session_exercise_id: "ex-1", reps: "8" } },
      { id: "set-4", type: "set_logged", payload: { session_exercise_id: "ex-1", reps: "8" } },
    ],
  });

  assert.equal(model.exercises[0].current_set.total, 3);
  assert.equal(model.exercises[0].current_set.planned_set_total, 3);
  assert.equal(model.exercises[0].current_set.label, "Extra set");
  assert.equal(model.exercises[0].current_set.position_label, "All 3 logged");
  assert.equal(model.exercises[0].current_set.primary_action_label, "Add extra set");
});

test("live session view model falls back to unbounded sets without prescribed count", () => {
  const model = buildLiveSessionViewModel({
    id: "s5",
    status: "active",
    exercises: [{ id: "ex-1", name: "Carry", prescription: { reps: 30 } }],
    events: [{ id: "set-1", type: "set_logged", payload: { session_exercise_id: "ex-1", reps: "30" } }],
  });

  assert.equal(model.exercises[0].current_set.total, null);
  assert.equal(model.exercises[0].current_set.label, "Set 2");
  assert.equal(model.exercises[0].current_set.position_label, "Set 2");
  assert.equal(model.exercises[0].current_set.primary_action_label, "Log set");
});
