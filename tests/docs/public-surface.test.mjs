import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("README presents a generic training generator", async () => {
  const readme = await readFile(new URL("../../README.md", import.meta.url), "utf8");
  assert.match(readme, /# Training Generator/);
  assert.match(readme, /own Cloudflare Pages site/);
  assert.match(readme, /agent-native/i);
  assert.doesNotMatch(readme, /\bacl\b/i);
});

test("package metadata is generic", async () => {
  const pkg = JSON.parse(await readFile(new URL("../../package.json", import.meta.url), "utf8"));
  assert.equal(pkg.name, "training-generator");
  assert.ok(pkg.scripts.test);
  assert.ok(pkg.scripts.help);
  assert.ok(pkg.scripts.init);
  assert.ok(pkg.scripts["plan:generate"]);
  assert.ok(pkg.scripts["render:html"]);
  assert.ok(pkg.scripts["render:module-check"]);
  assert.ok(pkg.scripts["artifacts:list"]);
  assert.ok(pkg.scripts["artifacts:delete"]);
  assert.ok(pkg.scripts["html:stage"]);
  assert.ok(pkg.scripts["html:deploy-site"]);
  assert.ok(pkg.scripts["html:list-published"]);
  assert.ok(pkg.scripts["html:delete-published"]);
  assert.ok(pkg.scripts["state:read"]);
  assert.ok(pkg.scripts["state:read-profile"]);
  assert.ok(pkg.scripts["state:list-sessions"]);
  assert.ok(pkg.scripts["state:update-session"]);
  assert.ok(pkg.scripts["state:delete-session"]);
  assert.ok(pkg.scripts["state:list-exercises"]);
  assert.ok(pkg.scripts["state:summarize-context"]);
  assert.ok(pkg.scripts["state:validate-log"]);
  assert.ok(pkg.scripts["state:tl1-to-session"]);
  assert.ok(pkg.scripts["state:eval-plan"]);
});

test("agent-native architecture doc exists", async () => {
  const doc = await readFile(new URL("../../docs/agent-native.md", import.meta.url), "utf8");
  assert.match(doc, /agent-native/i);
  assert.match(doc, /Capability Map/);
  assert.match(doc, /TL1/);
  assert.match(doc, /npm run help/);
});
