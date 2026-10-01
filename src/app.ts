import { createAgentRouter } from "@flue/runtime/routing";
import { Hono } from "hono";
import { TrainingCoach } from "./agents/training-coach";
import { createSessionApi } from "./routes/session-api.mjs";

export type Env = {
  TRAINING_DB: D1Database;
};

const app = new Hono<{ Bindings: Env }>();

app.get("/api/ping", (c) => c.json({ ok: true, service: "training-generator-agent" }));
app.route("/api/sessions", createSessionApi());
app.route("/agents/training", createAgentRouter(TrainingCoach));

export default app;
