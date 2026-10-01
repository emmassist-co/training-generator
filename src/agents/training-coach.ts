'use agent';

import { env } from "cloudflare:workers";
import { useModel, usePersistentState, useTool } from "@flue/runtime";
import instructions from "./instructions/training-coach.md?raw";
import { createD1ExerciseCatalog } from "../db/exercise-catalog.mjs";
import { createD1TrainingStore } from "../db/training-store.mjs";
import { searchExercisesTool } from "../tools/exercise-tools.mjs";

export function TrainingCoach() {
  useModel("openrouter/moonshotai/kimi-k2.6", { thinkingLevel: "medium" });
  const [activeSessionId, setActiveSessionId] = usePersistentState<string | undefined>("activeSessionId");
  const [lastProposalId, setLastProposalId] = usePersistentState<string | undefined>("lastProposalId");

  const trainingDb = (env as { TRAINING_DB: D1Database }).TRAINING_DB;
  const store = createD1TrainingStore(trainingDb);
  const catalog = createD1ExerciseCatalog(trainingDb);

  useTool(searchExercisesTool(catalog));

  useTool({
    name: "get_training_context",
    description: "Read the saved training profile, preferences, feedback signals, and recent sessions. Use this before planning or advising.",
    async run({ data }) {
      return { output: await store.getTrainingContext({ profileId: data?.profile_id || "default", recentLimit: data?.recent_limit || 5 }) };
    },
  });

  useTool({
    name: "get_active_session",
    description: "Read the current active session snapshot, including exercises, active version, events, and telemetry.",
    async run({ data }) {
      const sessionId = data?.session_id || activeSessionId;
      if (!sessionId) throw new Error("No active session id is known.");
      return { output: await store.getSession(sessionId) };
    },
  });

  useTool({
    name: "remember_active_session",
    description: "Remember which saved session this conversation is currently coaching.",
    async run({ data }) {
      if (!data?.session_id) throw new Error("session_id is required.");
      setActiveSessionId(data.session_id);
      return { output: { active_session_id: data.session_id } };
    },
  });

  useTool({
    name: "propose_session_change",
    description: "Create a proposed change for the active session without mutating it. Use this before swaps, prescription edits, or removals.",
    async run({ data }) {
      const sessionId = data?.session_id || activeSessionId;
      if (!sessionId) throw new Error("session_id is required.");
      const proposal = await store.logSessionEvent({
        session_id: sessionId,
        type: "proposal_created",
        payload: { patch: data.patch, reason: data.reason || "" },
        idempotency_key: data.proposal_id ? `proposal:${data.proposal_id}` : undefined,
        reason: data.reason,
      });
      setLastProposalId(data.proposal_id || proposal.id);
      return { output: { proposal_id: data.proposal_id || proposal.id, session_id: sessionId, patch: data.patch, reason: data.reason || "" } };
    },
  });

  useTool({
    name: "apply_approved_change",
    description: "Apply a user-approved session change. Do not call this until the user explicitly accepts a proposal.",
    async run({ data }) {
      const sessionId = data?.session_id || activeSessionId;
      const proposalId = data?.proposal_id || lastProposalId;
      if (!sessionId) throw new Error("session_id is required.");
      if (!proposalId && !data?.approval_token) throw new Error("proposal_id or approval_token is required.");
      return { output: await store.logSessionEvent({
        session_id: sessionId,
        type: "proposal_accepted",
        payload: { proposal_id: proposalId, patch: data.patch || null },
        idempotency_key: data.idempotency_key || `apply:${proposalId}`,
        approved_by: data.approved_by || "user",
      }) };
    },
  });

  useTool({
    name: "log_session_event",
    description: "Persist a trusted active-session event such as set completion, timer action, note update, or telemetry marker.",
    async run({ data }) {
      const sessionId = data?.session_id || activeSessionId;
      if (!sessionId) throw new Error("session_id is required.");
      return { output: await store.logSessionEvent({ ...data, session_id: sessionId }) };
    },
  });

  return instructions;
}
