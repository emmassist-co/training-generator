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

export function assertSessionAllowsUserWrite(session) {
  if (["completed", "aborted"].includes(session?.status)) {
    const label = session.status === "aborted" ? "canceled" : "completed";
    const error = new Error(`${label} sessions are read-only`);
    error.name = "ReadOnlySessionError";
    error.code = "session_read_only";
    throw error;
  }
}


export function deriveSessionLiveState(session = {}) {
  const completedExerciseIds = new Set();
  const notes = [];
  const effortFlags = [];
  const setLogs = [];
  const startedEvents = [];
  for (const event of session.events || []) {
    const payload = event.payload || {};
    if (event.type === "exercise_completion_updated") {
      const exerciseId = payload.exercise_id || payload.session_exercise_id;
      if (!exerciseId) continue;
      if (payload.completed === false) completedExerciseIds.delete(exerciseId);
      else completedExerciseIds.add(exerciseId);
    }
    if (event.type === "note_added" || event.type === "note_saved") {
      notes.push({ id: event.id, text: payload.note || payload.notes || "", created_at: event.created_at });
    }
    if (event.type === "effort_flag_logged") {
      effortFlags.push({ id: event.id, ...payload, created_at: event.created_at });
    }
    if (event.type === "set_logged") {
      setLogs.push({ id: event.id, ...payload, created_at: event.created_at });
    }
    if (event.type === "session_started") startedEvents.push(event);
  }
  return {
    completed_exercise_ids: [...completedExerciseIds],
    notes,
    effort_flags: effortFlags,
    set_logs: setLogs,
    started_at: session.started_at || startedEvents[0]?.created_at || null,
  };
}

function mergeProfileFeedback(current = {}, patch = {}) {
  const next = clone(current || {});
  const feedbackPatch = patch.planning_feedback_profile || patch.feedback_profile || patch;
  if (feedbackPatch.summary_note) {
    next.summary_notes = [...(next.summary_notes || []), feedbackPatch.summary_note];
  }
  if (Array.isArray(feedbackPatch.summary_notes)) {
    next.summary_notes = [...(next.summary_notes || []), ...feedbackPatch.summary_notes];
  }
  if (feedbackPatch.signal) {
    next.signals = [...(next.signals || []), feedbackPatch.signal];
  }
  if (Array.isArray(feedbackPatch.signals)) {
    next.signals = [...(next.signals || []), ...feedbackPatch.signals];
  }
  for (const [key, value] of Object.entries(feedbackPatch)) {
    if (["summary_note", "summary_notes", "signal", "signals"].includes(key)) continue;
    next[key] = value;
  }
  return next;
}

