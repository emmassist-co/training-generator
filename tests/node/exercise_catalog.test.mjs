import test from "node:test";
import assert from "node:assert/strict";
import { createMemoryExerciseCatalog, searchExerciseItems, summarizeExercise } from "../../src/db/exercise-catalog.mjs";

const raw = [
  { id: "Cable_Row", name: "Cable Row", category: "strength", equipment: "cable", primaryMuscles: ["middle back", "lats"], images: ["row/0.jpg"] },
  { id: "Dumbbell_Row", name: "Dumbbell Row", category: "strength", equipment: "dumbbell", primaryMuscles: ["middle back"] },
  { id: "Box_Jump", name: "Box Jump", category: "plyometrics", equipment: "box", primaryMuscles: ["quadriceps"] },
];

test("catalog build normalizes stable exercise summaries", () => {
  const row = summarizeExercise(raw[0]);
  assert.equal(row.id, "Cable_Row");
  assert.equal(row.muscles.includes("middle back"), true);
  assert.equal(row.risk, "prefer");
});

test("search returns safe practical alternatives and excludes duplicates", () => {
  const rows = raw.map(summarizeExercise);
  const results = searchExerciseItems(rows, {
    include_muscles: ["middle back"],
    allowed_risk: ["prefer", "caution"],
    exclude_ids: ["Cable_Row"],
  });
  assert.equal(results.length, 1);
  assert.equal(results[0].id, "Dumbbell_Row");
});

test("user overlays can avoid exercises without changing base catalog", async () => {
  const catalog = createMemoryExerciseCatalog(raw, [{ exercise_id: "Cable_Row", preference: "avoid", note: "Too much setup." }]);
  const results = await catalog.search({ include_muscles: ["middle back"], allowed_risk: ["prefer", "caution"] });
  assert.equal(results.some((item) => item.id === "Cable_Row"), false);
  assert.equal(results.some((item) => item.id === "Dumbbell_Row"), true);
});
