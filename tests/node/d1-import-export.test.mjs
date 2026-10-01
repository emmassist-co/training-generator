import test from "node:test";
import assert from "node:assert/strict";
import { buildImportPlan } from "../../tools/import_training_state_to_d1.mjs";
import { buildState } from "../../tools/export_d1_training_state.mjs";

test("import plan maps local state into D1-shaped rows", () => {
  const plan = buildImportPlan({
    profile: { name: "Alex" },
    preferences: { session_duration_min: 45 },
    planning_feedback_profile: { summary_notes: ["Keep setup simple."], signals: [] },
    sessions: [
      {
        session_id: "tl1-session",
        title: "TL1 Session",
        source_training_id: "published-session",
        focus: ["strength"],
        telemetry: { schema: "TL1", elapsed_seconds: 1800 },
        exercises: [{ exercise_id: "Cable_Row", name: "Cable Row", sets: 3, reps: 10 }],
      },
    ],
  });

  assert.equal(plan.profiles.length, 1);
  assert.equal(plan.sessions[0].id, "tl1-session");
  assert.equal(plan.session_exercises[0].name, "Cable Row");
  assert.equal(plan.session_telemetry[0].telemetry_json.schema, "TL1");
});

test("export reconstructs compact local state", () => {
  const state = buildState({
    profiles: [{ profile_json: { name: "Alex" }, preferences_json: {}, feedback_profile_json: { signals: [] } }],
    sessions: [{ id: "session-1", title: "Session", focus_json: ["strength"], source: "tl1", completion_json: { notes: "Good." } }],
    session_exercises: [{ session_id: "session-1", exercise_id: "Cable_Row", name: "Cable Row", prescription_json: { sets: 3 }, alternatives_json: [] }],
    session_telemetry: [{ session_id: "session-1", telemetry_json: { schema: "TL1" } }],
  });

  assert.equal(state.profile.name, "Alex");
  assert.equal(state.sessions[0].session_id, "session-1");
  assert.equal(state.sessions[0].telemetry.schema, "TL1");
  assert.equal(state.sessions[0].exercises[0].sets, 3);
});
