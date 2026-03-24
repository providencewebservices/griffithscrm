import { emailIntegrations } from '@griffiths-crm/shared/db/schema';
import { and, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { db } from '../lib/auth';
import { doSync } from '../lib/email-sync';

const inboxWebhookRoutes = new Hono()
	// POST /webhook/gmail - Google Pub/Sub push notification
	.post('/webhook/gmail', async (c) => {
		const webhookToken = process.env.GMAIL_WEBHOOK_TOKEN;
		if (!webhookToken) {
			return c.json({ error: 'Webhook not configured' }, 401);
		}

		// Validate shared-secret token
		const token = c.req.query('token');
		if (token !== webhookToken) {
			return c.json({ error: 'Invalid token' }, 401);
		}

		try {
			const body = await c.req.json();
			const data = body?.message?.data;
			if (!data) {
				// Malformed Pub/Sub envelope — ack to stop retries
				return c.json({ ok: true });
			}

			const decoded = JSON.parse(Buffer.from(data, 'base64').toString('utf-8'));
			const emailAddress = decoded.emailAddress as string | undefined;

			if (!emailAddress) {
				return c.json({ ok: true });
			}

			// Look up active integration by email address
			const [integration] = await db
				.select({
					id: emailIntegrations.id,
					tenantId: emailIntegrations.tenantId,
				})
				.from(emailIntegrations)
				.where(
					and(
						eq(emailIntegrations.emailAddress, emailAddress),
						eq(emailIntegrations.provider, 'gmail'),
						eq(emailIntegrations.status, 'active'),
					),
				)
				.limit(1);

			if (!integration) {
				// No active integration for this email — ack to stop retries
				return c.json({ ok: true });
			}

			// Fire-and-forget sync (doSync has its own 60s cooldown)
			doSync(integration.id, integration.tenantId).catch((err) => {
				console.error('[inbox-webhook] Sync failed for', emailAddress, err);
			});

			return c.json({ ok: true });
		} catch (err) {
			console.error('[inbox-webhook] Error processing notification:', err);
			// Return 200 to avoid Pub/Sub retries on transient errors
			return c.json({ ok: true });
		}
	});

export { inboxWebhookRoutes };
