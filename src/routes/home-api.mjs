import { Hono } from "hono";
import { createD1TrainingStore } from "../db/training-store.mjs";
import { firstExerciseImage } from "../media/exercise-images.mjs";

export function createHomeApi() {
  const app = new Hono();

  app.get("/", async (c) => {
    const store = createD1TrainingStore(c.env.TRAINING_DB);
    const profileId = c.req.query("profile_id") || "default";
    const recentLimit = c.req.query("recent_limit") || 5;
    const summary = await store.getHomeSummary({ profileId, recentLimit });
    const activeSession = summary.active_session;
    return c.json({
      ...summary,
      active_session: activeSession
        ? { ...activeSession, preview_image: firstExerciseImage(activeSession.exercises?.[0]) }
        : null,
    });
  });

  return app;
}
