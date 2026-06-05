import test from "node:test";
import assert from "node:assert/strict";
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
