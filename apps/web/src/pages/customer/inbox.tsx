import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
	Search,
	Reply,
	Link2,
	FileText,
	UserPlus,
	Clock,
	Archive,
	ChevronDown,
	Mail,
	Paperclip,
	File,
	Image,
	FileSpreadsheet,
	Download,
	PenSquare,
	RefreshCw,
	Loader2,
} from 'lucide-react';
import { ComposeEmailDialog } from '@/components/inbox/compose-email-dialog';
import {
	useEmailIntegrationsQuery,
	useInboxThreadsQuery,
	useInboxThreadQuery,
	useMarkReadMutation,
	useArchiveThreadMutation,
	useSendEmailMutation,
	useSyncInboxMutation,
	getConnectGmailUrl,
	type EmailThread,
	type EmailMessageFull,
	type ThreadsQueryParams,
} from '@/hooks/use-inbox';

const LINK_COLORS: Record<string, string> = {
	customer: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
	quote: 'bg-green-100 text-green-800 hover:bg-green-100',
	job: 'bg-orange-100 text-orange-800 hover:bg-orange-100',
	funeral_director: 'bg-purple-100 text-purple-800 hover:bg-purple-100',
	supplier: 'bg-cyan-100 text-cyan-800 hover:bg-cyan-100',
};

const ENTITY_LABELS: Record<string, string> = {
	customer: 'Customer',
	quote: 'Quote',
	job: 'Job',
	funeral_director: 'Funeral Director',
	supplier: 'Supplier',
};

function getInitials(name: string): string {
	return name
		.split(' ')
		.map((n) => n[0])
		.join('')
		.slice(0, 2)
		.toUpperCase();
}

function getDocumentIcon(mimeType: string) {
	if (mimeType.includes('pdf')) return <File className="h-4 w-4 text-red-500" />;
	if (mimeType.startsWith('image/')) return <Image className="h-4 w-4 text-blue-500" />;
	if (mimeType.includes('spreadsheet') || mimeType.includes('excel'))
		return <FileSpreadsheet className="h-4 w-4 text-green-500" />;
	return <FileText className="h-4 w-4 text-gray-500" />;
}

