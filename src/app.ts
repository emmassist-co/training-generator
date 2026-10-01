import { createAgentRouter } from "@flue/runtime/routing";
import { Hono } from "hono";
import { TrainingCoach } from "./agents/training-coach";
import { renderChatPage } from "./routes/chat-page.mjs";
import { createSessionApi, renderSavedSessionPage } from "./routes/session-api.mjs";

export type Env = {
  TRAINING_DB: D1Database;
  TRAINING_CHAT_PASSWORD?: string;
};

const app = new Hono<{ Bindings: Env }>();

app.use("*", async (c, next) => {
  const password = c.env.TRAINING_CHAT_PASSWORD;
  if (!password) return next();
  const auth = c.req.header("authorization") || "";
  const [scheme, encoded] = auth.split(" ");
  if (scheme === "Basic" && encoded) {
    const decoded = atob(encoded);
    const separator = decoded.indexOf(":");
    const supplied = separator >= 0 ? decoded.slice(separator + 1) : "";
    if (supplied === password) return next();
  }
  return new Response("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Training Coach", charset="UTF-8"' },
  });
});

app.get("/", (c) => c.html(renderChatPage()));
app.get("/chat", (c) => c.html(renderChatPage()));
app.get("/api/ping", (c) => c.json({ ok: true, service: "training-generator-agent" }));
app.get("/sessions/:sessionId", renderSavedSessionPage);
app.route("/api/sessions", createSessionApi());
app.route("/agents/training", createAgentRouter(TrainingCoach));

export default app;
