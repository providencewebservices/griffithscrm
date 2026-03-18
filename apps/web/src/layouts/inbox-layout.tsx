import { useState, useEffect } from 'react';
import { useSearchParams, NavLink } from 'react-router';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from '@/components/ui/command';
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarInset,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarProvider,
	SidebarTrigger,
	SidebarInput,
	useSidebar,
} from '@/components/ui/sidebar';
import {
	Search,
	Reply,
	Link2,
	FileText,
	Archive,
	ChevronDown,
	Mail,
	Paperclip,
	File,
	Image,
	FileSpreadsheet,
	PenSquare,
	RefreshCw,
	Loader2,
	X,
	Users,
	Eye,
	EyeOff,
} from 'lucide-react';
import { NavUser } from '@/components/nav-user';
import { ComposeEmailDialog } from '@/components/inbox/compose-email-dialog';
import { navItems } from '@/lib/nav-items';
import { useUnreadCountQuery } from '@/hooks/use-inbox';
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
	type ThreadsQueryParams,
} from '@/hooks/use-inbox';
import { useCustomersQuery } from '@/hooks/use-customers';
import { useFuneralDirectorsQuery } from '@/hooks/use-funeral-directors';
import { useSuppliersQuery } from '@/hooks/use-suppliers';
import { CustomerViewProvider, useCustomerView } from '@/contexts/customer-view-context';

// ─── Helpers ──────────────────────────────────────────────

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
	return (
		date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) +
		' at ' +
		date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
	);
}

// ─── Skeletons ──────────────────────────────────────────

