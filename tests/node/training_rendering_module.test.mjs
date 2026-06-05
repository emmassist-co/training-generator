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