export function createMemoryTrainingStore(seed = {}) {
  const profiles = new Map();
  const sessions = new Map();
  const exercises = new Map();
  const events = new Map();
  const telemetry = new Map();
  const artifacts = new Map();
  const profileProposals = new Map();

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
      const recent_sessions = await this.listTrainingHistory({ profileId, limit: recentLimit });
      return {
        profile: clone(profile.profile),
        preferences: clone(profile.preferences),
        planning_feedback_profile: clone(profile.planning_feedback_profile),
        recent_sessions,
      };
    },

    async getHomeSummary({ profileId = DEFAULT_PROFILE_ID, recentLimit = 5 } = {}) {
      const profilesList = await this.listProfiles();
      const active_session = await this.getActiveOrPlannedSession({ profileId });
      const recent_sessions = await this.listTrainingHistory({ profileId, limit: recentLimit });
      return {
        profiles: profilesList,
        selected_profile_id: profileId,
        active_session,
        recent_sessions,
        today_recommendation: active_session
          ? { kind: "resume", title: `Resume ${active_session.title}`, session_id: active_session.id, session_url: `/sessions/${active_session.id}` }
          : { kind: "generate", title: "Generate the next session", prompt: "Generate my next training session from my profile and recent history." },
      };
    },

    async getActiveOrPlannedSession({ profileId = DEFAULT_PROFILE_ID } = {}) {
      const candidates = [...sessions.values()]
        .filter((session) => session.profile_id === profileId && ["active", "planned"].includes(session.status))
        .sort((a, b) => {
          const statusDelta = (a.status === "active" ? 0 : 1) - (b.status === "active" ? 0 : 1);
          if (statusDelta) return statusDelta;
          return String(b.started_at || b.planned_at).localeCompare(String(a.started_at || a.planned_at));
        });
      return candidates[0] ? getSessionSnapshot(candidates[0].id) : null;
    },

    async startSession({ session_id, started_at, idempotency_key } = {}) {
      const session = sessions.get(session_id);
      if (!session) throw new Error(`Session not found: ${session_id}`);
      assertSessionAllowsUserWrite(session, "session_started");
      const startedAt = session.started_at || started_at || nowIso();
      sessions.set(session_id, { ...session, status: session.status === "completed" ? session.status : "active", started_at: startedAt });
      await this.logSessionEvent({
        session_id,
        type: "session_started",
        payload: { started_at: startedAt },
        idempotency_key: idempotency_key || `start:${session_id}`,
      });
      return getSessionSnapshot(session_id);
    },

    async abortSession({ session_id, reason, idempotency_key } = {}) {
      const session = sessions.get(session_id);
      if (!session) throw new Error(`Session not found: ${session_id}`);
      if (session.status === "aborted") return getSessionSnapshot(session_id);
      assertSessionAllowsUserWrite(session);
      await this.logSessionEvent({
        session_id,
        type: "session_canceled",
        payload: { reason: reason || null },
        reason,
        idempotency_key: idempotency_key || `cancel:${session_id}`,
      });
      sessions.set(session_id, { ...session, status: "aborted", completed_at: nowIso() });
      return getSessionSnapshot(session_id);
    },

    async restartSession({ session_id, restarted_at } = {}) {
      const session = getSessionSnapshot(session_id);
      if (!session) throw new Error(`Session not found: ${session_id}`);
      const replacementId = stableId("session", { restart_of: session_id });
      if (session.status === "aborted") {
        const existingReplacement = getSessionSnapshot(replacementId);
        if (existingReplacement) return existingReplacement;
      }
      assertSessionAllowsUserWrite(session);
      const restartedAt = restarted_at || nowIso();
      const fresh = await this.createSession({
        id: replacementId,
        profile_id: session.profile_id,
        title: session.title,
        status: "active",
        focus: session.focus,
        summary: session.summary,
        source: "restart",
        planned_at: restartedAt,
        started_at: restartedAt,
        exercises: copyExercisesForRestart(session.exercises),
      });
      await this.abortSession({ session_id, reason: `Started over as ${fresh.id}`, idempotency_key: `restart:${fresh.id}` });
      return fresh;
    },

    async getSessionLiveState(session_id) {
      const session = getSessionSnapshot(session_id);
      if (!session) throw new Error(`Session not found: ${session_id}`);
      return deriveSessionLiveState(session);
    },


    async listTrainingHistory({ profileId = DEFAULT_PROFILE_ID, limit = 10, offset = 0, status } = {}) {
      return [...sessions.values()]
        .filter((session) => session.profile_id === profileId)
        .filter((session) => !status || session.status === status)
        .sort((a, b) => String(b.completed_at || b.planned_at).localeCompare(String(a.completed_at || a.planned_at)))
        .slice(offset, offset + limit)
        .map((session) => ({
          id: session.id,
          title: session.title,
          status: session.status,
          focus: clone(session.focus),
          summary: session.summary || session.completion?.summary || null,
          completed_at: session.completed_at,
          planned_at: session.planned_at,
          active_version: session.active_version,
          exercise_count: [...exercises.values()].filter((exercise) => exercise.session_id === session.id && exercise.is_active !== false).length,
        }));
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
      if (session.status !== "completed") {
        await this.logSessionEvent({
          session_id: sessionId,
          type: "session_created",
          payload: { title: session.title, exercise_count: input.exercises?.length || 0 },
          idempotency_key: `session_created:${sessionId}`,
        });
      }
      return getSessionSnapshot(sessionId);
    },

    async getSession(sessionId) {
      return getSessionSnapshot(sessionId);
    },

    async proposeSessionChange({ session_id, proposal_id, patch, reason, created_by = "agent" }) {
      const session = sessions.get(session_id);
      if (!session) throw new Error(`Session not found: ${session_id}`);
      assertSessionAllowsUserWrite(session, "proposal_created");
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
      assertSessionAllowsUserWrite(session, "proposal_accepted");
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
      const session = sessions.get(session_id);
      if (!session) throw new Error(`Session not found: ${session_id}`);
      assertSessionAllowsUserWrite(session, "proposal_rejected");
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
      const session = sessions.get(session_id);
      if (!session) throw new Error(`Session not found: ${session_id}`);
      assertSessionAllowsUserWrite(session, type);
      if (idempotency_key) {
        const existing = [...events.values()].find((event) => event.session_id === session_id && event.idempotency_key === idempotency_key);
        if (existing) return clone(existing);
      }
      const event = {
        id: id || stableId("event", { session_id, type, payload, idempotency_key, at: nowIso() }),
        session_id,
        type,
        version: version || session.active_version,
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
      const key = idempotency_key || `complete:${session_id}`;
      const existing = [...events.values()].find((event) => event.session_id === session_id && event.idempotency_key === key);
      if (session.status === "completed") {
        if (!existing) assertSessionAllowsUserWrite(session);
        if (telemetryPayload) telemetry.set(session_id, clone(telemetryPayload));
        return getSessionSnapshot(session_id);
      }
      await this.logSessionEvent({
        session_id,
        type: "session_completed",
        payload: { completion: clone(completion), telemetry: clone(telemetryPayload || null) },
        idempotency_key: key,
      });
      if (telemetryPayload) telemetry.set(session_id, clone(telemetryPayload));
      sessions.set(session_id, {
        ...session,
        status: "completed",
        completed_at: completion.completed_at || nowIso(),
        completion: clone(completion),
      });
      return getSessionSnapshot(session_id);
    },

    async proposeProfileUpdate({ profile_id = DEFAULT_PROFILE_ID, proposal_id, patch, reason, created_by = "agent" }) {
      const proposalId = proposal_id || stableId("profile_proposal", { profile_id, patch, reason });
      const proposal = { id: proposalId, profile_id, patch: clone(patch || {}), reason: reason || null, created_by, status: "pending", created_at: nowIso(), updated_at: nowIso() };
      profileProposals.set(proposalId, proposal);
      return clone(proposal);
    },

    async applyProfileUpdate({ profile_id = DEFAULT_PROFILE_ID, proposal_id, patch, approved_by = "user" } = {}) {
      const proposal = proposal_id ? profileProposals.get(proposal_id) : null;
      const resolvedPatch = patch || proposal?.patch;
      if (!resolvedPatch) throw new Error("applyProfileUpdate requires a patch or a proposal_id with a saved patch.");
      const current = profiles.get(profile_id) || { id: profile_id, profile: {}, preferences: {}, planning_feedback_profile: {}, created_at: nowIso() };
      const row = {
        ...current,
        planning_feedback_profile: mergeProfileFeedback(current.planning_feedback_profile, resolvedPatch),
        updated_at: nowIso(),
      };
      profiles.set(profile_id, row);
      if (proposal) profileProposals.set(proposal_id, { ...proposal, status: "approved", approved_by, updated_at: nowIso() });
      return clone(row);
    },

    async rejectProfileUpdate({ profile_id = DEFAULT_PROFILE_ID, proposal_id, reason } = {}) {
      const proposal = profileProposals.get(proposal_id);
      if (!proposal) throw new Error(`Profile update proposal not found: ${proposal_id}`);
      profileProposals.set(proposal_id, { ...proposal, profile_id, status: "rejected", reason: reason || proposal.reason, updated_at: nowIso() });
      return clone(profileProposals.get(proposal_id));
    },

    _debug() {
      return { profiles, sessions, exercises, events, telemetry, artifacts, profileProposals };
    },
  };
}

