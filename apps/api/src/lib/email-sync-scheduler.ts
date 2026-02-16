import { eq } from 'drizzle-orm';
import { db } from './auth';
import { emailIntegrations } from '@griffiths-crm/shared/db/schema';
import { doSync } from './email-sync';

const BACKGROUND_SYNC_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

export function startEmailSyncScheduler() {
	console.log('[email-sync-scheduler] Background email sync started (interval: 2m)');

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
	}, BACKGROUND_SYNC_INTERVAL_MS);
}
