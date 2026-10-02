import test from "node:test";
import assert from "node:assert/strict";
import { createMemoryTrainingStore } from "../../src/db/training-store.mjs";
import { createMemoryExerciseCatalog } from "../../src/db/exercise-catalog.mjs";
import { searchExercisesTool } from "../../src/tools/exercise-tools.mjs";
import { createSessionTool, completeSessionTool } from "../../src/tools/session-tools.mjs";
import { applyApprovedChangeTool, proposeSessionChangeTool } from "../../src/tools/change-tools.mjs";
import { createSessionRuntime } from "../../src/client/session-state.mjs";

test("hosted training flow creates, changes, runs, and completes without live AI", async () => {
  const store = createMemoryTrainingStore({ profile: { name: "Alex" } });
  const catalog = createMemoryExerciseCatalog([
    { id: "Cable_Row", name: "Cable Row", category: "strength", equipment: "cable", primaryMuscles: ["middle back"] },
    { id: "Dumbbell_Row", name: "Dumbbell Row", category: "strength", equipment: "dumbbell", primaryMuscles: ["middle back"] },
  ]);

  const candidates = await searchExercisesTool(catalog).run({ data: { include_muscles: ["middle back"], equipment: ["cable"] } });
  const candidate = candidates.output.results[0];
  const planned = await createSessionTool(store).run({
    id: "hosted-session",
    title: "Hosted Session",
    exercises: [{ id: "ex-1", exercise_id: candidate.id, name: candidate.name, sets: 3, reps: 10 }],
  });

  const proposal = await proposeSessionChangeTool(store).run({
    session_id: planned.id,
    proposal_id: "swap-1",
    patch: { type: "replace_exercise", session_exercise_id: "ex-1", exercise_id: "Dumbbell_Row", name: "Dumbbell Row" },
    reason: "Cable station busy.",
  });
  const changed = await applyApprovedChangeTool(store).run({ session_id: planned.id, proposal_id: proposal.proposal_id, patch: proposal.patch });
  assert.equal(changed.exercises[0].name, "Dumbbell Row");

  const runtime = createSessionRuntime(changed);
  runtime.completeSet("ex-1");
  const completed = runtime.complete({ difficulty: "right" });
  const saved = await completeSessionTool(store).run({ session_id: planned.id, completion: completed.completion, telemetry: { schema: "hosted-training-runtime/v1" } });

  assert.equal(saved.status, "completed");
  assert.equal(saved.telemetry.schema, "hosted-training-runtime/v1");
});
