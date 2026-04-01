import {
	Archive,
	ChevronDown,
	Eye,
	EyeOff,
	File,
	FileSpreadsheet,
	FileText,
	Download,
	Image,
	Inbox,
	Link2,
	Loader2,
	Mail,
	Paperclip,
	PenSquare,
	RefreshCw,
	Reply,
	Search,
	Trash2,
	Undo2,
	Users,
	X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { NavLink, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { ComposeEmailDialog } from '@/components/inbox/compose-email-dialog';
import { NavUser } from '@/components/nav-user';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from '@/components/ui/command';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarInput,
	SidebarInset,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarProvider,
	SidebarTrigger,
	useSidebar,
} from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { CustomerViewProvider, useCustomerView } from '@/contexts/customer-view-context';
import { useCustomersQuery } from '@/hooks/use-customers';
import { useFuneralDirectorsQuery } from '@/hooks/use-funeral-directors';
import {
	type EmailThread,
	fetchInboxAttachmentBlob,
	getConnectGmailUrl,
	type ThreadsQueryParams,
	useArchiveThreadMutation,
	useEmailIntegrationsQuery,
	useInboxThreadQuery,
	useInboxThreadsQuery,
	useMarkReadMutation,
	useSendEmailMutation,
	useSyncInboxMutation,
	useTrashThreadMutation,
	useUnreadCountQuery,
	useUntrashThreadMutation,
} from '@/hooks/use-inbox';
import { useSuppliersQuery } from '@/hooks/use-suppliers';
import { navItems } from '@/lib/nav-items';

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

function canPreviewAttachment(mimeType: string): boolean {
	return (
		mimeType.includes('pdf') ||
		mimeType.startsWith('image/') ||
		mimeType.startsWith('text/') ||
		mimeType.startsWith('audio/') ||
		mimeType.startsWith('video/')
	);
}

function getAttachmentBadge(filename: string, mimeType: string): string {
	const extension = filename.split('.').pop()?.trim().toUpperCase();
	if (extension) return extension;
	if (mimeType.includes('pdf')) return 'PDF';
	if (mimeType.startsWith('image/')) return 'IMAGE';
	if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'SHEET';
	return 'FILE';
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
	const isYesterday = new Date(now.getTime() - 86400000).toDateString() === date.toDateString();
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
					Link your Gmail account to send and receive emails directly from the CRM. Your emails will
					stay synced automatically.
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
		<Sidebar collapsible="none" className="w-[calc(var(--sidebar-width-icon)+1px)]! border-r">
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
								<NavLink
									to={item.url}
									end={item.url === '/app'}
									className="relative justify-center"
								>
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
	registerThreadButton,
	onSelectThread,
	searchQuery,
	onSearchChange,
	debouncedSearch,
	filter,
	onFilterChange,
	folder,
	onFolderChange,
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
	globalUnreadCount,
}: {
	threads: EmailThread[];
	threadsLoading: boolean;
	selectedThreadId: string | null;
	registerThreadButton: (threadId: string, node: HTMLButtonElement | null) => void;
	onSelectThread: (thread: EmailThread) => void;
	searchQuery: string;
	onSearchChange: (q: string) => void;
	debouncedSearch: string;
	filter: ThreadsQueryParams['filter'];
	onFilterChange: (f: ThreadsQueryParams['filter']) => void;
	folder: 'inbox' | 'trash';
	onFolderChange: (f: 'inbox' | 'trash') => void;
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
	globalUnreadCount: number;
}) {
	const unreadCount = threads.filter((t) => t.isUnread).length;

	return (
		<Sidebar
			collapsible="none"
			className="hidden w-0 min-w-0 flex-1 md:flex bg-background text-foreground"
		>
			<SidebarHeader className="border-b p-0 gap-0">
				<div className="flex items-center justify-between p-3 pb-0">
					<h2 className="font-semibold text-base">Inbox</h2>
					<div className="flex items-center gap-1">
						<Button
							variant="ghost"
							size="icon"
							className="size-7"
							onClick={onSync}
							disabled={syncPending}
						>
							<RefreshCw className={`h-4 w-4 ${syncPending ? 'animate-spin' : ''}`} />
						</Button>
						<Button variant="ghost" size="icon" className="size-7" onClick={onCompose}>
							<PenSquare className="h-4 w-4" />
						</Button>
					</div>
				</div>
				<div className="flex border-b">
					<button
						onClick={() => onFolderChange('inbox')}
						className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
							folder === 'inbox'
								? 'border-primary text-primary'
								: 'border-transparent text-muted-foreground hover:text-foreground'
						}`}
					>
						<Inbox className="h-4 w-4" />
						Inbox
						{globalUnreadCount > 0 && (
							<Badge variant="secondary" className="h-5 px-1.5 text-xs">
								{globalUnreadCount}
							</Badge>
						)}
					</button>
					<button
						onClick={() => onFolderChange('trash')}
						className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
							folder === 'trash'
								? 'border-primary text-primary'
								: 'border-transparent text-muted-foreground hover:text-foreground'
						}`}
					>
						<Trash2 className="h-4 w-4" />
						Trash
					</button>
				</div>
				<div className="p-3 space-y-3">
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
						{folder !== 'trash' && (
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
																<span className="text-sm">
																	{c.firstName} {c.lastName}
																</span>
																{c.primaryEmail && (
																	<span className="text-xs text-muted-foreground">
																		{c.primaryEmail.value}
																	</span>
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
																	<span className="text-xs text-muted-foreground">
																		{fd.primaryEmail.value}
																	</span>
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
																	<span className="text-xs text-muted-foreground">
																		{s.primaryEmail.value}
																	</span>
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
						)}
					</div>
					{folder !== 'trash' && (
						<div className="flex items-center gap-2">
							<Select
								value={filter}
								onValueChange={(v) => onFilterChange(v as ThreadsQueryParams['filter'])}
							>
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
								<Badge variant="secondary" className="text-xs">
									{unreadCount} unread
								</Badge>
							)}
						</div>
					)}
					{folder !== 'trash' && selectedContact && (
						<div className="flex items-center gap-2">
							<Badge variant="secondary" className="flex items-center gap-1 py-1">
								<Users className="h-3 w-3" />
								{selectedContact.label}
								{selectedContact.email && (
									<span className="text-muted-foreground ml-1">({selectedContact.email})</span>
								)}
								<button onClick={onClearContact} className="ml-1 hover:bg-muted rounded-full p-0.5">
									<X className="h-3 w-3" />
								</button>
							</Badge>
						</div>
					)}
				</div>
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
							thread.latestMessage?.fromName || thread.latestMessage?.fromAddress || 'Unknown';
						const isSelected = selectedThreadId === thread.id;
						return (
							<button
								key={thread.id}
								ref={(node) => registerThreadButton(thread.id, node)}
								data-inbox-thread-item="true"
								onClick={() => onSelectThread(thread)}
								className={`w-full text-left px-3 py-3 border-b cursor-pointer transition-colors ${
									isSelected ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'
								} ${thread.isUnread && !isSelected ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''}`}
							>
								<div className="flex items-start gap-2.5">
									<div className="relative shrink-0">
										<Avatar className="h-8 w-8">
											<AvatarFallback className="text-xs">{getInitials(senderName)}</AvatarFallback>
										</Avatar>
										{thread.isUnread && (
											<div className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-blue-500 border-2 border-white" />
										)}
									</div>
									<div className="flex-1 min-w-0">
										<div className="flex items-center justify-between mb-0.5">
											<span
												className={`text-sm truncate ${thread.isUnread ? 'font-semibold' : ''}`}
											>
												{senderName}
											</span>
											<span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
												{formatDate(thread.lastMessageAt)}
											</span>
										</div>
										<p
											className={`text-sm truncate mb-0.5 ${thread.isUnread ? 'font-medium' : 'text-muted-foreground'}`}
										>
											{thread.subject || '(no subject)'}
										</p>
										<p className="text-xs text-muted-foreground line-clamp-2">{thread.snippet}</p>
										<div className="flex items-center gap-1.5 mt-1.5">
											{thread.latestMessage?.hasAttachments && (
												<Paperclip className="h-3 w-3 text-muted-foreground" />
											)}
											{thread.messageCount > 1 && (
												<span className="text-xs text-muted-foreground">{thread.messageCount}</span>
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
	const threadButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

	const [searchParams, setSearchParams] = useSearchParams();
	const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
	const [searchQuery, setSearchQuery] = useState('');
	const [debouncedSearch, setDebouncedSearch] = useState('');
	const [filter, setFilter] = useState<ThreadsQueryParams['filter']>('all');
	const folder = (searchParams.get('folder') as 'inbox' | 'trash') || 'inbox';
	const setFolder = (f: 'inbox' | 'trash') => {
		setSearchParams(
			(prev) => {
				if (f === 'inbox') {
					prev.delete('folder');
				} else {
					prev.set('folder', f);
				}
				return prev;
			},
			{ replace: true },
		);
		setSelectedThreadId(null);
	};
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
	}, [searchParams.get]);

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
		contactSearchEnabled ? { q: debouncedContactSearch } : undefined,
	);
	const { data: fdResults } = useFuneralDirectorsQuery(
		contactSearchEnabled ? { q: debouncedContactSearch } : undefined,
	);
	const { data: supplierResults } = useSuppliersQuery(
		contactSearchEnabled ? { q: debouncedContactSearch } : undefined,
	);

	// Queries
	const { data: integrations, isLoading: integrationsLoading } = useEmailIntegrationsQuery();
	const activeIntegration = integrations?.find((i) => i.status === 'active');

	const queryParams: ThreadsQueryParams = {
		q: debouncedSearch || undefined,
		filter: folder === 'trash' ? undefined : filter,
		contactEntityType: folder === 'trash' ? undefined : selectedContact?.entityType || undefined,
		contactEntityId: folder === 'trash' ? undefined : selectedContact?.entityId || undefined,
		folder,
	};
	const { data: threadsData, isLoading: threadsLoading } = useInboxThreadsQuery(queryParams);
	const { data: selectedThread, isLoading: threadLoading } = useInboxThreadQuery(selectedThreadId);
	const { data: globalUnreadCount } = useUnreadCountQuery();

	// Mutations
	const markReadMutation = useMarkReadMutation();
	const archiveMutation = useArchiveThreadMutation();
	const trashMutation = useTrashThreadMutation();
	const untrashMutation = useUntrashThreadMutation();
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
	}, [selectedThreadId, markReadMutation.mutate, threadsData?.threads.find]);

	const threads = threadsData?.threads || [];

	const handleSelectThread = (thread: EmailThread) => {
		setSelectedThreadId(thread.id);
		if (isMobile) setOpenMobile(false);
	};

	const registerThreadButton = (threadId: string, node: HTMLButtonElement | null) => {
		threadButtonRefs.current[threadId] = node;
	};

	const scrollThreadIntoView = (threadId: string) => {
		threadButtonRefs.current[threadId]?.scrollIntoView({
			block: 'nearest',
			inline: 'nearest',
		});
	};

	const selectAdjacentThread = (direction: 1 | -1) => {
		if (threads.length === 0) return;

		const currentIndex = selectedThreadId ? threads.findIndex((thread) => thread.id === selectedThreadId) : -1;
		const nextIndex =
			currentIndex === -1
				? direction === 1
					? 0
					: threads.length - 1
				: Math.min(Math.max(currentIndex + direction, 0), threads.length - 1);

		if (nextIndex === currentIndex) return;

		const nextThread = threads[nextIndex];
		handleSelectThread(nextThread);
		requestAnimationFrame(() => scrollThreadIntoView(nextThread.id));
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

	const handleTrash = async () => {
		if (!selectedThreadId) return;
		try {
			await trashMutation.mutateAsync(selectedThreadId);
			setSelectedThreadId(null);
			toast.success('Thread moved to trash');
		} catch {
			toast.error('Failed to trash thread');
		}
	};

	const handleUntrash = async () => {
		if (!selectedThreadId) return;
		try {
			await untrashMutation.mutateAsync(selectedThreadId);
			setSelectedThreadId(null);
			toast.success('Thread moved to inbox');
		} catch {
			toast.error('Failed to restore thread');
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

	const openAttachment = async (
		messageId: string,
		attachment: { attachmentId: string; filename: string; mimeType: string },
	) => {
		try {
			const blob = await fetchInboxAttachmentBlob(
				messageId,
				attachment.attachmentId,
				attachment.mimeType,
			);
			const objectUrl = URL.createObjectURL(blob);
			window.open(objectUrl, '_blank', 'noopener,noreferrer');
			setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
		} catch {
			toast.error('Failed to open attachment');
		}
	};

	const downloadAttachment = async (
		messageId: string,
		attachment: { attachmentId: string; filename: string; mimeType: string },
	) => {
		try {
			const blob = await fetchInboxAttachmentBlob(
				messageId,
				attachment.attachmentId,
				attachment.mimeType,
			);
			const objectUrl = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = objectUrl;
			link.download = attachment.filename;
			document.body.appendChild(link);
			link.click();
			link.remove();
			setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
		} catch {
			toast.error('Failed to download attachment');
		}
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

	useEffect(() => {
		if (!selectedThreadId) return;
		scrollThreadIntoView(selectedThreadId);
	}, [selectedThreadId]);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;

			const target = event.target;
			if (target instanceof HTMLElement) {
				if (
					target.closest(
						'input, textarea, select, [contenteditable="true"], [role="textbox"], [role="combobox"]',
					)
				) {
					return;
				}

				if (
					target.closest(
						'[role="dialog"], [role="menu"], [role="listbox"], [cmdk-root], [data-radix-popper-content-wrapper]',
					)
				) {
					return;
				}

				if (target.closest('button, a, [role="button"]') && !target.closest('[data-inbox-thread-item="true"]')) {
					return;
				}
			}

			if (event.key === 'ArrowDown') {
				event.preventDefault();
				selectAdjacentThread(1);
			} else if (event.key === 'ArrowUp') {
				event.preventDefault();
				selectAdjacentThread(-1);
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [selectAdjacentThread]);

	// Loading state
	if (integrationsLoading) {
		return (
			<>
				<Sidebar collapsible="icon" className="overflow-hidden *:data-[sidebar=sidebar]:flex-row">
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
				<Sidebar collapsible="icon" className="overflow-hidden *:data-[sidebar=sidebar]:flex-row">
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
			<Sidebar collapsible="icon" className="overflow-hidden *:data-[sidebar=sidebar]:flex-row">
				<IconRail />
				<ThreadListPanel
					threads={threads}
					threadsLoading={threadsLoading}
					selectedThreadId={selectedThreadId}
					registerThreadButton={registerThreadButton}
					onSelectThread={handleSelectThread}
					searchQuery={searchQuery}
					onSearchChange={setSearchQuery}
					debouncedSearch={debouncedSearch}
					filter={filter}
					onFilterChange={setFilter}
					folder={folder}
					onFolderChange={setFolder}
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
					globalUnreadCount={globalUnreadCount ?? 0}
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

								{folder === 'inbox' && (
									<>
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

										<Button
											variant="outline"
											size="sm"
											onClick={handleArchive}
											disabled={archiveMutation.isPending}
										>
											<Archive className="h-4 w-4 mr-2" />
											Archive
										</Button>

										<Button
											variant="outline"
											size="sm"
											onClick={handleTrash}
											disabled={trashMutation.isPending}
										>
											<Trash2 className="h-4 w-4 mr-2" />
											Trash
										</Button>
									</>
								)}

								{folder === 'trash' && (
									<Button
										variant="outline"
										size="sm"
										onClick={handleUntrash}
										disabled={untrashMutation.isPending}
									>
										<Undo2 className="h-4 w-4 mr-2" />
										Move to Inbox
									</Button>
								)}
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
													<span>
														{msg.attachments.length} attachment
														{msg.attachments.length > 1 ? 's' : ''}
													</span>
												</div>
												<div className="space-y-2">
													{msg.attachments.map((att) => {
														const previewable = canPreviewAttachment(att.mimeType);

														return (
															<div
																key={att.attachmentId}
																className="flex items-center gap-3 rounded-lg border bg-muted/50 px-3 py-2"
															>
																<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-background">
																	{getDocumentIcon(att.mimeType)}
																</div>
																<div className="min-w-0 flex-1">
																	<div className="flex items-center gap-2">
																		<p className="truncate text-sm font-medium">{att.filename}</p>
																		<Badge variant="secondary" className="shrink-0 text-[10px] uppercase">
																			{getAttachmentBadge(att.filename, att.mimeType)}
																		</Badge>
																	</div>
																	<p className="text-xs text-muted-foreground">
																		{msg.id ? formatFileSize(att.size) : 'Attachment unavailable'}
																	</p>
																</div>
																{msg.id && (
																	<div className="flex shrink-0 items-center gap-2">
																		{previewable && (
																			<Button
																				variant="outline"
																				size="sm"
																				onClick={() => openAttachment(msg.id!, att)}
																			>
																				<Eye className="mr-2 h-4 w-4" />
																				Preview
																			</Button>
																		)}
																		<Button
																			variant={previewable ? 'ghost' : 'outline'}
																			size="sm"
																			onClick={() => downloadAttachment(msg.id!, att)}
																		>
																			<Download className="mr-2 h-4 w-4" />
																			Download
																		</Button>
																	</div>
																)}
															</div>
														);
													})}
												</div>
											</div>
										)}

										{/* Message body */}
										<div className="px-6 pb-4">
											{msg.bodyHtml ? (
												<iframe
													srcDoc={msg.bodyHtml}
													sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
													className="w-full border-0"
													style={{ overflow: 'hidden' }}
													onLoad={(e) => {
														const iframe = e.target as HTMLIFrameElement;
														const doc = iframe.contentDocument;
														if (!doc) return;
														doc.body.style.overflow = 'hidden';
														doc.body.style.margin = '0';
														for (const link of doc.querySelectorAll<HTMLAnchorElement>('a[href]')) {
															link.target = '_blank';
															link.rel = 'noopener noreferrer';
														}
														const resize = () => {
															iframe.style.height = `${doc.body.scrollHeight}px`;
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
						? {
								entityType: selectedThread.links[0].entityType,
								entityId: selectedThread.links[0].entityId,
							}
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
			<SidebarProvider style={{ '--sidebar-width': '350px' } as React.CSSProperties}>
				<InboxLayoutInner />
			</SidebarProvider>
		</CustomerViewProvider>
	);
}
