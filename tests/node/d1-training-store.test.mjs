import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import { createD1TrainingStore, createMemoryTrainingStore } from "../../src/db/training-store.mjs";

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

test("completed sessions reject workout write events", async () => {
  const store = createMemoryTrainingStore();
  await store.createSession({ id: "session-readonly", title: "Read Only", exercises: [{ id: "ex-1", name: "Row" }] });
  await store.logSessionEvent({ session_id: "session-readonly", type: "set_logged", payload: { session_exercise_id: "ex-1", reps: "8" }, idempotency_key: "set:readonly:1" });
  await store.proposeSessionChange({ session_id: "session-readonly", proposal_id: "proposal-readonly", reason: "Swap", patch: { type: "replace_exercise", session_exercise_id: "ex-1", name: "Dumbbell Row" } });
  await store.completeSession({ session_id: "session-readonly", completion: { notes: "Done" } });
  const before = await store.getSession("session-readonly");

  await assert.rejects(
    () => store.logSessionEvent({ session_id: "session-readonly", type: "set_logged", payload: { session_exercise_id: "ex-1", reps: "10" } }),
    /completed sessions are read-only/,
  );
  await assert.rejects(
    () => store.logSessionEvent({ session_id: "session-readonly", type: "set_logged", payload: { session_exercise_id: "ex-1", reps: "8" }, idempotency_key: "set:readonly:1" }),
    /completed sessions are read-only/,
  );
  await assert.rejects(
    () => store.logSessionEvent({ session_id: "session-readonly", type: "exercise_completion_updated", payload: { session_exercise_id: "ex-1", completed: false } }),
    /completed sessions are read-only/,
  );
  await assert.rejects(
    () => store.logSessionEvent({ session_id: "session-readonly", type: "note_added", payload: { note: "late" } }),
    /completed sessions are read-only/,
  );
  await assert.rejects(
    () => store.logSessionEvent({ session_id: "session-readonly", type: "set_completed", payload: { exercise_id: "ex-1" } }),
    /completed sessions are read-only/,
  );
  await assert.rejects(
    () => store.logSessionEvent({ session_id: "session-readonly", type: "timer_event", payload: { action: "stop" } }),
    /completed sessions are read-only/,
  );
  await assert.rejects(
    () => store.applyApprovedChange({ session_id: "session-readonly", proposal_id: "proposal-readonly" }),
    /completed sessions are read-only/,
  );
  await assert.rejects(
    () => store.rejectProposal({ session_id: "session-readonly", proposal_id: "proposal-readonly" }),
    /completed sessions are read-only/,
  );
  await assert.rejects(
    () => store.startSession({ session_id: "session-readonly" }),
    /completed sessions are read-only/,
  );
  const replayedCompletion = await store.completeSession({ session_id: "session-readonly", completion: { notes: "Done" }, telemetry: { recovered: true } });
  assert.equal(replayedCompletion.status, "completed");
  assert.deepEqual(replayedCompletion.telemetry, { recovered: true });
  assert.equal(replayedCompletion.events.filter((event) => event.type === "session_completed").length, 1);
  await assert.rejects(
    () => store.completeSession({ session_id: "session-readonly", completion: { notes: "again" }, idempotency_key: "complete:other-attempt" }),
    /completed sessions are read-only/,
  );

  const after = await store.getSession("session-readonly");
  assert.equal(after.events.length, before.events.length);
  assert.equal(after.active_version, before.active_version);
  assert.equal(after.exercises[0].name, "Row");
});

test("cancel and start over preserve the old session while creating clean work", async () => {
  const store = createMemoryTrainingStore();
  await store.createSession({
    id: "active-old",
    profile_id: "alexandre",
    title: "Upper Pull",
    status: "active",
    exercises: [{ id: "old-row", exercise_id: "Cable_Row", name: "Cable Row", prescription: { sets: 3, reps: 10 } }],
  });
  await store.logSessionEvent({ session_id: "active-old", type: "set_logged", payload: { session_exercise_id: "old-row", reps: "10", load: "50 kg" } });

  const fresh = await store.restartSession({ session_id: "active-old", restarted_at: "2026-10-06T15:00:00.000Z" });
  const old = await store.getSession("active-old");

  assert.equal(old.status, "aborted");
  assert.equal(old.events.some((event) => event.type === "session_canceled"), true);
  assert.notEqual(fresh.id, old.id);
  assert.equal(fresh.status, "active");
  assert.equal(fresh.started_at, "2026-10-06T15:00:00.000Z");
  assert.equal(fresh.exercises[0].name, "Cable Row");
  assert.equal(fresh.events.some((event) => event.type === "set_logged"), false);
  assert.equal((await store.getActiveOrPlannedSession({ profileId: "alexandre" })).id, fresh.id);
  assert.equal((await store.restartSession({ session_id: "active-old" })).id, fresh.id);

  const canceled = await store.abortSession({ session_id: fresh.id, reason: "Testing complete" });
  assert.equal(canceled.status, "aborted");
  assert.equal(await store.getActiveOrPlannedSession({ profileId: "alexandre" }), null);
  await assert.rejects(() => store.logSessionEvent({ session_id: fresh.id, type: "set_logged" }), /canceled sessions are read-only/);
});

