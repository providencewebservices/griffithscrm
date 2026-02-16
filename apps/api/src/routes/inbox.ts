import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, desc, like, or, inArray, isNull } from 'drizzle-orm';
import { requireAuth, requireTenant } from '../middleware/auth';
import { db } from '../lib/auth';
import {
	emailIntegrations,
	emailThreads,
	emailMessages,
	emailEntityLinks,
} from '@griffiths-crm/shared/db/schema';
import { getEmailProvider, getValidAccessToken } from '../lib/email-providers';
import { GmailProvider } from '../lib/email-providers/gmail';
import crypto from 'crypto';

const SYNC_INTERVAL_MS = 60 * 1000; // 60 seconds

// In-memory lock to prevent concurrent syncs for the same integration
const activeSyncs = new Map<string, Promise<void>>();

// Perform incremental sync if needed
async function syncIfNeeded(integrationId: string, tenantId: string) {
	if (activeSyncs.has(integrationId)) return;

	const syncPromise = doSync(integrationId, tenantId);
	activeSyncs.set(integrationId, syncPromise);
	try {
		await syncPromise;
	} finally {
		activeSyncs.delete(integrationId);
	}
}

async function doSync(integrationId: string, tenantId: string) {
	const [integration] = await db
		.select()
		.from(emailIntegrations)
		.where(eq(emailIntegrations.id, integrationId))
		.limit(1);

	if (!integration || integration.status !== 'active') return;

	const now = Date.now();
	const lastSync = integration.lastSyncAt?.getTime() || 0;

	if (now - lastSync < SYNC_INTERVAL_MS) return;

	try {
		const { accessToken } = await getValidAccessToken(integrationId);
		const provider = getEmailProvider(integration.provider as 'gmail' | 'microsoft');

		const syncResult = await provider.incrementalSync({
			accessToken,
			historyId: integration.historyId || undefined,
		});

		if (syncResult.fullSyncRequired) {
			// Full re-sync: delete cached data and re-fetch
			await db.delete(emailThreads).where(eq(emailThreads.integrationId, integrationId));

			const listResult = await provider.listThreads({
				accessToken,
				maxResults: 50,
				labelIds: ['INBOX'],
			});

			for (const thread of listResult.threads) {
				const threadId = crypto.randomUUID();
				const [upsertedThread] = await db.insert(emailThreads).values({
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
				}).onConflictDoUpdate({
					target: [emailThreads.integrationId, emailThreads.providerThreadId],
					set: {
						subject: thread.subject,
						snippet: thread.snippet,
						lastMessageAt: thread.lastMessageAt,
						messageCount: thread.messageCount,
						isUnread: thread.isUnread,
						labelIds: JSON.stringify(thread.labelIds),
						updatedAt: new Date(),
					},
				}).returning({ id: emailThreads.id });

				const resolvedThreadId = upsertedThread.id;

				for (const msg of thread.messages) {
					await db.insert(emailMessages).values({
						id: crypto.randomUUID(),
						threadId: resolvedThreadId,
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
					}).onConflictDoUpdate({
						target: [emailMessages.integrationId, emailMessages.providerMessageId],
						set: {
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
							updatedAt: new Date(),
						},
					});
				}
			}

			await db
				.update(emailIntegrations)
				.set({
					historyId: listResult.historyId || null,
					lastSyncAt: new Date(),
					updatedAt: new Date(),
				})
				.where(eq(emailIntegrations.id, integrationId));
			return;
		}

		// Process added messages
		for (const msg of syncResult.added) {
			// Find or create thread
			let [thread] = await db
				.select()
				.from(emailThreads)
				.where(
					and(
						eq(emailThreads.integrationId, integrationId),
						eq(emailThreads.providerThreadId, msg.providerThreadId)
					)
				)
				.limit(1);

			if (!thread) {
				const threadId = crypto.randomUUID();
				await db.insert(emailThreads).values({
					id: threadId,
					integrationId,
					tenantId,
					providerThreadId: msg.providerThreadId,
					subject: msg.subject,
					snippet: msg.snippet,
					lastMessageAt: msg.internalDate,
					messageCount: 1,
					isUnread: msg.isUnread,
					isArchived: false,
					labelIds: JSON.stringify(msg.labelIds),
				});
				thread = { id: threadId } as any;
			} else {
				// Update thread metadata
				await db
					.update(emailThreads)
					.set({
						snippet: msg.snippet,
						lastMessageAt: msg.internalDate,
						messageCount: thread.messageCount + 1,
						isUnread: msg.isUnread || thread.isUnread,
						updatedAt: new Date(),
					})
					.where(eq(emailThreads.id, thread.id));
			}

			// Upsert message
			await db.insert(emailMessages).values({
				id: crypto.randomUUID(),
				threadId: thread.id,
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
			}).onConflictDoUpdate({
				target: [emailMessages.integrationId, emailMessages.providerMessageId],
				set: {
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
					updatedAt: new Date(),
				},
			});
		}

		// Process deleted messages
		if (syncResult.deleted.length > 0) {
			for (const msgId of syncResult.deleted) {
				await db
					.delete(emailMessages)
					.where(
						and(
							eq(emailMessages.integrationId, integrationId),
							eq(emailMessages.providerMessageId, msgId)
						)
					);
			}
		}

		// Process label modifications (unread status)
		for (const mod of syncResult.labelsModified) {
			const isNowUnread = mod.addedLabels.includes('UNREAD');
			const isNowRead = mod.removedLabels.includes('UNREAD');
			if (isNowUnread || isNowRead) {
				await db
					.update(emailMessages)
					.set({ isUnread: isNowUnread, updatedAt: new Date() })
					.where(
						and(
							eq(emailMessages.integrationId, integrationId),
							eq(emailMessages.providerMessageId, mod.providerMessageId)
						)
					);
			}
		}

		// Update sync state
		await db
			.update(emailIntegrations)
			.set({
				historyId: syncResult.newHistoryId || integration.historyId,
				lastSyncAt: new Date(),
				updatedAt: new Date(),
			})
			.where(eq(emailIntegrations.id, integrationId));
	} catch (err) {
		console.error('Incremental sync failed:', err);
	}
}

