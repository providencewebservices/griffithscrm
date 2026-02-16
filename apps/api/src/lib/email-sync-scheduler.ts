import { eq, and, lt, isNull, or } from 'drizzle-orm';
import { db } from './auth';
import { emailIntegrations } from '@griffiths-crm/shared/db/schema';
import { doSync } from './email-sync';
import { getValidAccessToken } from './email-providers';
import { GmailProvider } from './email-providers/gmail';

const BACKGROUND_SYNC_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const WATCH_CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

let lastWatchCheck = 0;

async function renewExpiringWatches() {
	const topicName = process.env.GOOGLE_PUBSUB_TOPIC;
	if (!topicName) return;

	const renewBefore = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h from now

	const integrations = await db
		.select({
			id: emailIntegrations.id,
		})
		.from(emailIntegrations)
		.where(
			and(
				eq(emailIntegrations.provider, 'gmail'),
				eq(emailIntegrations.status, 'active'),
				or(
					lt(emailIntegrations.watchExpiration, renewBefore),
					isNull(emailIntegrations.watchExpiration)
				)
			)
		);

	if (integrations.length === 0) return;

	console.log(`[email-sync-scheduler] Renewing watches for ${integrations.length} integration(s)`);

	const provider = new GmailProvider();

	for (const integration of integrations) {
		try {
			const { accessToken } = await getValidAccessToken(integration.id);
			const watchResult = await provider.watchMailbox({
				accessToken,
				topicName,
			});
			await db.update(emailIntegrations).set({
				watchExpiration: new Date(parseInt(watchResult.expiration)),
				watchHistoryId: watchResult.historyId,
				updatedAt: new Date(),
			}).where(eq(emailIntegrations.id, integration.id));
		} catch (err) {
			console.error(`[email-sync-scheduler] Watch renewal failed for integration ${integration.id}:`, err);
		}
	}
}

export function startEmailSyncScheduler() {
	console.log('[email-sync-scheduler] Background email sync started (interval: 10m)');

	setInterval(async () => {
		try {
			const activeIntegrations = await db
				.select({
					id: emailIntegrations.id,
					tenantId: emailIntegrations.tenantId,
				})
				.from(emailIntegrations)
				.where(eq(emailIntegrations.status, 'active'));

			if (activeIntegrations.length === 0) return;

			console.log(`[email-sync-scheduler] Syncing ${activeIntegrations.length} active integration(s)`);

			for (const integration of activeIntegrations) {
				try {
					await doSync(integration.id, integration.tenantId);
				} catch (err) {
					console.error(`[email-sync-scheduler] Sync failed for integration ${integration.id}:`, err);
				}
			}
		} catch (err) {
			console.error('[email-sync-scheduler] Failed to query active integrations:', err);
		}

		// Check if watches need renewal (hourly)
		const now = Date.now();
		if (now - lastWatchCheck >= WATCH_CHECK_INTERVAL_MS) {
			lastWatchCheck = now;
			try {
				await renewExpiringWatches();
			} catch (err) {
				console.error('[email-sync-scheduler] Watch renewal check failed:', err);
			}
		}
	}, BACKGROUND_SYNC_INTERVAL_MS);
}
