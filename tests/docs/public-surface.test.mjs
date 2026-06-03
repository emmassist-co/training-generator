import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("README presents a generic training generator", async () => {
  const readme = await readFile(new URL("../../README.md", import.meta.url), "utf8");
  assert.match(readme, /# Training Generator/);
  assert.match(readme, /own Cloudflare Pages site/);
  assert.doesNotMatch(readme, /\bacl\b/i);
});

test("package metadata is generic", async () => {
  const pkg = JSON.parse(await readFile(new URL("../../package.json", import.meta.url), "utf8"));
  assert.equal(pkg.name, "training-generator");
  assert.ok(pkg.scripts.test);
  assert.ok(pkg.scripts.init);
});
