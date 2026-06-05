import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const repoRoot = path.resolve(new URL("../..", import.meta.url).pathname);

test("training generation flow uses saved history, passes eval, and renders HTML", async () => {
  const tempRoot = await mkdtemp(path.join(tmpdir(), "training-generation-flow-"));
  const statePath = path.join(tempRoot, "training-state.json");
  const planPath = path.join(tempRoot, "generated-plan.json");
  const htmlPath = path.join(tempRoot, "generated-plan.html");

  const seedState = JSON.parse(await readFile(path.join(repoRoot, "data", "training_state.json"), "utf8"));
  await writeFile(statePath, JSON.stringify(seedState, null, 2), "utf8");

  const env = { TRAINING_GENERATOR_STATE_PATH: statePath };

  const generateResult = await run(
    "python3",
    ["./tools/generate_training_plan.py", "--output", planPath],
    repoRoot,
    env
  );
  assert.equal(generateResult.exitCode, 0, generateResult.stderr);

  const plan = JSON.parse(await readFile(planPath, "utf8"));
  assert.equal(plan.title, "Posterior Chain Reset");
  assert.ok(Array.isArray(plan.planning_context.recent_sessions_considered));
  assert.ok(plan.planning_context.recent_sessions_considered.length >= 1);
  assert.ok(Array.isArray(plan.planning_context.influences));
  assert.ok(plan.planning_context.influences[0].adjustment.includes("Avoid increasing the same squat or hinge stressor"));
  assert.equal(plan.exercises.some((exercise) => exercise.name === "Goblet Squat"), false);

  const evalResult = await run(
    "python3",
    ["./tools/training_state.py", "evaluate-plan", "--input", planPath],
    repoRoot,
    env
  );
  assert.equal(evalResult.exitCode, 0, evalResult.stderr);
  const evaluation = JSON.parse(evalResult.stdout);
  assert.equal(evaluation.ok, true);
  assert.equal(evaluation.score.passed, evaluation.score.total);

  const renderResult = await run(
    "python3",
    ["./tools/render_training_plan.py", "--input", planPath, "--output", htmlPath],
    repoRoot,
    env
  );
  assert.equal(renderResult.exitCode, 0, renderResult.stderr);
  const html = await readFile(htmlPath, "utf8");
  assert.match(html, /Posterior Chain Reset/);
  assert.match(html, /Barbell Hip Thrust/);
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
