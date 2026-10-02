import { defineTool } from "@flue/runtime";
import * as v from "valibot";

export function searchExercisesTool(catalog) {
  return defineTool({
    name: "search_exercises",
    description: "Search the hosted exercise catalog for safe, practical exercise candidates and substitutions. Use include_muscles for target muscles, equipment for available equipment, categories for movement categories, allowed_risk to control risk, exclude_ids to avoid duplicates, text for keyword search, and limit for result count.",
    input: v.object({
      include_muscles: v.optional(v.array(v.string())),
      equipment: v.optional(v.array(v.string())),
      categories: v.optional(v.array(v.string())),
      allowed_risk: v.optional(v.array(v.picklist(["prefer", "caution", "avoid"]))),
      exclude_ids: v.optional(v.array(v.string())),
      text: v.optional(v.string()),
      limit: v.optional(v.number()),
    }),
    async run({ data }) {
      const results = await catalog.search(data || {});
      return { output: { results } };
    },
  });
}
