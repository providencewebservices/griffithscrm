import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Types
export type EmailIntegration = {
	id: string;
	provider: string;
	emailAddress: string;
	status: string;
	lastSyncAt: string | null;
	errorMessage: string | null;
	createdAt: string;
};

export type EmailEntityLink = {
	id: string;
	tenantId: string;
	threadId: string;
	entityType: string;
	entityId: string;
	linkedById: string | null;
	createdAt: string;
};

export type EmailMessageMeta = {
	id: string;
	threadId: string;
	providerMessageId: string;
	fromAddress: string | null;
	fromName: string | null;
	toAddresses: { name?: string; address: string }[];
	ccAddresses: { name?: string; address: string }[];
	subject: string | null;
	snippet: string | null;
	isUnread: boolean;
	hasAttachments: boolean;
	labelIds: string[];
	internalDate: string | null;
};

export type EmailThread = {
	id: string;
	integrationId: string;
	tenantId: string;
	providerThreadId: string;
	subject: string | null;
	snippet: string | null;
	lastMessageAt: string | null;
	messageCount: number;
	isUnread: boolean;
	isArchived: boolean;
	labelIds: string[];
	links: EmailEntityLink[];
	latestMessage: EmailMessageMeta | null;
};

export type EmailAttachmentMeta = {
	attachmentId: string;
	filename: string;
	mimeType: string;
	size: number;
};

export type EmailMessageFull = {
	providerMessageId: string;
	providerThreadId: string;
	fromAddress: string;
	fromName: string;
	toAddresses: { name?: string; address: string }[];
	ccAddresses: { name?: string; address: string }[];
	subject: string;
	snippet: string;
	isUnread: boolean;
	hasAttachments: boolean;
	labelIds: string[];
	internalDate: string;
	bodyHtml: string;
	bodyText: string;
	attachments: EmailAttachmentMeta[];
	headers: Record<string, string>;
};

export type EmailThreadFull = {
	id: string;
	integrationId: string;
	providerThreadId: string;
	subject: string | null;
	snippet: string | null;
	labelIds: string[];
	links: EmailEntityLink[];
	messages: EmailMessageFull[];
};

export type ThreadsQueryParams = {
	q?: string;
	page?: number;
	limit?: number;
	filter?: 'all' | 'unread' | 'customers' | 'quotes' | 'jobs' | 'unlinked';
};

// Fetch functions
async function fetchEmailIntegrations(): Promise<EmailIntegration[]> {
	const response = await fetch(`${API_URL}/api/email-integrations`, {
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch integrations');
	}

	const data = await response.json();
	return data.integrations;
}

async function fetchInboxThreads(params?: ThreadsQueryParams): Promise<{
	threads: EmailThread[];
	total: number;
	page: number;
	limit: number;
}> {
	const searchParams = new URLSearchParams();
	if (params?.q) searchParams.set('q', params.q);
	if (params?.page) searchParams.set('page', String(params.page));
	if (params?.limit) searchParams.set('limit', String(params.limit));
	if (params?.filter) searchParams.set('filter', params.filter);

	const url = `${API_URL}/api/inbox/threads${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
	const response = await fetch(url, { credentials: 'include' });

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch threads');
	}

	return response.json();
}

async function fetchInboxThread(threadId: string): Promise<EmailThreadFull> {
	const response = await fetch(`${API_URL}/api/inbox/threads/${threadId}`, {
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to fetch thread');
	}

	const data = await response.json();
	return data.thread;
}

async function sendEmail(params: {
	to: string;
	cc?: string;
	bcc?: string;
	subject: string;
	bodyHtml: string;
	replyToThreadId?: string;
	replyToMessageId?: string;
}): Promise<{ success: boolean; messageId: string; threadId: string }> {
	const response = await fetch(`${API_URL}/api/inbox/send`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(params),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to send email');
	}

	return response.json();
}

async function linkThread(params: {
	threadId: string;
	entityType: string;
	entityId: string;
}): Promise<EmailEntityLink> {
	const response = await fetch(`${API_URL}/api/inbox/threads/${params.threadId}/links`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify({ entityType: params.entityType, entityId: params.entityId }),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to link thread');
	}

	const data = await response.json();
	return data.link;
}

async function unlinkThread(params: { threadId: string; linkId: string }): Promise<void> {
	const response = await fetch(
		`${API_URL}/api/inbox/threads/${params.threadId}/links/${params.linkId}`,
		{
			method: 'DELETE',
			credentials: 'include',
		}
	);

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to unlink thread');
	}
}

async function markThreadRead(threadId: string): Promise<void> {
	const response = await fetch(`${API_URL}/api/inbox/threads/${threadId}/read`, {
		method: 'POST',
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to mark thread as read');
	}
}

async function archiveThread(threadId: string): Promise<void> {
	const response = await fetch(`${API_URL}/api/inbox/threads/${threadId}/archive`, {
		method: 'POST',
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to archive thread');
	}
}

async function syncIntegration(integrationId: string): Promise<void> {
	const response = await fetch(`${API_URL}/api/email-integrations/${integrationId}/sync`, {
		method: 'POST',
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to sync inbox');
	}
}

async function disconnectIntegration(integrationId: string): Promise<void> {
	const response = await fetch(`${API_URL}/api/email-integrations/${integrationId}`, {
		method: 'DELETE',
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to disconnect integration');
	}
}

async function getConnectGmailUrl(): Promise<string> {
	const response = await fetch(`${API_URL}/api/email-integrations/connect/gmail`, {
		credentials: 'include',
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to get connection URL');
	}

	const data = await response.json();
	return data.url;
}

// React Query hooks
export function useEmailIntegrationsQuery() {
	return useQuery({
		queryKey: ['email-integrations'],
		queryFn: fetchEmailIntegrations,
	});
}

export function useInboxThreadsQuery(params?: ThreadsQueryParams) {
	return useQuery({
		queryKey: ['inbox-threads', params],
		queryFn: () => fetchInboxThreads(params),
		placeholderData: keepPreviousData,
	});
}

export function useInboxThreadQuery(threadId: string | null) {
	return useQuery({
		queryKey: ['inbox-thread', threadId],
		queryFn: () => fetchInboxThread(threadId!),
		enabled: !!threadId,
	});
}

export function useSendEmailMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: sendEmail,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['inbox-threads'] });
		},
	});
}

export function useLinkThreadMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: linkThread,
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['inbox-threads'] });
			queryClient.invalidateQueries({ queryKey: ['inbox-thread', variables.threadId] });
		},
	});
}

export function useUnlinkThreadMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: unlinkThread,
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['inbox-threads'] });
			queryClient.invalidateQueries({ queryKey: ['inbox-thread', variables.threadId] });
		},
	});
}

export function useMarkReadMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: markThreadRead,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['inbox-threads'] });
		},
	});
}

export function useArchiveThreadMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: archiveThread,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['inbox-threads'] });
		},
	});
}

export function useSyncInboxMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: syncIntegration,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['inbox-threads'] });
			queryClient.invalidateQueries({ queryKey: ['email-integrations'] });
		},
	});
}

export function useDisconnectIntegrationMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: disconnectIntegration,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['email-integrations'] });
			queryClient.invalidateQueries({ queryKey: ['inbox-threads'] });
		},
	});
}

export { getConnectGmailUrl };
