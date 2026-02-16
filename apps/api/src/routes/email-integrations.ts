import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { requireAuth, requireTenant } from '../middleware/auth';
import { db } from '../lib/auth';
import {
	emailIntegrations,
	emailThreads,
	emailMessages,
} from '@griffiths-crm/shared/db/schema';
import { GmailProvider, GMAIL_SCOPES, getOAuth2Client } from '../lib/email-providers/gmail';
import { getValidAccessToken } from '../lib/email-providers';
import crypto from 'crypto';

// HMAC-based state signing using BETTER_AUTH_SECRET
function signState(payload: Record<string, unknown>): string {
	const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
	const hmac = crypto
		.createHmac('sha256', process.env.BETTER_AUTH_SECRET || 'secret')
		.update(data)
		.digest('base64url');
	return `${data}.${hmac}`;
}

function verifyState(state: string): Record<string, unknown> | null {
	const [data, sig] = state.split('.');
	if (!data || !sig) return null;

	const expected = crypto
		.createHmac('sha256', process.env.BETTER_AUTH_SECRET || 'secret')
		.update(data)
		.digest('base64url');

	if (sig !== expected) return null;

	try {
		const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf-8'));
		// Check expiry
		if (payload.exp && Date.now() > payload.exp) return null;
		return payload;
	} catch {
		return null;
	}
}

async function performInitialSync(integrationId: string, tenantId: string) {
	try {
		const { accessToken } = await getValidAccessToken(integrationId);
		const gmail = new GmailProvider();

		const result = await gmail.listThreads({
			accessToken,
			maxResults: 50,
			labelIds: ['INBOX'],
		});

		for (const thread of result.threads) {
			const threadId = crypto.randomUUID();

			await db.insert(emailThreads).values({
				id: threadId,
				integrationId,
				tenantId,
				providerThreadId: thread.providerThreadId,
				subject: thread.subject,
				snippet: thread.snippet,
				lastMessageAt: thread.lastMessageAt,
				messageCount: thread.messageCount,
				isUnread: thread.isUnread,
				isArchived: false,
				labelIds: JSON.stringify(thread.labelIds),
			});

			// Store message metadata
			for (const msg of thread.messages) {
				await db.insert(emailMessages).values({
					id: crypto.randomUUID(),
					threadId,
					integrationId,
					tenantId,
					providerMessageId: msg.providerMessageId,
					fromAddress: msg.fromAddress,
					fromName: msg.fromName,
					toAddresses: JSON.stringify(msg.toAddresses),
					ccAddresses: JSON.stringify(msg.ccAddresses),
					subject: msg.subject,
					snippet: msg.snippet,
					isUnread: msg.isUnread,
					hasAttachments: msg.hasAttachments,
					labelIds: JSON.stringify(msg.labelIds),
					internalDate: msg.internalDate,
				});
			}
		}

		// Update historyId and lastSyncAt
		if (result.historyId) {
			await db
				.update(emailIntegrations)
				.set({
					historyId: result.historyId,
					lastSyncAt: new Date(),
					updatedAt: new Date(),
				})
				.where(eq(emailIntegrations.id, integrationId));
		}
	} catch (err) {
		console.error('Initial sync failed:', err);
		await db
			.update(emailIntegrations)
			.set({
				errorMessage: `Initial sync failed: ${(err as Error).message}`,
				updatedAt: new Date(),
			})
			.where(eq(emailIntegrations.id, integrationId));
	}
}

