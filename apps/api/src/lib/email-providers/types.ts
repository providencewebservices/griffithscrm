// Shared types for email provider abstraction

export type EmailAddress = {
	name?: string;
	address: string;
};

export type EmailAttachmentMeta = {
	attachmentId: string;
	filename: string;
	mimeType: string;
	size: number;
};

export type EmailMessageSummary = {
	providerMessageId: string;
	providerThreadId: string;
	fromAddress: string;
	fromName: string;
	toAddresses: EmailAddress[];
	ccAddresses: EmailAddress[];
	subject: string;
	snippet: string;
	isUnread: boolean;
	hasAttachments: boolean;
	labelIds: string[];
	internalDate: Date;
};

export type EmailMessageFull = EmailMessageSummary & {
	bodyHtml: string;
	bodyText: string;
	attachments: EmailAttachmentMeta[];
	headers: Record<string, string>;
};

export type EmailThreadSummary = {
	providerThreadId: string;
	subject: string;
	snippet: string;
	lastMessageAt: Date;
	messageCount: number;
	isUnread: boolean;
	labelIds: string[];
	messages: EmailMessageSummary[];
	historyId?: string;
};

export type EmailThreadFull = {
	providerThreadId: string;
	subject: string;
	messages: EmailMessageFull[];
	historyId?: string;
};

export type EmailAttachment = {
	filename: string;
	contentType: string;
	content: Buffer;
};

export type SendEmailParams = {
	to: EmailAddress[];
	cc?: EmailAddress[];
	bcc?: EmailAddress[];
	subject: string;
	bodyHtml: string;
	replyToMessageId?: string;
	replyToThreadId?: string;
	fromAddress: string;
	fromName?: string;
	attachments?: EmailAttachment[];
};

export type SendEmailResult = {
	providerMessageId: string;
	providerThreadId: string;
};

export type ListThreadsParams = {
	accessToken: string;
	query?: string;
	maxResults?: number;
	pageToken?: string;
	labelIds?: string[];
};

export type ListThreadsResult = {
	threads: EmailThreadSummary[];
	nextPageToken?: string;
	resultSizeEstimate?: number;
	historyId?: string;
};

export type SyncResult = {
	added: EmailMessageSummary[];
	deleted: string[]; // provider message IDs
	labelsModified: { providerMessageId: string; addedLabels: string[]; removedLabels: string[] }[];
	newHistoryId?: string;
	fullSyncRequired?: boolean;
};

export interface IEmailProvider {
	refreshAccessToken(refreshToken: string): Promise<{
		accessToken: string;
		expiresAt: Date;
		refreshToken?: string;
	}>;

	listThreads(params: ListThreadsParams): Promise<ListThreadsResult>;

	getThread(params: { accessToken: string; threadId: string }): Promise<EmailThreadFull>;

	getMessage(params: { accessToken: string; messageId: string }): Promise<EmailMessageFull>;

	getAttachment(params: {
		accessToken: string;
		messageId: string;
		attachmentId: string;
	}): Promise<{ data: Buffer; mimeType: string; filename: string }>;

	getMessageHeaders(params: {
		accessToken: string;
		messageId: string;
		headers: string[];
	}): Promise<Record<string, string>>;

	sendMessage(params: { accessToken: string; email: SendEmailParams }): Promise<SendEmailResult>;

	incrementalSync(params: {
		accessToken: string;
		historyId?: string;
		syncCursor?: string;
	}): Promise<SyncResult>;

	modifyLabels(params: {
		accessToken: string;
		messageIds: string[];
		addLabelIds?: string[];
		removeLabelIds?: string[];
	}): Promise<void>;

	watchMailbox(params: {
		accessToken: string;
		topicName: string;
		labelIds?: string[];
	}): Promise<{ historyId: string; expiration: string }>;

	stopWatch(params: { accessToken: string }): Promise<void>;

	trashThread(params: { accessToken: string; threadId: string }): Promise<void>;

	untrashThread(params: { accessToken: string; threadId: string }): Promise<void>;
}