function ThreadListSkeleton() {
	return (
		<div className="space-y-0">
			{Array.from({ length: 5 }).map((_, i) => (
				<div key={i} className="p-4 border-b">
					<div className="flex items-start gap-3">
						<Skeleton className="h-8 w-8 rounded-full" />
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

// ─── Connect Email CTA ──────────────────────────────────

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
		<div className="flex-1 flex items-center justify-center">
			<div className="max-w-md w-full p-8 text-center">
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
			</div>
		</div>
	);
}

// ─── Contact filter type ─────────────────────────────────

type ContactFilterSelection = {
	entityType: string;
	entityId: string;
	label: string;
	email?: string;
};

// ─── Icon Rail ───────────────────────────────────────────

function IconRail() {
	const { data: unreadCount } = useUnreadCountQuery();

	return (
		<Sidebar
			collapsible="none"
			className="w-[calc(var(--sidebar-width-icon))] border-r"
		>
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton size="lg" asChild className="justify-center">
							<a href="/app">
								<div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg">
									<span className="text-sm font-bold">G</span>
								</div>
							</a>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				<SidebarMenu className="px-2">
					{navItems.map((item) => (
						<SidebarMenuItem key={item.title}>
							<SidebarMenuButton asChild tooltip={item.title}>
								<NavLink to={item.url} end={item.url === '/app'} className="relative justify-center">
									<item.icon className="size-4" />
									{item.title === 'Inbox' && unreadCount ? (
										<span className="absolute top-0.5 right-1 size-2 rounded-full bg-red-500" />
									) : null}
								</NavLink>
							</SidebarMenuButton>
						</SidebarMenuItem>
					))}
				</SidebarMenu>
			</SidebarContent>
			<SidebarFooter>
				<NavUser />
			</SidebarFooter>
		</Sidebar>
	);
}

// ─── Thread List Panel ───────────────────────────────────

function ThreadListPanel({
	threads,
	threadsLoading,
	selectedThreadId,
	onSelectThread,
	searchQuery,
	onSearchChange,
	debouncedSearch,
	filter,
	onFilterChange,
	selectedContact,
	onClearContact,
	contactFilterOpen,
	onContactFilterOpenChange,
	contactSearch,
	onContactSearchChange,
	debouncedContactSearch,
	customerResults,
	fdResults,
	supplierResults,
	onContactSelect,
	onCompose,
	onSync,
	syncPending,
}: {
	threads: EmailThread[];
	threadsLoading: boolean;
	selectedThreadId: string | null;
	onSelectThread: (thread: EmailThread) => void;
	searchQuery: string;
	onSearchChange: (q: string) => void;
	debouncedSearch: string;
	filter: ThreadsQueryParams['filter'];
	onFilterChange: (f: ThreadsQueryParams['filter']) => void;
	selectedContact: ContactFilterSelection | null;
	onClearContact: () => void;
	contactFilterOpen: boolean;
	onContactFilterOpenChange: (open: boolean) => void;
	contactSearch: string;
	onContactSearchChange: (q: string) => void;
	debouncedContactSearch: string;
	customerResults: any;
	fdResults: any;
	supplierResults: any;
	onContactSelect: (c: ContactFilterSelection) => void;
	onCompose: () => void;
	onSync: () => void;
	syncPending: boolean;
}) {
	const unreadCount = threads.filter((t) => t.isUnread).length;

	return (
		<Sidebar collapsible="none" className="flex-1 flex flex-col">
			<SidebarHeader className="border-b p-3 gap-3">
				<div className="flex items-center justify-between">
					<h2 className="font-semibold text-base">Inbox</h2>
					<div className="flex items-center gap-1">
						<Button variant="ghost" size="icon" className="size-7" onClick={onSync} disabled={syncPending}>
							<RefreshCw className={`h-4 w-4 ${syncPending ? 'animate-spin' : ''}`} />
						</Button>
						<Button variant="ghost" size="icon" className="size-7" onClick={onCompose}>
							<PenSquare className="h-4 w-4" />
						</Button>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<div className="relative flex-1">
						<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
						<SidebarInput
							placeholder="Search emails..."
							value={searchQuery}
							onChange={(e) => onSearchChange(e.target.value)}
							className="pl-8"
						/>
					</div>
					<Popover open={contactFilterOpen} onOpenChange={onContactFilterOpenChange}>
						<PopoverTrigger asChild>
							<Button variant="outline" size="icon" className="size-8 shrink-0">
								<Users className="h-4 w-4" />
							</Button>
						</PopoverTrigger>
						<PopoverContent className="w-72 p-0" align="end">
							<Command shouldFilter={false}>
								<CommandInput
									placeholder="Search contacts..."
									value={contactSearch}
									onValueChange={onContactSearchChange}
								/>
								<CommandList>
									<CommandEmpty>
										{debouncedContactSearch.length < 2
											? 'Type to search contacts...'
											: 'No contacts found'}
									</CommandEmpty>
									{customerResults && customerResults.length > 0 && (
										<CommandGroup heading="Customers">
											{customerResults.slice(0, 5).map((c: any) => (
												<CommandItem
													key={`customer-${c.id}`}
													onSelect={() => {
														onContactSelect({
															entityType: 'customer',
															entityId: c.id,
															label: `${c.firstName} ${c.lastName}`,
															email: c.primaryEmail?.value,
														});
													}}
												>
													<div className="flex flex-col">
														<span className="text-sm">{c.firstName} {c.lastName}</span>
														{c.primaryEmail && (
															<span className="text-xs text-muted-foreground">{c.primaryEmail.value}</span>
														)}
													</div>
												</CommandItem>
											))}
										</CommandGroup>
									)}
									{fdResults && fdResults.length > 0 && (
										<CommandGroup heading="Funeral Directors">
											{fdResults.slice(0, 5).map((fd: any) => (
												<CommandItem
													key={`fd-${fd.id}`}
													onSelect={() => {
														onContactSelect({
															entityType: 'funeral_director',
															entityId: fd.id,
															label: fd.tradingName || fd.businessName,
															email: fd.primaryEmail?.value,
														});
													}}
												>
													<div className="flex flex-col">
														<span className="text-sm">{fd.tradingName || fd.businessName}</span>
														{fd.primaryEmail && (
															<span className="text-xs text-muted-foreground">{fd.primaryEmail.value}</span>
														)}
													</div>
												</CommandItem>
											))}
										</CommandGroup>
									)}
									{supplierResults && supplierResults.length > 0 && (
										<CommandGroup heading="Suppliers">
											{supplierResults.slice(0, 5).map((s: any) => (
												<CommandItem
													key={`supplier-${s.id}`}
													onSelect={() => {
														onContactSelect({
															entityType: 'supplier',
															entityId: s.id,
															label: s.tradingName || s.businessName,
															email: s.primaryEmail?.value,
														});
													}}
												>
													<div className="flex flex-col">
														<span className="text-sm">{s.tradingName || s.businessName}</span>
														{s.primaryEmail && (
															<span className="text-xs text-muted-foreground">{s.primaryEmail.value}</span>
														)}
													</div>
												</CommandItem>
											))}
										</CommandGroup>
									)}
								</CommandList>
							</Command>
						</PopoverContent>
					</Popover>
				</div>
				<div className="flex items-center gap-2">
					<Select value={filter} onValueChange={(v) => onFilterChange(v as ThreadsQueryParams['filter'])}>
						<SelectTrigger size="sm" className="h-7 text-xs flex-1">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All</SelectItem>
							<SelectItem value="unread">Unread</SelectItem>
							<SelectItem value="customers">Customers</SelectItem>
							<SelectItem value="quotes">Quotes</SelectItem>
							<SelectItem value="jobs">Jobs</SelectItem>
							<SelectItem value="unlinked">Unlinked</SelectItem>
						</SelectContent>
					</Select>
					{unreadCount > 0 && (
						<Badge variant="secondary" className="text-xs">{unreadCount} unread</Badge>
					)}
				</div>
				{selectedContact && (
					<div className="flex items-center gap-2">
						<Badge variant="secondary" className="flex items-center gap-1 py-1">
							<Users className="h-3 w-3" />
							{selectedContact.label}
							{selectedContact.email && (
								<span className="text-muted-foreground ml-1">({selectedContact.email})</span>
							)}
							<button
								onClick={onClearContact}
								className="ml-1 hover:bg-muted rounded-full p-0.5"
							>
								<X className="h-3 w-3" />
							</button>
						</Badge>
					</div>
				)}
			</SidebarHeader>
			<SidebarContent>
				{threadsLoading ? (
					<ThreadListSkeleton />
				) : threads.length === 0 ? (
					<div className="p-8 text-center text-muted-foreground text-sm">
						{debouncedSearch ? 'No emails match your search' : 'No emails found'}
					</div>
				) : (
					threads.map((thread) => {
						const senderName =
							thread.latestMessage?.fromName ||
							thread.latestMessage?.fromAddress ||
							'Unknown';
						const isSelected = selectedThreadId === thread.id;
						return (
							<button
								key={thread.id}
								onClick={() => onSelectThread(thread)}
								className={`w-full text-left px-3 py-3 border-b cursor-pointer transition-colors ${
									isSelected
										? 'bg-sidebar-accent text-sidebar-accent-foreground'
										: 'hover:bg-sidebar-accent/50'
								} ${thread.isUnread && !isSelected ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''}`}
							>
								<div className="flex items-start gap-2.5">
									<div className="relative shrink-0">
										<Avatar className="h-8 w-8">
											<AvatarFallback className="text-xs">
												{getInitials(senderName)}
											</AvatarFallback>
										</Avatar>
										{thread.isUnread && (
											<div className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-blue-500 border-2 border-white" />
										)}
									</div>
									<div className="flex-1 min-w-0">
										<div className="flex items-center justify-between mb-0.5">
											<span className={`text-sm truncate ${thread.isUnread ? 'font-semibold' : ''}`}>
												{senderName}
											</span>
											<span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
												{formatDate(thread.lastMessageAt)}
											</span>
										</div>
										<p className={`text-sm truncate mb-0.5 ${thread.isUnread ? 'font-medium' : 'text-muted-foreground'}`}>
											{thread.subject || '(no subject)'}
										</p>
										<p className="text-xs text-muted-foreground line-clamp-2">
											{thread.snippet}
										</p>
										<div className="flex items-center gap-1.5 mt-1.5">
											{thread.latestMessage?.hasAttachments && (
												<Paperclip className="h-3 w-3 text-muted-foreground" />
											)}
											{thread.messageCount > 1 && (
												<span className="text-xs text-muted-foreground">
													{thread.messageCount}
												</span>
											)}
											{thread.links?.map((link) => (
												<Badge
													key={link.id}
													variant="secondary"
													className={`text-[10px] px-1 py-0 ${LINK_COLORS[link.entityType] || ''}`}
												>
													{ENTITY_LABELS[link.entityType] || link.entityType}
												</Badge>
											))}
										</div>
									</div>
								</div>
							</button>
						);
					})
				)}
			</SidebarContent>
		</Sidebar>
	);
}

// ─── Main Layout (inner) ─────────────────────────────────

function InboxLayoutInner() {
	const { isCustomerView, toggleCustomerView } = useCustomerView();
	const { setOpenMobile, isMobile } = useSidebar();

	const [searchParams, setSearchParams] = useSearchParams();
	const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
	const [searchQuery, setSearchQuery] = useState('');
	const [debouncedSearch, setDebouncedSearch] = useState('');
	const [filter, setFilter] = useState<ThreadsQueryParams['filter']>('all');
	const [composeOpen, setComposeOpen] = useState(false);
	const [replyToThread, setReplyToThread] = useState<{
		threadId: string;
		subject: string;
		fromAddress: string;
		fromName: string;
		body: string;
	} | null>(null);

	// Contact filter state
	const [contactFilterOpen, setContactFilterOpen] = useState(false);
	const [contactSearch, setContactSearch] = useState('');
	const [debouncedContactSearch, setDebouncedContactSearch] = useState('');
	const [selectedContact, setSelectedContact] = useState<ContactFilterSelection | null>(null);

	// Read contact filter from URL params on mount
	useEffect(() => {
		const entityType = searchParams.get('contactEntityType');
		const entityId = searchParams.get('contactEntityId');
		if (entityType && entityId) {
			setSelectedContact({ entityType, entityId, label: 'Contact' });
		}
	}, []);

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

	// Debounce contact search
	useEffect(() => {
		const timer = setTimeout(() => setDebouncedContactSearch(contactSearch), 300);
		return () => clearTimeout(timer);
	}, [contactSearch]);

	// Contact search queries
	const contactSearchEnabled = contactFilterOpen && debouncedContactSearch.length >= 2;
	const { data: customerResults } = useCustomersQuery(
		contactSearchEnabled ? { q: debouncedContactSearch } : undefined
	);
	const { data: fdResults } = useFuneralDirectorsQuery(
		contactSearchEnabled ? { q: debouncedContactSearch } : undefined
	);
	const { data: supplierResults } = useSuppliersQuery(
		contactSearchEnabled ? { q: debouncedContactSearch } : undefined
	);

	// Queries
	const { data: integrations, isLoading: integrationsLoading } = useEmailIntegrationsQuery();
	const activeIntegration = integrations?.find((i) => i.status === 'active');

	const queryParams: ThreadsQueryParams = {
		q: debouncedSearch || undefined,
		filter,
		contactEntityType: selectedContact?.entityType || undefined,
		contactEntityId: selectedContact?.entityId || undefined,
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

	const threads = threadsData?.threads || [];

	const handleSelectThread = (thread: EmailThread) => {
		setSelectedThreadId(thread.id);
		if (isMobile) setOpenMobile(false);
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
		cc?: string;
		bcc?: string;
		subject: string;
		body: string;
		localFiles: File[];
		documentIds: string[];
	}) => {
		try {
			await sendEmailMutation.mutateAsync({
				to: data.to,
				cc: data.cc,
				bcc: data.bcc,
				subject: data.subject,
				bodyHtml: data.body,
				replyToThreadId: replyToThread?.threadId,
				localFiles: data.localFiles.length > 0 ? data.localFiles : undefined,
				documentIds: data.documentIds.length > 0 ? data.documentIds : undefined,
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
		const isOwnMessage = lastMsg.fromAddress === activeIntegration?.emailAddress;
		const replyTo = isOwnMessage
			? lastMsg.toAddresses?.[0]?.address || lastMsg.fromAddress
			: lastMsg.fromAddress;
		const replyToName = isOwnMessage
			? lastMsg.toAddresses?.[0]?.name || lastMsg.fromName
			: lastMsg.fromName;
		setReplyToThread({
			threadId: selectedThreadId!,
			subject: lastMsg.subject,
			fromAddress: replyTo,
			fromName: replyToName,
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

	const handleContactSelect = (c: ContactFilterSelection) => {
		setSelectedContact(c);
		setContactFilterOpen(false);
		setContactSearch('');
	};

	// Loading state
	if (integrationsLoading) {
		return (
			<>
				<Sidebar collapsible="icon" className="overflow-hidden [&>[data-sidebar=sidebar]]:flex-row">
					<IconRail />
				</Sidebar>
				<SidebarInset>
					<div className="flex-1 flex items-center justify-center">
						<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
					</div>
				</SidebarInset>
			</>
		);
	}

	// No active integration — show connect CTA in content area
	if (!activeIntegration) {
		return (
			<>
				<Sidebar collapsible="icon" className="overflow-hidden [&>[data-sidebar=sidebar]]:flex-row">
					<IconRail />
				</Sidebar>
				<SidebarInset>
					<header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
						<div className="flex flex-1 items-center gap-2 px-4">
							<SidebarTrigger className="-ml-1" />
							<Separator orientation="vertical" className="mr-2 h-4" />
							<Breadcrumb>
								<BreadcrumbList>
									<BreadcrumbItem>
										<BreadcrumbPage>Inbox</BreadcrumbPage>
									</BreadcrumbItem>
								</BreadcrumbList>
							</Breadcrumb>
						</div>
					</header>
					<ConnectEmailCTA />
				</SidebarInset>
			</>
		);
	}

	// Thread subject for breadcrumbs
	const threadSubject = selectedThread?.messages?.[0]?.subject || '(no subject)';

	return (
		<>
			{/* Outer sidebar: icon rail + thread list */}
			<Sidebar collapsible="icon" className="overflow-hidden [&>[data-sidebar=sidebar]]:flex-row">
				<IconRail />
				<ThreadListPanel
					threads={threads}
					threadsLoading={threadsLoading}
					selectedThreadId={selectedThreadId}
					onSelectThread={handleSelectThread}
					searchQuery={searchQuery}
					onSearchChange={setSearchQuery}
					debouncedSearch={debouncedSearch}
					filter={filter}
					onFilterChange={setFilter}
					selectedContact={selectedContact}
					onClearContact={() => setSelectedContact(null)}
					contactFilterOpen={contactFilterOpen}
					onContactFilterOpenChange={setContactFilterOpen}
					contactSearch={contactSearch}
					onContactSearchChange={setContactSearch}
					debouncedContactSearch={debouncedContactSearch}
					customerResults={customerResults}
					fdResults={fdResults}
					supplierResults={supplierResults}
					onContactSelect={handleContactSelect}
					onCompose={handleCompose}
					onSync={handleSync}
					syncPending={syncMutation.isPending}
				/>
			</Sidebar>

			{/* Content area */}
			<SidebarInset>
				<header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
					<div className="flex flex-1 items-center gap-2 px-4">
						<SidebarTrigger className="-ml-1" />
						<Separator orientation="vertical" className="mr-2 h-4" />
						<Breadcrumb>
							<BreadcrumbList>
								<BreadcrumbItem>
									{selectedThreadId ? (
										<button
											className="hover:text-foreground transition-colors text-muted-foreground"
											onClick={() => setSelectedThreadId(null)}
										>
											Inbox
										</button>
									) : (
										<BreadcrumbPage>Inbox</BreadcrumbPage>
									)}
								</BreadcrumbItem>
								{selectedThreadId && (
									<>
										<BreadcrumbSeparator />
										<BreadcrumbItem>
											<BreadcrumbPage className="max-w-[300px] truncate">
												{threadSubject}
											</BreadcrumbPage>
										</BreadcrumbItem>
									</>
								)}
							</BreadcrumbList>
						</Breadcrumb>
					</div>
					<div className="flex items-center gap-2 px-4">
						<Button
							variant={isCustomerView ? 'default' : 'outline'}
							size="sm"
							onClick={toggleCustomerView}
						>
							{isCustomerView ? <EyeOff /> : <Eye />}
							{isCustomerView ? 'Exit Customer View' : 'Customer View'}
						</Button>
					</div>
				</header>

				{/* Thread detail */}
				<div className="flex-1 flex flex-col overflow-hidden">
					{selectedThreadId && threadLoading ? (
						<ThreadDetailSkeleton />
					) : selectedThread ? (
						<>
							{/* Thread Header */}
							<div className="p-4 border-b shrink-0">
								<div className="flex items-start justify-between">
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
							<div className="p-3 border-b bg-muted/30 flex items-center gap-2 flex-wrap shrink-0">
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
													sandbox="allow-same-origin"
													className="w-full border-0"
													style={{ overflow: 'hidden' }}
													onLoad={(e) => {
														const iframe = e.target as HTMLIFrameElement;
														const doc = iframe.contentDocument;
														if (!doc) return;
														doc.body.style.overflow = 'hidden';
														doc.body.style.margin = '0';
														const resize = () => {
															iframe.style.height = doc.body.scrollHeight + 'px';
														};
														resize();
														const observer = new ResizeObserver(resize);
														observer.observe(doc.body);
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
				</div>
			</SidebarInset>

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
				entityContext={
					selectedThread?.links?.[0]
						? { entityType: selectedThread.links[0].entityType, entityId: selectedThread.links[0].entityId }
						: undefined
				}
			/>
		</>
	);
}

// ─── Export ──────────────────────────────────────────────

export function InboxLayout() {
	return (
		<CustomerViewProvider>
			<SidebarProvider
				style={{ '--sidebar-width': '350px' } as React.CSSProperties}
			>
				<InboxLayoutInner />
			</SidebarProvider>
		</CustomerViewProvider>
	);
}
