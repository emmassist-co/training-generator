import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { spawn } from "node:child_process";

const repoRoot = path.resolve(new URL("../..", import.meta.url).pathname);

test("training rendering module is importable as a primitive", async () => {
  const result = await run(
    "python3",
    ["-c", "from training_rendering import render_plan; print(callable(render_plan))"],
    repoRoot,
    { PYTHONPATH: "./tools" }
  );
  assert.equal(result.exitCode, 0, result.stderr);
  assert.match(result.stdout.trim(), /True/);
});

test("training renderer makes unilateral prescriptions explicit", async () => {
  const script = `
from training_rendering import build_exercise_lookup, render_plan

plan = {
  "title": "Unilateral Check",
  "subtitle": "Test session",
  "goal": "Make unilateral prescriptions explicit.",
  "duration": "20 minutes",
  "exercises": [
    {
      "exercise_id": "One-Arm_Dumbbell_Row",
      "name": "One-Arm Dumbbell Row",
      "sets": 4,
      "reps": 10,
      "side_mode": "each-side",
      "rest_seconds": 75,
      "load": "moderate",
      "classification": "favorable",
      "reason": "Regression test for unilateral wording.",
      "execution_notes": ["10 reps left + 10 reps right counts as 1 set."]
    }
  ]
}

html = render_plan(plan, build_exercise_lookup())
print("HAS_REPS=" + str("10 each side" in html))
print("HAS_NOTE=" + str("Left + right = 1 set." in html))
`;
  const result = await run("python3", ["-c", script], repoRoot, { PYTHONPATH: "./tools" });
  assert.equal(result.exitCode, 0, result.stderr);
  assert.match(result.stdout, /HAS_REPS=True/);
  assert.match(result.stdout, /HAS_NOTE=True/);
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
