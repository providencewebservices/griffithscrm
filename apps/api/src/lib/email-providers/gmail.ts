import crypto from 'node:crypto';
import { google } from 'googleapis';
import type {
	EmailAddress,
	EmailAttachmentMeta,
	EmailMessageFull,
	EmailMessageSummary,
	EmailThreadFull,
	EmailThreadSummary,
	IEmailProvider,
	ListThreadsParams,
	ListThreadsResult,
	SendEmailParams,
	SendEmailResult,
	SyncResult,
} from './types';

const GMAIL_SCOPES = [
	'https://www.googleapis.com/auth/gmail.modify',
	'https://www.googleapis.com/auth/userinfo.email',
];

function getOAuth2Client() {
	return new google.auth.OAuth2(
		process.env.GOOGLE_CLIENT_ID,
		process.env.GOOGLE_CLIENT_SECRET,
		`${process.env.BETTER_AUTH_URL}/api/email-integrations/callback/gmail`,
	);
}

function createAuthenticatedClient(accessToken: string) {
	const oauth2Client = getOAuth2Client();
	oauth2Client.setCredentials({ access_token: accessToken });
	return google.gmail({ version: 'v1', auth: oauth2Client });
}

// Parse "Name <email@example.com>" or just "email@example.com"
function parseEmailAddress(raw: string): EmailAddress {
	const match = raw.match(/^(.+?)\s*<(.+?)>$/);
	if (match) {
		return { name: match[1].trim().replace(/^"|"$/g, ''), address: match[2].trim() };
	}
	return { address: raw.trim() };
}

function parseAddressList(raw: string | undefined): EmailAddress[] {
	if (!raw) return [];
	return raw
		.split(',')
		.map((s) => parseEmailAddress(s.trim()))
		.filter((a) => a.address);
}

function getHeader(
	headers: { name?: string | null; value?: string | null }[],
	name: string,
): string {
	const header = headers.find((h) => h.name?.toLowerCase() === name.toLowerCase());
	return header?.value || '';
}

