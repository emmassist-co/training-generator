export function proposeProfileUpdateTool(store) {
  return {
    name: "propose_profile_update",
    description: "Create a durable profile-learning proposal without changing future training context. Use before saving preferences, constraints, injuries, or repeated adherence signals.",
    async run(input) {
      return store.proposeProfileUpdate(input);
    },
  };
}

export function applyProfileUpdateTool(store) {
  return {
    name: "apply_profile_update",
    description: "Apply a user-approved profile-learning proposal so future plans can use it. Do not call before explicit approval.",
    async run(input) {
      if (!input.proposal_id && !input.patch) throw new Error("apply_profile_update requires proposal_id or patch.");
      return store.applyProfileUpdate(input);
    },
  };
}

export function rejectProfileUpdateTool(store) {
  return {
    name: "reject_profile_update",
    description: "Record that the user rejected a durable profile-learning proposal without changing context.",
    async run(input) {
      return store.rejectProfileUpdate(input);
    },
  };
}
