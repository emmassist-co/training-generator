export function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

export function summarizeExercise(raw) {
  const muscles = [
    ...(raw.primaryMuscles || raw.primary_muscles || []),
    ...(raw.secondaryMuscles || raw.secondary_muscles || []),
    ...(raw.muscles || []),
  ].map(normalizeText).filter(Boolean);
  return {
    id: raw.id,
    name: raw.name,
    category: raw.category || null,
    equipment: raw.equipment || null,
    muscles: [...new Set(muscles)],
    instructions: raw.instructions || [],
    images: raw.images || [],
    risk: raw.risk || classifyExerciseRisk(raw),
    search_text: normalizeText([raw.id, raw.name, raw.category, raw.equipment, muscles.join(" ")].filter(Boolean).join(" ")),
  };
}

export function classifyExerciseRisk(exercise) {
  const text = normalizeText(`${exercise.name || ""} ${exercise.id || ""}`);
  if (/jump|hop|sprint|snatch|clean|jerk|plyometric|shuffle/.test(text)) return "avoid";
  if (/squat|lunge|deadlift|single[- ]leg|step[- ]?up|leg press/.test(text)) return "caution";
  return "prefer";
}

export function createMemoryExerciseCatalog(rawExercises = [], overlays = []) {
  const items = rawExercises.map(summarizeExercise);
  const overlayByExercise = new Map(overlays.map((overlay) => [overlay.exercise_id, overlay]));
  return {
    async search(query = {}) {
      return searchExerciseItems(items, query, overlayByExercise);
    },
    async upsertOverlay(overlay) {
      overlayByExercise.set(overlay.exercise_id, { ...overlay, updated_at: new Date().toISOString() });
      return overlayByExercise.get(overlay.exercise_id);
    },
    async all() {
      return items.map((item) => ({ ...item }));
    },
  };
}

export function createD1ExerciseCatalog(db, { profileId = "default" } = {}) {
  if (!db || typeof db.prepare !== "function") {
    throw new Error("TRAINING_DB D1 binding is required.");
  }
  return {
    async search(query = {}) {
      const [catalogRows, overlayRows] = await Promise.all([
        db.prepare("SELECT * FROM exercise_catalog").all(),
        db.prepare("SELECT exercise_id, preference, note FROM exercise_overlays WHERE profile_id = ?").bind(profileId).all(),
      ]);
      const items = (catalogRows.results || []).map(rowToExerciseItem);
      const overlayByExercise = new Map((overlayRows.results || []).map((overlay) => [overlay.exercise_id, overlay]));
      return searchExerciseItems(items, query, overlayByExercise);
    },
    async upsertOverlay({ exercise_id, preference, note }) {
      await db.prepare("INSERT OR REPLACE INTO exercise_overlays (id, profile_id, exercise_id, preference, note) VALUES (?, ?, ?, ?, ?)")
        .bind(`${profileId}:${exercise_id}`, profileId, exercise_id, preference, note || null)
        .run();
      return { profile_id: profileId, exercise_id, preference, note: note || null };
    },
  };
}

function rowToExerciseItem(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    equipment: row.equipment,
    muscles: JSON.parse(row.muscles_json || "[]"),
    instructions: JSON.parse(row.instructions_json || "[]"),
    images: JSON.parse(row.images_json || "[]"),
    risk: row.risk || "caution",
    search_text: row.search_text || "",
  };
}

export function searchExerciseItems(items, query = {}, overlayByExercise = new Map()) {
  const includeMuscles = (query.include_muscles || query.includeMuscles || []).map(normalizeText).filter(Boolean);
  const excludeIds = new Set((query.exclude_ids || query.excludeIds || []).map(String));
  const allowedRisk = new Set(query.allowed_risk || query.allowedRisk || ["prefer", "caution"]);
  const equipment = new Set((query.equipment || []).map(normalizeText).filter(Boolean));
  const categories = new Set((query.categories || []).map(normalizeText).filter(Boolean));
  const text = normalizeText(query.text || query.q || "");
  const limit = query.limit || 12;

  return items
    .filter((item) => !excludeIds.has(item.id))
    .map((item) => applyOverlay(item, overlayByExercise.get(item.id)))
    .filter((item) => allowedRisk.has(item.risk))
    .filter((item) => !includeMuscles.length || includeMuscles.some((muscle) => item.muscles.includes(muscle)))
    .filter((item) => !equipment.size || equipment.has(normalizeText(item.equipment)))
    .filter((item) => !categories.size || categories.has(normalizeText(item.category)))
    .filter((item) => !text || item.search_text.includes(text))
    .slice(0, limit)
    .map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      equipment: item.equipment,
      muscles: item.muscles,
      risk: item.risk,
      preference: item.preference || null,
      note: item.note || null,
      images: item.images,
    }));
}

function applyOverlay(item, overlay) {
  if (!overlay) return item;
  const preferenceRisk = overlay.preference === "avoid" ? "avoid" : overlay.preference === "prefer" ? "prefer" : item.risk;
  return { ...item, risk: preferenceRisk, preference: overlay.preference, note: overlay.note };
}
