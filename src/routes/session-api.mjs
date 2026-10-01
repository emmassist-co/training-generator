import { Hono } from "hono";
import { createD1TrainingStore } from "../db/training-store.mjs";

export function createSessionApi() {
  const app = new Hono();

  app.get("/:sessionId", async (c) => {
    const store = createD1TrainingStore(c.env.TRAINING_DB);
    const session = await store.getSession?.(c.req.param("sessionId"));
    if (!session) return c.json({ error: "not_found" }, 404);
    return c.json(session);
  });

  app.post("/:sessionId/events", async (c) => {
    const store = createD1TrainingStore(c.env.TRAINING_DB);
    const body = await c.req.json();
    const event = await store.logSessionEvent?.({ ...body, session_id: c.req.param("sessionId") });
    return c.json(event, 201);
  });

  return app;
}
