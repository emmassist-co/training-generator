import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const repoRoot = path.resolve(new URL("../..", import.meta.url).pathname);

test("training generation flow uses saved history, passes eval, and renders HTML", async () => {
  const tempRoot = await mkdtemp(path.join(tmpdir(), "training-generation-flow-"));
  const statePath = path.join(tempRoot, "training-state.json");
  const planPath = path.join(tempRoot, "generated-plan.json");
  const htmlPath = path.join(tempRoot, "generated-plan.html");

  const seedState = JSON.parse(await readFile(path.join(repoRoot, "data", "training_state.json"), "utf8"));
  await writeFile(statePath, JSON.stringify(seedState, null, 2), "utf8");

  const env = { TRAINING_GENERATOR_STATE_PATH: statePath };

  const generateResult = await run(
    "python3",
    ["./tools/generate_training_plan.py", "--output", planPath],
    repoRoot,
    env
  );
  assert.equal(generateResult.exitCode, 0, generateResult.stderr);

  const plan = JSON.parse(await readFile(planPath, "utf8"));
  assert.ok(typeof plan.title === "string" && plan.title.length > 0);
  assert.ok(Array.isArray(plan.planning_context.recent_sessions_considered));
  assert.ok(plan.planning_context.recent_sessions_considered.length >= 1);
  assert.ok(Array.isArray(plan.planning_context.influences));
  assert.ok(plan.planning_context.influences[0].adjustment.length > 10);
  assert.equal(plan.exercises.some((exercise) => exercise.name === "Goblet Squat"), false);

  const candidateBuckets = plan.planning_context.candidate_buckets;
  assert.ok(candidateBuckets);
  assert.ok(Object.values(candidateBuckets).every((bucket) => Array.isArray(bucket) && bucket.length >= 2));

  const primaryIds = new Set(plan.exercises.map((exercise) => exercise.exercise_id));
  for (const exercise of plan.exercises) {
    for (const alternative of exercise.alternatives ?? []) {
      assert.notEqual(alternative.exercise_id, exercise.exercise_id);
      assert.equal(primaryIds.has(alternative.exercise_id), false);
    }
  }

  const evalResult = await run(
    "python3",
    ["./tools/training_state.py", "evaluate-plan", "--input", planPath],
    repoRoot,
    env
  );
  assert.equal(evalResult.exitCode, 0, evalResult.stderr);
  const evaluation = JSON.parse(evalResult.stdout);
  assert.equal(evaluation.ok, true);
  assert.equal(evaluation.score.passed, evaluation.score.total);

  const renderResult = await run(
    "python3",
    ["./tools/render_training_plan.py", "--input", planPath, "--output", htmlPath],
    repoRoot,
    env
  );
  assert.equal(renderResult.exitCode, 0, renderResult.stderr);
  const html = await readFile(htmlPath, "utf8");
  assert.match(html, new RegExp(plan.title));
  assert.match(html, new RegExp(plan.exercises[0].name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("training generation surfaces practical machine hamstring candidates for commercial gym context", async () => {
  const tempRoot = await mkdtemp(path.join(tmpdir(), "training-generation-machines-"));
  const statePath = path.join(tempRoot, "training-state.json");
  const planPath = path.join(tempRoot, "generated-plan.json");

  const seedState = JSON.parse(await readFile(path.join(repoRoot, "data", "training_state.json"), "utf8"));
  seedState.preferences = {
    ...seedState.preferences,
    equipment_access: ["commercial gym", "machine", "cable", "barbell", "dumbbell"],
  };
  await writeFile(statePath, JSON.stringify(seedState, null, 2), "utf8");

  const env = { TRAINING_GENERATOR_STATE_PATH: statePath };
  const generateResult = await run(
    "python3",
    ["./tools/generate_training_plan.py", "--output", planPath],
    repoRoot,
    env
  );
  assert.equal(generateResult.exitCode, 0, generateResult.stderr);

  const plan = JSON.parse(await readFile(planPath, "utf8"));
  const hamstringCandidates = plan.planning_context.candidate_buckets.hamstring_accessory.map((candidate) => candidate.name);
  assert.ok(hamstringCandidates.includes("Seated Leg Curl"));
  assert.ok(hamstringCandidates.includes("Lying Leg Curls"));
  assert.ok(plan.exercises.some((exercise) => exercise.name === "Seated Leg Curl" || exercise.name === "Lying Leg Curls"));
});

test("training generation rotates away from repeated lower sessions when feedback asks for it", async () => {
  const tempRoot = await mkdtemp(path.join(tmpdir(), "training-generation-rotation-"));
  const statePath = path.join(tempRoot, "training-state.json");
  const planPath = path.join(tempRoot, "generated-plan.json");

  const seedState = JSON.parse(await readFile(path.join(repoRoot, "data", "training_state.json"), "utf8"));
  seedState.planning_feedback_profile = {
    updated_at: "2026-07-03T11:20:16",
    summary_notes: [],
    signals: [
      {
        category: "progression",
        target: "Session-to-session exercise selection",
        preference: "rotate",
        note: "Keep some anchors if useful, but rotate more when sessions start feeling too similar.",
        source: "session-feedback",
        updated_at: "2026-07-03T11:20:16",
      },
    ],
  };
  seedState.sessions = [
    {
      date: "2026-06-30",
      session_type: "strength",
      focus: ["knee-friendly lower body", "posterior chain", "trunk"],
      summary: "Lower session one.",
      body_response: "good",
      pain_during_10: 0,
      swelling_after: "none",
      confidence_note: "Fine.",
      exercises: [
        { name: "Leg Press" },
        { name: "Barbell Hip Thrust" },
      ],
    },
    {
      date: "2026-07-02",
      session_type: "strength",
      focus: ["knee-friendly lower body", "posterior chain", "trunk"],
      summary: "Lower session two.",
      body_response: "good",
      pain_during_10: 0,
      swelling_after: "none",
      confidence_note: "Fine.",
      exercises: [
        { name: "Leg Press" },
        { name: "Dead Bug" },
      ],
    },
  ];
  await writeFile(statePath, JSON.stringify(seedState, null, 2), "utf8");

  const env = { TRAINING_GENERATOR_STATE_PATH: statePath };
  const generateResult = await run(
    "python3",
    ["./tools/generate_training_plan.py", "--output", planPath],
    repoRoot,
    env
  );
  assert.equal(generateResult.exitCode, 0, generateResult.stderr);

  const plan = JSON.parse(await readFile(planPath, "utf8"));
  assert.equal(plan.title, "Full Body Strength Builder");
  assert.ok(plan.notes.some((note) => note.includes("more exercise rotation")));
  assert.ok(plan.exercises.some((exercise) => exercise.name === "Dumbbell Bench Press with Neutral Grip" || exercise.name === "Alternating Floor Press"));
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
