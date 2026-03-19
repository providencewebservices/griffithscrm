import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, desc, like, or, inArray, isNull, sql } from 'drizzle-orm';
import { requireAuth, requireTenant } from '../middleware/auth';
import { db } from '../lib/auth';
import {
	emailIntegrations,
	emailThreads,
	emailMessages,
	emailEntityLinks,
	documents,
} from '@griffiths-crm/shared/db/schema';
import { getEmailProvider, getValidAccessToken } from '../lib/email-providers';
import type { EmailAttachment } from '../lib/email-providers/types';
import { GmailProvider } from '../lib/email-providers/gmail';
import { getObjectBuffer } from '../lib/s3';
import crypto from 'crypto';
import { syncIfNeeded } from '../lib/email-sync';

const threadsQuerySchema = z.object({
	q: z.string().optional(),
	page: z.coerce.number().int().min(1).optional().default(1),
	limit: z.coerce.number().int().min(1).max(100).optional().default(50),
	filter: z.enum(['all', 'unread', 'customers', 'quotes', 'jobs', 'unlinked']).optional().default('all'),
	folder: z.enum(['inbox', 'trash']).optional().default('inbox'),
	contactEntityType: z.enum(['customer', 'funeral_director', 'memorial_site', 'supplier', 'quote', 'job']).optional(),
	contactEntityId: z.string().optional(),
});

const linkSchema = z.object({
	entityType: z.enum(['customer', 'quote', 'job', 'funeral_director', 'memorial_site', 'supplier']),
	entityId: z.string().min(1),
});


