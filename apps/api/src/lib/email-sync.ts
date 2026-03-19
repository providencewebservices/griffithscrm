import { eq, and } from 'drizzle-orm';
import { db } from './auth';
import {
	emailIntegrations,
	emailThreads,
	emailMessages,
} from '@griffiths-crm/shared/db/schema';
import { getEmailProvider, getValidAccessToken } from './email-providers';
import { autoLinkThreadByEmail, collectEmailAddresses } from './email-auto-link';
import crypto from 'crypto';

export const SYNC_INTERVAL_MS = 60 * 1000; // 60 seconds

// In-memory lock to prevent concurrent syncs for the same integration
export const activeSyncs = new Map<string, Promise<void>>();

// Perform incremental sync if needed
export async function syncIfNeeded(integrationId: string, tenantId: string) {
	if (activeSyncs.has(integrationId)) return;

	const syncPromise = doSync(integrationId, tenantId);
	activeSyncs.set(integrationId, syncPromise);
	try {
		await syncPromise;
	} finally {
		activeSyncs.delete(integrationId);
	}
}

export async function doSync(integrationId: string, tenantId: string) {
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
					isTrashed: thread.labelIds.includes('TRASH'),
					labelIds: JSON.stringify(thread.labelIds),
				}).onConflictDoUpdate({
					target: [emailThreads.integrationId, emailThreads.providerThreadId],
					set: {
						subject: thread.subject,
						snippet: thread.snippet,
						lastMessageAt: thread.lastMessageAt,
						messageCount: thread.messageCount,
						isUnread: thread.isUnread,
						isTrashed: thread.labelIds.includes('TRASH'),
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

				// Auto-link thread to contacts by email address
				try {
					const addresses = collectEmailAddresses(
						thread.messages.map((m) => ({
							fromAddress: m.fromAddress,
							toAddresses: JSON.stringify(m.toAddresses),
							ccAddresses: JSON.stringify(m.ccAddresses),
						}))
					);
					await autoLinkThreadByEmail(resolvedThreadId, tenantId, addresses);
				} catch (err) {
					console.error('Auto-link failed for thread:', resolvedThreadId, err);
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
					isTrashed: msg.labelIds.includes('TRASH'),
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

			// Auto-link thread to contacts by email address
			try {
				const addresses = collectEmailAddresses([{
					fromAddress: msg.fromAddress,
					toAddresses: JSON.stringify(msg.toAddresses),
					ccAddresses: JSON.stringify(msg.ccAddresses),
				}]);
				await autoLinkThreadByEmail(thread.id, tenantId, addresses);
			} catch (err) {
				console.error('Auto-link failed for thread:', thread.id, err);
			}
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

		// Process label modifications (unread status + trash status)
		const affectedThreadIds = new Set<string>();
		const trashedThreadIds = new Set<string>();
		const untrashedThreadIds = new Set<string>();
		const threadsToCheckTrash = new Set<string>();

		for (const mod of syncResult.labelsModified) {
			const isNowUnread = mod.addedLabels.includes('UNREAD');
			const isNowRead = mod.removedLabels.includes('UNREAD');
			const trashAdded = mod.addedLabels.includes('TRASH');
			const trashRemoved = mod.removedLabels.includes('TRASH');
			const inboxRemoved = mod.removedLabels.includes('INBOX');

			// Update message unread status
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

			// Look up the thread if there's any relevant label change
			if (isNowUnread || isNowRead || trashAdded || trashRemoved || inboxRemoved) {
				const [msg] = await db
					.select({ threadId: emailMessages.threadId })
					.from(emailMessages)
					.where(
						and(
							eq(emailMessages.integrationId, integrationId),
							eq(emailMessages.providerMessageId, mod.providerMessageId)
						)
					)
					.limit(1);

				if (msg) {
					if (isNowUnread || isNowRead) {
						affectedThreadIds.add(msg.threadId);
					}
					if (trashAdded) {
						trashedThreadIds.add(msg.threadId);
					} else if (trashRemoved) {
						untrashedThreadIds.add(msg.threadId);
					} else if (inboxRemoved) {
						threadsToCheckTrash.add(msg.threadId);
					}
				}
			}
		}

		// Recalculate thread isUnread for affected threads
		for (const affectedThreadId of affectedThreadIds) {
			const [unreadMsg] = await db
				.select({ id: emailMessages.id })
				.from(emailMessages)
				.where(
					and(
						eq(emailMessages.threadId, affectedThreadId),
						eq(emailMessages.isUnread, true)
					)
				)
				.limit(1);

			await db
				.update(emailThreads)
				.set({ isUnread: !!unreadMsg, updatedAt: new Date() })
				.where(eq(emailThreads.id, affectedThreadId));
		}

		// Update definitively trashed threads
		for (const threadId of trashedThreadIds) {
			await db
				.update(emailThreads)
				.set({ isTrashed: true, updatedAt: new Date() })
				.where(eq(emailThreads.id, threadId));
		}

		// Update definitively untrashed threads
		for (const threadId of untrashedThreadIds) {
			await db
				.update(emailThreads)
				.set({ isTrashed: false, updatedAt: new Date() })
				.where(eq(emailThreads.id, threadId));
		}

		// Re-fetch threads where INBOX was removed to determine trash vs archive
		for (const threadId of threadsToCheckTrash) {
			if (trashedThreadIds.has(threadId) || untrashedThreadIds.has(threadId)) continue;

			const [thread] = await db
				.select()
				.from(emailThreads)
				.where(eq(emailThreads.id, threadId))
				.limit(1);

			if (thread) {
				try {
					const fullThread = await provider.getThread({
						accessToken,
						threadId: thread.providerThreadId,
					});
					const allLabels = fullThread.messages.flatMap((m: any) => m.labelIds);
					const isTrashed = allLabels.includes('TRASH');
					await db
						.update(emailThreads)
						.set({ isTrashed, updatedAt: new Date() })
						.where(eq(emailThreads.id, threadId));
				} catch (err) {
					console.error('Failed to re-fetch thread for trash check:', threadId, err);
				}
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