test("D1 cancel and start over create a clean replacement session", async () => {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(await readFile(new URL("../../migrations/0001_training_domain.sql", import.meta.url), "utf8"));
  sqlite.exec(await readFile(new URL("../../migrations/0002_exercise_catalog.sql", import.meta.url), "utf8"));
  const d1 = sqliteD1(sqlite);
  const store = createD1TrainingStore(d1);
  await store.createSession({ id: "d1-old", profile_id: "alexandre", title: "D1 restart", status: "active", exercises: [{ id: "d1-row", exercise_id: "Cable_Row", name: "Cable Row", prescription: { sets: 3, reps: 8 } }] });
  await store.logSessionEvent({ session_id: "d1-old", type: "set_logged", payload: { session_exercise_id: "d1-row", reps: "8" } });

  const fresh = await store.restartSession({ session_id: "d1-old", restarted_at: "2026-10-06T15:10:00.000Z" });
  const old = await store.getSession("d1-old");

  assert.equal(old.status, "aborted");
  assert.equal(fresh.status, "active");
  assert.notEqual(fresh.id, old.id);
  assert.equal(fresh.exercises.length, 1);
  assert.equal(fresh.events.some((event) => event.type === "set_logged"), false);
  assert.equal((await store.getActiveOrPlannedSession({ profileId: "alexandre" })).id, fresh.id);
  assert.equal((await store.restartSession({ session_id: "d1-old" })).id, fresh.id);
  sqlite.close();
});

test("D1 session reads recover catalog images from the exercise name", async () => {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(await readFile(new URL("../../migrations/0001_training_domain.sql", import.meta.url), "utf8"));
  sqlite.exec(await readFile(new URL("../../migrations/0002_exercise_catalog.sql", import.meta.url), "utf8"));
  sqlite.exec(`
    INSERT INTO profiles (id) VALUES ('alexandre');
    INSERT INTO sessions (id, profile_id, title, status) VALUES ('session-images', 'alexandre', 'Image Test', 'active');
    INSERT INTO session_exercises (id, session_id, position, exercise_id, name)
      VALUES ('session-row', 'session-images', 0, 'session-local-row', 'Seated Cable Row');
    INSERT INTO exercise_catalog (id, name, images_json)
      VALUES ('Seated_Cable_Rows', 'Seated Cable Rows', '["Seated_Cable_Rows/0.jpg"]');
  `);
  const session = await createD1TrainingStore(sqliteD1(sqlite)).getSession("session-images");
  assert.equal(session.exercises[0].exercise_id, "session-local-row");
  assert.deepEqual(session.exercises[0].images, ["Seated_Cable_Rows/0.jpg"]);
  sqlite.close();
});

function sqliteD1(sqlite) {
  return {
    prepare(sql) {
      const statement = sqlite.prepare(sql);
      let bindings = [];
      return {
        bind(...values) { bindings = values; return this; },
        async first() { return statement.get(...bindings) || null; },
        async all() { return { results: statement.all(...bindings) }; },
        async run() { const result = statement.run(...bindings); return { success: true, meta: { changes: Number(result.changes || 0) } }; },
      };
    },
    async batch(statements) {
      sqlite.exec("BEGIN");
      try {
        const results = [];
        for (const statement of statements) results.push(await statement.run());
        sqlite.exec("COMMIT");
        return results;
      } catch (error) {
        sqlite.exec("ROLLBACK");
        throw error;
      }
    },
  };
}

test("history listing exposes older profile sessions beyond recent context", async () => {
  const store = createMemoryTrainingStore();
  await store.createSession({ id: "old", profile_id: "alexandre", title: "Old Session", planned_at: "2026-01-01", completed_at: "2026-01-01", status: "completed", exercises: [{ name: "Row" }] });
  await store.createSession({ id: "new", profile_id: "alexandre", title: "New Session", planned_at: "2026-02-01", completed_at: "2026-02-01", status: "completed", exercises: [{ name: "Press" }, { name: "Run" }] });

  const recent = await store.getTrainingContext({ profileId: "alexandre", recentLimit: 1 });
  const history = await store.listTrainingHistory({ profileId: "alexandre", limit: 10 });

  assert.deepEqual(recent.recent_sessions.map((session) => session.id), ["new"]);
  assert.deepEqual(history.map((session) => session.id), ["new", "old"]);
  assert.equal(history[0].exercise_count, 2);
});
