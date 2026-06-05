import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { spawn } from "node:child_process";

const repoRoot = path.resolve(new URL("../..", import.meta.url).pathname);

test("help script exposes workflows and prompts", async () => {
  const result = await run("node", ["./tools/help_training_generator.mjs", "--json"], repoRoot);
  assert.equal(result.exitCode, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.match(payload.summary, /agent-native workspace/i);
  assert.ok(payload.workflows.some((workflow) => workflow.skill === "create-training-plan"));
  assert.ok(payload.workflows.some((workflow) => /quick product tour/i.test(workflow.name)));
  assert.ok(payload.prompts.some((prompt) => /TL1/.test(prompt)));
  assert.ok(payload.prompts.some((prompt) => /demo training session/i.test(prompt)));
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
