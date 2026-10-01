import test from "node:test";
import assert from "node:assert/strict";
import { createMemoryTrainingStore } from "../../src/db/training-store.mjs";
import { createMemoryExerciseCatalog } from "../../src/db/exercise-catalog.mjs";
import { getTrainingContextTool } from "../../src/tools/training-context.mjs";
import { searchExercisesTool } from "../../src/tools/exercise-tools.mjs";
import { createSessionTool, getActiveSessionTool } from "../../src/tools/session-tools.mjs";
import { applyApprovedChangeTool, proposeSessionChangeTool } from "../../src/tools/change-tools.mjs";

test("training context tool returns seeded profile and feedback", async () => {
  const store = createMemoryTrainingStore({
    profile: { name: "Alex" },
    preferences: { session_duration_min: 45 },
    planning_feedback_profile: { summary_notes: ["Prefer short sessions."], signals: [] },
  });
  const result = await getTrainingContextTool(store).run({ recent_limit: 3 });
  assert.equal(result.profile.name, "Alex");
  assert.equal(result.planning_feedback_profile.summary_notes[0], "Prefer short sessions.");
});

test("exercise search tool respects feedback overlays", async () => {
  const catalog = createMemoryExerciseCatalog(
    [
      { id: "Cable_Row", name: "Cable Row", category: "strength", equipment: "cable", primaryMuscles: ["middle back"] },
      { id: "Dumbbell_Row", name: "Dumbbell Row", category: "strength", equipment: "dumbbell", primaryMuscles: ["middle back"] },
    ],
    [{ exercise_id: "Cable_Row", preference: "avoid", note: "Busy setup." }],
  );
  const result = await searchExercisesTool(catalog).run({ include_muscles: ["middle back"], allowed_risk: ["prefer", "caution"] });
  assert.equal(result.results.some((item) => item.id === "Cable_Row"), false);
  assert.equal(result.results[0].id, "Dumbbell_Row");
});

test("session tools enforce propose before approved apply", async () => {
  const store = createMemoryTrainingStore();
  await createSessionTool(store).run({ id: "session-1", title: "Session", exercises: [{ id: "ex-1", name: "Cable Row" }] });
  const active = await getActiveSessionTool(store).run({ session_id: "session-1" });
  assert.equal(active.id, "session-1");

  const proposal = await proposeSessionChangeTool(store).run({
    session_id: "session-1",
    proposal_id: "proposal-1",
    patch: { type: "replace_exercise", session_exercise_id: "ex-1", name: "Dumbbell Row" },
    reason: "Cable station busy.",
  });
  assert.equal(proposal.status, "proposed");

  await assert.rejects(() => applyApprovedChangeTool(store).run({ session_id: "session-1", patch: proposal.patch }), /proposal_id or approval_token/);
  const changed = await applyApprovedChangeTool(store).run({ session_id: "session-1", proposal_id: "proposal-1", patch: proposal.patch });
  assert.equal(changed.exercises[0].name, "Dumbbell Row");
});
