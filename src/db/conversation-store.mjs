export function createD1ConversationStore(db) {
  if (!db || typeof db.prepare !== "function") {
    throw new Error("TRAINING_DB D1 binding is required.");
  }

  return {
    async listConversations({ profileId = "default", limit = 20 } = {}) {
      const cappedLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);
      const rows = await db.prepare("SELECT id, profile_id, title, flue_uid, created_at, updated_at FROM chat_conversations WHERE profile_id = ? ORDER BY updated_at DESC LIMIT ?")
        .bind(profileId, cappedLimit)
        .all();
      return rows.results || [];
    },

    async createConversation({ id = crypto.randomUUID(), profileId = "default", title = "New conversation", flueUid } = {}) {
      await db.prepare("INSERT OR IGNORE INTO profiles (id, profile_json, preferences_json, feedback_profile_json) VALUES (?, '{}', '{}', '{}')")
        .bind(profileId)
        .run();
      await db.prepare("INSERT INTO chat_conversations (id, profile_id, title, flue_uid, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP) ON CONFLICT(id) DO UPDATE SET profile_id = excluded.profile_id, title = excluded.title, flue_uid = COALESCE(excluded.flue_uid, chat_conversations.flue_uid), updated_at = CURRENT_TIMESTAMP")
        .bind(id, profileId, title, flueUid || null)
        .run();
      return this.getConversation(id);
    },

    async getConversation(id) {
      return db.prepare("SELECT id, profile_id, title, flue_uid, created_at, updated_at FROM chat_conversations WHERE id = ?")
        .bind(id)
        .first();
    },

    async updateConversation({ id, title, flueUid }) {
      const current = await this.getConversation(id);
      if (!current) throw new Error(`Conversation not found: ${id}`);
      await db.prepare("UPDATE chat_conversations SET title = COALESCE(?, title), flue_uid = COALESCE(?, flue_uid), updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .bind(title || null, flueUid || null, id)
        .run();
      return this.getConversation(id);
    },

    async listMessages({ conversationId, limit = 100 } = {}) {
      const cappedLimit = Math.min(Math.max(Number(limit) || 100, 1), 200);
      const rows = await db.prepare("SELECT id, conversation_id, role, body, created_at FROM chat_messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT ?")
        .bind(conversationId, cappedLimit)
        .all();
      return rows.results || [];
    },

    async addMessage({ id = crypto.randomUUID(), conversationId, role, body }) {
      if (!conversationId) throw new Error("conversationId is required.");
      if (!role) throw new Error("role is required.");
      await db.prepare("INSERT INTO chat_messages (id, conversation_id, role, body) VALUES (?, ?, ?, ?)")
        .bind(id, conversationId, role, String(body || ""))
        .run();
      await db.prepare("UPDATE chat_conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .bind(conversationId)
        .run();
      return { id, conversation_id: conversationId, role, body: String(body || "") };
    },
  };
}
