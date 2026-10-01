import { Hono } from "hono";
import { createD1TrainingStore } from "../db/training-store.mjs";

export function createHomeApi() {
  const app = new Hono();

  app.get("/", async (c) => {
    const store = createD1TrainingStore(c.env.TRAINING_DB);
    const profileId = c.req.query("profile_id") || "default";
    const recentLimit = c.req.query("recent_limit") || 5;
    return c.json(await store.getHomeSummary({ profileId, recentLimit }));
  });

  return app;
}
