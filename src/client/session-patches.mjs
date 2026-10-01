const SUPPORTED_PATCH_TYPES = new Set(["replace_exercise", "update_prescription", "add_note"]);

export function validateSessionPatch(patch) {
  if (!patch || typeof patch !== "object") return { ok: false, error: "Patch must be an object." };
  const operations = Array.isArray(patch.operations) ? patch.operations : [patch];
  if (!operations.length) return { ok: false, error: "Patch must contain at least one operation." };
  for (const operation of operations) {
    if (!SUPPORTED_PATCH_TYPES.has(operation.type)) {
      return { ok: false, error: `Unsupported patch operation: ${operation.type || "unknown"}.` };
    }
    if ((operation.type === "replace_exercise" || operation.type === "update_prescription") && !operation.session_exercise_id) {
      return { ok: false, error: `${operation.type} requires session_exercise_id.` };
    }
    if (operation.type === "replace_exercise" && !operation.name && !operation.exercise_id) {
      return { ok: false, error: "replace_exercise requires a replacement name or exercise_id." };
    }
  }
  return { ok: true, operations };
}

export function previewSessionPatch(session, patch) {
  const validation = validateSessionPatch(patch);
  if (!validation.ok) return { ok: false, error: validation.error };
  return { ok: true, session: applySessionPatch(session, patch, { preview: true }) };
}

export function applySessionPatch(session, patch, { preview = false } = {}) {
  const validation = validateSessionPatch(patch);
  if (!validation.ok) throw new Error(validation.error);
  const next = structuredClone(session);
  next.exercises = next.exercises || [];
  for (const operation of validation.operations) {
    if (operation.type === "add_note") {
      next.notes = [...(next.notes || []), operation.note || ""];
      continue;
    }
    const exercise = next.exercises.find((item) => item.id === operation.session_exercise_id || item.session_exercise_id === operation.session_exercise_id);
    if (!exercise) throw new Error(`Exercise not found: ${operation.session_exercise_id}`);
    if (operation.type === "replace_exercise") {
      exercise.previous_name = exercise.previous_name || exercise.name;
      exercise.exercise_id = operation.exercise_id || exercise.exercise_id;
      exercise.name = operation.name || exercise.name;
      exercise.prescription = { ...(exercise.prescription || {}), ...(operation.prescription || {}) };
      exercise.reason = operation.reason || exercise.reason;
    }
    if (operation.type === "update_prescription") {
      exercise.prescription = { ...(exercise.prescription || {}), ...(operation.prescription || {}) };
    }
  }
  if (!preview) next.active_version = (next.active_version || 1) + 1;
  return next;
}
