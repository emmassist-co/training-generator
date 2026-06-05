import test from "node:test";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

const repoRoot = path.resolve(new URL("../..", import.meta.url).pathname);
const artifactsRoot = path.join(repoRoot, "output", "training-plans");

test("artifact manager can list and delete rendered plans", async () => {
  const stem = `artifact-smoke-${Date.now()}`;
  const htmlPath = path.join(artifactsRoot, `${stem}.html`);
  const pdfPath = path.join(artifactsRoot, `${stem}.pdf`);

  await writeFile(htmlPath, "<h1>Artifact Smoke</h1>\n", "utf8");
  await writeFile(pdfPath, "fake pdf bytes\n", "utf8");

  const listResult = await run("node", ["./tools/manage_training_artifacts.mjs"], repoRoot);
  assert.equal(listResult.exitCode, 0, listResult.stderr);
  const listed = JSON.parse(listResult.stdout);
  assert.ok(listed.artifacts.some((artifact) => artifact.stem === stem));

  const deleteResult = await run(
    "node",
    ["./tools/manage_training_artifacts.mjs", "--delete", stem],
    repoRoot
  );
  assert.equal(deleteResult.exitCode, 0, deleteResult.stderr);
  const deleted = JSON.parse(deleteResult.stdout);
  assert.equal(deleted.stem, stem);

  const relistResult = await run("node", ["./tools/manage_training_artifacts.mjs"], repoRoot);
  assert.equal(relistResult.exitCode, 0, relistResult.stderr);
  const relisted = JSON.parse(relistResult.stdout);
  assert.ok(!relisted.artifacts.some((artifact) => artifact.stem === stem));
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
