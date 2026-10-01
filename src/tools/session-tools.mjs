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
    async run({ session_id }) {
      const session = await store.getSession(session_id);
      if (!session) throw new Error(`Session not found: ${session_id}`);
      return session;
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