const threadsQuerySchema = z.object({
	q: z.string().optional(),
	page: z.coerce.number().int().min(1).optional().default(1),
	limit: z.coerce.number().int().min(1).max(100).optional().default(50),
	filter: z.enum(['all', 'unread', 'customers', 'quotes', 'jobs', 'unlinked']).optional().default('all'),
});

const linkSchema = z.object({
	entityType: z.enum(['customer', 'quote', 'job', 'funeral_director', 'supplier']),
	entityId: z.string().min(1),
});

const sendEmailSchema = z.object({
	to: z.string().min(1),
	cc: z.string().optional(),
	bcc: z.string().optional(),
	subject: z.string().min(1),
	bodyHtml: z.string().min(1),
	replyToThreadId: z.string().optional(),
	replyToMessageId: z.string().optional(),
});

const inboxRoutes = new Hono()
	.use('*', requireAuth, requireTenant)

	// GET /threads - List threads
	.get('/threads', zValidator('query', threadsQuerySchema), async (c) => {
		const user = c.get('user');
		const tenantId = user.tenantId!;
		const { q, page, limit, filter } = c.req.valid('query');

		// Get user's active integration
		const [integration] = await db
			.select()
			.from(emailIntegrations)
			.where(
				and(
					eq(emailIntegrations.userId, user.id),
					eq(emailIntegrations.tenantId, tenantId),
					eq(emailIntegrations.status, 'active')
				)
			)
			.limit(1);

		if (!integration) {
			return c.json({ threads: [], total: 0, page, limit });
		}

		// Trigger incremental sync if needed (fire and forget for list)
		syncIfNeeded(integration.id, tenantId).catch(() => {});

		// Build query conditions
		const conditions = [
			eq(emailThreads.integrationId, integration.id),
			eq(emailThreads.tenantId, tenantId),
		];

		if (q) {
			conditions.push(
				or(
					like(emailThreads.subject, `%${q}%`),
					like(emailThreads.snippet, `%${q}%`)
				)!
			);
		}

		if (filter === 'unread') {
			conditions.push(eq(emailThreads.isUnread, true));
		}

		// Get threads
		const threads = await db
			.select()
			.from(emailThreads)
			.where(and(...conditions))
			.orderBy(desc(emailThreads.lastMessageAt))
			.limit(limit)
			.offset((page - 1) * limit);

		// Get entity links for these threads
		const threadIds = threads.map((t) => t.id);
		let links: (typeof emailEntityLinks.$inferSelect)[] = [];
		if (threadIds.length > 0) {
			links = await db
				.select()
				.from(emailEntityLinks)
				.where(
					and(
						eq(emailEntityLinks.tenantId, tenantId),
						inArray(emailEntityLinks.threadId, threadIds)
					)
				);
		}

		// Get latest message for each thread
		const latestMessages = await Promise.all(
			threads.map(async (thread) => {
				const [msg] = await db
					.select()
					.from(emailMessages)
					.where(eq(emailMessages.threadId, thread.id))
					.orderBy(desc(emailMessages.internalDate))
					.limit(1);
				return { threadId: thread.id, message: msg || null };
			})
		);

		// Apply entity-link based filters
		let filteredThreads = threads;
		if (filter === 'customers' || filter === 'quotes' || filter === 'jobs') {
			const entityType = filter === 'customers' ? 'customer' : filter === 'quotes' ? 'quote' : 'job';
			const linkedThreadIds = new Set(
				links.filter((l) => l.entityType === entityType).map((l) => l.threadId)
			);
			filteredThreads = threads.filter((t) => linkedThreadIds.has(t.id));
		} else if (filter === 'unlinked') {
			const linkedThreadIds = new Set(links.map((l) => l.threadId));
			filteredThreads = threads.filter((t) => !linkedThreadIds.has(t.id));
		}

		// Build response
		const linksByThread = new Map<string, typeof links>();
		for (const link of links) {
			const existing = linksByThread.get(link.threadId) || [];
			existing.push(link);
			linksByThread.set(link.threadId, existing);
		}

		const latestByThread = new Map(latestMessages.map((m) => [m.threadId, m.message]));

		const result = filteredThreads.map((thread) => ({
			...thread,
			labelIds: thread.labelIds ? JSON.parse(thread.labelIds) : [],
			links: linksByThread.get(thread.id) || [],
			latestMessage: latestByThread.get(thread.id) ? {
				...latestByThread.get(thread.id)!,
				toAddresses: JSON.parse(latestByThread.get(thread.id)!.toAddresses || '[]'),
				ccAddresses: JSON.parse(latestByThread.get(thread.id)!.ccAddresses || '[]'),
				labelIds: JSON.parse(latestByThread.get(thread.id)!.labelIds || '[]'),
			} : null,
		}));

		return c.json({ threads: result, total: filteredThreads.length, page, limit });
	})

	// GET /threads/:threadId - Get full thread with bodies
	.get('/threads/:threadId', async (c) => {
		const user = c.get('user');
		const tenantId = user.tenantId!;
		const threadId = c.req.param('threadId');

		const [thread] = await db
			.select()
			.from(emailThreads)
			.where(
				and(
					eq(emailThreads.id, threadId),
					eq(emailThreads.tenantId, tenantId)
				)
			)
			.limit(1);

		if (!thread) {
			return c.json({ error: 'Thread not found' }, 404);
		}

		// Fetch full thread from provider (bodies on demand)
		const { accessToken, integration } = await getValidAccessToken(thread.integrationId);
		const provider = getEmailProvider(integration.provider as 'gmail' | 'microsoft');
		const fullThread = await provider.getThread({
			accessToken,
			threadId: thread.providerThreadId,
		});

		// Get entity links
		const links = await db
			.select()
			.from(emailEntityLinks)
			.where(
				and(
					eq(emailEntityLinks.threadId, threadId),
					eq(emailEntityLinks.tenantId, tenantId)
				)
			);

		return c.json({
			thread: {
				...thread,
				labelIds: thread.labelIds ? JSON.parse(thread.labelIds) : [],
				links,
				messages: fullThread.messages.map((msg) => ({
					...msg,
					internalDate: msg.internalDate.toISOString(),
				})),
			},
		});
	})

	// POST /threads/:threadId/read - Mark thread as read
	.post('/threads/:threadId/read', async (c) => {
		const user = c.get('user');
		const tenantId = user.tenantId!;
		const threadId = c.req.param('threadId');

		const [thread] = await db
			.select()
			.from(emailThreads)
			.where(
				and(
					eq(emailThreads.id, threadId),
					eq(emailThreads.tenantId, tenantId)
				)
			)
			.limit(1);

		if (!thread) {
			return c.json({ error: 'Thread not found' }, 404);
		}

		// Get all unread message IDs for this thread
		const unreadMessages = await db
			.select({ providerMessageId: emailMessages.providerMessageId })
			.from(emailMessages)
			.where(
				and(
					eq(emailMessages.threadId, threadId),
					eq(emailMessages.isUnread, true)
				)
			);

		if (unreadMessages.length > 0) {
			const { accessToken, integration } = await getValidAccessToken(thread.integrationId);
			const provider = getEmailProvider(integration.provider as 'gmail' | 'microsoft');

			await provider.modifyLabels({
				accessToken,
				messageIds: unreadMessages.map((m) => m.providerMessageId),
				removeLabelIds: ['UNREAD'],
			});

			// Update local cache
			await db
				.update(emailMessages)
				.set({ isUnread: false, updatedAt: new Date() })
				.where(eq(emailMessages.threadId, threadId));

			await db
				.update(emailThreads)
				.set({ isUnread: false, updatedAt: new Date() })
				.where(eq(emailThreads.id, threadId));
		}

		return c.json({ success: true });
	})

	// POST /threads/:threadId/archive - Archive thread
	.post('/threads/:threadId/archive', async (c) => {
		const user = c.get('user');
		const tenantId = user.tenantId!;
		const threadId = c.req.param('threadId');

		const [thread] = await db
			.select()
			.from(emailThreads)
			.where(
				and(
					eq(emailThreads.id, threadId),
					eq(emailThreads.tenantId, tenantId)
				)
			)
			.limit(1);

		if (!thread) {
			return c.json({ error: 'Thread not found' }, 404);
		}

		// Get all message IDs for this thread
		const messages = await db
			.select({ providerMessageId: emailMessages.providerMessageId })
			.from(emailMessages)
			.where(eq(emailMessages.threadId, threadId));

		if (messages.length > 0) {
			const { accessToken, integration } = await getValidAccessToken(thread.integrationId);
			const provider = getEmailProvider(integration.provider as 'gmail' | 'microsoft');

			await provider.modifyLabels({
				accessToken,
				messageIds: messages.map((m) => m.providerMessageId),
				removeLabelIds: ['INBOX'],
			});
		}

		await db
			.update(emailThreads)
			.set({ isArchived: true, updatedAt: new Date() })
			.where(eq(emailThreads.id, threadId));

		return c.json({ success: true });
	})

	// GET /messages/:messageId/attachments/:attachmentId - Get attachment
	.get('/messages/:messageId/attachments/:attachmentId', async (c) => {
		const user = c.get('user');
		const tenantId = user.tenantId!;
		const messageId = c.req.param('messageId');
		const attachmentId = c.req.param('attachmentId');

		// Find the message to get integration
		const [message] = await db
			.select()
			.from(emailMessages)
			.where(
				and(
					eq(emailMessages.id, messageId),
					eq(emailMessages.tenantId, tenantId)
				)
			)
			.limit(1);

		if (!message) {
			return c.json({ error: 'Message not found' }, 404);
		}

		const { accessToken, integration } = await getValidAccessToken(message.integrationId);
		const provider = getEmailProvider(integration.provider as 'gmail' | 'microsoft');

		const attachment = await provider.getAttachment({
			accessToken,
			messageId: message.providerMessageId,
			attachmentId,
		});

		return new Response(attachment.data, {
			headers: {
				'Content-Type': attachment.mimeType,
				'Content-Disposition': `attachment; filename="${attachment.filename}"`,
			},
		});
	})

	// POST /send - Send an email
	.post('/send', zValidator('json', sendEmailSchema), async (c) => {
		const user = c.get('user');
		const tenantId = user.tenantId!;
		const body = c.req.valid('json');

		// Get user's active integration
		const [integration] = await db
			.select()
			.from(emailIntegrations)
			.where(
				and(
					eq(emailIntegrations.userId, user.id),
					eq(emailIntegrations.tenantId, tenantId),
					eq(emailIntegrations.status, 'active')
				)
			)
			.limit(1);

		if (!integration) {
			return c.json({ error: 'No active email integration' }, 400);
		}

		const { accessToken } = await getValidAccessToken(integration.id);
		const provider = getEmailProvider(integration.provider as 'gmail' | 'microsoft');

		// Parse recipients
		const toAddresses = body.to.split(',').map((a) => ({ address: a.trim() }));
		const ccAddresses = body.cc ? body.cc.split(',').map((a) => ({ address: a.trim() })) : undefined;
		const bccAddresses = body.bcc ? body.bcc.split(',').map((a) => ({ address: a.trim() })) : undefined;

		// If replying, get original message headers for In-Reply-To
		let replyToMessageId: string | undefined;
		if (body.replyToMessageId) {
			// The replyToMessageId from frontend is our DB message ID
			const [origMsg] = await db
				.select()
				.from(emailMessages)
				.where(eq(emailMessages.id, body.replyToMessageId))
				.limit(1);
			if (origMsg) {
				replyToMessageId = origMsg.providerMessageId;
			}
		}

		// Get provider thread ID for threading
		let providerThreadId: string | undefined;
		if (body.replyToThreadId) {
			const [origThread] = await db
				.select()
				.from(emailThreads)
				.where(eq(emailThreads.id, body.replyToThreadId))
				.limit(1);
			if (origThread) {
				providerThreadId = origThread.providerThreadId;
			}
		}

		const result = await provider.sendMessage({
			accessToken,
			email: {
				to: toAddresses,
				cc: ccAddresses,
				bcc: bccAddresses,
				subject: body.bodyHtml ? body.subject : body.subject,
				bodyHtml: body.bodyHtml,
				replyToMessageId,
				replyToThreadId: providerThreadId,
				fromAddress: integration.emailAddress,
				fromName: user.name,
			},
		});

		return c.json({ success: true, messageId: result.providerMessageId, threadId: result.providerThreadId });
	})

	// POST /threads/:threadId/links - Link thread to entity
	.post('/threads/:threadId/links', zValidator('json', linkSchema), async (c) => {
		const user = c.get('user');
		const tenantId = user.tenantId!;
		const threadId = c.req.param('threadId');
		const { entityType, entityId } = c.req.valid('json');

		// Verify thread exists
		const [thread] = await db
			.select({ id: emailThreads.id })
			.from(emailThreads)
			.where(
				and(
					eq(emailThreads.id, threadId),
					eq(emailThreads.tenantId, tenantId)
				)
			)
			.limit(1);

		if (!thread) {
			return c.json({ error: 'Thread not found' }, 404);
		}

		const id = crypto.randomUUID();
		await db.insert(emailEntityLinks).values({
			id,
			tenantId,
			threadId,
			entityType,
			entityId,
			linkedById: user.id,
		});

		return c.json({ link: { id, tenantId, threadId, entityType, entityId, linkedById: user.id } });
	})

	// DELETE /threads/:threadId/links/:linkId - Unlink thread from entity
	.delete('/threads/:threadId/links/:linkId', async (c) => {
		const user = c.get('user');
		const tenantId = user.tenantId!;
		const linkId = c.req.param('linkId');

		await db
			.delete(emailEntityLinks)
			.where(
				and(
					eq(emailEntityLinks.id, linkId),
					eq(emailEntityLinks.tenantId, tenantId)
				)
			);

		return c.json({ success: true });
	});

export { inboxRoutes };
