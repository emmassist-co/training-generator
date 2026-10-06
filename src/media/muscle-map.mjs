export const MUSCLE_GROUP = Object.freeze({
  ABDOMINALS: "abdominals",
  ABDUCTORS: "abductors",
  ADDUCTORS: "adductors",
  BICEPS: "biceps",
  CALVES: "calves",
  CHEST: "chest",
  FOREARMS: "forearms",
  GLUTES: "glutes",
  HAMSTRINGS: "hamstrings",
  LATS: "lats",
  LOWER_BACK: "lower back",
  MIDDLE_BACK: "middle back",
  NECK: "neck",
  QUADRICEPS: "quadriceps",
  SHOULDERS: "shoulders",
  TRAPS: "traps",
  TRICEPS: "triceps",
});

const GROUP_ALIASES = new Map([
  ["abs", MUSCLE_GROUP.ABDOMINALS],
  ["abdominal", MUSCLE_GROUP.ABDOMINALS],
  ["abdominals", MUSCLE_GROUP.ABDOMINALS],
  ["abductor", MUSCLE_GROUP.ABDUCTORS],
  ["abductors", MUSCLE_GROUP.ABDUCTORS],
  ["adductor", MUSCLE_GROUP.ADDUCTORS],
  ["adductors", MUSCLE_GROUP.ADDUCTORS],
  ["bicep", MUSCLE_GROUP.BICEPS],
  ["biceps", MUSCLE_GROUP.BICEPS],
  ["calf", MUSCLE_GROUP.CALVES],
  ["calves", MUSCLE_GROUP.CALVES],
  ["chest", MUSCLE_GROUP.CHEST],
  ["pectoral", MUSCLE_GROUP.CHEST],
  ["pectorals", MUSCLE_GROUP.CHEST],
  ["forearm", MUSCLE_GROUP.FOREARMS],
  ["forearms", MUSCLE_GROUP.FOREARMS],
  ["glute", MUSCLE_GROUP.GLUTES],
  ["glutes", MUSCLE_GROUP.GLUTES],
  ["gluteal", MUSCLE_GROUP.GLUTES],
  ["gluteals", MUSCLE_GROUP.GLUTES],
  ["hamstring", MUSCLE_GROUP.HAMSTRINGS],
  ["hamstrings", MUSCLE_GROUP.HAMSTRINGS],
  ["lat", MUSCLE_GROUP.LATS],
  ["lats", MUSCLE_GROUP.LATS],
  ["latissimus dorsi", MUSCLE_GROUP.LATS],
  ["lower back", MUSCLE_GROUP.LOWER_BACK],
  ["middle back", MUSCLE_GROUP.MIDDLE_BACK],
  ["mid back", MUSCLE_GROUP.MIDDLE_BACK],
  ["neck", MUSCLE_GROUP.NECK],
  ["quad", MUSCLE_GROUP.QUADRICEPS],
  ["quads", MUSCLE_GROUP.QUADRICEPS],
  ["quadriceps", MUSCLE_GROUP.QUADRICEPS],
  ["shoulder", MUSCLE_GROUP.SHOULDERS],
  ["shoulders", MUSCLE_GROUP.SHOULDERS],
  ["deltoid", MUSCLE_GROUP.SHOULDERS],
  ["deltoids", MUSCLE_GROUP.SHOULDERS],
  ["trap", MUSCLE_GROUP.TRAPS],
  ["traps", MUSCLE_GROUP.TRAPS],
  ["trapezius", MUSCLE_GROUP.TRAPS],
  ["tricep", MUSCLE_GROUP.TRICEPS],
  ["triceps", MUSCLE_GROUP.TRICEPS],
]);

