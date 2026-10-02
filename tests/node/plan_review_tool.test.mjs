import test from "node:test";
import assert from "node:assert/strict";
import { reviewTrainingPlan } from "../../src/tools/plan-review-tool.mjs";

test("plan reviewer flags missing load guidance and knee stress", () => {
  const review = reviewTrainingPlan({
    title: "Lower Day",
    exercises: [
      { name: "Box Jump", prescription: { sets: 3, reps: 5 } },
      { name: "Walking Lunge", prescription: { sets: 3, reps: 10 } },
      { name: "Leg Press", prescription: { sets: 3, reps: 10 } },
      { name: "Treadmill Run", prescription: { duration: "10 minutes" } },
    ],
    context: {
      profile: { constraints: ["left knee ACL and meniscus history"] },
      preferences: { session_duration_min: 45 },
      planning_feedback_profile: { summary_notes: ["Include explicit load guidance."], signals: [] },
      recent_sessions: [{ id: "run-1", title: "5 km steady run", focus: ["running"], completed_at: "2026-10-01" }],
    },
  });

  assert.equal(review.verdict, "revise_or_explain");
  assert.equal(review.warnings.some((warning) => /impact/.test(warning)), true);
  assert.equal(review.warnings.some((warning) => /Recent history includes running/.test(warning)), true);
  assert.equal(review.warnings.some((warning) => /explicit load guidance/.test(warning)), true);
});
