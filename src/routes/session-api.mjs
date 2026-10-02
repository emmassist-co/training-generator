import { Hono } from "hono";
import { createD1TrainingStore } from "../db/training-store.mjs";
import { renderSessionPage } from "./session-page.mjs";

export async function renderSavedSessionPage(c) {
  const store = createD1TrainingStore(c.env.TRAINING_DB);
  const session = await store.getSession?.(c.req.param("sessionId"));
  if (!session) return c.text("Session not found", 404);
  return c.html(renderSessionPage(session));
}

export function createSessionApi() {
  const app = new Hono();

  app.get("/", async (c) => {
    const store = createD1TrainingStore(c.env.TRAINING_DB);
    const profileId = c.req.query("profile_id") || "default";
    const status = c.req.query("status") || undefined;
    const limit = c.req.query("limit") || 10;
    const offset = c.req.query("offset") || 0;
    const sessions = await store.listTrainingHistory({ profileId, status, limit, offset });
    return c.json({ profile_id: profileId, sessions });
  });

  app.get("/:sessionId", async (c) => {
    const store = createD1TrainingStore(c.env.TRAINING_DB);
    const session = await store.getSession?.(c.req.param("sessionId"));
    if (!session) return c.json({ error: "not_found" }, 404);
    return c.json(session);
  });

  app.get("/:sessionId/live-state", async (c) => {
    const store = createD1TrainingStore(c.env.TRAINING_DB);
    try {
      return c.json(await store.getSessionLiveState(c.req.param("sessionId")));
    } catch (error) {
      return c.json({ error: "not_found", message: error.message }, 404);
    }
  });

  app.post("/:sessionId/start", async (c) => {
    const store = createD1TrainingStore(c.env.TRAINING_DB);
    const body = await safeJson(c);
    const session = await store.startSession?.({ ...body, session_id: c.req.param("sessionId") });
    return c.json(session);
  });

  app.post("/:sessionId/proposals/:proposalId/apply", async (c) => {
    const store = createD1TrainingStore(c.env.TRAINING_DB);
    const body = await safeJson(c);
    const session = await store.applyApprovedChange?.({
      ...body,
      session_id: c.req.param("sessionId"),
      proposal_id: c.req.param("proposalId"),
      approved_by: body.approved_by || "user",
    });
    return c.json(session);
  });

  app.post("/:sessionId/proposals/:proposalId/reject", async (c) => {
    const store = createD1TrainingStore(c.env.TRAINING_DB);
    const body = await safeJson(c);
    const session = await store.rejectProposal?.({
      ...body,
      session_id: c.req.param("sessionId"),
      proposal_id: c.req.param("proposalId"),
    });
    return c.json(session);
  });

  app.post("/:sessionId/events", async (c) => {
    const store = createD1TrainingStore(c.env.TRAINING_DB);
    const body = await c.req.json();
    if (!body?.type || typeof body.type !== "string") return c.json({ error: "invalid_event", message: "type is required" }, 400);
    const event = await store.logSessionEvent?.({ ...body, session_id: c.req.param("sessionId") });
    return c.json(event, 201);
  });

  app.post("/:sessionId/complete", async (c) => {
    const store = createD1TrainingStore(c.env.TRAINING_DB);
    const body = await c.req.json();
    const session = await store.completeSession?.({ ...body, session_id: c.req.param("sessionId") });
    return c.json(session);
  });

  return app;
}

async function safeJson(c) {
  try {
    return await c.req.json();
  } catch {
    return {};
  }
}
