import { Link } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Mail, Paperclip, ExternalLink } from 'lucide-react';
import { useEntityEmailThreadsQuery, type EntityEmailThread } from '@/hooks/use-inbox';

interface EmailThreadsCardProps {
	entityType: string;
	entityId: string;
	entityName?: string;
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

function ThreadRow({ thread }: { thread: EntityEmailThread }) {
	const senderName = thread.latestMessage?.fromName || thread.latestMessage?.fromAddress || 'Unknown';

	return (
		<Link
			to={`/app/inbox?threadId=${thread.id}`}
			className="flex items-start gap-3 p-3 rounded-md hover:bg-muted/50 transition-colors group"
		>
			<div className="relative mt-0.5">
				{thread.isUnread && (
					<div className="h-2 w-2 rounded-full bg-blue-500" />
				)}
				{!thread.isUnread && (
					<div className="h-2 w-2" />
				)}
			</div>
			<div className="flex-1 min-w-0">
				<div className="flex items-center justify-between gap-2 mb-0.5">
					<span className={`text-sm truncate ${thread.isUnread ? 'font-semibold' : 'text-muted-foreground'}`}>
						{senderName}
					</span>
					<span className="text-xs text-muted-foreground whitespace-nowrap">
						{formatDate(thread.lastMessageAt)}
					</span>
				</div>
				<p className={`text-sm truncate ${thread.isUnread ? 'font-medium' : 'text-muted-foreground'}`}>
					{thread.subject || '(no subject)'}
				</p>
				<div className="flex items-center gap-2 mt-1">
					{thread.latestMessage?.hasAttachments && (
						<Paperclip className="h-3 w-3 text-muted-foreground" />
					)}
					{thread.messageCount > 1 && (
						<span className="text-xs text-muted-foreground">
							{thread.messageCount} messages
						</span>
					)}
				</div>
			</div>
			<ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1 shrink-0" />
		</Link>
	);
}

export function EmailThreadsCard({ entityType, entityId, entityName }: EmailThreadsCardProps) {
	const { data, isLoading } = useEntityEmailThreadsQuery(entityType, entityId);

	const threads = data?.threads || [];
	const total = data?.total || 0;

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle>Email Threads</CardTitle>
						<CardDescription>
							Email conversations matched by email address
						</CardDescription>
					</div>
					{total > 0 && (
						<Link
							to={`/app/inbox?contactEntityType=${entityType}&contactEntityId=${entityId}`}
						>
							<Button variant="outline" size="sm">
								View all in Inbox
							</Button>
						</Link>
					)}
				</div>
			</CardHeader>
			<CardContent>
				{isLoading ? (
					<div className="space-y-3">
						{Array.from({ length: 3 }).map((_, i) => (
							<div key={i} className="flex items-start gap-3 p-3">
								<Skeleton className="h-2 w-2 rounded-full mt-2" />
								<div className="flex-1 space-y-2">
									<Skeleton className="h-4 w-3/4" />
									<Skeleton className="h-3 w-full" />
								</div>
							</div>
						))}
					</div>
				) : threads.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-8 text-center">
						<Mail className="h-10 w-10 text-muted-foreground/30 mb-3" />
						<p className="text-sm text-muted-foreground">
							No email conversations found
						</p>
						<p className="text-xs text-muted-foreground mt-1">
							Threads are automatically matched when email addresses in messages match this contact's email
						</p>
					</div>
				) : (
					<div className="divide-y -mx-2">
						{threads.map((thread) => (
							<ThreadRow key={thread.id} thread={thread} />
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
