import test from "node:test";
import assert from "node:assert/strict";
import { createD1ExerciseCatalog, createMemoryExerciseCatalog, searchExerciseItems, summarizeExercise } from "../../src/db/exercise-catalog.mjs";

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

test("D1 catalog searches persisted exercise rows with profile overlays", async () => {
  const db = createFakeD1({
    catalog: raw.map(summarizeExercise),
    overlays: [{ exercise_id: "Cable_Row", preference: "avoid", note: "Too much setup." }],
  });
  const catalog = createD1ExerciseCatalog(db);
  const results = await catalog.search({ include_muscles: ["middle back"], allowed_risk: ["prefer", "caution"] });
  assert.deepEqual(results.map((item) => item.id), ["Dumbbell_Row"]);
});

function createFakeD1({ catalog, overlays }) {
  return {
    prepare(sql) {
      return {
        bind() {
          return this;
        },
        async all() {
          if (sql.includes("exercise_catalog")) {
            return {
              results: catalog.map((item) => ({
                id: item.id,
                name: item.name,
                category: item.category,
                equipment: item.equipment,
                muscles_json: JSON.stringify(item.muscles),
                instructions_json: JSON.stringify(item.instructions),
                images_json: JSON.stringify(item.images),
                risk: item.risk,
                search_text: item.search_text,
              })),
            };
          }
          if (sql.includes("exercise_overlays")) return { results: overlays };
          return { results: [] };
        },
        async run() {
          return { success: true };
        },
      };
    },
  };
}
