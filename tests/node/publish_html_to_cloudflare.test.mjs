import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

test("publisher uses local config for dry-run", async () => {
  const configRoot = await mkdtemp(path.join(tmpdir(), "training-generator-publish-"));
  await mkdir(path.join(configRoot, "config"), { recursive: true });
  await writeFile(
    path.join(configRoot, "config", "training-generator.local.json"),
    JSON.stringify(
      {
        pagesProject: "demo-training",
        pagesSection: "sessions",
        pagesBaseUrl: "https://demo-training.pages.dev"
      },
      null,
      2
    ),
    "utf8"
  );
  const result = await run(
    "node",
    ["./tools/publish_html_to_cloudflare.mjs", "--dry-run", "--title", "Tempo Lower A", "--html", "<h1>Tempo Lower A</h1>"],
    path.resolve(new URL("../..", import.meta.url).pathname),
    {
      TRAINING_GENERATOR_CONFIG: path.join(configRoot, "config", "training-generator.local.json"),
    }
  );

  assert.equal(result.exitCode, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.projectName, "demo-training");
  assert.equal(payload.section, "sessions");
  assert.match(payload.pageUrl, /https:\/\/demo-training\.pages\.dev\/sessions\//);
});

test("publisher can list published pages from local site tree", async () => {
  const cwd = path.resolve(new URL("../..", import.meta.url).pathname);
  const uniquePath = `test-list-${Date.now()}`;

  const publishResult = await run(
    "node",
    [
      "./tools/publish_html_to_cloudflare.mjs",
      "--dry-run",
      "--section",
      "test-pages",
      "--path",
      uniquePath,
      "--title",
      "List Test",
      "--html",
      "<h1>List Test</h1>"
    ],
    cwd
  );
  assert.equal(publishResult.exitCode, 0, publishResult.stderr);

  const listResult = await run(
    "node",
    ["./tools/publish_html_to_cloudflare.mjs", "--list-published", "--section", "test-pages"],
    cwd
  );
  assert.equal(listResult.exitCode, 0, listResult.stderr);
  const payload = JSON.parse(listResult.stdout);
  assert.equal(Array.isArray(payload.pages), true);
  assert.ok(payload.pages.some((page) => page.pageId === uniquePath));
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
