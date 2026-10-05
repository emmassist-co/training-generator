import { createAgentRouter } from "@flue/runtime/routing";
import { Hono } from "hono";
import { TrainingCoach } from "./agents/training-coach";
import { renderChatPage } from "./routes/ChatPage.tsx";
import { renderHomePage } from "./routes/HomePage.tsx";
import { renderHistoryPage } from "./routes/HistoryPage.tsx";
import { createHomeApi } from "./routes/home-api.mjs";
import { createSessionApi, renderSavedSessionPage } from "./routes/session-api.mjs";
import { createConversationApi } from "./routes/conversation-api.mjs";
import { createProfileLearningApi } from "./routes/profile-learning-api.mjs";

export type Env = {
  TRAINING_DB: D1Database;
};

const app = new Hono<{ Bindings: Env }>();

app.get("/", (c) => c.html(renderHomePage()));
app.get("/chat", (c) => c.html(renderChatPage()));
app.get("/history", (c) => c.html(renderHistoryPage()));
app.get("/api/ping", (c) => c.json({ ok: true, service: "training-generator-agent" }));
app.get("/sessions/:sessionId", renderSavedSessionPage);
app.route("/api/home", createHomeApi());
app.route("/api/conversations", createConversationApi());
app.route("/api/sessions", createSessionApi());
app.route("/api/profile-learning", createProfileLearningApi());
app.route("/agents/training", createAgentRouter(TrainingCoach));

export default app;
