import { Hono } from "hono";
import { createD1ConversationStore } from "../db/conversation-store.mjs";

export function createConversationApi() {
  const app = new Hono();

  app.get("/", async (c) => {
    const store = createD1ConversationStore(c.env.TRAINING_DB);
    const profileId = c.req.query("profile_id") || "default";
    const conversations = await store.listConversations({ profileId, limit: c.req.query("limit") || 20 });
    return c.json({ conversations });
  });

  app.post("/", async (c) => {
    const store = createD1ConversationStore(c.env.TRAINING_DB);
    const body = await c.req.json().catch(() => ({}));
    const conversation = await store.createConversation({ profileId: body.profile_id || "default", title: body.title || "New conversation" });
    return c.json(conversation, 201);
  });

  app.patch("/:conversationId", async (c) => {
    const store = createD1ConversationStore(c.env.TRAINING_DB);
    const body = await c.req.json().catch(() => ({}));
    const conversation = await store.updateConversation({ id: c.req.param("conversationId"), title: body.title, flueUid: body.flue_uid });
    return c.json(conversation);
  });

  app.get("/:conversationId/messages", async (c) => {
    const store = createD1ConversationStore(c.env.TRAINING_DB);
    const messages = await store.listMessages({ conversationId: c.req.param("conversationId"), limit: c.req.query("limit") || 100 });
    return c.json({ messages });
  });

  app.post("/:conversationId/messages", async (c) => {
    const store = createD1ConversationStore(c.env.TRAINING_DB);
    const body = await c.req.json();
    const message = await store.addMessage({ conversationId: c.req.param("conversationId"), role: body.role, body: body.body });
    return c.json(message, 201);
  });

  return app;
}
