import test from "node:test";
import assert from "node:assert/strict";
import { createMemoryTrainingStore } from "../../src/db/training-store.mjs";

test("memory training store creates planned sessions and reads snapshots", async () => {
  const store = createMemoryTrainingStore({ profile: { name: "A" }, preferences: { session_duration_min: 45 } });
  const session = await store.createSession({
    id: "session-1",
    title: "Hosted Strength",
    focus: ["strength"],
    exercises: [{ id: "ex-1", exercise_id: "row", name: "Cable Row", sets: 3, reps: 10 }],
  });

  assert.equal(session.id, "session-1");
  assert.equal(session.exercises.length, 1);
  assert.equal(session.exercises[0].prescription.sets, 3);

  const readBack = await store.getSession("session-1");
  assert.equal(readBack.title, "Hosted Strength");
  assert.equal(readBack.events.some((event) => event.type === "session_created"), true);
});

test("approved changes advance the session version and are idempotent", async () => {
  const store = createMemoryTrainingStore();
  await store.createSession({
    id: "session-2",
    title: "Swap Test",
    exercises: [{ id: "ex-1", name: "Cable Row", sets: 3, reps: 10 }],
  });

  await store.proposeSessionChange({
    session_id: "session-2",
    proposal_id: "proposal-1",
    reason: "Cable station busy.",
    patch: { type: "replace_exercise", session_exercise_id: "ex-1", name: "Dumbbell Row", prescription: { sets: 3, reps: 10 } },
  });

  const changed = await store.applyApprovedChange({
    session_id: "session-2",
    proposal_id: "proposal-1",
    idempotency_key: "apply:proposal-1",
  });
  const replayed = await store.applyApprovedChange({
    session_id: "session-2",
    proposal_id: "proposal-1",
    idempotency_key: "apply:proposal-1",
    patch: { type: "replace_exercise", session_exercise_id: "ex-1", name: "Other Row" },
  });

  assert.equal(changed.active_version, 2);
  assert.equal(replayed.active_version, 2);
  assert.equal(replayed.exercises[0].name, "Dumbbell Row");
  assert.equal(replayed.events.filter((event) => event.type === "proposal_accepted").length, 1);
});

test("completion saves telemetry for future context", async () => {
  const store = createMemoryTrainingStore();
  await store.createSession({ id: "session-3", title: "Complete Test", exercises: [] });
  const completed = await store.completeSession({
    session_id: "session-3",
    completion: { difficulty: "right", notes: "Felt good." },
    telemetry: { schema: "TL1", elapsed_seconds: 1200 },
  });

  assert.equal(completed.status, "completed");
  assert.equal(completed.telemetry.elapsed_seconds, 1200);
  assert.equal(completed.events.some((event) => event.type === "session_completed"), true);
});
