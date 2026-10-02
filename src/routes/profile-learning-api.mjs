import { Hono } from "hono";
import { createD1TrainingStore } from "../db/training-store.mjs";

export function createProfileLearningApi() {
  const app = new Hono();

  app.post("/proposals", async (c) => {
    const store = createD1TrainingStore(c.env.TRAINING_DB);
    const body = await c.req.json();
    const proposal = await store.proposeProfileUpdate(body);
    return c.json(proposal, 201);
  });

  app.post("/proposals/:proposalId/apply", async (c) => {
    const store = createD1TrainingStore(c.env.TRAINING_DB);
    const body = await c.req.json();
    const result = await store.applyProfileUpdate({ ...body, proposal_id: c.req.param("proposalId") });
    return c.json(result);
  });

  app.post("/proposals/:proposalId/reject", async (c) => {
    const store = createD1TrainingStore(c.env.TRAINING_DB);
    const body = await c.req.json();
    const result = await store.rejectProfileUpdate({ ...body, proposal_id: c.req.param("proposalId") });
    return c.json(result);
  });

  return app;
}
