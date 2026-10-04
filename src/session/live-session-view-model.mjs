import { deriveSessionLiveState } from "../db/training-store.mjs";

export const EXERCISE_IMAGE_BASE = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/";

const COMPACT_VALUE_LIMIT = 22;

function isCompactValue(value) {
  return String(value ?? "").length <= COMPACT_VALUE_LIMIT;
}

export function conciseLoadValue(load) {
  if (!load) return "";
  const text = String(load).trim();
  if (isCompactValue(text)) return text;
  const weightedMatch = text.match(/\b\d+(?:\.\d+)?\s?(?:kg|lb|lbs)\b/i);
  if (weightedMatch) return weightedMatch[0].replace(/\s+/, " ");
  const numberMatch = text.match(/\b\d+(?:\.\d+)?\b/);
  return numberMatch ? numberMatch[0] : "";
}

export function prescriptionNotes(prescription = {}) {
  const notes = [];
  if (prescription.load && !isCompactValue(prescription.load)) notes.push(String(prescription.load));
  return notes;
}

function prescribedSetCount(prescription = {}) {
  const value = Number.parseInt(String(prescription.sets ?? ""), 10);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function currentSetForExercise(exercise = {}, loggedSets = []) {
  const total = prescribedSetCount(exercise.prescription);
  const savedCount = loggedSets.length;
  const isComplete = Boolean(total && savedCount >= total);
  const nextNumber = total ? Math.min(savedCount + 1, total) : savedCount + 1;
  return {
    number: nextNumber,
    total,
    planned_set_total: total,
    saved_count: savedCount,
    is_complete: isComplete,
    primary_action_label: isComplete ? "Add extra set" : "Log set",
    label: isComplete ? `All ${total} sets logged` : total ? `Set ${nextNumber} of ${total}` : `Set ${nextNumber}`,
    target_reps: exercise.prescription?.reps || "",
    target_load: conciseLoadValue(exercise.prescription?.load),
    target_rest_seconds: exercise.prescription?.rest_seconds || null,
  };
}

function savedSetSummaries(loggedSets = []) {
  return loggedSets.map((set, index) => ({
    reps: set.reps || "",
    load: set.load || "",
    note: set.note || "",
    label: `Set ${index + 1}`,
  }));
}

function compactPlanNote(notes = []) {
  const first = notes[0] || "";
  return first.length > 96 ? `${first.slice(0, 93).trim()}…` : first;
}

export function prescriptionText(prescription = {}) {
  const parts = [];
  const load = conciseLoadValue(prescription.load);
  if (prescription.sets) parts.push(`${prescription.sets} sets`);
  if (prescription.reps) parts.push(`${prescription.reps} reps`);
  if (prescription.duration) parts.push(String(prescription.duration));
  if (load) parts.push(load);
  if (prescription.rest_seconds) parts.push(`${prescription.rest_seconds}s rest`);
  else if (prescription.rest) parts.push(String(prescription.rest));
  return parts.join(" · ") || "As prescribed";
}

export function prescriptionMetricItems(prescription = {}) {
  const metrics = [];
  const load = conciseLoadValue(prescription.load);
  if (prescription.sets) metrics.push({ key: "sets", label: "Sets", value: prescription.sets, icon: "↻" });
  if (prescription.reps) metrics.push({ key: "reps", label: "Reps", value: prescription.reps, icon: "#" });
  if (load) metrics.push({ key: "load", label: "Load", value: load, icon: "◆" });
  if (prescription.duration) metrics.push({ key: "time", label: "Time", value: prescription.duration, icon: "◷" });
  if (prescription.rest_seconds) metrics.push({ key: "rest", label: "Rest", value: `${prescription.rest_seconds}s`, icon: "⌁" });
  else if (prescription.rest) metrics.push({ key: "rest", label: "Rest", value: prescription.rest, icon: "⌁" });
  return metrics;
}

export function firstExerciseImage(exercise = {}) {
  const image = exercise.images?.[0];
  if (image) return image.startsWith("http") ? image : `${EXERCISE_IMAGE_BASE}${encodeURI(image)}`;
  if (exercise.exercise_id) return `${EXERCISE_IMAGE_BASE}${encodeURIComponent(exercise.exercise_id)}/0.jpg`;
  return null;
}

export function pendingSessionProposals(events = []) {
  const resolvedProposalIds = new Set(events
    .filter((event) => event.type === "proposal_accepted" || event.type === "proposal_rejected")
    .map((event) => event.payload?.proposal_id)
    .filter(Boolean));
  return events
    .filter((event) => event.type === "proposal_created" && !resolvedProposalIds.has(event.id))
    .map((event) => ({ id: event.id, reason: event.reason, patch: event.payload?.patch || null }));
}

export function buildLiveSessionViewModel(session = {}) {
  const exercises = session.exercises || [];
  const liveState = deriveSessionLiveState(session);
  const completed = new Set(liveState.completed_exercise_ids || []);
  const isCompleted = session.status === "completed";
  const latestNote = liveState.notes?.at(-1)?.text || "";

  return {
    session: {
      id: session.id,
      title: session.title || "Training Session",
      profile_id: session.profile_id || "default",
      status: session.status || "planned",
      active_version: session.active_version,
      summary: session.summary || "Train from one focused exercise card. Reps, load, timer, notes, and coach-readable logs save while you work.",
      is_completed: isCompleted,
    },
    progress: {
      completed_count: completed.size,
      exercise_count: exercises.length,
      completed_exercise_ids: [...completed],
      has_exercises: exercises.length > 0,
    },
    notes: { latest: latestNote },
    proposals: pendingSessionProposals(session.events || []),
    exercises: exercises.map((exercise, index) => {
      const loggedSets = liveState.set_logs?.filter((set) => (set.session_exercise_id || set.exercise_id) === exercise.id) || [];
      const notes = prescriptionNotes(exercise.prescription);
      const image = firstExerciseImage(exercise);
      const latestSet = loggedSets.at(-1) || {};
      return {
        ...exercise,
        index,
        is_done: completed.has(exercise.id),
        prescription_text: prescriptionText(exercise.prescription),
        prescription_notes: notes,
        plan_note: { compact: compactPlanNote(notes), full: notes.join("\n\n") },
        current_set: currentSetForExercise(exercise, loggedSets),
        saved_sets: savedSetSummaries(loggedSets),
        metrics: prescriptionMetricItems(exercise.prescription),
        media: {
          image,
          caption: exercise.equipment || exercise.category || "Exercise demo",
          fallback_letter: (exercise.name?.[0] || "T").toUpperCase(),
        },
        has_optional_details: Boolean(image || exercise.rationale || exercise.alternatives?.length || notes.length),
        logged_set_count: loggedSets.length,
        initial_reps: exercise.prescription?.reps || 0,
        initial_load: conciseLoadValue(exercise.prescription?.load) || 0,
        input_reps: latestSet.reps || exercise.prescription?.reps || "",
        input_load: latestSet.load || conciseLoadValue(exercise.prescription?.load),
      };
    }),
    runtime: {
      session: {
        id: session.id,
        active_version: session.active_version,
        status: session.status,
        completed_exercise_ids: liveState.completed_exercise_ids,
        set_logs: liveState.set_logs,
        exercise_count: exercises.length,
      },
      exerciseNames: exercises.map((exercise) => exercise.name),
    },
  };
}
