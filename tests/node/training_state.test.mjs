import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const repoRoot = path.resolve(new URL("../..", import.meta.url).pathname);

test("validate-tl1 parses compact training log", async () => {
  const result = await run("python3", ["./tools/training_state.py", "validate-tl1", "--input", "./examples/completed-session-log.txt"], repoRoot);
  assert.equal(result.exitCode, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.schema, "TL1");
  assert.equal(payload.id, "lower-body-strength-a");
  assert.equal(payload.exercise_count, 2);
  assert.equal(payload.exercises[0].swapped, true);
  assert.equal(payload.telemetry.schema_version, 1);
  assert.ok(payload.exercises[0].telemetry);
  assert.ok(Array.isArray(payload.exercises[0].telemetry.active_windows));
  assert.equal(payload.exercises[0].telemetry.next_exercise_start_gap_seconds, 3);
});

test("log-session preserves telemetry from a parsed TL1 payload", async () => {
  const stateRoot = await mkdtemp(path.join(tmpdir(), "training-generator-tl1-log-"));
  const statePath = path.join(stateRoot, "training-state.json");
  const seedState = JSON.parse(await readFile(path.join(repoRoot, "data", "training_state.json"), "utf8"));
  seedState.sessions = [];
  await writeFile(statePath, JSON.stringify(seedState, null, 2), "utf8");

  const tl1Result = await run(
    "python3",
    ["./tools/training_state.py", "validate-tl1", "--input", "./examples/completed-session-log.txt"],
    repoRoot,
  );
  assert.equal(tl1Result.exitCode, 0, tl1Result.stderr);
  const tl1 = JSON.parse(tl1Result.stdout);

  const sessionInputPath = path.join(stateRoot, "session.json");
  await writeFile(
    sessionInputPath,
    JSON.stringify(
      {
        title: tl1.title,
        source_training_id: tl1.id,
        date: "2026-06-03",
        session_type: "strength",
        focus: ["glutes", "hamstrings"],
        summary: "Completed published lower-body strength session.",
        body_response: "good",
        pain_during_10: 2,
        swelling_after: "none",
        confidence_note: "Felt steady throughout.",
        difficulty: tl1.difficulty,
        notes: tl1.notes,
        telemetry: tl1.telemetry,
        exercises: tl1.exercises,
      },
      null,
      2
    ),
    "utf8"
  );

  const extraEnv = { TRAINING_GENERATOR_STATE_PATH: statePath };
  const logResult = await run("python3", ["./tools/training_state.py", "log-session", "--input", sessionInputPath], repoRoot, extraEnv);
  assert.equal(logResult.exitCode, 0, logResult.stderr);
  const logged = JSON.parse(logResult.stdout);

  const readResult = await run(
    "python3",
    ["./tools/training_state.py", "read-session", "--session-id", logged.session_id],
    repoRoot,
    extraEnv
  );
  assert.equal(readResult.exitCode, 0, readResult.stderr);
  const session = JSON.parse(readResult.stdout);

  assert.deepEqual(session.telemetry, tl1.telemetry);
  assert.equal(session.exercises[0].telemetry.swap_count, 1);
  assert.equal(session.exercises[0].telemetry.next_exercise_start_gap_seconds, 3);
  assert.equal(session.exercises[1].telemetry.active_total_seconds, 45);
});

test("validate-tl1 remains compatible with logs that have no telemetry block", async () => {
  const legacyLog = [
    'TL1 ',
    JSON.stringify({
      id: "legacy-session",
      t: "Legacy Session",
      u: "https://example.com/training/legacy",
      sa: "2026-06-01T10:00:00.000Z",
      ea: "2026-06-01T10:20:00.000Z",
      d: "right",
      n: "",
      ex: [
        { s: 1, p: "Goblet Squat", a: "Goblet Squat", sw: 0, ps: "3 sets · 8 reps", cs: 3, st: 3, tt: 0, ok: 1 }
      ]
    })
  ].join("");
  const result = await run("python3", ["./tools/training_state.py", "validate-tl1", "--log", legacyLog], repoRoot);
  assert.equal(result.exitCode, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.id, "legacy-session");
  assert.equal(payload.telemetry, null);
  assert.equal(payload.exercises[0].telemetry, null);
});

