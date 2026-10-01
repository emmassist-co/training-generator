import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const repoRoot = new URL("../..", import.meta.url);

test("agent instructions require propose-before-apply behavior", async () => {
  const instructions = await readFile(new URL("src/agents/instructions/training-coach.md", repoRoot), "utf8");
  assert.match(instructions, /Never silently mutate/i);
  assert.match(instructions, /create a structured change proposal/i);
  assert.match(instructions, /Apply only approved changes/i);
});

test("Flue scaffold declares use agent module and route", async () => {
  const agent = await readFile(new URL("src/agents/training-coach.ts", repoRoot), "utf8");
  const app = await readFile(new URL("src/app.ts", repoRoot), "utf8");
  const vite = await readFile(new URL("vite.config.ts", repoRoot), "utf8");
  const wrangler = await readFile(new URL("wrangler.jsonc", repoRoot), "utf8");

  assert.match(agent, /'use agent'/);
  assert.match(agent, /useModel\(\s*["']openrouter\/moonshotai\/kimi-k2\.6["']/);
  assert.doesNotMatch(agent, /useModel\(\s*["']cloudflare\//);
  assert.doesNotMatch(agent, /OPENROUTER_API_KEY/);
  assert.match(agent, /propose_session_change/);
  assert.match(agent, /apply_approved_change/);
  assert.match(app, /createAgentRouter\(TrainingCoach\)/);
  assert.match(vite, /flue\(\{\s*providers:\s*\[\s*["']openrouter["']\s*\]/s);
  assert.match(wrangler, /FlueTrainingCoachAgent/);
  assert.match(wrangler, /TRAINING_DB/);
});
