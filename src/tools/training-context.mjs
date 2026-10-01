export function getTrainingContextTool(store) {
  return {
    name: "get_training_context",
    description: "Read the active training profile, preferences, feedback signals, and recent sessions for session planning or in-run questions.",
    async run({ profile_id = "default", recent_limit = 5 } = {}) {
      return store.getTrainingContext({ profileId: profile_id, recentLimit: recent_limit });
    },
  };
}
