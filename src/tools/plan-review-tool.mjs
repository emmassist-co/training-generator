const IMPACT_PATTERN = /jump|hop|bound|sprint|plyo|burpee|cutting|pivot/i;
const UNILATERAL_PATTERN = /single|one[- ]arm|one[- ]leg|split|lunge|step[- ]?up|bulgarian|cossack/i;
const LOWER_PATTERN = /squat|leg|lunge|deadlift|hinge|hip thrust|calf|hamstring|quad|run|treadmill/i;
const CONDITIONING_PATTERN = /run|row|bike|treadmill|conditioning|finisher|circuit/i;

export function reviewTrainingPlanTool(store) {
  return {
    name: "review_training_plan",
    description: "Independently review a proposed training session against the profile, recent history, safety constraints, and planning rules before saving it.",
    async run({ data = {} } = {}) {
      const profileId = data.profile_id || "default";
      const context = await store.getTrainingContext({ profileId, recentLimit: data.recent_limit || 8 });
      return { output: reviewTrainingPlan({ ...data, context }) };
    },
  };
}

export function reviewTrainingPlan({ title = "Training Session", focus = [], summary = "", exercises = [], context = {} }) {
  const blockers = [];
  const warnings = [];
  const suggestions = [];
  const profile = context.profile || {};
  const preferences = context.preferences || {};
  const feedback = context.planning_feedback_profile || {};
  const recentSessions = context.recent_sessions || [];

  if (!Array.isArray(exercises) || exercises.length === 0) blockers.push("Plan has no exercises.");
  if (exercises.length > 7) warnings.push("Plan has more than 7 exercises; consider cutting scope so it stays finishable.");
  if (exercises.length < 3) warnings.push("Plan has fewer than 3 exercises; confirm this is intentionally short.");

  const profileText = JSON.stringify(profile).toLowerCase();
  const hasKneeHistory = /knee|acl|meniscus/.test(profileText);
  const recentText = recentSessions.map((session) => `${session.title || ""} ${(session.focus || []).join(" ")} ${session.summary || ""}`).join("\n");
  const recentRunning = /run|running|treadmill|5 km|5k/i.test(recentText);
  const recentLower = /lower|squat|leg|lunge|deadlift|run|knee/i.test(recentText);

  let lowerCount = 0;
  let conditioningCount = 0;
  for (const [index, exercise] of exercises.entries()) {
    const name = exercise.name || exercise.exercise || exercise.title || `Exercise ${index + 1}`;
    const prescription = exercise.prescription || exercise;
    const text = `${name} ${JSON.stringify(prescription)} ${exercise.rationale || exercise.reason || ""}`;

    if (LOWER_PATTERN.test(text)) lowerCount += 1;
    if (CONDITIONING_PATTERN.test(text)) conditioningCount += 1;

    if (!prescription.sets && !prescription.duration) warnings.push(`${name}: missing sets or duration.`);
    if (!prescription.reps && !prescription.duration) warnings.push(`${name}: missing reps or time.`);
    if (!prescription.rest_seconds && !prescription.rest) suggestions.push(`${name}: add rest guidance.`);
    if (!prescription.load && !prescription.effort && !prescription.rpe && !/mobility|stretch|warm/i.test(text)) suggestions.push(`${name}: add load, effort, or RPE guidance.`);
    if (UNILATERAL_PATTERN.test(name) && !/each side|per side|total alternating/i.test(text)) warnings.push(`${name}: unilateral prescription should say each side or total alternating.`);
    if (hasKneeHistory && IMPACT_PATTERN.test(text)) warnings.push(`${name}: impact/plyometric choice conflicts with knee-history caution unless clearly justified and dosed low.`);
    if (!exercise.alternatives?.length) suggestions.push(`${name}: add at least one practical alternative.`);
  }

  if (hasKneeHistory && recentRunning && lowerCount >= 3) warnings.push("Recent history includes running; avoid stacking too much lower-body stress without asking knee response.");
  if (hasKneeHistory && recentLower && lowerCount >= 4) warnings.push("Several lower-body slots after recent lower-body stress; consider upper/posterior bias or lower volume.");
  if (conditioningCount > 1) suggestions.push("Multiple conditioning slots may be overkill; keep one clear finisher unless conditioning is the main goal.");
  if (preferences.session_duration_min && exercises.length >= 7) suggestions.push(`Profile target is about ${preferences.session_duration_min} minutes; check that this plan fits.`);

  const feedbackText = [...(feedback.summary_notes || []), ...(feedback.signals || []).map((signal) => signal.note || "")].join(" ").toLowerCase();
  if (/explicit.*load|load guidance|starting loads/.test(feedbackText) && exercises.some((exercise) => !(exercise.prescription || exercise).load && !(exercise.prescription || exercise).effort)) {
    warnings.push("Feedback profile asks for explicit load guidance; add loads or effort targets to all main lifts.");
  }
  if (/core.*dropped|trunk.*low-friction/.test(feedbackText) && !exercises.some((exercise) => /dead bug|pallof|plank|carry|core|trunk/i.test(exercise.name || ""))) {
    suggestions.push("Feedback says trunk work needs to be low-friction; consider a simple trunk slot.");
  }

  return {
    verdict: blockers.length ? "revise" : warnings.length ? "revise_or_explain" : "pass",
    title,
    focus,
    summary,
    blockers,
    warnings,
    suggestions: suggestions.slice(0, 12),
    recent_sessions_considered: recentSessions.map((session) => ({ id: session.id, title: session.title, completed_at: session.completed_at })),
  };
}
