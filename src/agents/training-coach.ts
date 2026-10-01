'use agent';

import { env } from "cloudflare:workers";
import { useModel, usePersistentState, useTool } from "@flue/runtime";
import * as v from "valibot";
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
    name: "list_profiles",
    description: "List available training profiles. Use this when the user has not said who the session is for.",
    input: v.object({}),
    async run() {
      return { output: { profiles: await store.listProfiles() } };
    },
  });

  useTool({
    name: "get_training_context",
    description: "Read the saved training profile, preferences, feedback signals, and recent sessions for one profile. Use this before planning or advising.",
    input: v.object({ profile_id: v.optional(v.string()), recent_limit: v.optional(v.number()) }),
    async run({ data }) {
      return { output: await store.getTrainingContext({ profileId: data.profile_id || "default", recentLimit: data.recent_limit || 5 }) };
    },
  });

  useTool({
    name: "create_training_session",
    description: "Persist a planned training session for one profile after checking context and exercise candidates. Include ordered exercises with prescriptions, alternatives, and rationale.",
    input: v.object({
      id: v.optional(v.string()),
      profile_id: v.optional(v.string()),
      title: v.string(),
      focus: v.optional(v.array(v.string())),
      summary: v.optional(v.string()),
      exercises: v.array(v.any()),
    }),
    async run({ data }) {
      const session = await store.createSession({ ...data, status: "planned" });
      setActiveSessionId(session.id);
      return { output: session };
    },
  });

  useTool({
    name: "get_active_session",
    description: "Read the current active session snapshot, including exercises, active version, events, and telemetry.",
    input: v.object({ session_id: v.optional(v.string()) }),
    async run({ data }) {
      const sessionId = data.session_id || activeSessionId;
      if (!sessionId) throw new Error("No active session id is known.");
      return { output: await store.getSession(sessionId) };
    },
  });

  useTool({
    name: "remember_active_session",
    description: "Remember which saved session this conversation is currently coaching.",
    input: v.object({ session_id: v.string() }),
    async run({ data }) {
      setActiveSessionId(data.session_id);
      return { output: { active_session_id: data.session_id } };
    },
  });

  useTool({
    name: "propose_session_change",
    description: "Create a proposed change for the active session without mutating it. Use this before swaps, prescription edits, or removals. Supported patch shapes: {type:'replace_exercise', session_exercise_id, exercise_id?, name?, prescription?, reason?} or {type:'update_prescription', session_exercise_id, prescription:{sets?, reps?, duration?, rest_seconds?, load?}}.",
    input: v.object({ session_id: v.optional(v.string()), proposal_id: v.optional(v.string()), patch: v.any(), reason: v.optional(v.string()) }),
    async run({ data }) {
      const sessionId = data.session_id || activeSessionId;
      if (!sessionId) throw new Error("session_id is required.");
      const proposal = await store.proposeSessionChange({ ...data, session_id: sessionId });
      setLastProposalId(proposal.proposal_id);
      return { output: proposal };
    },
  });

  useTool({
    name: "apply_approved_change",
    description: "Apply a user-approved session change. Do not call this until the user explicitly accepts a proposal. Pass the exact supported patch from propose_session_change; for prescription edits use {type:'update_prescription', session_exercise_id, prescription:{sets?, reps?, duration?, rest_seconds?, load?}}.",
    input: v.object({ session_id: v.optional(v.string()), proposal_id: v.optional(v.string()), patch: v.optional(v.any()), idempotency_key: v.optional(v.string()), approved_by: v.optional(v.string()) }),
    async run({ data }) {
      const sessionId = data.session_id || activeSessionId;
      const proposalId = data.proposal_id || lastProposalId;
      if (!sessionId) throw new Error("session_id is required.");
      if (!proposalId && !data.patch) throw new Error("proposal_id or patch is required.");
      const changed = await store.applyApprovedChange({ ...data, session_id: sessionId, proposal_id: proposalId });
      return { output: changed };
    },
  });

  useTool({
    name: "complete_session",
    description: "Finalize and log a training session for future planning history. Use when the user says the session is done or sends completion notes/telemetry.",
    input: v.object({ session_id: v.optional(v.string()), completion: v.optional(v.any()), telemetry: v.optional(v.any()), idempotency_key: v.optional(v.string()) }),
    async run({ data }) {
      const sessionId = data.session_id || activeSessionId;
      if (!sessionId) throw new Error("session_id is required.");
      return { output: await store.completeSession({ ...data, session_id: sessionId }) };
    },
  });

  useTool({
    name: "log_session_event",
    description: "Persist a trusted active-session event such as set completion, timer action, note update, or telemetry marker.",
    input: v.object({ session_id: v.optional(v.string()), type: v.string(), version: v.optional(v.number()), payload: v.optional(v.any()), idempotency_key: v.optional(v.string()), approved_by: v.optional(v.string()), reason: v.optional(v.string()) }),
    async run({ data }) {
      const sessionId = data.session_id || activeSessionId;
      if (!sessionId) throw new Error("session_id is required.");
      return { output: await store.logSessionEvent({ ...data, session_id: sessionId }) };
    },
  });

  return instructions;
}
