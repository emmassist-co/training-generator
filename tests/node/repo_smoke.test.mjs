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
  assert.equal(config.statePath, "data/local/training-state.json");
  assert.equal("profilePack" in config, false);
});

test("example session artifacts exist", async () => {
  const session = JSON.parse(await readFile(new URL("../../examples/lower-body-strength-a.session.json", import.meta.url), "utf8"));
  const log = await readFile(new URL("../../examples/completed-session-log.txt", import.meta.url), "utf8");
  const upper = JSON.parse(await readFile(new URL("../../examples/upper-body-strength-b.session.json", import.meta.url), "utf8"));
  const upperLog = await readFile(new URL("../../examples/upper-body-strength-b.completed-log.txt", import.meta.url), "utf8");
  const conditioning = JSON.parse(await readFile(new URL("../../examples/conditioning-circuit.session.json", import.meta.url), "utf8"));
  const conditioningLog = await readFile(new URL("../../examples/conditioning-circuit.completed-log.txt", import.meta.url), "utf8");
  assert.equal(session.title, "Lower Body Strength A");
  assert.match(log, /^TL1 /);
  assert.equal(upper.title, "Upper Body Strength B");
  assert.match(upperLog, /^TL1 /);
  assert.equal(conditioning.title, "Conditioning Circuit");
  assert.match(conditioningLog, /^TL1 /);
  assert.equal(conditioning.exercises.some((exercise) => Boolean(exercise.duration)), true);
});

test("agent-native skills exist", async () => {
  const renderSkill = await readFile(new URL("../../.codex/skills/render-training-artifacts/SKILL.md", import.meta.url), "utf8");
  const runtimeSkill = await readFile(new URL("../../.codex/skills/test-training-session-runtime/SKILL.md", import.meta.url), "utf8");
  const discoverSkill = await readFile(new URL("../../.codex/skills/discover-training-workflows/SKILL.md", import.meta.url), "utf8");
  assert.match(renderSkill, /render existing training session JSON/i);
  assert.match(runtimeSkill, /smoke-test the interactive workout runtime/i);
  assert.match(discoverSkill, /what the repo can do/i);
});
