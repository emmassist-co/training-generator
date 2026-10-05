import test from "node:test";
import assert from "node:assert/strict";
import { createSessionApi } from "../../src/routes/session-api.mjs";

function completedSessionD1() {
  const session = {
    id: "readonly",
    profile_id: "alex",
    title: "Read only",
    status: "completed",
    focus_json: "[]",
    summary: "",
    active_version: 3,
    planned_at: "2026-01-01T00:00:00Z",
    started_at: "2026-01-01T00:10:00Z",
    completed_at: "2026-01-01T01:00:00Z",
    completion_json: "{}",
  };
  let writeCount = 0;
  return {
    session,
    get writeCount() { return writeCount; },
    prepare(sql) {
      let bindings = [];
      const statement = {
        bind(...values) {
          bindings = values;
          return statement;
        },
        async first() {
          if (sql.includes("SELECT * FROM sessions WHERE id = ?") && bindings[0] === session.id) return { ...session };
          return null;
        },
        async all() {
          if (sql.includes("FROM session_exercises")) return { results: [] };
          if (sql.includes("FROM session_events")) return { results: [] };
          return { results: [] };
        },
        async run() {
          writeCount += 1;
          return { success: true };
        },
      };
      return statement;
    },
  };
}

test("session API returns session_read_only and performs no D1 writes for completed-session actions", async () => {
  const app = createSessionApi();
  const db = completedSessionD1();
  const requests = [
    ["/readonly/start", {}],
    ["/readonly/events", { type: "set_logged", payload: { session_exercise_id: "ex-1", reps: "8" } }],
    ["/readonly/events", { type: "exercise_completion_updated", payload: { session_exercise_id: "ex-1", completed: false } }],
    ["/readonly/events", { type: "note_added", payload: { note: "Late note" } }],
    ["/readonly/events", { type: "effort_flag_logged", payload: { kind: "too_hard" } }],
    ["/readonly/proposals/proposal-1/apply", { approved_by: "user" }],
    ["/readonly/proposals/proposal-1/reject", { reason: "No" }],
    ["/readonly/complete", { completion: { notes: "Again" } }],
  ];

  for (const [path, body] of requests) {
    const response = await app.request(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }, { TRAINING_DB: db });
    assert.equal(response.status, 409, path);
    assert.deepEqual(await response.json(), {
      error: "session_read_only",
      message: "completed sessions are read-only",
    }, path);
  }

  assert.equal(db.writeCount, 0);
  assert.equal(db.session.status, "completed");
  assert.equal(db.session.active_version, 3);
});
