#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stableId } from "../src/db/training-store.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

if (import.meta.url === new URL(process.argv[1], "file:").href) {
  const args = parseArgs(process.argv.slice(2));
  const input = args.input || process.env.TRAINING_GENERATOR_STATE_PATH || path.join(repoRoot, "data", "local", "training-state.json");
  const fallback = path.join(repoRoot, "data", "training_state.json");
  const output = args.output || path.join(repoRoot, "output", "d1-import-plan.json");
  const dryRun = args["dry-run"] !== "false";

  let state;
  try {
    state = JSON.parse(await readFile(input, "utf8"));
  } catch {
    state = JSON.parse(await readFile(fallback, "utf8"));
  }

  const plan = buildImportPlan(state);
  await writeFile(output, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ ok: true, dry_run: dryRun, output, counts: Object.fromEntries(Object.entries(plan).map(([key, rows]) => [key, rows.length])) }, null, 2));
}

export function buildImportPlan(state) {
  const profileId = "default";
  const profiles = [{
    id: profileId,
    profile_json: state.profile || {},
    preferences_json: state.preferences || {},
    feedback_profile_json: state.planning_feedback_profile || {},
  }];
  const sessions = [];
  const session_exercises = [];
  const session_telemetry = [];
  for (const session of state.sessions || []) {
    const sessionId = session.session_id || stableId("session", session);
    sessions.push({
      id: sessionId,
      profile_id: profileId,
      title: session.title || "Training Session",
      status: session.status || "completed",
      focus_json: session.focus || [],
      source: session.source_training_id ? "tl1" : "local-state",
      completed_at: session.completed_at || session.date || null,
      completion_json: session,
    });
    if (session.telemetry) session_telemetry.push({ session_id: sessionId, telemetry_json: session.telemetry });
    for (const [position, exercise] of (session.exercises || []).entries()) {
      session_exercises.push({
        id: `${sessionId}:ex:${position + 1}`,
        session_id: sessionId,
        position,
        exercise_id: exercise.exercise_id || exercise.id || null,
        name: exercise.name || exercise.actual || exercise.planned || "Exercise",
        prescription_json: exercise.prescription || { sets: exercise.sets, reps: exercise.reps, duration: exercise.duration },
        alternatives_json: exercise.alternatives || [],
        rationale: exercise.reason || "",
        classification: exercise.classification || null,
      });
    }
  }
  return { profiles, sessions, session_exercises, session_telemetry };
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith("--")) continue;
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) parsed[item.slice(2)] = true;
    else {
      parsed[item.slice(2)] = next;
      index += 1;
    }
  }
  return parsed;
}
