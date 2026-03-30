CREATE TABLE "whatsapp_chat_messages" (
  "id" TEXT NOT NULL,
  "session_id" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "intent" TEXT,
  "message_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "whatsapp_chat_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "whatsapp_chat_messages_session_id_created_at_idx"
  ON "whatsapp_chat_messages"("session_id", "created_at");

CREATE INDEX "whatsapp_chat_messages_session_id_role_idx"
  ON "whatsapp_chat_messages"("session_id", "role");

CREATE INDEX "whatsapp_chat_messages_message_id_idx"
  ON "whatsapp_chat_messages"("message_id");

ALTER TABLE "whatsapp_chat_messages"
  ADD CONSTRAINT "whatsapp_chat_messages_session_id_fkey"
  FOREIGN KEY ("session_id") REFERENCES "whatsapp_sessions"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
