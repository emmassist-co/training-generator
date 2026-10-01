export function proposeSessionChangeTool(store) {
  return {
    name: "propose_session_change",
    description: "Create a structured session change proposal without mutating the active workout. Use this before any exercise swap or prescription edit.",
    async run(input) {
      return store.proposeSessionChange(input);
    },
  };
}

export function applyApprovedChangeTool(store) {
  return {
    name: "apply_approved_change",
    description: "Apply a user-approved session patch. Requires a valid proposal id or approval context and must use an idempotency key.",
    async run(input) {
      if (!input.proposal_id && !input.approval_token) {
        throw new Error("apply_approved_change requires proposal_id or approval_token.");
      }
      return store.applyApprovedChange(input);
    },
  };
}

export function rejectProposalTool(store) {
  return {
    name: "reject_session_change",
    description: "Record that the user rejected a proposed session change without mutating the active workout.",
    async run(input) {
      return store.rejectProposal(input);
    },
  };
}
