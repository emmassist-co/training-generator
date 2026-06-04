import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

test("init script creates local config from example", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "training-generator-init-"));
  await mkdir(path.join(root, "config"), { recursive: true });
  await mkdir(path.join(root, "data"), { recursive: true });
  await writeFile(
    path.join(root, "config", "training-generator.example.json"),
    '{"pagesProject":"demo","pagesSection":"training"}\n',
    "utf8"
  );
  await writeFile(
    path.join(root, "data", "training_state.json"),
    '{"profile":{"name":"Example"},"sessions":[]}\n',
    "utf8"
  );
  await mkdir(path.join(root, "scripts"), { recursive: true });
  const source = await readFile(new URL("../../scripts/init-training-generator.mjs", import.meta.url), "utf8");
  await writeFile(path.join(root, "scripts", "init-training-generator.mjs"), source, "utf8");

  const result = await run("node", ["./scripts/init-training-generator.mjs"], root);
  assert.equal(result.exitCode, 0, result.stderr);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.createdConfig, true);
  assert.equal(payload.createdState, true);

  const generated = await readFile(path.join(root, "config", "training-generator.local.json"), "utf8");
  assert.match(generated, /"pagesProject":"demo"/);
  const generatedState = await readFile(path.join(root, "data", "local", "training-state.json"), "utf8");
  assert.match(generatedState, /"profile"/);
});

function run(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.on("error", reject);
    child.on("close", (exitCode) => resolve({ exitCode, stdout, stderr }));
  });
}