test("tl1-to-session produces a reusable session seed", async () => {
  const result = await run("python3", ["./tools/training_state.py", "tl1-to-session", "--input", "./examples/completed-session-log.txt"], repoRoot);
  assert.equal(result.exitCode, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.source_training_id, "lower-body-strength-a");
  assert.equal(payload.date, "2026-06-03");
  assert.equal(payload.duration_min, 42);
  assert.equal(payload.telemetry.schema, "TL1");
  assert.equal(payload.exercises[0].swap_from, "Barbell Hip Thrust");
  assert.equal(payload.exercises[0].telemetry.swap_count, 1);
});

test("summarize-context exposes publish and state context", async () => {
  const result = await run("python3", ["./tools/training_state.py", "summarize-context"], repoRoot);
  assert.equal(result.exitCode, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.ok(payload.profile);
  assert.ok(payload.publish);
  assert.equal(payload.publish.pagesSection, "training");
  assert.ok(typeof payload.state.using_example_state === "boolean");
});

test("read-profile exposes profile and preferences", async () => {
  const result = await run("python3", ["./tools/training_state.py", "read-profile"], repoRoot);
  assert.equal(result.exitCode, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.ok(payload.profile);
  assert.ok(payload.preferences);
  assert.ok(payload.planning_feedback_profile);
});

test("update-profile merges onboarding facts into local state", async () => {
  const stateRoot = await mkdtemp(path.join(tmpdir(), "training-generator-profile-"));
  const statePath = path.join(stateRoot, "training-state.json");
  const seedState = JSON.parse(await readFile(path.join(repoRoot, "data", "training_state.json"), "utf8"));
  seedState.sessions = [];
  await writeFile(statePath, JSON.stringify(seedState, null, 2), "utf8");

  const patchPath = path.join(stateRoot, "profile.json");
  await writeFile(
    patchPath,
    JSON.stringify(
      {
        profile: {
          name: "Alex",
          constraints: ["avoid jumping"],
          training_focus: ["strength", "consistency"]
        },
        preferences: {
          session_duration_min: 45,
          weekly_frequency: 4,
          equipment_access: ["dumbbells", "cable machine"]
        }
      },
      null,
      2
    ),
    "utf8"
  );

  const extraEnv = { TRAINING_GENERATOR_STATE_PATH: statePath };
  const updateResult = await run(
    "python3",
    ["./tools/training_state.py", "update-profile", "--input", patchPath],
    repoRoot,
    extraEnv
  );
  assert.equal(updateResult.exitCode, 0, updateResult.stderr);
  const updated = JSON.parse(updateResult.stdout);
  assert.equal(updated.ok, true);
  assert.equal(updated.profile.name, "Alex");
  assert.equal(updated.preferences.session_duration_min, 45);

  const readResult = await run("python3", ["./tools/training_state.py", "read-profile"], repoRoot, extraEnv);
  assert.equal(readResult.exitCode, 0, readResult.stderr);
  const payload = JSON.parse(readResult.stdout);
  assert.equal(payload.profile.name, "Alex");
  assert.ok(payload.profile.constraints.includes("avoid jumping"));
  assert.equal(payload.preferences.weekly_frequency, 4);
  assert.ok(payload.preferences.equipment_access.includes("dumbbells"));
});

test("update-feedback-profile preserves durable planning preferences", async () => {
  const stateRoot = await mkdtemp(path.join(tmpdir(), "training-generator-feedback-"));
  const statePath = path.join(stateRoot, "training-state.json");
  const seedState = JSON.parse(await readFile(path.join(repoRoot, "data", "training_state.json"), "utf8"));
  seedState.sessions = [];
  await writeFile(statePath, JSON.stringify(seedState, null, 2), "utf8");

  const patchPath = path.join(stateRoot, "feedback.json");
  await writeFile(
    patchPath,
    JSON.stringify(
      {
        summary_notes: [
          "Prefers short lower-body sessions with minimal setup friction."
        ],
        signals: [
          {
            category: "exercise",
            target: "Barbell Hip Thrust",
            preference: "avoid",
            note: "Too much setup friction when the gym is busy.",
            source: "plan-feedback"
          },
          {
            category: "session",
            target: "Lower-body days",
            preference: "shorter",
            note: "About 45 minutes works best.",
            source: "plan-feedback"
          }
        ]
      },
      null,
      2
    ),
    "utf8"
  );

  const extraEnv = { TRAINING_GENERATOR_STATE_PATH: statePath };
  const updateResult = await run(
    "python3",
    ["./tools/training_state.py", "update-feedback-profile", "--input", patchPath],
    repoRoot,
    extraEnv
  );
  assert.equal(updateResult.exitCode, 0, updateResult.stderr);
  const updated = JSON.parse(updateResult.stdout);
  assert.equal(updated.ok, true);
  assert.equal(updated.planning_feedback_profile.signals.length >= 2, true);

  const readResult = await run(
    "python3",
    ["./tools/training_state.py", "read-feedback-profile"],
    repoRoot,
    extraEnv
  );
  assert.equal(readResult.exitCode, 0, readResult.stderr);
  const feedbackProfile = JSON.parse(readResult.stdout);
  assert.ok(feedbackProfile.updated_at);
  assert.ok(feedbackProfile.summary_notes.includes("Prefers short lower-body sessions with minimal setup friction."));
  assert.ok(feedbackProfile.signals.some((signal) => signal.target === "Barbell Hip Thrust" && signal.preference === "avoid"));
  assert.ok(feedbackProfile.signals.some((signal) => signal.category === "session" && signal.preference === "shorter"));
});

test("list-exercises returns primitive exercise summaries", async () => {
  const result = await run("python3", ["./tools/training_state.py", "list-exercises", "--limit", "3"], repoRoot);
  assert.equal(result.exitCode, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(Array.isArray(payload), true);
  assert.equal(payload.length, 3);
  assert.ok(payload[0].id);
  assert.ok(!("instructions" in payload[0]));
});

test("session CRUD works against a local state file", async () => {
  const stateRoot = await mkdtemp(path.join(tmpdir(), "training-generator-state-"));
  const statePath = path.join(stateRoot, "training-state.json");
  const seedState = JSON.parse(await readFile(path.join(repoRoot, "data", "training_state.json"), "utf8"));
  seedState.sessions = [];
  await writeFile(statePath, JSON.stringify(seedState, null, 2), "utf8");

  const sessionInputPath = path.join(stateRoot, "session.json");
  await writeFile(
    sessionInputPath,
    JSON.stringify(
      {
        title: "Tempo Lower A",
        source_training_id: "tempo-lower-a",
        difficulty: "right",
        focus: ["posterior-chain", "conditioning"],
        telemetry: {
          schema_version: 1,
          tick_ms: 100,
          exercises: [
            {
              active_windows: [{ start_seconds: 0.0, end_seconds: 1.2, duration_seconds: 1.2 }],
              active_total_seconds: 1.2,
              wall_elapsed_seconds: 1.2
            }
          ]
        }
      },
      null,
      2
    ),
    "utf8"
  );

  const extraEnv = { TRAINING_GENERATOR_STATE_PATH: statePath };
  const logResult = await run("python3", ["./tools/training_state.py", "log-session", "--input", sessionInputPath], repoRoot, extraEnv);
  assert.equal(logResult.exitCode, 0, logResult.stderr);
  const logged = JSON.parse(logResult.stdout);
  assert.match(logged.session_id, /^20\d{2}-\d{2}-\d{2}-tempo-lower-a-/);

  const listResult = await run("python3", ["./tools/training_state.py", "list-sessions", "--limit", "5"], repoRoot, extraEnv);
  assert.equal(listResult.exitCode, 0, listResult.stderr);
  const sessions = JSON.parse(listResult.stdout);
  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].session_id, logged.session_id);

  const patchPath = path.join(stateRoot, "session-patch.json");
  await writeFile(
    patchPath,
    JSON.stringify(
      {
        difficulty: "hard",
        notes: "Bike felt stronger."
      },
      null,
      2
    ),
    "utf8"
  );

  const updateResult = await run(
    "python3",
    ["./tools/training_state.py", "update-session", "--session-id", logged.session_id, "--input", patchPath],
    repoRoot,
    extraEnv
  );
  assert.equal(updateResult.exitCode, 0, updateResult.stderr);
  const updated = JSON.parse(updateResult.stdout);
  assert.equal(updated.session.difficulty, "hard");

  const readResult = await run(
    "python3",
    ["./tools/training_state.py", "read-session", "--session-id", logged.session_id],
    repoRoot,
    extraEnv
  );
  assert.equal(readResult.exitCode, 0, readResult.stderr);
  const session = JSON.parse(readResult.stdout);
  assert.equal(session.notes, "Bike felt stronger.");
  assert.equal(session.telemetry.schema_version, 1);
  assert.equal(session.telemetry.exercises[0].active_total_seconds, 1.2);

  const deleteResult = await run(
    "python3",
    ["./tools/training_state.py", "delete-session", "--session-id", logged.session_id],
    repoRoot,
    extraEnv
  );
  assert.equal(deleteResult.exitCode, 0, deleteResult.stderr);
  const deleted = JSON.parse(deleteResult.stdout);
  assert.equal(deleted.session.session_id, logged.session_id);
  assert.equal(deleted.session_count, 0);
});

test("evaluate-plan checks history references and planning best practices", async () => {
  const stateRoot = await mkdtemp(path.join(tmpdir(), "training-generator-eval-"));
  const statePath = path.join(stateRoot, "training-state.json");
  const seedState = JSON.parse(await readFile(path.join(repoRoot, "data", "training_state.json"), "utf8"));
  await writeFile(statePath, JSON.stringify(seedState, null, 2), "utf8");

  const sessionsResult = await run("python3", ["./tools/training_state.py", "list-sessions", "--limit", "1"], repoRoot, {
    TRAINING_GENERATOR_STATE_PATH: statePath
  });
  assert.equal(sessionsResult.exitCode, 0, sessionsResult.stderr);
  const [latestSession] = JSON.parse(sessionsResult.stdout);
  assert.ok(latestSession.session_id);

  const planPath = path.join(stateRoot, "plan.json");
  await writeFile(
    planPath,
    JSON.stringify(
      {
        title: "Posterior Chain Reset",
        goal: "Controlled posterior-chain work that avoids pushing the same lower-body pattern harder.",
        notes: [
          "Keep the dose controlled instead of repeating the same lower-body load jump.",
          "Use this as a confidence-building bridge off the last session."
        ],
        planning_context: {
          recent_sessions_considered: [latestSession.session_id],
          influences: [
            {
              source_session_id: latestSession.session_id,
              observation: "The last session already covered lower-body strength with goblet squat and RDL work.",
              adjustment: "Keep this session controlled, stay posterior-chain biased, and avoid a higher-load repeat of the same pattern."
            }
          ]
        },
        exercises: [
          {
            name: "Barbell Hip Thrust",
            sets: 4,
            reps: 8,
            rest_seconds: 90,
            classification: "favorable",
            reason: "Posterior-chain emphasis without pushing the same squat stressor.",
            alternatives: [
              {
                name: "Barbell Glute Bridge",
                sets: 4,
                reps: 8,
                rest_seconds: 90
              }
            ]
          },
          {
            name: "Ball Leg Curl",
            sets: 3,
            reps: 10,
            rest_seconds: 60,
            classification: "favorable",
            reason: "Keeps knee loading controlled while building hamstring tolerance.",
            alternatives: []
          }
        ]
      },
      null,
      2
    ),
    "utf8"
  );

  const evalResult = await run("python3", ["./tools/training_state.py", "evaluate-plan", "--input", planPath], repoRoot, {
    TRAINING_GENERATOR_STATE_PATH: statePath
  });
  assert.equal(evalResult.exitCode, 0, evalResult.stderr);
  const payload = JSON.parse(evalResult.stdout);
  assert.equal(payload.ok, true);
  assert.equal(payload.score.passed, payload.score.total);
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
