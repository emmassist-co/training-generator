import test from "node:test";
import assert from "node:assert/strict";
import { applySessionPatch, previewSessionPatch, validateSessionPatch } from "../../src/client/session-patches.mjs";
import { buildTelemetrySummary, createSessionRuntime } from "../../src/client/session-state.mjs";

const session = {
  id: "session-1",
  active_version: 1,
  exercises: [
    { id: "ex-1", name: "Cable Row", prescription: { sets: 3, reps: 10 }, completed_sets: 2 },
    { id: "ex-2", name: "Bike", prescription: { duration: "8 minutes" }, completed_sets: 0 },
  ],
};

test("patch validation rejects unsupported operations", () => {
  assert.equal(validateSessionPatch({ type: "delete_everything" }).ok, false);
  assert.equal(validateSessionPatch({ type: "replace_exercise", session_exercise_id: "ex-1", name: "Dumbbell Row" }).ok, true);
});

test("preview does not mutate current progress", () => {
  const preview = previewSessionPatch(session, { type: "replace_exercise", session_exercise_id: "ex-1", name: "Dumbbell Row" });
  assert.equal(preview.ok, true);
  assert.equal(preview.session.exercises[0].name, "Dumbbell Row");
  assert.equal(session.exercises[0].name, "Cable Row");
  assert.equal(preview.session.exercises[0].completed_sets, 2);
});

test("accepted patch updates version and keeps unrelated state", () => {
  const changed = applySessionPatch(session, { type: "replace_exercise", session_exercise_id: "ex-1", name: "Dumbbell Row" });
  assert.equal(changed.active_version, 2);
  assert.equal(changed.exercises[1].name, "Bike");
  assert.equal(changed.exercises[0].completed_sets, 2);
});

test("runtime can accept and reject proposals without losing progress", () => {
  const runtime = createSessionRuntime(session);
  runtime.completeSet("ex-2");
  runtime.proposeChange({ proposal_id: "p1", patch: { type: "replace_exercise", session_exercise_id: "ex-1", name: "Dumbbell Row" } });
  runtime.rejectProposal("p1", "Keep original.");
  assert.equal(runtime.session.exercises[0].name, "Cable Row");

  runtime.proposeChange({ proposal_id: "p2", patch: { type: "replace_exercise", session_exercise_id: "ex-1", name: "Chest-Supported Row" } });
  const accepted = runtime.acceptProposal("p2");
  assert.equal(accepted.exercises[0].name, "Chest-Supported Row");
  assert.equal(accepted.exercises[1].completed_sets, 1);
  assert.equal(buildTelemetrySummary(runtime.events).proposals, 4);
});
