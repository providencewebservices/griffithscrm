-- Clean up duplicate messages (keep newest per providerMessageId, delete older duplicates)
DELETE FROM "email_messages" a USING "email_messages" b
WHERE a.integration_id = b.integration_id
  AND a.provider_message_id = b.provider_message_id
  AND a.created_at < b.created_at;--> statement-breakpoint

-- Clean up duplicate threads (first delete messages referencing duplicate threads that will be removed)
DELETE FROM "email_messages" WHERE thread_id IN (
  SELECT a.id FROM "email_threads" a
  INNER JOIN "email_threads" b
    ON a.integration_id = b.integration_id
    AND a.provider_thread_id = b.provider_thread_id
    AND a.created_at < b.created_at
);--> statement-breakpoint

-- Now delete duplicate threads (keep newest per providerThreadId)
DELETE FROM "email_threads" a USING "email_threads" b
WHERE a.integration_id = b.integration_id
  AND a.provider_thread_id = b.provider_thread_id
  AND a.created_at < b.created_at;--> statement-breakpoint

CREATE UNIQUE INDEX "email_messages_integration_provider_idx" ON "email_messages" USING btree ("integration_id","provider_message_id");--> statement-breakpoint
CREATE UNIQUE INDEX "email_threads_integration_provider_idx" ON "email_threads" USING btree ("integration_id","provider_thread_id");