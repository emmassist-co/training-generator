export function createSessionTool(store) {
  return {
    name: "create_session",
    description: "Persist a planned training session with ordered exercises, prescriptions, alternatives, and rationale before returning it to the user.",
    async run(input) {
      return store.createSession(input);
    },
  };
}

export function getActiveSessionTool(store) {
  return {
    name: "get_active_session",
    description: "Read the current saved session snapshot, including exercises, active version, events, and telemetry.",
    async run({ session_id, profile_id } = {}) {
      const session = session_id
        ? await store.getSession(session_id)
        : await store.getActiveOrPlannedSession({ profileId: profile_id || "default" });
      if (!session) throw new Error(session_id ? `Session not found: ${session_id}` : "No active or planned session found.");
      return session;
    },
  };
}

export function startSessionTool(store) {
  return {
    name: "start_session",
    description: "Mark a planned hosted training session as active and record an idempotent start event.",
    async run(input) {
      return store.startSession(input);
    },
  };
}

export function listActiveOrPlannedSessionsTool(store) {
  return {
    name: "list_active_or_planned_sessions",
    description: "Return the current active session for a profile, or the newest planned session if none is active.",
    async run({ profile_id } = {}) {
      return { active_session: await store.getActiveOrPlannedSession({ profileId: profile_id || "default" }) };
    },
  };
}

export function logSessionEventTool(store) {
  return {
    name: "log_session_event",
    description: "Persist a trusted client progress event such as set completion, timer action, note, or telemetry marker with an idempotency key.",
    async run(input) {
      return store.logSessionEvent(input);
    },
  };
}

export function completeSessionTool(store) {
  return {
    name: "complete_session",
    description: "Finalize a hosted training session and save completion notes, difficulty, telemetry, and per-exercise outcomes.",
    async run(input) {
      return store.completeSession(input);
    },
  };
}
