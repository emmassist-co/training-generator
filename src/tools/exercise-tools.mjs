export function searchExercisesTool(catalog) {
  return {
    name: "search_exercises",
    description: "Search the hosted exercise catalog for safe, practical exercise candidates and substitutions using muscles, equipment, category, and risk filters.",
    async run(input = {}) {
      const results = await catalog.search(input);
      return { results };
    },
  };
}
