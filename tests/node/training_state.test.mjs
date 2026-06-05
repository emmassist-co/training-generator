import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const repoRoot = path.resolve(new URL("../..", import.meta.url).pathname);

test("validate-tl1 parses compact training log", async () => {
  const result = await run("python3", ["./tools/training_state.py", "validate-tl1", "--input", "./examples/completed-session-log.txt"], repoRoot);
  assert.equal(result.exitCode, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.schema, "TL1");
  assert.equal(payload.id, "lower-body-strength-a");
  assert.equal(payload.exercise_count, 2);
  assert.equal(payload.exercises[0].swapped, true);
  assert.equal(payload.telemetry.schema_version, 1);
  assert.ok(payload.exercises[0].telemetry);
  assert.ok(Array.isArray(payload.exercises[0].telemetry.active_windows));
});

test("validate-tl1 remains compatible with logs that have no telemetry block", async () => {
  const legacyLog = [
    'TL1 ',
    JSON.stringify({
      id: "legacy-session",
      t: "Legacy Session",
      u: "https://example.com/training/legacy",
      sa: "2026-06-01T10:00:00.000Z",
      ea: "2026-06-01T10:20:00.000Z",
      d: "right",
      n: "",
      ex: [
        { s: 1, p: "Goblet Squat", a: "Goblet Squat", sw: 0, ps: "3 sets · 8 reps", cs: 3, st: 3, tt: 0, ok: 1 }
      ]
    })
  ].join("");
  const result = await run("python3", ["./tools/training_state.py", "validate-tl1", "--log", legacyLog], repoRoot);
  assert.equal(result.exitCode, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.id, "legacy-session");
  assert.equal(payload.telemetry, null);
  assert.equal(payload.exercises[0].telemetry, null);
});

test("summarize-context exposes publish and state context", async () => {
  const result = await run("python3", ["./tools/training_state.py", "summarize-context"], repoRoot);
  assert.equal(result.exitCode, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.ok(payload.profile);
  assert.ok(payload.publish);
  assert.equal(payload.publish.pagesSection, "training");
  assert.ok(typeof payload.state.using_example_state === "boolean");
});

test("read-profile exposes profile and preferences", async () => {
  const result = await run("python3", ["./tools/training_state.py", "read-profile"], repoRoot);
  assert.equal(result.exitCode, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.ok(payload.profile);
  assert.ok(payload.preferences);
});

test("list-exercises returns primitive exercise summaries", async () => {
  const result = await run("python3", ["./tools/training_state.py", "list-exercises", "--limit", "3"], repoRoot);
  assert.equal(result.exitCode, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(Array.isArray(payload), true);
  assert.equal(payload.length, 3);
  assert.ok(payload[0].id);
  assert.ok(!("instructions" in payload[0]));
});

test("session CRUD works against a local state file", async () => {
  const stateRoot = await mkdtemp(path.join(tmpdir(), "training-generator-state-"));
  const statePath = path.join(stateRoot, "training-state.json");
  const seedState = JSON.parse(await readFile(path.join(repoRoot, "data", "training_state.json"), "utf8"));
  seedState.sessions = [];
  await writeFile(statePath, JSON.stringify(seedState, null, 2), "utf8");

  const sessionInputPath = path.join(stateRoot, "session.json");
  await writeFile(
    sessionInputPath,
    JSON.stringify(
      {
        title: "Tempo Lower A",
        source_training_id: "tempo-lower-a",
        difficulty: "right",
        focus: ["posterior-chain", "conditioning"],
        telemetry: {
          schema_version: 1,
          tick_ms: 100,
          exercises: [
            {
              active_windows: [{ start_seconds: 0.0, end_seconds: 1.2, duration_seconds: 1.2 }],
              active_total_seconds: 1.2,
              wall_elapsed_seconds: 1.2
            }
          ]
        }
      },
      null,
      2
    ),
    "utf8"
  );

  const extraEnv = { TRAINING_GENERATOR_STATE_PATH: statePath };
  const logResult = await run("python3", ["./tools/training_state.py", "log-session", "--input", sessionInputPath], repoRoot, extraEnv);
  assert.equal(logResult.exitCode, 0, logResult.stderr);
  const logged = JSON.parse(logResult.stdout);
  assert.match(logged.session_id, /^20\d{2}-\d{2}-\d{2}-tempo-lower-a-/);

  const listResult = await run("python3", ["./tools/training_state.py", "list-sessions", "--limit", "5"], repoRoot, extraEnv);
  assert.equal(listResult.exitCode, 0, listResult.stderr);
  const sessions = JSON.parse(listResult.stdout);
  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].session_id, logged.session_id);

  const patchPath = path.join(stateRoot, "session-patch.json");
  await writeFile(
    patchPath,
    JSON.stringify(
      {
        difficulty: "hard",
        notes: "Bike felt stronger."
      },
      null,
      2
    ),
    "utf8"
  );

  const updateResult = await run(
    "python3",
    ["./tools/training_state.py", "update-session", "--session-id", logged.session_id, "--input", patchPath],
    repoRoot,
    extraEnv
  );
  assert.equal(updateResult.exitCode, 0, updateResult.stderr);
  const updated = JSON.parse(updateResult.stdout);
  assert.equal(updated.session.difficulty, "hard");

  const readResult = await run(
    "python3",
    ["./tools/training_state.py", "read-session", "--session-id", logged.session_id],
    repoRoot,
    extraEnv
  );
  assert.equal(readResult.exitCode, 0, readResult.stderr);
  const session = JSON.parse(readResult.stdout);
  assert.equal(session.notes, "Bike felt stronger.");
  assert.equal(session.telemetry.schema_version, 1);
  assert.equal(session.telemetry.exercises[0].active_total_seconds, 1.2);

  const deleteResult = await run(
    "python3",
    ["./tools/training_state.py", "delete-session", "--session-id", logged.session_id],
    repoRoot,
    extraEnv
  );
  assert.equal(deleteResult.exitCode, 0, deleteResult.stderr);
  const deleted = JSON.parse(deleteResult.stdout);
  assert.equal(deleted.session.session_id, logged.session_id);
  assert.equal(deleted.session_count, 0);
});

function run(command, args, cwd, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, ...extraEnv },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.on("error", reject);
    child.on("close", (exitCode) => resolve({ exitCode, stdout, stderr }));
  });
}