const GROUP_REGIONS = {
  [MUSCLE_GROUP.ABDOMINALS]: ["abs-", "obliques-", "serratus-anterior-"],
  [MUSCLE_GROUP.ABDUCTORS]: ["gluteus-medius-"],
  [MUSCLE_GROUP.ADDUCTORS]: ["adductors-"],
  [MUSCLE_GROUP.BICEPS]: ["biceps-"],
  [MUSCLE_GROUP.CALVES]: ["calves-"],
  [MUSCLE_GROUP.CHEST]: ["chest-"],
  [MUSCLE_GROUP.FOREARMS]: ["forearm-", "forearm-flexors-", "forearm-extensors-"],
  [MUSCLE_GROUP.GLUTES]: ["gluteus-"],
  [MUSCLE_GROUP.HAMSTRINGS]: ["hamstrings-"],
  [MUSCLE_GROUP.LATS]: ["lats-"],
  [MUSCLE_GROUP.LOWER_BACK]: ["lower-back-", "spine"],
  [MUSCLE_GROUP.MIDDLE_BACK]: ["traps-mid-", "traps-lower-", "lats-upper-", "lats-mid-"],
  [MUSCLE_GROUP.NECK]: ["neck-", "nape"],
  [MUSCLE_GROUP.QUADRICEPS]: ["quads-"],
  [MUSCLE_GROUP.SHOULDERS]: ["shoulder-", "deltoid-rear-"],
  [MUSCLE_GROUP.TRAPS]: ["traps-"],
  [MUSCLE_GROUP.TRICEPS]: ["triceps-"],
};

const FRONT_REGION_IDS = [
  "head", "face", "neck-right", "neck-left", "shoulder-front-left", "shoulder-side-left", "shoulder-front-right", "shoulder-side-right",
  "biceps-left", "forearm-left", "biceps-right", "forearm-right", "chest-upper-left", "chest-lower-left", "chest-upper-right", "chest-lower-right",
  "abs-upper-left", "serratus-anterior-left", "obliques-left", "abs-upper-right", "abs-lower-right", "abs-lower-left", "serratus-anterior-right", "obliques-right",
  "hip-flexor-right", "hip-flexor-left", "quads-left", "adductors-left", "foot-left", "tibialis-anterior-left", "knee-left", "quads-right", "adductors-right",
  "foot-right", "tibialis-anterior-right", "knee-right", "elbow-right", "hand-right", "elbow-left", "hand-left",
];

const BACK_REGION_IDS = [
  "head-back", "nape", "traps-upper-left", "traps-mid-left", "traps-lower-left", "traps-upper-right", "traps-mid-right", "traps-lower-right",
  "lats-upper-left", "deltoid-rear-left", "lats-mid-left", "lats-lower-left", "deltoid-rear-right", "lats-upper-right", "lats-mid-right", "lats-lower-right",
  "triceps-long-left", "triceps-lateral-left", "hand-back-left", "forearm-flexors-left", "forearm-extensors-left", "triceps-long-right", "triceps-lateral-right",
  "hand-back-right", "forearm-flexors-right", "forearm-extensors-right", "spine", "lower-back-erectors-left", "lower-back-ql-left", "lower-back-erectors-right",
  "lower-back-ql-right", "gluteus-medius-left", "gluteus-maximus-left", "gluteus-medius-right", "gluteus-maximus-right", "knee-back-left", "knee-back-right",
  "calves-gastroc-medial-left", "calves-gastroc-lateral-left", "calves-soleus-left", "calves-gastroc-medial-right", "calves-gastroc-lateral-right", "calves-soleus-right",
  "foot-back-left", "hamstrings-medial-left", "hamstrings-lateral-left", "foot-back-right", "hamstrings-medial-right", "hamstrings-lateral-right",
];

function normalizedMuscleName(value) {
  return String(value || "").trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function matchingRegions(ids, group) {
  const patterns = GROUP_REGIONS[group] || [];
  return ids.filter((id) => patterns.some((pattern) => pattern.endsWith("-") ? id.startsWith(pattern) : id === pattern));
}

export function buildMuscleMap(muscles = []) {
  const groups = [];
  const unmapped = [];
  for (const value of Array.isArray(muscles) ? muscles : []) {
    const group = GROUP_ALIASES.get(normalizedMuscleName(value));
    if (!group) {
      if (value && !unmapped.includes(String(value))) unmapped.push(String(value));
      continue;
    }
    if (!groups.includes(group)) groups.push(group);
  }
  return {
    groups,
    front_ids: [...new Set(groups.flatMap((group) => matchingRegions(FRONT_REGION_IDS, group)))],
    back_ids: [...new Set(groups.flatMap((group) => matchingRegions(BACK_REGION_IDS, group)))],
    unmapped,
  };
}
