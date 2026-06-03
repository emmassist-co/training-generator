import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test(".gitignore protects local config and state", async () => {
  const gitignore = await readFile(new URL("../../.gitignore", import.meta.url), "utf8");
  assert.match(gitignore, /config\/\*\.local\.json/);
  assert.match(gitignore, /data\/local\//);
  assert.match(gitignore, /\.env/);
});

test("example config exists", async () => {
  const config = JSON.parse(await readFile(new URL("../../config/training-generator.example.json", import.meta.url), "utf8"));
  assert.equal(config.pagesSection, "training");
});
