import test from "node:test";
import assert from "node:assert/strict";
import { buildMuscleMap, MUSCLE_GROUP } from "../../src/media/muscle-map.mjs";

test("muscle map normalizes catalog muscle names into deterministic SVG regions", () => {
  const map = buildMuscleMap(["middle back", "Biceps", "unknown custom area", "middle-back"]);

  assert.deepEqual(map.groups, [MUSCLE_GROUP.MIDDLE_BACK, MUSCLE_GROUP.BICEPS]);
  assert.ok(map.front_ids.includes("biceps-left"));
  assert.ok(map.back_ids.includes("traps-mid-left"));
  assert.ok(map.back_ids.includes("lats-mid-right"));
  assert.deepEqual(map.unmapped, ["unknown custom area"]);
});

test("muscle map covers the free-exercise-db catalog vocabulary", () => {
  const catalogMuscles = [
    "abdominals", "abductors", "adductors", "biceps", "calves", "chest",
    "forearms", "glutes", "hamstrings", "lats", "lower back", "middle back",
    "neck", "quadriceps", "shoulders", "traps", "triceps",
  ];
  const map = buildMuscleMap(catalogMuscles);

  assert.equal(map.groups.length, catalogMuscles.length);
  assert.deepEqual(map.unmapped, []);
  assert.ok(map.front_ids.length > 0);
  assert.ok(map.back_ids.length > 0);
});
