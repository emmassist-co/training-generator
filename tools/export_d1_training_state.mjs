#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

if (import.meta.url === new URL(process.argv[1], "file:").href) {
  const args = parseArgs(process.argv.slice(2));
  const input = args.input || path.join(repoRoot, "output", "d1-import-plan.json");
  const output = args.output || path.join(repoRoot, "output", "training-state.export.json");
  const rows = JSON.parse(await readFile(input, "utf8"));
  const state = buildState(rows);
  await writeFile(output, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ ok: true, input, output, session_count: state.sessions.length }, null, 2));
}

export function buildState(rows) {
  const profile = rows.profiles?.[0] || {};
  const exercisesBySession = new Map();
  for (const exercise of rows.session_exercises || []) {
    const list = exercisesBySession.get(exercise.session_id) || [];
    list.push({
      exercise_id: exercise.exercise_id,
      name: exercise.name,
      ...(exercise.prescription_json || {}),
      alternatives: exercise.alternatives_json || [],
      classification: exercise.classification || undefined,
      reason: exercise.rationale || undefined,
    });
    exercisesBySession.set(exercise.session_id, list);
  }
  const telemetryBySession = new Map((rows.session_telemetry || []).map((row) => [row.session_id, row.telemetry_json]));
  return {
    profile: profile.profile_json || {},
    preferences: profile.preferences_json || {},
    planning_feedback_profile: profile.feedback_profile_json || { summary_notes: [], signals: [] },
    sessions: (rows.sessions || []).map((session) => ({
      session_id: session.id,
      title: session.title,
      focus: session.focus_json || [],
      source_training_id: session.source === "tl1" ? session.id : undefined,
      telemetry: telemetryBySession.get(session.id) || undefined,
      exercises: exercisesBySession.get(session.id) || [],
      ...(session.completion_json || {}),
    })),
  };
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith("--")) continue;
    parsed[item.slice(2)] = argv[index + 1];
    index += 1;
  }
  return parsed;
}