function copyExercisesForRestart(exercises = []) {
  return exercises.map(({ id, session_id, position, version, ...exercise }) => ({
    ...clone(exercise),
    session_exercise_id: undefined,
    version: 1,
  }));
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
    category: rawExercise.category || null,
    equipment: rawExercise.equipment || null,
    muscles: clone(rawExercise.muscles || rawExercise.primaryMuscles || rawExercise.primary_muscles || []),
    instructions: clone(rawExercise.instructions || []),
    images: clone(rawExercise.images || []),
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
      return {
        profile: profile ? JSON.parse(profile.profile_json) : {},
        preferences: profile ? JSON.parse(profile.preferences_json) : {},
        planning_feedback_profile: profile ? JSON.parse(profile.feedback_profile_json) : { summary_notes: [], signals: [] },
        recent_sessions: await this.listTrainingHistory({ profileId, limit: recentLimit }),
      };
    },

    async getHomeSummary({ profileId = DEFAULT_PROFILE_ID, recentLimit = 5 } = {}) {
      const profiles = await this.listProfiles();
      const active_session = await this.getActiveOrPlannedSession({ profileId });
      const recent_sessions = await this.listTrainingHistory({ profileId, limit: recentLimit });
      return {
        profiles,
        selected_profile_id: profileId,
        active_session,
        recent_sessions,
        today_recommendation: active_session
          ? { kind: "resume", title: `Resume ${active_session.title}`, session_id: active_session.id, session_url: `/sessions/${active_session.id}` }
          : { kind: "generate", title: "Generate the next session", prompt: "Generate my next training session from my profile and recent history." },
      };
    },

    async getActiveOrPlannedSession({ profileId = DEFAULT_PROFILE_ID } = {}) {
      const row = await db.prepare(`
        SELECT id FROM sessions
        WHERE profile_id = ? AND status IN ('active', 'planned')
        ORDER BY CASE status WHEN 'active' THEN 0 ELSE 1 END ASC, COALESCE(started_at, planned_at) DESC
        LIMIT 1
      `).bind(profileId).first();
      return row ? this.getSession(row.id) : null;
    },

    async startSession({ session_id, started_at, idempotency_key } = {}) {
      const session = await this.getSession(session_id);
      if (!session) throw new Error(`Session not found: ${session_id}`);
      assertSessionAllowsUserWrite(session, "session_started");
      const startedAt = session.started_at || started_at || nowIso();
      if (session.status !== "completed") {
        await db.prepare("UPDATE sessions SET status = 'active', started_at = COALESCE(started_at, ?) WHERE id = ?")
          .bind(startedAt, session_id)
          .run();
      }
      await this.logSessionEvent({ session_id, type: "session_started", payload: { started_at: startedAt }, idempotency_key: idempotency_key || `start:${session_id}` });
      return this.getSession(session_id);
    },

    async abortSession({ session_id, reason, idempotency_key } = {}) {
      const session = await this.getSession(session_id);
      if (!session) throw new Error(`Session not found: ${session_id}`);
      if (session.status === "aborted") return session;
      assertSessionAllowsUserWrite(session);
      const canceledAt = nowIso();
      const key = idempotency_key || `cancel:${session_id}`;
      const eventId = stableId("event", { session_id, type: "session_canceled", key });
      const results = await db.batch([
        db.prepare(`
          INSERT OR IGNORE INTO session_events (id, session_id, type, version, payload_json, idempotency_key, reason)
          SELECT ?, id, 'session_canceled', active_version, ?, ?, ? FROM sessions
          WHERE id = ? AND status IN ('active', 'planned')
        `).bind(eventId, JSON.stringify({ reason: reason || null }), key, reason || null, session_id),
        db.prepare("UPDATE sessions SET status = 'aborted', completed_at = ? WHERE id = ? AND status IN ('active', 'planned')")
          .bind(canceledAt, session_id),
      ]);
      if (!results.at(-1)?.meta?.changes) {
        const current = await this.getSession(session_id);
        if (current?.status === "aborted") return current;
        assertSessionAllowsUserWrite(current);
        throw new Error("Session could not be canceled");
      }
      return this.getSession(session_id);
    },

    async restartSession({ session_id, restarted_at } = {}) {
      const session = await this.getSession(session_id);
      if (!session) throw new Error(`Session not found: ${session_id}`);
      const replacementId = stableId("session", { restart_of: session_id });
      if (session.status === "aborted") {
        const existingReplacement = await this.getSession(replacementId);
        if (existingReplacement) return existingReplacement;
      }
      assertSessionAllowsUserWrite(session);
      const restartedAt = restarted_at || nowIso();
      const replacementExercises = copyExercisesForRestart(session.exercises).map((exercise, index) => normalizeExercise(replacementId, exercise, index));
      const createdPayload = JSON.stringify({ title: session.title, exercise_count: replacementExercises.length });
      const cancelReason = `Started over as ${replacementId}`;
      const statements = [
        db.prepare(`
          INSERT OR IGNORE INTO sessions (id, profile_id, title, status, focus_json, summary, source, active_version, planned_at, started_at)
          SELECT ?, ?, ?, 'active', ?, ?, 'restart', 1, ?, ?
          WHERE EXISTS (SELECT 1 FROM sessions WHERE id = ? AND status IN ('active', 'planned'))
        `).bind(replacementId, session.profile_id, session.title, JSON.stringify(session.focus || []), session.summary || null, restartedAt, restartedAt, session_id),
        ...replacementExercises.map((exercise) => db.prepare(`
          INSERT OR IGNORE INTO session_exercises (id, session_id, position, exercise_id, name, prescription_json, alternatives_json, rationale, classification, version, is_active)
          SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ? WHERE EXISTS (SELECT 1 FROM sessions WHERE id = ?)
        `).bind(exercise.id, replacementId, exercise.position, exercise.exercise_id, exercise.name, JSON.stringify(exercise.prescription), JSON.stringify(exercise.alternatives), exercise.rationale, exercise.classification, exercise.is_active ? 1 : 0, replacementId)),
        db.prepare(`
          INSERT OR IGNORE INTO session_events (id, session_id, type, version, payload_json, idempotency_key)
          SELECT ?, ?, 'session_created', 1, ?, ? WHERE EXISTS (SELECT 1 FROM sessions WHERE id = ?)
        `).bind(stableId("event", { session_id: replacementId, type: "session_created" }), replacementId, createdPayload, `session_created:${replacementId}`, replacementId),
        db.prepare(`
          INSERT OR IGNORE INTO session_events (id, session_id, type, version, payload_json, idempotency_key, reason)
          SELECT ?, id, 'session_canceled', active_version, ?, ?, ? FROM sessions
          WHERE id = ? AND status IN ('active', 'planned')
        `).bind(stableId("event", { session_id, type: "session_canceled", replacementId }), JSON.stringify({ reason: cancelReason }), `restart:${replacementId}`, cancelReason, session_id),
        db.prepare("UPDATE sessions SET status = 'aborted', completed_at = ? WHERE id = ? AND status IN ('active', 'planned')")
          .bind(restartedAt, session_id),
      ];
      const results = await db.batch(statements);
      if (!results.at(-1)?.meta?.changes) {
        const existingReplacement = await this.getSession(replacementId);
        if (existingReplacement) return existingReplacement;
        const current = await this.getSession(session_id);
        assertSessionAllowsUserWrite(current);
        throw new Error("Session could not be restarted");
      }
      return this.getSession(replacementId);
    },

    async getSessionLiveState(session_id) {
      const session = await this.getSession(session_id);
      if (!session) throw new Error(`Session not found: ${session_id}`);
      return deriveSessionLiveState(session);
    },

    async listTrainingHistory({ profileId = DEFAULT_PROFILE_ID, limit = 10, offset = 0, status } = {}) {
      const cappedLimit = Math.min(Math.max(Number(limit) || 10, 1), 50);
      const safeOffset = Math.max(Number(offset) || 0, 0);
      const where = status ? "WHERE s.profile_id = ? AND s.status = ?" : "WHERE s.profile_id = ?";
      const bindings = status ? [profileId, status, cappedLimit, safeOffset] : [profileId, cappedLimit, safeOffset];
      const rows = await db.prepare(`
        SELECT s.id, s.title, s.status, s.focus_json, s.summary, s.completed_at, s.planned_at, s.active_version, COUNT(se.id) AS exercise_count
        FROM sessions s
        LEFT JOIN session_exercises se ON se.session_id = s.id AND se.is_active = 1
        ${where}
        GROUP BY s.id
        ORDER BY COALESCE(s.completed_at, s.planned_at) DESC
        LIMIT ? OFFSET ?
      `).bind(...bindings).all();
      return (rows.results || []).map((session) => ({
        id: session.id,
        title: session.title,
        status: session.status,
        focus: JSON.parse(session.focus_json || "[]"),
        summary: session.summary,
        completed_at: session.completed_at,
        planned_at: session.planned_at,
        active_version: session.active_version,
        exercise_count: session.exercise_count,
      }));
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
      if (input.status !== "completed") {
        await this.logSessionEvent({
          session_id: sessionId,
          type: "session_created",
          payload: { title: input.title || "Training Session", exercise_count: input.exercises?.length || 0 },
          idempotency_key: `session_created:${sessionId}`,
        });
      }
      return this.getSession(sessionId);
    },

    async getSession(sessionId) {
      const session = await db.prepare("SELECT * FROM sessions WHERE id = ?").bind(sessionId).first();
      if (!session) return null;
      const exercises = await db.prepare(`
        SELECT
          se.*,
          ec.category AS catalog_category,
          ec.equipment AS catalog_equipment,
          ec.muscles_json AS catalog_muscles_json,
          ec.instructions_json AS catalog_instructions_json,
          ec.images_json AS catalog_images_json
        FROM session_exercises se
        LEFT JOIN exercise_catalog ec ON ec.id = se.exercise_id OR (
          rtrim(lower(ec.name), 's') = rtrim(lower(se.name), 's')
          AND NOT EXISTS (SELECT 1 FROM exercise_catalog preferred WHERE preferred.id = se.exercise_id)
        )
        WHERE se.session_id = ? AND se.is_active = 1
        ORDER BY se.position ASC
      `).bind(sessionId).all();
      const events = await db.prepare("SELECT * FROM session_events WHERE session_id = ? ORDER BY created_at ASC, rowid ASC").bind(sessionId).all();
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
          category: exercise.catalog_category || null,
          equipment: exercise.catalog_equipment || null,
          muscles: JSON.parse(exercise.catalog_muscles_json || "[]"),
          instructions: JSON.parse(exercise.catalog_instructions_json || "[]"),
          images: JSON.parse(exercise.catalog_images_json || "[]"),
        })),
        events: (events.results || []).map((event) => ({ ...event, payload: JSON.parse(event.payload_json || "{}") })),
        telemetry: telemetryRow ? JSON.parse(telemetryRow.telemetry_json) : null,
      };
    },

    async proposeSessionChange({ session_id, proposal_id, patch, reason, created_by = "agent" }) {
      const session = await this.getSession(session_id);
      if (!session) throw new Error(`Session not found: ${session_id}`);
      assertSessionAllowsUserWrite(session, "proposal_created");
      const proposalId = proposal_id || stableId("proposal", { session_id, patch, reason });
      await this.logSessionEvent({ id: proposalId, session_id, type: "proposal_created", payload: { patch: clone(patch), created_by }, reason, idempotency_key: `proposal:${proposalId}` });
      return { proposal_id: proposalId, session_id, patch: clone(patch), reason, status: "proposed" };
    },

    async applyApprovedChange({ session_id, proposal_id, patch, approved_by = "user", idempotency_key }) {
      const session = await this.getSession(session_id);
      if (!session) throw new Error(`Session not found: ${session_id}`);
      assertSessionAllowsUserWrite(session, "proposal_accepted");
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
      const session = await this.getSession(session_id);
      if (!session) throw new Error(`Session not found: ${session_id}`);
      assertSessionAllowsUserWrite(session, "proposal_rejected");
      await this.logSessionEvent({ session_id, type: "proposal_rejected", payload: { proposal_id }, reason, idempotency_key: idempotency_key || `reject:${proposal_id}` });
      return this.getSession(session_id);
    },

    async completeSession({ session_id, completion = {}, telemetry: telemetryPayload, idempotency_key }) {
      const session = await this.getSession(session_id);
      if (!session) throw new Error(`Session not found: ${session_id}`);
      const key = idempotency_key || `complete:${session_id}`;
      const existing = await db.prepare("SELECT id FROM session_events WHERE session_id = ? AND idempotency_key = ?").bind(session_id, key).first();
      if (session.status === "completed") {
        if (!existing) assertSessionAllowsUserWrite(session);
        if (telemetryPayload) {
          await db.prepare("INSERT INTO session_telemetry (session_id, telemetry_json) VALUES (?, ?) ON CONFLICT(session_id) DO UPDATE SET telemetry_json = excluded.telemetry_json, updated_at = CURRENT_TIMESTAMP").bind(session_id, JSON.stringify(telemetryPayload)).run();
        }
        return this.getSession(session_id);
      }
      assertSessionAllowsUserWrite(session);
      const completedAt = completion.completed_at || nowIso();
      const eventPayload = { completion: clone(completion), telemetry: clone(telemetryPayload || null) };
      const eventId = stableId("event", { session_id, type: "session_completed", key });
      const statements = [
        db.prepare(`
          INSERT OR IGNORE INTO session_events (id, session_id, type, version, payload_json, idempotency_key)
          SELECT ?, id, 'session_completed', active_version, ?, ? FROM sessions
          WHERE id = ? AND status IN ('active', 'planned')
        `).bind(eventId, JSON.stringify(eventPayload), key, session_id),
      ];
      if (telemetryPayload) {
        statements.push(db.prepare(`
          INSERT INTO session_telemetry (session_id, telemetry_json)
          SELECT ?, ? WHERE EXISTS (SELECT 1 FROM sessions WHERE id = ? AND status IN ('active', 'planned'))
          ON CONFLICT(session_id) DO UPDATE SET telemetry_json = excluded.telemetry_json, updated_at = CURRENT_TIMESTAMP
        `).bind(session_id, JSON.stringify(telemetryPayload), session_id));
      }
      statements.push(db.prepare("UPDATE sessions SET status = 'completed', completed_at = ?, completion_json = ? WHERE id = ? AND status IN ('active', 'planned')")
        .bind(completedAt, JSON.stringify(completion), session_id));
      const results = await db.batch(statements);
      if (!results.at(-1)?.meta?.changes) {
        const current = await this.getSession(session_id);
        if (current?.status === "completed") return current;
        assertSessionAllowsUserWrite(current);
        throw new Error("Session could not be completed");
      }
      return this.getSession(session_id);
    },

    async proposeProfileUpdate({ profile_id = DEFAULT_PROFILE_ID, proposal_id, patch, reason, created_by = "agent" }) {
      await db.prepare("INSERT OR IGNORE INTO profiles (id, profile_json, preferences_json, feedback_profile_json) VALUES (?, '{}', '{}', '{}')")
        .bind(profile_id)
        .run();
      const proposalId = proposal_id || stableId("profile_proposal", { profile_id, patch, reason });
      await db.prepare("INSERT INTO profile_update_proposals (id, profile_id, patch_json, reason, created_by, status, updated_at) VALUES (?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP) ON CONFLICT(id) DO UPDATE SET patch_json = excluded.patch_json, reason = excluded.reason, created_by = excluded.created_by, status = 'pending', updated_at = excluded.updated_at")
        .bind(proposalId, profile_id, JSON.stringify(patch || {}), reason || null, created_by)
        .run();
      return { id: proposalId, profile_id, patch: clone(patch || {}), reason: reason || null, created_by, status: "pending" };
    },

    async applyProfileUpdate({ profile_id = DEFAULT_PROFILE_ID, proposal_id, patch, approved_by = "user" } = {}) {
      const proposal = proposal_id
        ? await db.prepare("SELECT * FROM profile_update_proposals WHERE id = ? AND profile_id = ?").bind(proposal_id, profile_id).first()
        : null;
      const resolvedPatch = patch || (proposal ? JSON.parse(proposal.patch_json || "{}") : null);
      if (!resolvedPatch) throw new Error("applyProfileUpdate requires a patch or a proposal_id with a saved patch.");
      await db.prepare("INSERT OR IGNORE INTO profiles (id, profile_json, preferences_json, feedback_profile_json) VALUES (?, '{}', '{}', '{}')")
        .bind(profile_id)
        .run();
      const profile = await db.prepare("SELECT * FROM profiles WHERE id = ?").bind(profile_id).first();
      const feedback = mergeProfileFeedback(JSON.parse(profile.feedback_profile_json || "{}"), resolvedPatch);
      await db.prepare("UPDATE profiles SET feedback_profile_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .bind(JSON.stringify(feedback), profile_id)
        .run();
      if (proposal_id) {
        await db.prepare("UPDATE profile_update_proposals SET status = 'approved', approved_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
          .bind(approved_by, proposal_id)
          .run();
      }
      return this.getTrainingContext({ profileId: profile_id, recentLimit: 0 });
    },

    async rejectProfileUpdate({ profile_id = DEFAULT_PROFILE_ID, proposal_id, reason } = {}) {
      const result = await db.prepare("UPDATE profile_update_proposals SET status = 'rejected', reason = COALESCE(?, reason), updated_at = CURRENT_TIMESTAMP WHERE id = ? AND profile_id = ?")
        .bind(reason || null, proposal_id, profile_id)
        .run();
      if (result.meta?.changes === 0) throw new Error(`Profile update proposal not found: ${proposal_id}`);
      return { id: proposal_id, profile_id, status: "rejected", reason: reason || null };
    },

    async logSessionEvent({ id, session_id, type, version, payload = {}, idempotency_key, approved_by, reason }) {
      const session = await this.getSession(session_id);
      if (!session) throw new Error(`Session not found: ${session_id}`);
      assertSessionAllowsUserWrite(session, type);
      if (idempotency_key) {
        const existing = await db.prepare("SELECT * FROM session_events WHERE session_id = ? AND idempotency_key = ?").bind(session_id, idempotency_key).first();
        if (existing) {
          return { ...existing, payload: JSON.parse(existing.payload_json || "{}") };
        }
      }
      const eventId = id || stableId("event", { session_id, type, payload, idempotency_key });
      const eventVersion = version || session.active_version || 1;
      await db.prepare("INSERT OR IGNORE INTO session_events (id, session_id, type, version, payload_json, idempotency_key, approved_by, reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(eventId, session_id, type, eventVersion, JSON.stringify(payload), idempotency_key || null, approved_by || null, reason || null)
        .run();
      return { id: eventId, session_id, type, version: eventVersion, payload, idempotency_key: idempotency_key || null };
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