const emailIntegrationsRoutes = new Hono()
	// GET /connect/gmail - Generate OAuth URL (requires auth)
	.use('/connect/*', requireAuth, requireTenant)
	.get('/connect/gmail', async (c) => {
		const user = c.get('user');
		const oauth2Client = getOAuth2Client();

		const state = signState({
			userId: user.id,
			tenantId: user.tenantId,
			exp: Date.now() + 10 * 60 * 1000, // 10 min expiry
		});

		const url = oauth2Client.generateAuthUrl({
			access_type: 'offline',
			prompt: 'consent',
			scope: GMAIL_SCOPES,
			state,
		});

		return c.json({ url });
	})

	// GET /callback/gmail - OAuth callback (NO auth middleware - redirect from Google)
	.get('/callback/gmail', async (c) => {
		const code = c.req.query('code');
		const state = c.req.query('state');
		const error = c.req.query('error');
		const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';

		if (error) {
			return c.redirect(`${corsOrigin}/app/inbox?error=${encodeURIComponent(error)}`);
		}

		if (!code || !state) {
			return c.redirect(`${corsOrigin}/app/inbox?error=missing_params`);
		}

		const payload = verifyState(state);
		if (!payload) {
			return c.redirect(`${corsOrigin}/app/inbox?error=invalid_state`);
		}

		const userId = payload.userId as string;
		const tenantId = payload.tenantId as string;

		try {
			const oauth2Client = getOAuth2Client();
			const { tokens } = await oauth2Client.getToken(code);

			if (!tokens.access_token || !tokens.refresh_token) {
				return c.redirect(`${corsOrigin}/app/inbox?error=no_tokens`);
			}

			// Get email address from userinfo
			oauth2Client.setCredentials(tokens);
			const oauth2 = (await import('googleapis')).google.oauth2({ version: 'v2', auth: oauth2Client });
			const userInfo = await oauth2.userinfo.get();
			const emailAddress = userInfo.data.email;

			if (!emailAddress) {
				return c.redirect(`${corsOrigin}/app/inbox?error=no_email`);
			}

			// Check for existing integration with same email
			const [existing] = await db
				.select()
				.from(emailIntegrations)
				.where(
					and(
						eq(emailIntegrations.userId, userId),
						eq(emailIntegrations.tenantId, tenantId),
						eq(emailIntegrations.emailAddress, emailAddress)
					)
				)
				.limit(1);

			const integrationId = existing?.id || crypto.randomUUID();

			if (existing) {
				// Update existing integration
				await db
					.update(emailIntegrations)
					.set({
						accessToken: tokens.access_token,
						refreshToken: tokens.refresh_token,
						accessTokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
						scopes: tokens.scope || GMAIL_SCOPES.join(','),
						providerAccountId: userInfo.data.id || null,
						status: 'active',
						errorMessage: null,
						updatedAt: new Date(),
					})
					.where(eq(emailIntegrations.id, existing.id));
			} else {
				// Create new integration
				await db.insert(emailIntegrations).values({
					id: integrationId,
					userId,
					tenantId,
					provider: 'gmail',
					emailAddress,
					accessToken: tokens.access_token,
					refreshToken: tokens.refresh_token,
					accessTokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
					scopes: tokens.scope || GMAIL_SCOPES.join(','),
					providerAccountId: userInfo.data.id || null,
					status: 'active',
				});
			}

			// Trigger initial sync in the background (don't await)
			performInitialSync(integrationId, tenantId).catch((err) => {
				console.error('Background initial sync error:', err);
			});

			// Set up Gmail push notifications if Pub/Sub is configured
			if (process.env.GOOGLE_PUBSUB_TOPIC) {
				try {
					const provider = new GmailProvider();
					const watchResult = await provider.watchMailbox({
						accessToken: tokens.access_token!,
						topicName: process.env.GOOGLE_PUBSUB_TOPIC,
					});
					await db.update(emailIntegrations).set({
						watchExpiration: new Date(parseInt(watchResult.expiration)),
						watchHistoryId: watchResult.historyId,
					}).where(eq(emailIntegrations.id, integrationId));
				} catch (err) {
					console.error('Failed to set up Gmail watch:', err);
					// Non-fatal: polling continues
				}
			}

			return c.redirect(`${corsOrigin}/app/inbox?connected=gmail`);
		} catch (err) {
			console.error('Gmail OAuth callback error:', err);
			return c.redirect(`${corsOrigin}/app/inbox?error=oauth_failed`);
		}
	})

	// Protected routes below
	.use('/*', requireAuth, requireTenant)

	// GET / - List current user's integrations
	.get('/', async (c) => {
		const user = c.get('user');
		const tenantId = user.tenantId!;

		const integrations = await db
			.select({
				id: emailIntegrations.id,
				provider: emailIntegrations.provider,
				emailAddress: emailIntegrations.emailAddress,
				status: emailIntegrations.status,
				lastSyncAt: emailIntegrations.lastSyncAt,
				errorMessage: emailIntegrations.errorMessage,
				createdAt: emailIntegrations.createdAt,
			})
			.from(emailIntegrations)
			.where(
				and(
					eq(emailIntegrations.userId, user.id),
					eq(emailIntegrations.tenantId, tenantId)
				)
			);

		return c.json({ integrations });
	})

	// DELETE /:id - Disconnect an integration
	.delete('/:id', async (c) => {
		const user = c.get('user');
		const tenantId = user.tenantId!;
		const id = c.req.param('id');

		const [integration] = await db
			.select()
			.from(emailIntegrations)
			.where(
				and(
					eq(emailIntegrations.id, id),
					eq(emailIntegrations.userId, user.id),
					eq(emailIntegrations.tenantId, tenantId)
				)
			)
			.limit(1);

		if (!integration) {
			return c.json({ error: 'Integration not found' }, 404);
		}

		// Stop Gmail push notifications (best effort)
		if (integration.provider === 'gmail') {
			try {
				const provider = new GmailProvider();
				await provider.stopWatch({ accessToken: integration.accessToken });
			} catch (err) {
				console.error('Failed to stop Gmail watch:', err);
				// Best effort — watch expires on its own in 7 days
			}
		}

		// Try to revoke the token (best effort)
		try {
			const oauth2Client = getOAuth2Client();
			await oauth2Client.revokeToken(integration.accessToken);
		} catch {
			// Non-critical - token may already be expired
		}

		// Cascading delete removes threads, messages, and entity links
		await db
			.delete(emailIntegrations)
			.where(eq(emailIntegrations.id, id));

		return c.json({ success: true });
	})

	// POST /:id/sync - Trigger manual sync
	.post('/:id/sync', async (c) => {
		const user = c.get('user');
		const tenantId = user.tenantId!;
		const id = c.req.param('id');

		const [integration] = await db
			.select()
			.from(emailIntegrations)
			.where(
				and(
					eq(emailIntegrations.id, id),
					eq(emailIntegrations.userId, user.id),
					eq(emailIntegrations.tenantId, tenantId)
				)
			)
			.limit(1);

		if (!integration) {
			return c.json({ error: 'Integration not found' }, 404);
		}

		// Perform sync inline (await for manual sync)
		await performInitialSync(id, tenantId);

		return c.json({ success: true });
	});

export { emailIntegrationsRoutes };
