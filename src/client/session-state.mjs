import { applySessionPatch, previewSessionPatch } from "./session-patches.mjs";

export function createSessionRuntime(initialSession) {
  let session = structuredClone(initialSession);
  const proposals = new Map();
  const events = [];

  function record(type, payload = {}) {
    const event = { id: `${type}:${events.length + 1}`, type, payload, at: new Date().toISOString() };
    events.push(event);
    return event;
  }

  return {
    get session() {
      return structuredClone(session);
    },
    get events() {
      return events.map((event) => ({ ...event }));
    },
    completeSet(sessionExerciseId) {
      const exercise = session.exercises.find((item) => item.id === sessionExerciseId || item.session_exercise_id === sessionExerciseId);
      if (!exercise) throw new Error(`Exercise not found: ${sessionExerciseId}`);
      exercise.completed_sets = (exercise.completed_sets || 0) + 1;
      return record("set_completed", { session_exercise_id: sessionExerciseId, completed_sets: exercise.completed_sets });
    },
    recordTimer(sessionExerciseId, action, remaining_seconds = null) {
      return record("timer_event", { session_exercise_id: sessionExerciseId, action, remaining_seconds });
    },
    proposeChange(proposal) {
      const preview = previewSessionPatch(session, proposal.patch);
      if (!preview.ok) throw new Error(preview.error);
      proposals.set(proposal.proposal_id, { ...proposal, preview: preview.session });
      record("proposal_created", { proposal_id: proposal.proposal_id, reason: proposal.reason || "" });
      return structuredClone(proposals.get(proposal.proposal_id));
    },
    acceptProposal(proposalId) {
      const proposal = proposals.get(proposalId);
      if (!proposal) throw new Error(`Proposal not found: ${proposalId}`);
      session = applySessionPatch(session, proposal.patch);
      proposal.status = "accepted";
      record("proposal_accepted", { proposal_id: proposalId, active_version: session.active_version });
      return structuredClone(session);
    },
    rejectProposal(proposalId, reason = "") {
      const proposal = proposals.get(proposalId);
      if (!proposal) throw new Error(`Proposal not found: ${proposalId}`);
      proposal.status = "rejected";
      record("proposal_rejected", { proposal_id: proposalId, reason });
      return structuredClone(session);
    },
    complete(completion = {}) {
      session.status = "completed";
      session.completed_at = completion.completed_at || new Date().toISOString();
      session.completion = completion;
      record("session_completed", completion);
      return structuredClone(session);
    },
  };
}

export function buildTelemetrySummary(runtimeEvents) {
  return {
    schema: "hosted-training-runtime/v1",
    event_count: runtimeEvents.length,
    set_events: runtimeEvents.filter((event) => event.type === "set_completed").length,
    timer_events: runtimeEvents.filter((event) => event.type === "timer_event").length,
    proposals: runtimeEvents.filter((event) => event.type.startsWith("proposal_")).length,
  };
}