function decodeBase64Url(data: string): string {
	const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
	return Buffer.from(base64, 'base64').toString('utf-8');
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getPartHeader(part: any, name: string): string {
	return getHeader(part?.headers || [], name);
}

function normalizeContentId(contentId: string): string {
	return contentId.trim().replace(/^<|>$/g, '');
}

function extractBody(payload: any): { html: string; text: string } {
	let html = '';
	let text = '';

	if (!payload) return { html, text };

	// Simple body
	if (payload.body?.data) {
		const decoded = decodeBase64Url(payload.body.data);
		if (payload.mimeType === 'text/html') {
			html = decoded;
		} else if (payload.mimeType === 'text/plain') {
			text = decoded;
		}
	}

	// Multipart
	if (payload.parts) {
		for (const part of payload.parts) {
			if (part.mimeType === 'text/html' && part.body?.data) {
				html = decodeBase64Url(part.body.data);
			} else if (part.mimeType === 'text/plain' && part.body?.data) {
				text = decodeBase64Url(part.body.data);
			} else if (part.mimeType?.startsWith('multipart/')) {
				const nested = extractBody(part);
				if (nested.html) html = nested.html;
				if (nested.text) text = nested.text;
			}
		}
	}

	return { html, text };
}

function extractAttachments(payload: any): EmailAttachmentMeta[] {
	const attachments: EmailAttachmentMeta[] = [];

	function walk(part: any) {
		if (part.filename && part.body?.attachmentId) {
			attachments.push({
				attachmentId: part.body.attachmentId,
				filename: part.filename,
				mimeType: part.mimeType || 'application/octet-stream',
				size: part.body.size || 0,
			});
		}
		if (part.parts) {
			for (const child of part.parts) {
				walk(child);
			}
		}
	}

	if (payload) walk(payload);
	return attachments;
}

function extractInlineAttachmentParts(payload: any): Array<{
	attachmentId: string;
	mimeType: string;
	contentId: string;
}> {
	const inlineParts: Array<{ attachmentId: string; mimeType: string; contentId: string }> = [];

	function walk(part: any) {
		if (!part) return;

		const attachmentId = part.body?.attachmentId;
		const contentId = getPartHeader(part, 'Content-ID');
		const disposition = getPartHeader(part, 'Content-Disposition').toLowerCase();

		if (attachmentId && contentId && (disposition.includes('inline') || part.mimeType?.startsWith('image/'))) {
			inlineParts.push({
				attachmentId,
				mimeType: part.mimeType || 'application/octet-stream',
				contentId: normalizeContentId(contentId),
			});
		}

		if (part.parts) {
			for (const child of part.parts) {
				walk(child);
			}
		}
	}

	if (payload) walk(payload);
	return inlineParts;
}

function parseMessageToSummary(msg: any): EmailMessageSummary {
	const headers = msg.payload?.headers || [];
	const from = getHeader(headers, 'From');
	const parsed = parseEmailAddress(from);

	return {
		providerMessageId: msg.id!,
		providerThreadId: msg.threadId!,
		fromAddress: parsed.address,
		fromName: parsed.name || parsed.address,
		toAddresses: parseAddressList(getHeader(headers, 'To')),
		ccAddresses: parseAddressList(getHeader(headers, 'Cc')),
		subject: getHeader(headers, 'Subject'),
		snippet: msg.snippet || '',
		isUnread: (msg.labelIds || []).includes('UNREAD'),
		hasAttachments: extractAttachments(msg.payload).length > 0,
		labelIds: msg.labelIds || [],
		internalDate: new Date(parseInt(msg.internalDate || '0', 10)),
	};
}

function parseMessageToFull(msg: any): EmailMessageFull {
	const summary = parseMessageToSummary(msg);
	const { html, text } = extractBody(msg.payload);
	const attachments = extractAttachments(msg.payload);
	const headers: Record<string, string> = {};
	for (const h of msg.payload?.headers || []) {
		if (h.name && h.value) headers[h.name] = h.value;
	}

	return {
		...summary,
		bodyHtml: html,
		bodyText: text,
		attachments,
		headers,
	};
}

async function hydrateInlineImages(gmail: ReturnType<typeof createAuthenticatedClient>, msg: any): Promise<EmailMessageFull> {
	const parsed = parseMessageToFull(msg);

	if (!parsed.bodyHtml || !parsed.bodyHtml.includes('cid:')) {
		return parsed;
	}

	const inlineParts = extractInlineAttachmentParts(msg.payload);
	if (inlineParts.length === 0) {
		return parsed;
	}

	let bodyHtml = parsed.bodyHtml;

	for (const part of inlineParts) {
		try {
			const res = await gmail.users.messages.attachments.get({
				userId: 'me',
				messageId: msg.id!,
				id: part.attachmentId,
			});
			const data = Buffer.from(res.data.data || '', 'base64url');
			const dataUrl = `data:${part.mimeType};base64,${data.toString('base64')}`;
			const contentIdPattern = escapeRegExp(part.contentId);
			bodyHtml = bodyHtml.replace(
				new RegExp(`cid:(?:%3C|<)?${contentIdPattern}(?:%3E|>)?`, 'gi'),
				dataUrl,
			);
		} catch (err) {
			console.error(`Failed to hydrate inline attachment ${part.attachmentId}:`, err);
		}
	}

	return {
		...parsed,
		bodyHtml,
	};
}

export class GmailProvider implements IEmailProvider {
	async refreshAccessToken(refreshToken: string) {
		const oauth2Client = getOAuth2Client();
		oauth2Client.setCredentials({ refresh_token: refreshToken });
		const { credentials } = await oauth2Client.refreshAccessToken();

		return {
			accessToken: credentials.access_token!,
			expiresAt: new Date(credentials.expiry_date || Date.now() + 3600 * 1000),
			refreshToken: credentials.refresh_token || undefined,
		};
	}

	async listThreads(params: ListThreadsParams): Promise<ListThreadsResult> {
		const gmail = createAuthenticatedClient(params.accessToken);

		const listRes = await gmail.users.threads.list({
			userId: 'me',
			q: params.query,
			maxResults: params.maxResults || 50,
			pageToken: params.pageToken,
			labelIds: params.labelIds,
		});

		const threadList = listRes.data.threads || [];
		const threads: EmailThreadSummary[] = [];

		// Fetch metadata for each thread
		for (const t of threadList) {
			if (!t.id) continue;
			try {
				const threadRes = await gmail.users.threads.get({
					userId: 'me',
					id: t.id,
					format: 'metadata',
					metadataHeaders: ['From', 'To', 'Cc', 'Subject', 'Date'],
				});

				const messages = (threadRes.data.messages || []).map(parseMessageToSummary);
				const lastMessage = messages[messages.length - 1];
				const isUnread = messages.some((m) => m.isUnread);

				threads.push({
					providerThreadId: t.id,
					subject: lastMessage?.subject || messages[0]?.subject || '(no subject)',
					snippet: t.snippet || lastMessage?.snippet || '',
					lastMessageAt: lastMessage?.internalDate || new Date(),
					messageCount: messages.length,
					isUnread,
					labelIds: Array.from(new Set(messages.flatMap((m) => m.labelIds))),
					messages,
					historyId: threadRes.data.historyId || undefined,
				});
			} catch (err) {
				console.error(`Failed to fetch thread ${t.id}:`, err);
			}
		}

		// Get profile for historyId
		let historyId: string | undefined;
		try {
			const profile = await gmail.users.getProfile({ userId: 'me' });
			historyId = profile.data.historyId || undefined;
		} catch {
			// non-critical
		}

		return {
			threads,
			nextPageToken: listRes.data.nextPageToken || undefined,
			resultSizeEstimate: listRes.data.resultSizeEstimate || undefined,
			historyId,
		};
	}

	async getThread(params: { accessToken: string; threadId: string }): Promise<EmailThreadFull> {
		const gmail = createAuthenticatedClient(params.accessToken);

		const res = await gmail.users.threads.get({
			userId: 'me',
			id: params.threadId,
			format: 'full',
		});

		const messages = await Promise.all((res.data.messages || []).map((msg) => hydrateInlineImages(gmail, msg)));

		return {
			providerThreadId: params.threadId,
			subject: messages[0]?.subject || '(no subject)',
			messages,
			historyId: res.data.historyId || undefined,
		};
	}

	async getMessage(params: { accessToken: string; messageId: string }): Promise<EmailMessageFull> {
		const gmail = createAuthenticatedClient(params.accessToken);

		const res = await gmail.users.messages.get({
			userId: 'me',
			id: params.messageId,
			format: 'full',
		});

		return hydrateInlineImages(gmail, res.data);
	}

	async getAttachment(params: { accessToken: string; messageId: string; attachmentId: string }) {
		const gmail = createAuthenticatedClient(params.accessToken);

		// First get the message to find attachment metadata
		const msgRes = await gmail.users.messages.get({
			userId: 'me',
			id: params.messageId,
			format: 'full',
		});

		const allAttachments = extractAttachments(msgRes.data.payload);
		const meta = allAttachments.find((a) => a.attachmentId === params.attachmentId);

		const res = await gmail.users.messages.attachments.get({
			userId: 'me',
			messageId: params.messageId,
			id: params.attachmentId,
		});

		const data = Buffer.from(res.data.data || '', 'base64url');

		return {
			data,
			mimeType: meta?.mimeType || 'application/octet-stream',
			filename: meta?.filename || 'attachment',
		};
	}

	async getMessageHeaders(params: {
		accessToken: string;
		messageId: string;
		headers: string[];
	}): Promise<Record<string, string>> {
		const gmail = createAuthenticatedClient(params.accessToken);

		const res = await gmail.users.messages.get({
			userId: 'me',
			id: params.messageId,
			format: 'metadata',
			metadataHeaders: params.headers,
		});

		const result: Record<string, string> = {};
		for (const h of res.data.payload?.headers || []) {
			if (h.name && h.value) {
				result[h.name] = h.value;
			}
		}
		return result;
	}

	async sendMessage(params: {
		accessToken: string;
		email: SendEmailParams;
	}): Promise<SendEmailResult> {
		const gmail = createAuthenticatedClient(params.accessToken);
		const { email } = params;

		const formatAddr = (a: EmailAddress) => (a.name ? `${a.name} <${a.address}>` : a.address);

		// Common headers
		const headers: string[] = [];
		headers.push(
			`From: ${email.fromName ? `${email.fromName} <${email.fromAddress}>` : email.fromAddress}`,
		);
		headers.push(`To: ${email.to.map(formatAddr).join(', ')}`);
		if (email.cc?.length) {
			headers.push(`Cc: ${email.cc.map(formatAddr).join(', ')}`);
		}
		if (email.bcc?.length) {
			headers.push(`Bcc: ${email.bcc.map(formatAddr).join(', ')}`);
		}
		headers.push(`Subject: ${email.subject}`);
		if (email.replyToMessageId) {
			headers.push(`In-Reply-To: ${email.replyToMessageId}`);
			headers.push(`References: ${email.replyToMessageId}`);
		}
		headers.push('MIME-Version: 1.0');

		let messageBody: string;

		if (email.attachments?.length) {
			// Build multipart/mixed message with attachments
			const boundary = `boundary_${crypto.randomUUID().replace(/-/g, '')}`;
			headers.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);

			const parts: string[] = [];

			// HTML body part
			parts.push(`--${boundary}`);
			parts.push('Content-Type: text/html; charset=UTF-8');
			parts.push('');
			parts.push(email.bodyHtml);

			// Attachment parts
			for (const att of email.attachments) {
				const base64Content = att.content.toString('base64');
				// Wrap base64 at 76 chars per RFC 2045
				const wrappedBase64 = base64Content.match(/.{1,76}/g)?.join('\r\n') || base64Content;

				parts.push(`--${boundary}`);
				parts.push(`Content-Type: ${att.contentType}; name="${att.filename}"`);
				parts.push('Content-Transfer-Encoding: base64');
				parts.push(`Content-Disposition: attachment; filename="${att.filename}"`);
				parts.push('');
				parts.push(wrappedBase64);
			}

			parts.push(`--${boundary}--`);

			messageBody = `${headers.join('\r\n')}\r\n\r\n${parts.join('\r\n')}`;
		} else {
			// Simple message without attachments
			headers.push('Content-Type: text/html; charset=UTF-8');
			messageBody = `${headers.join('\r\n')}\r\n\r\n${email.bodyHtml}`;
		}

		const raw = Buffer.from(messageBody).toString('base64url');

		const res = await gmail.users.messages.send({
			userId: 'me',
			requestBody: {
				raw,
				threadId: email.replyToThreadId || undefined,
			},
		});

		return {
			providerMessageId: res.data.id!,
			providerThreadId: res.data.threadId!,
		};
	}

	async incrementalSync(params: { accessToken: string; historyId?: string }) {
		const gmail = createAuthenticatedClient(params.accessToken);
		const result: SyncResult = {
			added: [],
			deleted: [],
			labelsModified: [],
		};

		if (!params.historyId) {
			return { ...result, fullSyncRequired: true };
		}

		try {
			const res = await gmail.users.history.list({
				userId: 'me',
				startHistoryId: params.historyId,
				historyTypes: ['messageAdded', 'messageDeleted', 'labelAdded', 'labelRemoved'],
			});

			const history = res.data.history || [];

			for (const h of history) {
				// Messages added
				if (h.messagesAdded) {
					for (const added of h.messagesAdded) {
						if (added.message?.id) {
							try {
								const msgRes = await gmail.users.messages.get({
									userId: 'me',
									id: added.message.id,
									format: 'metadata',
									metadataHeaders: ['From', 'To', 'Cc', 'Subject', 'Date'],
								});
								result.added.push(parseMessageToSummary(msgRes.data));
							} catch {
								// Message may have been deleted
							}
						}
					}
				}

				// Messages deleted
				if (h.messagesDeleted) {
					for (const deleted of h.messagesDeleted) {
						if (deleted.message?.id) {
							result.deleted.push(deleted.message.id);
						}
					}
				}

				// Labels modified
				if (h.labelsAdded) {
					for (const mod of h.labelsAdded) {
						if (mod.message?.id && mod.labelIds) {
							result.labelsModified.push({
								providerMessageId: mod.message.id,
								addedLabels: mod.labelIds,
								removedLabels: [],
							});
						}
					}
				}
				if (h.labelsRemoved) {
					for (const mod of h.labelsRemoved) {
						if (mod.message?.id && mod.labelIds) {
							const existing = result.labelsModified.find(
								(m) => m.providerMessageId === mod.message?.id,
							);
							if (existing) {
								existing.removedLabels.push(...mod.labelIds);
							} else {
								result.labelsModified.push({
									providerMessageId: mod.message.id,
									addedLabels: [],
									removedLabels: mod.labelIds,
								});
							}
						}
					}
				}
			}

			result.newHistoryId = res.data.historyId || undefined;
		} catch (err: any) {
			// 404 means historyId expired, need full re-sync
			if (err?.code === 404 || err?.status === 404) {
				return { ...result, fullSyncRequired: true };
			}
			throw err;
		}

		return result;
	}

	async modifyLabels(params: {
		accessToken: string;
		messageIds: string[];
		addLabelIds?: string[];
		removeLabelIds?: string[];
	}) {
		const gmail = createAuthenticatedClient(params.accessToken);

		if (params.messageIds.length === 1) {
			await gmail.users.messages.modify({
				userId: 'me',
				id: params.messageIds[0],
				requestBody: {
					addLabelIds: params.addLabelIds,
					removeLabelIds: params.removeLabelIds,
				},
			});
		} else {
			await gmail.users.messages.batchModify({
				userId: 'me',
				requestBody: {
					ids: params.messageIds,
					addLabelIds: params.addLabelIds,
					removeLabelIds: params.removeLabelIds,
				},
			});
		}
	}
	async watchMailbox(params: {
		accessToken: string;
		topicName: string;
		labelIds?: string[];
	}): Promise<{ historyId: string; expiration: string }> {
		const gmail = createAuthenticatedClient(params.accessToken);

		const res = await gmail.users.watch({
			userId: 'me',
			requestBody: {
				topicName: params.topicName,
				labelIds: params.labelIds,
				labelFilterBehavior: params.labelIds?.length ? 'INCLUDE' : undefined,
			},
		});

		return {
			historyId: res.data.historyId?.toString(),
			expiration: res.data.expiration?.toString(),
		};
	}

	async stopWatch(params: { accessToken: string }): Promise<void> {
		const gmail = createAuthenticatedClient(params.accessToken);
		await gmail.users.stop({ userId: 'me' });
	}

	async trashThread(params: { accessToken: string; threadId: string }): Promise<void> {
		const gmail = createAuthenticatedClient(params.accessToken);
		await gmail.users.threads.trash({ userId: 'me', id: params.threadId });
	}

	async untrashThread(params: { accessToken: string; threadId: string }): Promise<void> {
		const gmail = createAuthenticatedClient(params.accessToken);
		await gmail.users.threads.untrash({ userId: 'me', id: params.threadId });
	}
}

export { GMAIL_SCOPES, getOAuth2Client };
