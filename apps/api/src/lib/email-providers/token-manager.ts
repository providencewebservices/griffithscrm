import { eq } from 'drizzle-orm';
import { db } from '../auth';
import { emailIntegrations } from '@griffiths-crm/shared/db/schema';
import { getEmailProvider } from './index';

const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Gets a valid access token for an email integration.
 * If the token is expired (or within 5 min of expiring), it refreshes it first.
 * If refresh fails with invalid_grant, marks integration as token_expired.
 */
export async function getValidAccessToken(integrationId: string): Promise<{
	accessToken: string;
	integration: typeof emailIntegrations.$inferSelect;
}> {
	const [integration] = await db
		.select()
		.from(emailIntegrations)
		.where(eq(emailIntegrations.id, integrationId))
		.limit(1);

	if (!integration) {
		throw new Error('Email integration not found');
	}

	if (integration.status !== 'active' && integration.status !== 'token_expired') {
		throw new Error(`Email integration is ${integration.status}`);
	}

	const now = new Date();
	const expiresAt = integration.accessTokenExpiresAt;
	const needsRefresh = !expiresAt || now.getTime() >= expiresAt.getTime() - TOKEN_REFRESH_BUFFER_MS;

	if (!needsRefresh) {
		return { accessToken: integration.accessToken, integration };
	}

	// Need to refresh
	const provider = getEmailProvider(integration.provider as 'gmail' | 'microsoft');

	try {
		const result = await provider.refreshAccessToken(integration.refreshToken);

		const updates: Partial<typeof emailIntegrations.$inferInsert> = {
			accessToken: result.accessToken,
			accessTokenExpiresAt: result.expiresAt,
			status: 'active',
			errorMessage: null,
			updatedAt: new Date(),
		};

		if (result.refreshToken) {
			updates.refreshToken = result.refreshToken;
		}

		await db
			.update(emailIntegrations)
			.set(updates)
			.where(eq(emailIntegrations.id, integrationId));

		return {
			accessToken: result.accessToken,
			integration: { ...integration, ...updates } as typeof emailIntegrations.$inferSelect,
		};
	} catch (err: any) {
		// Mark as token_expired if refresh fails
		const isInvalidGrant =
			err?.message?.includes('invalid_grant') ||
			err?.response?.data?.error === 'invalid_grant';

		await db
			.update(emailIntegrations)
			.set({
				status: isInvalidGrant ? 'token_expired' : 'error',
				errorMessage: err?.message || 'Token refresh failed',
				updatedAt: new Date(),
			})
			.where(eq(emailIntegrations.id, integrationId));

		throw new Error(
			isInvalidGrant
				? 'Gmail access expired. Please reconnect your account.'
				: `Token refresh failed: ${err?.message}`
		);
	}
}