const inboxRoutes = new Hono()
	.use('*', requireAuth, requireTenant)

	// GET /unread-count - Count of unread, non-archived threads
	.get('/unread-count', async (c) => {
		const user = c.get('user');
		const tenantId = user.tenantId!;

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
			return c.json({ count: 0 });
		}

		const [result] = await db
			.select({ count: sql<number>`count(*)::int` })
			.from(emailThreads)
			.where(
				and(
					eq(emailThreads.integrationId, integration.id),
					eq(emailThreads.tenantId, tenantId),
					eq(emailThreads.isUnread, true),
					eq(emailThreads.isArchived, false),
					eq(emailThreads.isTrashed, false)
				)
			);

		return c.json({ count: result?.count ?? 0 });
	})

	// GET /threads - List threads
	.get('/threads', zValidator('query', threadsQuerySchema), async (c) => {
		const user = c.get('user');
		const tenantId = user.tenantId!;
		const { q, page, limit, filter, folder, contactEntityType, contactEntityId } = c.req.valid('query');

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

		// If filtering by contact entity, get the linked thread IDs first
		let contactLinkedThreadIds: string[] | null = null;
		if (contactEntityType && contactEntityId) {
			const contactLinks = await db
				.select({ threadId: emailEntityLinks.threadId })
				.from(emailEntityLinks)
				.where(
					and(
						eq(emailEntityLinks.tenantId, tenantId),
						eq(emailEntityLinks.entityType, contactEntityType),
						eq(emailEntityLinks.entityId, contactEntityId)
					)
				);
			contactLinkedThreadIds = contactLinks.map((l) => l.threadId);
			if (contactLinkedThreadIds.length === 0) {
				return c.json({ threads: [], total: 0, page, limit });
			}
		}

		// Build query conditions
		const conditions = [
			eq(emailThreads.integrationId, integration.id),
			eq(emailThreads.tenantId, tenantId),
		];

		if (folder === 'inbox') {
			conditions.push(eq(emailThreads.isArchived, false));
			conditions.push(eq(emailThreads.isTrashed, false));
		} else if (folder === 'trash') {
			conditions.push(eq(emailThreads.isTrashed, true));
		}

		if (contactLinkedThreadIds) {
			conditions.push(inArray(emailThreads.id, contactLinkedThreadIds));
		}

		if (q) {
			conditions.push(
				or(
					like(emailThreads.subject, `%${q}%`),
					like(emailThreads.snippet, `%${q}%`)
				)!
			);
		}

		if (folder !== 'trash' && filter === 'unread') {
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

		// Apply entity-link based filters (only for inbox folder)
		let filteredThreads = threads;
		if (folder !== 'trash') {
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
		}

		// Always update thread status — even if messages were already marked read
		// (e.g. by a sync that updated messages but not the thread)
		await db
			.update(emailThreads)
			.set({ isUnread: false, updatedAt: new Date() })
			.where(eq(emailThreads.id, threadId));

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

	// POST /threads/:threadId/trash - Move thread to trash
	.post('/threads/:threadId/trash', async (c) => {
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

		const { accessToken, integration } = await getValidAccessToken(thread.integrationId);
		const provider = getEmailProvider(integration.provider as 'gmail' | 'microsoft');

		await provider.trashThread({
			accessToken,
			threadId: thread.providerThreadId,
		});

		await db
			.update(emailThreads)
			.set({ isTrashed: true, updatedAt: new Date() })
			.where(eq(emailThreads.id, threadId));

		return c.json({ success: true });
	})

	// POST /threads/:threadId/untrash - Remove thread from trash
	.post('/threads/:threadId/untrash', async (c) => {
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

		const { accessToken, integration } = await getValidAccessToken(thread.integrationId);
		const provider = getEmailProvider(integration.provider as 'gmail' | 'microsoft');

		await provider.untrashThread({
			accessToken,
			threadId: thread.providerThreadId,
		});

		// Re-fetch thread to get accurate labels after untrashing
		const fullThread = await provider.getThread({
			accessToken,
			threadId: thread.providerThreadId,
		});

		// Derive labels as the union of all message labelIds
		const freshLabels = [
			...new Set(fullThread.messages.flatMap((m) => m.labelIds)),
		];

		await db
			.update(emailThreads)
			.set({
				isTrashed: false,
				labelIds: JSON.stringify(freshLabels),
				updatedAt: new Date(),
			})
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

	// POST /send - Send an email (FormData: text fields + file uploads + document IDs)
	.post('/send', async (c) => {
		const user = c.get('user');
		const tenantId = user.tenantId!;

		const formData = await c.req.formData();

		// Extract text fields
		const to = formData.get('to') as string | null;
		const cc = formData.get('cc') as string | null;
		const bcc = formData.get('bcc') as string | null;
		const subject = formData.get('subject') as string | null;
		const bodyHtml = formData.get('bodyHtml') as string | null;
		const replyToThreadIdField = formData.get('replyToThreadId') as string | null;
		const documentIdsRaw = formData.get('documentIds') as string | null;

		// Validate required fields
		if (!to?.trim() || !subject?.trim() || !bodyHtml?.trim()) {
			return c.json({ error: 'Missing required fields: to, subject, bodyHtml' }, 400);
		}

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
		const toAddresses = to.split(',').map((a) => ({ address: a.trim() }));
		const ccAddresses = cc ? cc.split(',').map((a) => ({ address: a.trim() })) : undefined;
		const bccAddresses = bcc ? bcc.split(',').map((a) => ({ address: a.trim() })) : undefined;

		// Collect attachments from local file uploads
		const attachments: EmailAttachment[] = [];
		const fileEntries = formData.getAll('files');
		for (const entry of fileEntries) {
			if (entry instanceof File && entry.size > 0) {
				const buffer = Buffer.from(await entry.arrayBuffer());
				attachments.push({
					filename: entry.name,
					contentType: entry.type || 'application/octet-stream',
					content: buffer,
				});
			}
		}

		// Collect attachments from CRM document IDs
		if (documentIdsRaw) {
			let documentIds: string[];
			try {
				documentIds = JSON.parse(documentIdsRaw);
			} catch {
				return c.json({ error: 'Invalid documentIds format' }, 400);
			}

			if (documentIds.length > 0) {
				// Fetch documents from DB (validate tenant ownership)
				const docs = await db
					.select({
						id: documents.id,
						name: documents.name,
						filename: documents.filename,
						s3Key: documents.s3Key,
						contentType: documents.contentType,
					})
					.from(documents)
					.where(
						and(
							eq(documents.tenantId, tenantId),
							inArray(documents.id, documentIds)
						)
					);

				if (docs.length !== documentIds.length) {
					return c.json({ error: 'One or more documents not found' }, 404);
				}

				// Fetch each document from S3
				for (const doc of docs) {
					const { buffer } = await getObjectBuffer(doc.s3Key);
					attachments.push({
						filename: doc.filename,
						contentType: doc.contentType,
						content: buffer,
					});
				}
			}
		}

		// Validate total attachment size (18MB raw = ~24MB base64, within Gmail's 25MB limit)
		const MAX_ATTACHMENT_SIZE = 18 * 1024 * 1024;
		const totalSize = attachments.reduce((sum, a) => sum + a.content.length, 0);
		if (totalSize > MAX_ATTACHMENT_SIZE) {
			return c.json({ error: 'Total attachment size exceeds 18MB limit' }, 400);
		}

		// Get provider thread ID and RFC 2822 Message-ID for threading
		let replyToMessageId: string | undefined;
		let providerThreadId: string | undefined;
		if (replyToThreadIdField) {
			const [origThread] = await db
				.select()
				.from(emailThreads)
				.where(eq(emailThreads.id, replyToThreadIdField))
				.limit(1);
			if (origThread) {
				providerThreadId = origThread.providerThreadId;

				// Find the last message in this thread to get its RFC 2822 Message-ID
				const [lastMsg] = await db
					.select({ providerMessageId: emailMessages.providerMessageId })
					.from(emailMessages)
					.where(eq(emailMessages.threadId, origThread.id))
					.orderBy(desc(emailMessages.internalDate))
					.limit(1);

				if (lastMsg) {
					try {
						const msgHeaders = await provider.getMessageHeaders({
							accessToken,
							messageId: lastMsg.providerMessageId,
							headers: ['Message-Id'],
						});
						if (msgHeaders['Message-Id']) {
							replyToMessageId = msgHeaders['Message-Id'];
						}
					} catch (err) {
						console.error('Failed to fetch Message-ID header:', err);
					}
				}
			}
		}

		const result = await provider.sendMessage({
			accessToken,
			email: {
				to: toAddresses,
				cc: ccAddresses,
				bcc: bccAddresses,
				subject,
				bodyHtml,
				replyToMessageId,
				replyToThreadId: providerThreadId,
				fromAddress: integration.emailAddress,
				fromName: user.name,
				attachments: attachments.length > 0 ? attachments : undefined,
			},
		});

		return c.json({ success: true, messageId: result.providerMessageId, threadId: result.providerThreadId });
	})

	// GET /entity-threads/:entityType/:entityId - Get threads linked to an entity
	.get(
		'/entity-threads/:entityType/:entityId',
		zValidator('query', z.object({
			page: z.coerce.number().int().min(1).optional().default(1),
			limit: z.coerce.number().int().min(1).max(50).optional().default(10),
		})),
		async (c) => {
			const user = c.get('user');
			const tenantId = user.tenantId!;
			const entityType = c.req.param('entityType');
			const entityId = c.req.param('entityId');
			const { page, limit } = c.req.valid('query');

			// Verify user has an active integration
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
				return c.json({ threads: [], total: 0 });
			}

			// Get linked thread IDs
			const links = await db
				.select()
				.from(emailEntityLinks)
				.where(
					and(
						eq(emailEntityLinks.tenantId, tenantId),
						eq(emailEntityLinks.entityType, entityType),
						eq(emailEntityLinks.entityId, entityId)
					)
				);

			if (links.length === 0) {
				return c.json({ threads: [], total: 0 });
			}

			const linkedThreadIds = links.map((l) => l.threadId);
			const linksByThreadId = new Map(links.map((l) => [l.threadId, l]));

			// Get threads
			const threads = await db
				.select()
				.from(emailThreads)
				.where(
					and(
						inArray(emailThreads.id, linkedThreadIds),
						eq(emailThreads.tenantId, tenantId)
					)
				)
				.orderBy(desc(emailThreads.lastMessageAt))
				.limit(limit)
				.offset((page - 1) * limit);

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

			const latestByThread = new Map(latestMessages.map((m) => [m.threadId, m.message]));

			const result = threads.map((thread) => {
				const link = linksByThreadId.get(thread.id);
				const latestMsg = latestByThread.get(thread.id);
				return {
					...thread,
					labelIds: thread.labelIds ? JSON.parse(thread.labelIds) : [],
					linkSource: link?.linkSource || 'manual',
					latestMessage: latestMsg ? {
						fromAddress: latestMsg.fromAddress,
						fromName: latestMsg.fromName,
						internalDate: latestMsg.internalDate,
						hasAttachments: latestMsg.hasAttachments,
					} : null,
				};
			});

			return c.json({ threads: result, total: links.length });
		}
	)

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
