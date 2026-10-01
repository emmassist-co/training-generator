import crypto from "node:crypto";

const DEFAULT_PROFILE_ID = "default";

export function nowIso() {
  return new Date().toISOString();
}

export function stableId(prefix, payload) {
  const digest = crypto
    .createHash("sha1")
    .update(stableStringify(payload))
    .digest("hex")
    .slice(0, 10);
  return `${prefix}_${digest}`;
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

export function createMemoryTrainingStore(seed = {}) {
  const profiles = new Map();
  const sessions = new Map();
  const exercises = new Map();
  const events = new Map();
  const telemetry = new Map();
  const artifacts = new Map();

  if (seed.profile || seed.preferences || seed.planning_feedback_profile) {
    profiles.set(DEFAULT_PROFILE_ID, {
      id: DEFAULT_PROFILE_ID,
      profile: clone(seed.profile || {}),
      preferences: clone(seed.preferences || {}),
      planning_feedback_profile: clone(seed.planning_feedback_profile || {}),
      created_at: nowIso(),
      updated_at: nowIso(),
    });
  }

  for (const session of seed.sessions || []) {
    const sessionId = session.session_id || session.id || stableId("session", session);
    sessions.set(sessionId, {
      id: sessionId,
      profile_id: DEFAULT_PROFILE_ID,
      title: session.title || "Training Session",
      status: session.status || "completed",
      focus: clone(session.focus || []),
      summary: session.summary || "",
      source: session.source || "import",
      active_version: session.active_version || 1,
      planned_at: session.planned_at || session.date || nowIso(),
      started_at: session.started_at || session.startedAt || null,
      completed_at: session.completed_at || session.completedAt || null,
      completion: clone(session),
      agent_conversation_url: session.agent_conversation_url || null,
    });
    telemetry.set(sessionId, clone(session.telemetry || null));
    for (const [position, exercise] of (session.exercises || []).entries()) {
      const exerciseRow = normalizeExercise(sessionId, exercise, position);
      exercises.set(exerciseRow.id, exerciseRow);
    }
  }

  function listSessionEvents(sessionId) {
    return [...events.values()]
      .filter((event) => event.session_id === sessionId)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  function getSessionSnapshot(sessionId) {
    const session = sessions.get(sessionId);
    if (!session) return null;
    return {
      ...clone(session),
      exercises: [...exercises.values()]
        .filter((exercise) => exercise.session_id === sessionId && exercise.is_active !== false)
        .sort((a, b) => a.position - b.position)
        .map(clone),
      events: listSessionEvents(sessionId),
      telemetry: clone(telemetry.get(sessionId) || null),
    };
  }

  return {
    async listProfiles() {
      return [...profiles.values()].map((profile) => ({
        id: profile.id,
        name: profile.profile?.name || profile.id,
        updated_at: profile.updated_at,
      }));
    },

    async upsertProfile({ id = DEFAULT_PROFILE_ID, profile = {}, preferences = {}, planning_feedback_profile = {} }) {
      const current = profiles.get(id) || { id, created_at: nowIso() };
      const row = {
        ...current,
        profile: clone(profile),
        preferences: clone(preferences),
        planning_feedback_profile: clone(planning_feedback_profile),
        updated_at: nowIso(),
      };
      profiles.set(id, row);
      return clone(row);
    },

    async getTrainingContext({ profileId = DEFAULT_PROFILE_ID, recentLimit = 5 } = {}) {
      const profile = profiles.get(profileId) || {
        id: profileId,
        profile: {},
        preferences: {},
        planning_feedback_profile: { summary_notes: [], signals: [] },
      };
      const recent_sessions = [...sessions.values()]
        .filter((session) => session.profile_id === profileId)
        .sort((a, b) => String(b.completed_at || b.planned_at).localeCompare(String(a.completed_at || a.planned_at)))
        .slice(0, recentLimit)
        .map((session) => ({
          id: session.id,
          title: session.title,
          status: session.status,
          focus: clone(session.focus),
          completed_at: session.completed_at,
          active_version: session.active_version,
        }));
      return {
        profile: clone(profile.profile),
        preferences: clone(profile.preferences),
        planning_feedback_profile: clone(profile.planning_feedback_profile),
        recent_sessions,
      };
    },

    async createSession(input) {
      const sessionId = input.id || input.session_id || stableId("session", {
        title: input.title,
        exercises: input.exercises,
        planned_at: input.planned_at || input.date || nowIso(),
      });
      const session = {
        id: sessionId,
        profile_id: input.profile_id || DEFAULT_PROFILE_ID,
        title: input.title || "Training Session",
        status: input.status || "planned",
        focus: clone(input.focus || []),
        summary: input.summary || "",
        source: input.source || "hosted",
        active_version: input.active_version || 1,
        planned_at: input.planned_at || nowIso(),
        started_at: input.started_at || null,
        completed_at: input.completed_at || null,
        completion: input.completion || null,
        agent_conversation_url: input.agent_conversation_url || null,
      };
      sessions.set(sessionId, session);
      for (const [position, rawExercise] of (input.exercises || []).entries()) {
        const exercise = normalizeExercise(sessionId, rawExercise, position);
        exercises.set(exercise.id, exercise);
      }
      if (input.telemetry) telemetry.set(sessionId, clone(input.telemetry));
      await this.logSessionEvent({
        session_id: sessionId,
        type: "session_created",
        payload: { title: session.title, exercise_count: input.exercises?.length || 0 },
        idempotency_key: `session_created:${sessionId}`,
      });
      return getSessionSnapshot(sessionId);
    },

    async getSession(sessionId) {
      return getSessionSnapshot(sessionId);
    },

    async proposeSessionChange({ session_id, proposal_id, patch, reason, created_by = "agent" }) {
      if (!sessions.has(session_id)) throw new Error(`Session not found: ${session_id}`);
      const proposalId = proposal_id || stableId("proposal", { session_id, patch, reason });
      await this.logSessionEvent({
        id: proposalId,
        session_id,
        type: "proposal_created",
        payload: { patch: clone(patch), created_by },
        reason,
        idempotency_key: `proposal:${proposalId}`,
      });
      return { proposal_id: proposalId, session_id, patch: clone(patch), reason, status: "proposed" };
    },

    async applyApprovedChange({ session_id, proposal_id, patch, approved_by = "user", idempotency_key }) {
      const session = sessions.get(session_id);
      if (!session) throw new Error(`Session not found: ${session_id}`);
      const resolvedPatch = patch || [...events.values()].find((event) => event.session_id === session_id && event.id === proposal_id)?.payload?.patch;
      if (!resolvedPatch) throw new Error("applyApprovedChange requires a patch or a proposal_id with a saved patch.");
      const key = idempotency_key || `apply:${proposal_id || stableId("patch", resolvedPatch)}`;
      const existing = [...events.values()].find((event) => event.session_id === session_id && event.idempotency_key === key);
      if (existing) return getSessionSnapshot(session_id);

      const nextVersion = session.active_version + 1;
      applyPatchToExercises({ exercises, session_id, patch: resolvedPatch, version: nextVersion });
      sessions.set(session_id, { ...session, active_version: nextVersion });
      await this.logSessionEvent({
        session_id,
        type: "proposal_accepted",
        version: nextVersion,
        payload: { proposal_id, patch: clone(resolvedPatch) },
        idempotency_key: key,
        approved_by,
      });
      return getSessionSnapshot(session_id);
    },

    async rejectProposal({ session_id, proposal_id, reason, idempotency_key }) {
      await this.logSessionEvent({
        session_id,
        type: "proposal_rejected",
        payload: { proposal_id },
        reason,
        idempotency_key: idempotency_key || `reject:${proposal_id}`,
      });
      return getSessionSnapshot(session_id);
    },

    async logSessionEvent({ id, session_id, type, version, payload = {}, idempotency_key, approved_by, reason }) {
      if (!sessions.has(session_id)) throw new Error(`Session not found: ${session_id}`);
      if (idempotency_key) {
        const existing = [...events.values()].find((event) => event.session_id === session_id && event.idempotency_key === idempotency_key);
        if (existing) return clone(existing);
      }
      const event = {
        id: id || stableId("event", { session_id, type, payload, idempotency_key, at: nowIso() }),
        session_id,
        type,
        version: version || sessions.get(session_id).active_version,
        payload: clone(payload),
        idempotency_key: idempotency_key || null,
        approved_by: approved_by || null,
        reason: reason || null,
        created_at: nowIso(),
      };
      events.set(event.id, event);
      return clone(event);
    },

    async completeSession({ session_id, completion = {}, telemetry: telemetryPayload, idempotency_key }) {
      const session = sessions.get(session_id);
      if (!session) throw new Error(`Session not found: ${session_id}`);
      sessions.set(session_id, {
        ...session,
        status: "completed",
        completed_at: completion.completed_at || nowIso(),
        completion: clone(completion),
      });
      if (telemetryPayload) telemetry.set(session_id, clone(telemetryPayload));
      await this.logSessionEvent({
        session_id,
        type: "session_completed",
        payload: { completion: clone(completion), telemetry: clone(telemetryPayload || null) },
        idempotency_key: idempotency_key || `complete:${session_id}`,
      });
      return getSessionSnapshot(session_id);
    },

    _debug() {
      return { profiles, sessions, exercises, events, telemetry, artifacts };
    },
  };
}

export function normalizeExercise(sessionId, rawExercise, position) {
  return {
    id: rawExercise.id || rawExercise.session_exercise_id || `${sessionId}:ex:${position + 1}`,
    session_id: sessionId,
    position,
    exercise_id: rawExercise.exercise_id || rawExercise.id || null,
    name: rawExercise.name || rawExercise.actual || rawExercise.planned || "Exercise",
    prescription: {
      ...(rawExercise.prescription || {}),
      sets: rawExercise.sets ?? rawExercise.prescription?.sets ?? null,
      reps: rawExercise.reps ?? rawExercise.prescription?.reps ?? null,
      duration: rawExercise.duration ?? rawExercise.prescription?.duration ?? null,
      rest_seconds: rawExercise.rest_seconds ?? rawExercise.prescription?.rest_seconds ?? null,
      rest: rawExercise.rest ?? rawExercise.prescription?.rest ?? null,
      load: rawExercise.load || rawExercise.prescription?.load || null,
    },
    alternatives: clone(rawExercise.alternatives || []),
    rationale: rawExercise.reason || rawExercise.rationale || "",
    classification: rawExercise.classification || null,
    version: rawExercise.version || 1,
    is_active: rawExercise.is_active ?? true,
  };
}

export function applyPatchToExercises({ exercises, session_id, patch, version }) {
  if (!patch || typeof patch !== "object") throw new Error("Patch must be an object.");
  const operations = Array.isArray(patch.operations) ? patch.operations : [patch];
  for (const operation of operations) {
    if (operation.type === "replace_exercise") {
      const current = [...exercises.values()].find(
        (exercise) => exercise.session_id === session_id && exercise.id === operation.session_exercise_id,
      );
      if (!current) throw new Error(`Exercise not found: ${operation.session_exercise_id}`);
      exercises.set(current.id, {
        ...current,
        exercise_id: operation.exercise_id || current.exercise_id,
        name: operation.name || current.name,
        prescription: { ...current.prescription, ...(operation.prescription || {}) },
        rationale: operation.reason || current.rationale,
        version,
      });
      continue;
    }
    if (operation.type === "update_prescription") {
      const current = [...exercises.values()].find(
        (exercise) => exercise.session_id === session_id && exercise.id === operation.session_exercise_id,
      );
      if (!current) throw new Error(`Exercise not found: ${operation.session_exercise_id}`);
      exercises.set(current.id, {
        ...current,
        prescription: { ...current.prescription, ...(operation.prescription || {}) },
        version,
      });
      continue;
    }
    if (operation.type === "add_note") {
      continue;
    }
    throw new Error(`Unsupported patch operation: ${operation.type || "unknown"}`);
  }
}

export function createD1TrainingStore(db) {
  if (!db || typeof db.prepare !== "function") {
    throw new Error("TRAINING_DB D1 binding is required.");
  }
  return {
    async listProfiles() {
      const rows = await db.prepare("SELECT id, profile_json, updated_at FROM profiles ORDER BY id ASC").all();
      return (rows.results || []).map((row) => {
        const profile = JSON.parse(row.profile_json || "{}");
        return { id: row.id, name: profile.name || row.id, updated_at: row.updated_at };
      });
    },

    async upsertProfile({ id = DEFAULT_PROFILE_ID, profile = {}, preferences = {}, planning_feedback_profile = {} }) {
      await db.prepare("INSERT INTO profiles (id, profile_json, preferences_json, feedback_profile_json, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET profile_json = excluded.profile_json, preferences_json = excluded.preferences_json, feedback_profile_json = excluded.feedback_profile_json, updated_at = excluded.updated_at")
        .bind(id, JSON.stringify(profile), JSON.stringify(preferences), JSON.stringify(planning_feedback_profile), nowIso())
        .run();
      return { id, profile: clone(profile), preferences: clone(preferences), planning_feedback_profile: clone(planning_feedback_profile) };
    },

    async getTrainingContext({ profileId = DEFAULT_PROFILE_ID, recentLimit = 5 } = {}) {
      const profile = await db.prepare("SELECT * FROM profiles WHERE id = ?").bind(profileId).first();
      const sessions = await db
        .prepare("SELECT id, title, status, focus_json, completed_at, active_version FROM sessions WHERE profile_id = ? ORDER BY COALESCE(completed_at, planned_at) DESC LIMIT ?")
        .bind(profileId, recentLimit)
        .all();
      return {
        profile: profile ? JSON.parse(profile.profile_json) : {},
        preferences: profile ? JSON.parse(profile.preferences_json) : {},
        planning_feedback_profile: profile ? JSON.parse(profile.feedback_profile_json) : { summary_notes: [], signals: [] },
        recent_sessions: (sessions.results || []).map((session) => ({
          ...session,
          focus: JSON.parse(session.focus_json || "[]"),
        })),
      };
    },

    async createSession(input) {
      const sessionId = input.id || input.session_id || stableId("session", {
        profile_id: input.profile_id || DEFAULT_PROFILE_ID,
        title: input.title,
        exercises: input.exercises,
        planned_at: input.planned_at || nowIso(),
      });
      const profileId = input.profile_id || DEFAULT_PROFILE_ID;
      await db.prepare("INSERT OR IGNORE INTO profiles (id, profile_json, preferences_json, feedback_profile_json) VALUES (?, '{}', '{}', '{}')")
        .bind(profileId)
        .run();
      await db.prepare("INSERT INTO sessions (id, profile_id, title, status, focus_json, summary, source, active_version, planned_at, started_at, completed_at, completion_json, agent_conversation_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET profile_id = excluded.profile_id, title = excluded.title, status = excluded.status, focus_json = excluded.focus_json, summary = excluded.summary, source = excluded.source, active_version = excluded.active_version, planned_at = excluded.planned_at, started_at = excluded.started_at, completed_at = excluded.completed_at, completion_json = excluded.completion_json, agent_conversation_url = excluded.agent_conversation_url")
        .bind(sessionId, profileId, input.title || "Training Session", input.status || "planned", JSON.stringify(input.focus || []), input.summary || null, input.source || "hosted", input.active_version || 1, input.planned_at || nowIso(), input.started_at || null, input.completed_at || null, input.completion ? JSON.stringify(input.completion) : null, input.agent_conversation_url || null)
        .run();
      for (const [position, rawExercise] of (input.exercises || []).entries()) {
        const exercise = normalizeExercise(sessionId, rawExercise, position);
        await db.prepare("INSERT INTO session_exercises (id, session_id, position, exercise_id, name, prescription_json, alternatives_json, rationale, classification, version, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET session_id = excluded.session_id, position = excluded.position, exercise_id = excluded.exercise_id, name = excluded.name, prescription_json = excluded.prescription_json, alternatives_json = excluded.alternatives_json, rationale = excluded.rationale, classification = excluded.classification, version = excluded.version, is_active = excluded.is_active")
          .bind(exercise.id, exercise.session_id, exercise.position, exercise.exercise_id, exercise.name, JSON.stringify(exercise.prescription), JSON.stringify(exercise.alternatives), exercise.rationale, exercise.classification, exercise.version, exercise.is_active ? 1 : 0)
          .run();
      }
      if (input.telemetry) {
        await db.prepare("INSERT INTO session_telemetry (session_id, telemetry_json) VALUES (?, ?) ON CONFLICT(session_id) DO UPDATE SET telemetry_json = excluded.telemetry_json, updated_at = CURRENT_TIMESTAMP")
          .bind(sessionId, JSON.stringify(input.telemetry))
          .run();
      }
      await this.logSessionEvent({
        session_id: sessionId,
        type: "session_created",
        payload: { title: input.title || "Training Session", exercise_count: input.exercises?.length || 0 },
        idempotency_key: `session_created:${sessionId}`,
      });
      return this.getSession(sessionId);
    },

    async getSession(sessionId) {
      const session = await db.prepare("SELECT * FROM sessions WHERE id = ?").bind(sessionId).first();
      if (!session) return null;
      const exercises = await db.prepare("SELECT * FROM session_exercises WHERE session_id = ? AND is_active = 1 ORDER BY position ASC").bind(sessionId).all();
      const events = await db.prepare("SELECT * FROM session_events WHERE session_id = ? ORDER BY created_at ASC").bind(sessionId).all();
      const telemetryRow = await db.prepare("SELECT telemetry_json FROM session_telemetry WHERE session_id = ?").bind(sessionId).first();
      return {
        id: session.id,
        profile_id: session.profile_id,
        title: session.title,
        status: session.status,
        focus: JSON.parse(session.focus_json || "[]"),
        summary: session.summary,
        active_version: session.active_version,
        planned_at: session.planned_at,
        started_at: session.started_at,
        completed_at: session.completed_at,
        completion: session.completion_json ? JSON.parse(session.completion_json) : null,
        exercises: (exercises.results || []).map((exercise) => ({
          id: exercise.id,
          session_id: exercise.session_id,
          position: exercise.position,
          exercise_id: exercise.exercise_id,
          name: exercise.name,
          prescription: JSON.parse(exercise.prescription_json || "{}"),
          alternatives: JSON.parse(exercise.alternatives_json || "[]"),
          rationale: exercise.rationale,
          classification: exercise.classification,
          version: exercise.version,
        })),
        events: (events.results || []).map((event) => ({ ...event, payload: JSON.parse(event.payload_json || "{}") })),
        telemetry: telemetryRow ? JSON.parse(telemetryRow.telemetry_json) : null,
      };
    },

    async proposeSessionChange({ session_id, proposal_id, patch, reason, created_by = "agent" }) {
      const session = await this.getSession(session_id);
      if (!session) throw new Error(`Session not found: ${session_id}`);
      const proposalId = proposal_id || stableId("proposal", { session_id, patch, reason });
      await this.logSessionEvent({ id: proposalId, session_id, type: "proposal_created", payload: { patch: clone(patch), created_by }, reason, idempotency_key: `proposal:${proposalId}` });
      return { proposal_id: proposalId, session_id, patch: clone(patch), reason, status: "proposed" };
    },

    async applyApprovedChange({ session_id, proposal_id, patch, approved_by = "user", idempotency_key }) {
      const session = await this.getSession(session_id);
      if (!session) throw new Error(`Session not found: ${session_id}`);
      const resolvedPatch = patch || await readProposalPatch(db, { session_id, proposal_id });
      if (!resolvedPatch) throw new Error("applyApprovedChange requires a patch or a proposal_id with a saved patch.");
      const key = idempotency_key || `apply:${proposal_id || stableId("patch", resolvedPatch)}`;
      const existing = await db.prepare("SELECT id FROM session_events WHERE session_id = ? AND idempotency_key = ?").bind(session_id, key).first();
      if (existing) return this.getSession(session_id);
      const nextVersion = session.active_version + 1;
      await applyPatchToD1Exercises(db, { session_id, patch: resolvedPatch, version: nextVersion });
      await db.prepare("UPDATE sessions SET active_version = ? WHERE id = ?").bind(nextVersion, session_id).run();
      await this.logSessionEvent({ session_id, type: "proposal_accepted", version: nextVersion, payload: { proposal_id, patch: clone(resolvedPatch) }, idempotency_key: key, approved_by });
      return this.getSession(session_id);
    },

    async rejectProposal({ session_id, proposal_id, reason, idempotency_key }) {
      await this.logSessionEvent({ session_id, type: "proposal_rejected", payload: { proposal_id }, reason, idempotency_key: idempotency_key || `reject:${proposal_id}` });
      return this.getSession(session_id);
    },

    async completeSession({ session_id, completion = {}, telemetry: telemetryPayload, idempotency_key }) {
      const session = await this.getSession(session_id);
      if (!session) throw new Error(`Session not found: ${session_id}`);
      await db.prepare("UPDATE sessions SET status = 'completed', completed_at = ?, completion_json = ? WHERE id = ?")
        .bind(completion.completed_at || nowIso(), JSON.stringify(completion), session_id)
        .run();
      if (telemetryPayload) {
        await db.prepare("INSERT INTO session_telemetry (session_id, telemetry_json) VALUES (?, ?) ON CONFLICT(session_id) DO UPDATE SET telemetry_json = excluded.telemetry_json, updated_at = CURRENT_TIMESTAMP").bind(session_id, JSON.stringify(telemetryPayload)).run();
      }
      await this.logSessionEvent({ session_id, type: "session_completed", payload: { completion: clone(completion), telemetry: clone(telemetryPayload || null) }, idempotency_key: idempotency_key || `complete:${session_id}` });
      return this.getSession(session_id);
    },

    async logSessionEvent({ id, session_id, type, version, payload = {}, idempotency_key, approved_by, reason }) {
      const eventId = id || stableId("event", { session_id, type, payload, idempotency_key });
      await db.prepare("INSERT OR IGNORE INTO session_events (id, session_id, type, version, payload_json, idempotency_key, approved_by, reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(eventId, session_id, type, version || 1, JSON.stringify(payload), idempotency_key || null, approved_by || null, reason || null)
        .run();
      return { id: eventId, session_id, type, version: version || 1, payload, idempotency_key: idempotency_key || null };
    },
  };
}

async function readProposalPatch(db, { session_id, proposal_id }) {
  if (!proposal_id) return null;
  const proposal = await db.prepare("SELECT payload_json FROM session_events WHERE session_id = ? AND id = ? AND type = 'proposal_created'")
    .bind(session_id, proposal_id)
    .first();
  if (!proposal) return null;
  return JSON.parse(proposal.payload_json || "{}").patch || null;
}

async function applyPatchToD1Exercises(db, { session_id, patch, version }) {
  if (!patch || typeof patch !== "object") throw new Error("Patch must be an object.");
  const operations = Array.isArray(patch.operations) ? patch.operations : [patch];
  for (const operation of operations) {
    if (operation.type === "replace_exercise") {
      const current = await db.prepare("SELECT * FROM session_exercises WHERE session_id = ? AND id = ? AND is_active = 1").bind(session_id, operation.session_exercise_id).first();
      if (!current) throw new Error(`Exercise not found: ${operation.session_exercise_id}`);
      const prescription = { ...JSON.parse(current.prescription_json || "{}"), ...(operation.prescription || {}) };
      await db.prepare("UPDATE session_exercises SET exercise_id = ?, name = ?, prescription_json = ?, rationale = ?, version = ? WHERE session_id = ? AND id = ?")
        .bind(operation.exercise_id || current.exercise_id, operation.name || current.name, JSON.stringify(prescription), operation.reason || current.rationale, version, session_id, operation.session_exercise_id)
        .run();
      continue;
    }
    if (operation.type === "update_prescription") {
      const current = await db.prepare("SELECT * FROM session_exercises WHERE session_id = ? AND id = ? AND is_active = 1").bind(session_id, operation.session_exercise_id).first();
      if (!current) throw new Error(`Exercise not found: ${operation.session_exercise_id}`);
      const prescription = { ...JSON.parse(current.prescription_json || "{}"), ...(operation.prescription || {}) };
      await db.prepare("UPDATE session_exercises SET prescription_json = ?, version = ? WHERE session_id = ? AND id = ?")
        .bind(JSON.stringify(prescription), version, session_id, operation.session_exercise_id)
        .run();
      continue;
    }
    if (operation.type === "add_note") continue;
    throw new Error(`Unsupported patch operation: ${operation.type || "unknown"}`);
  }
}