function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string | null): string {
	if (!dateStr) return '';
	const date = new Date(dateStr);
	const now = new Date();
	const isToday = date.toDateString() === now.toDateString();
	const isYesterday =
		new Date(now.getTime() - 86400000).toDateString() === date.toDateString();

	if (isToday) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	if (isYesterday) return 'Yesterday';
	return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function formatFullDate(dateStr: string): string {
	const date = new Date(dateStr);
	return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) +
		' at ' +
		date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Connection CTA component
function ConnectEmailCTA() {
	const [isConnecting, setIsConnecting] = useState(false);

	const handleConnect = async () => {
		setIsConnecting(true);
		try {
			const url = await getConnectGmailUrl();
			window.location.href = url;
		} catch {
			toast.error('Failed to start Gmail connection');
			setIsConnecting(false);
		}
	};

	return (
		<div className="h-[calc(100vh-8rem)] flex items-center justify-center">
			<Card className="max-w-md w-full p-8 text-center">
				<div className="flex justify-center mb-6">
					<div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
						<Mail className="h-8 w-8 text-primary" />
					</div>
				</div>
				<h2 className="text-xl font-semibold mb-2">Connect your email</h2>
				<p className="text-muted-foreground mb-6">
					Link your Gmail account to send and receive emails directly from the CRM.
					Your emails will stay synced automatically.
				</p>
				<Button onClick={handleConnect} disabled={isConnecting} size="lg">
					{isConnecting ? (
						<Loader2 className="h-4 w-4 mr-2 animate-spin" />
					) : (
						<Mail className="h-4 w-4 mr-2" />
					)}
					Connect Gmail
				</Button>
			</Card>
		</div>
	);
}

// Thread list skeleton
function ThreadListSkeleton() {
	return (
		<div className="space-y-0">
			{Array.from({ length: 5 }).map((_, i) => (
				<div key={i} className="p-4 border-b">
					<div className="flex items-start gap-3">
						<Skeleton className="h-10 w-10 rounded-full" />
						<div className="flex-1 space-y-2">
							<Skeleton className="h-4 w-3/4" />
							<Skeleton className="h-3 w-full" />
							<Skeleton className="h-3 w-1/2" />
						</div>
					</div>
				</div>
			))}
		</div>
	);
}

// Thread detail skeleton
function ThreadDetailSkeleton() {
	return (
		<div className="p-6 space-y-4">
			<Skeleton className="h-6 w-3/4" />
			<div className="flex items-center gap-3">
				<Skeleton className="h-10 w-10 rounded-full" />
				<div className="space-y-2">
					<Skeleton className="h-4 w-48" />
					<Skeleton className="h-3 w-32" />
				</div>
			</div>
			<Skeleton className="h-48 w-full" />
		</div>
	);
}

export function InboxPage() {
	const [searchParams, setSearchParams] = useSearchParams();
	const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
	const [searchQuery, setSearchQuery] = useState('');
	const [debouncedSearch, setDebouncedSearch] = useState('');
	const [filter, setFilter] = useState<ThreadsQueryParams['filter']>('all');
	const [composeOpen, setComposeOpen] = useState(false);
	const [replyToThread, setReplyToThread] = useState<{ threadId: string; subject: string; fromAddress: string; fromName: string; body: string } | null>(null);

	// Show toast on connection success/error from redirect
	useEffect(() => {
		const connected = searchParams.get('connected');
		const error = searchParams.get('error');
		if (connected === 'gmail') {
			toast.success('Gmail connected successfully');
			setSearchParams({}, { replace: true });
		} else if (error) {
			toast.error(`Connection failed: ${error}`);
			setSearchParams({}, { replace: true });
		}
	}, [searchParams, setSearchParams]);

	// Debounce search
	useEffect(() => {
		const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
		return () => clearTimeout(timer);
	}, [searchQuery]);

	// Queries
	const { data: integrations, isLoading: integrationsLoading } = useEmailIntegrationsQuery();
	const activeIntegration = integrations?.find((i) => i.status === 'active');

	const queryParams: ThreadsQueryParams = {
		q: debouncedSearch || undefined,
		filter,
	};
	const { data: threadsData, isLoading: threadsLoading } = useInboxThreadsQuery(queryParams);
	const { data: selectedThread, isLoading: threadLoading } = useInboxThreadQuery(selectedThreadId);

	// Mutations
	const markReadMutation = useMarkReadMutation();
	const archiveMutation = useArchiveThreadMutation();
	const sendEmailMutation = useSendEmailMutation();
	const syncMutation = useSyncInboxMutation();

	// Mark thread as read when selected
	useEffect(() => {
		if (selectedThreadId) {
			const thread = threadsData?.threads.find((t) => t.id === selectedThreadId);
			if (thread?.isUnread) {
				markReadMutation.mutate(selectedThreadId);
			}
		}
	}, [selectedThreadId]);

	// Connection gate
	if (integrationsLoading) {
		return (
			<div className="h-[calc(100vh-8rem)] flex items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (!activeIntegration) {
		return <ConnectEmailCTA />;
	}

	const threads = threadsData?.threads || [];
	const unreadCount = threads.filter((t) => t.isUnread).length;

	const handleSelectThread = (thread: EmailThread) => {
		setSelectedThreadId(thread.id);
	};

	const handleArchive = async () => {
		if (!selectedThreadId) return;
		try {
			await archiveMutation.mutateAsync(selectedThreadId);
			setSelectedThreadId(null);
			toast.success('Thread archived');
		} catch {
			toast.error('Failed to archive');
		}
	};

	const handleSendEmail = async (data: {
		to: string;
		subject: string;
		body: string;
		attachments: File[];
	}) => {
		try {
			await sendEmailMutation.mutateAsync({
				to: data.to,
				subject: data.subject,
				bodyHtml: data.body,
				replyToThreadId: replyToThread?.threadId,
			});
			toast.success('Email sent');
			setReplyToThread(null);
		} catch {
			toast.error('Failed to send email');
		}
	};

	const handleReply = () => {
		if (!selectedThread || !selectedThread.messages.length) return;
		const lastMsg = selectedThread.messages[selectedThread.messages.length - 1];
		setReplyToThread({
			threadId: selectedThreadId!,
			subject: lastMsg.subject,
			fromAddress: lastMsg.fromAddress,
			fromName: lastMsg.fromName,
			body: lastMsg.bodyHtml || lastMsg.bodyText,
		});
		setComposeOpen(true);
	};

	const handleCompose = () => {
		setReplyToThread(null);
		setComposeOpen(true);
	};

	const handleSync = async () => {
		if (!activeIntegration) return;
		try {
			await syncMutation.mutateAsync(activeIntegration.id);
			toast.success('Inbox synced');
		} catch {
			toast.error('Failed to sync');
		}
	};

	return (
		<div className="h-[calc(100vh-8rem)]">
			<div className="mb-4 flex items-center justify-between">
				<h2 className="text-2xl font-bold">Inbox</h2>
				<div className="flex items-center gap-2">
					<Button variant="outline" size="sm" onClick={handleSync} disabled={syncMutation.isPending}>
						<RefreshCw className={`h-4 w-4 mr-2 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
						Sync
					</Button>
					<Button onClick={handleCompose}>
						<PenSquare className="h-4 w-4 mr-2" />
						Compose
					</Button>
				</div>
			</div>

			<div className="flex gap-4 h-[calc(100%-4rem)]">
				{/* Left Panel - Thread List */}
				<Card className="w-2/5 flex flex-col overflow-hidden">
					<div className="p-4 border-b space-y-4">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<h3 className="font-semibold">Messages</h3>
								{unreadCount > 0 && (
									<Badge variant="secondary">{unreadCount} unread</Badge>
								)}
							</div>
						</div>
						<div className="relative">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
							<Input
								placeholder="Search emails..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="pl-9"
							/>
						</div>
						<Tabs value={filter} onValueChange={(v) => setFilter(v as ThreadsQueryParams['filter'])}>
							<TabsList className="w-full">
								<TabsTrigger value="all" className="flex-1">All</TabsTrigger>
								<TabsTrigger value="unread" className="flex-1">Unread</TabsTrigger>
								<TabsTrigger value="customers" className="flex-1">Customers</TabsTrigger>
								<TabsTrigger value="quotes" className="flex-1">Quotes</TabsTrigger>
								<TabsTrigger value="jobs" className="flex-1">Jobs</TabsTrigger>
								<TabsTrigger value="unlinked" className="flex-1">Unlinked</TabsTrigger>
							</TabsList>
						</Tabs>
					</div>

					<div className="flex-1 overflow-y-auto">
						{threadsLoading ? (
							<ThreadListSkeleton />
						) : threads.length === 0 ? (
							<div className="p-8 text-center text-muted-foreground">
								{debouncedSearch ? 'No emails match your search' : 'No emails found'}
							</div>
						) : (
							threads.map((thread) => {
								const senderName = thread.latestMessage?.fromName || thread.latestMessage?.fromAddress || 'Unknown';
								return (
									<div
										key={thread.id}
										onClick={() => handleSelectThread(thread)}
										className={`p-4 border-b cursor-pointer transition-colors ${
											selectedThreadId === thread.id
												? 'bg-muted border-l-2 border-l-primary'
												: 'hover:bg-muted/50'
										} ${thread.isUnread ? 'bg-blue-50/50' : ''}`}
									>
										<div className="flex items-start gap-3">
											<div className="relative">
												<Avatar className="h-10 w-10">
													<AvatarFallback className="text-xs">
														{getInitials(senderName)}
													</AvatarFallback>
												</Avatar>
												{thread.isUnread && (
													<div className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-blue-500 border-2 border-white" />
												)}
											</div>
											<div className="flex-1 min-w-0">
												<div className="flex items-center justify-between mb-1">
													<span className={`text-sm truncate ${thread.isUnread ? 'font-semibold' : ''}`}>
														{senderName}
													</span>
													<span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
														{formatDate(thread.lastMessageAt)}
													</span>
												</div>
												<p className={`text-sm truncate mb-1 ${thread.isUnread ? 'font-medium' : 'text-muted-foreground'}`}>
													{thread.subject || '(no subject)'}
												</p>
												<p className="text-xs text-muted-foreground truncate">
													{thread.snippet}
												</p>
												<div className="flex items-center gap-2 mt-2">
													{thread.latestMessage?.hasAttachments && (
														<div className="flex items-center gap-1 text-muted-foreground">
															<Paperclip className="h-3 w-3" />
														</div>
													)}
													{thread.messageCount > 1 && (
														<span className="text-xs text-muted-foreground">
															{thread.messageCount} messages
														</span>
													)}
													{thread.links?.map((link) => (
														<Badge
															key={link.id}
															variant="secondary"
															className={`text-xs ${LINK_COLORS[link.entityType] || ''}`}
														>
															{ENTITY_LABELS[link.entityType] || link.entityType}
														</Badge>
													))}
												</div>
											</div>
										</div>
									</div>
								);
							})
						)}
					</div>
				</Card>

				{/* Right Panel - Thread Detail */}
				<Card className="flex-1 flex flex-col overflow-hidden">
					{selectedThreadId && threadLoading ? (
						<ThreadDetailSkeleton />
					) : selectedThread ? (
						<>
							{/* Thread Header */}
							<div className="p-4 border-b">
								<div className="flex items-start justify-between mb-4">
									<h3 className="text-lg font-semibold">
										{selectedThread.messages[0]?.subject || '(no subject)'}
									</h3>
									{selectedThread.links?.length > 0 && (
										<div className="flex gap-1">
											{selectedThread.links.map((link) => (
												<Badge
													key={link.id}
													variant="secondary"
													className={LINK_COLORS[link.entityType] || ''}
												>
													{ENTITY_LABELS[link.entityType] || link.entityType}
												</Badge>
											))}
										</div>
									)}
								</div>
							</div>

							{/* Action Buttons */}
							<div className="p-3 border-b bg-muted/30 flex items-center gap-2 flex-wrap">
								<Button variant="outline" size="sm" onClick={handleReply}>
									<Reply className="h-4 w-4 mr-2" />
									Reply
								</Button>

								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button variant="outline" size="sm">
											<Link2 className="h-4 w-4 mr-2" />
											Link to...
											<ChevronDown className="h-4 w-4 ml-1" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent>
										<DropdownMenuItem onClick={() => toast.info('Entity linking coming soon')}>
											Link to Customer
										</DropdownMenuItem>
										<DropdownMenuItem onClick={() => toast.info('Entity linking coming soon')}>
											Link to Quote
										</DropdownMenuItem>
										<DropdownMenuItem onClick={() => toast.info('Entity linking coming soon')}>
											Link to Job
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>

								<Button variant="outline" size="sm" onClick={handleArchive} disabled={archiveMutation.isPending}>
									<Archive className="h-4 w-4 mr-2" />
									Archive
								</Button>
							</div>

							{/* Messages */}
							<div className="flex-1 overflow-y-auto">
								{selectedThread.messages.map((msg, index) => (
									<div key={msg.providerMessageId} className={index > 0 ? 'border-t' : ''}>
										{/* Message header */}
										<div className="p-4 pb-2">
											<div className="flex items-center gap-3">
												<Avatar className="h-10 w-10">
													<AvatarFallback>
														{getInitials(msg.fromName || msg.fromAddress)}
													</AvatarFallback>
												</Avatar>
												<div className="flex-1">
													<div className="font-medium">{msg.fromName || msg.fromAddress}</div>
													<div className="text-sm text-muted-foreground">
														{msg.fromAddress}
														{msg.toAddresses?.length > 0 && (
															<> to {msg.toAddresses.map((a) => a.name || a.address).join(', ')}</>
														)}
													</div>
												</div>
												<div className="text-sm text-muted-foreground">
													{formatFullDate(msg.internalDate)}
												</div>
											</div>
										</div>

										{/* Attachments */}
										{msg.attachments && msg.attachments.length > 0 && (
											<div className="px-6 py-2">
												<div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
													<Paperclip className="h-4 w-4" />
													<span>{msg.attachments.length} attachment{msg.attachments.length > 1 ? 's' : ''}</span>
												</div>
												<div className="flex flex-wrap gap-2">
													{msg.attachments.map((att) => (
														<div
															key={att.attachmentId}
															className="flex items-center gap-2 px-3 py-2 bg-muted border rounded-lg"
														>
															{getDocumentIcon(att.mimeType)}
															<div className="text-left">
																<p className="text-sm font-medium truncate max-w-[180px]">{att.filename}</p>
																<p className="text-xs text-muted-foreground">{formatFileSize(att.size)}</p>
															</div>
														</div>
													))}
												</div>
											</div>
										)}

										{/* Message body */}
										<div className="px-6 pb-4">
											{msg.bodyHtml ? (
												<iframe
													srcDoc={msg.bodyHtml}
													sandbox=""
													className="w-full border-0"
													style={{ minHeight: '200px' }}
													onLoad={(e) => {
														const iframe = e.target as HTMLIFrameElement;
														if (iframe.contentDocument) {
															iframe.style.height = iframe.contentDocument.body.scrollHeight + 'px';
														}
													}}
													title="Email content"
												/>
											) : (
												<pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
													{msg.bodyText}
												</pre>
											)}
										</div>
									</div>
								))}
							</div>
						</>
					) : (
						<div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
							<Mail className="h-16 w-16 mb-4 opacity-20" />
							<p className="text-lg font-medium">Select an email to view</p>
							<p className="text-sm">Choose from the list on the left</p>
						</div>
					)}
				</Card>
			</div>

			<ComposeEmailDialog
				open={composeOpen}
				onOpenChange={setComposeOpen}
				onSend={handleSendEmail}
				defaultTo={replyToThread?.fromAddress || ''}
				defaultSubject={replyToThread ? `RE: ${replyToThread.subject}` : ''}
				defaultBody={
					replyToThread
						? `<br><br><p>On ${new Date().toLocaleDateString()}, ${replyToThread.fromName} wrote:</p><blockquote style="border-left: 2px solid #ccc; padding-left: 10px; margin-left: 0; color: #666;">${replyToThread.body}</blockquote>`
						: ''
				}
				fromAddress={activeIntegration?.emailAddress}
			/>
		</div>
	);
}
