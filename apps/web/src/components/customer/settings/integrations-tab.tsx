import { AlertCircle, RefreshCw, Unplug } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
	getConnectGmailUrl,
	useDisconnectIntegrationMutation,
	useEmailIntegrationsQuery,
	useSyncInboxMutation,
} from '@/hooks/use-inbox';

function GmailLogo({ className }: { className?: string }) {
	return (
		<svg className={className} viewBox="52 42 88 66" xmlns="http://www.w3.org/2000/svg">
			<path fill="#4285f4" d="M58 108h14V74L52 59v43c0 3.32 2.69 6 6 6" />
			<path fill="#34a853" d="M120 108h14c3.32 0 6-2.69 6-6V59l-20 15" />
			<path fill="#fbbc04" d="M120 48v26l20-15v-8c0-7.42-8.47-11.65-14.4-7.2" />
			<path fill="#ea4335" d="M72 74V48l24 18 24-18v26L96 92" />
			<path fill="#c5221f" d="M52 51v8l20 15V48l-5.6-4.2c-5.94-4.45-14.4-.22-14.4 7.2" />
		</svg>
	);
}

const STATUS_CONFIG: Record<
	string,
	{ label: string; variant: 'success' | 'warning' | 'destructive' | 'secondary' }
> = {
	active: { label: 'Connected', variant: 'success' },
	token_expired: { label: 'Expired', variant: 'warning' },
	revoked: { label: 'Revoked', variant: 'destructive' },
	error: { label: 'Error', variant: 'destructive' },
	not_connected: { label: 'Not Connected', variant: 'secondary' },
};

export function IntegrationsTab() {
	const { data: integrations, isLoading } = useEmailIntegrationsQuery();
	const disconnectMutation = useDisconnectIntegrationMutation();
	const syncMutation = useSyncInboxMutation();

	const handleConnectGmail = async () => {
		try {
			const url = await getConnectGmailUrl();
			window.location.href = url;
		} catch (_err) {
			toast.error('Failed to start Gmail connection');
		}
	};

	const handleDisconnect = async (integrationId: string) => {
		try {
			await disconnectMutation.mutateAsync(integrationId);
			toast.success('Email disconnected');
		} catch (_err) {
			toast.error('Failed to disconnect');
		}
	};

	const handleSync = async (integrationId: string) => {
		try {
			await syncMutation.mutateAsync(integrationId);
			toast.success('Inbox synced');
		} catch (_err) {
			toast.error('Failed to sync inbox');
		}
	};

	const handleReconnect = async () => {
		try {
			const url = await getConnectGmailUrl();
			window.location.href = url;
		} catch (_err) {
			toast.error('Failed to start reconnection');
		}
	};

	if (isLoading) {
		return (
			<div className="max-w-2xl space-y-4">
				<div className="h-8 w-48 bg-muted animate-pulse rounded" />
				<div className="h-48 bg-muted animate-pulse rounded-lg" />
			</div>
		);
	}

	const gmail = integrations?.find((i) => i.provider === 'gmail');
	const status = gmail
		? STATUS_CONFIG[gmail.status] || STATUS_CONFIG.error
		: STATUS_CONFIG.not_connected;

	return (
		<div className="max-w-2xl space-y-6">
			<div>
				<h3 className="text-lg font-semibold">Email Integrations</h3>
				<p className="text-sm text-muted-foreground mt-1">Manage connected email accounts.</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="text-base flex items-center gap-2">
						<GmailLogo className="h-6 w-6" />
						Gmail
						<Badge variant={status.variant}>{status.label}</Badge>
					</CardTitle>
					<CardAction>
						{!gmail && (
							<Button size="sm" onClick={handleConnectGmail}>
								Connect
							</Button>
						)}
						{gmail?.status === 'active' && (
							<div className="flex items-center gap-2">
								<Button
									variant="outline"
									size="sm"
									onClick={() => handleSync(gmail.id)}
									disabled={syncMutation.isPending}
								>
									<RefreshCw
										className={`h-4 w-4 mr-2 ${syncMutation.isPending ? 'animate-spin' : ''}`}
									/>
									Sync
								</Button>
								<Button
									variant="outline"
									size="sm"
									onClick={() => handleDisconnect(gmail.id)}
									disabled={disconnectMutation.isPending}
								>
									<Unplug className="h-4 w-4 mr-2" />
									Disconnect
								</Button>
							</div>
						)}
						{gmail?.status === 'token_expired' && (
							<div className="flex items-center gap-2">
								<Button variant="outline" size="sm" onClick={handleReconnect}>
									Reconnect
								</Button>
								<Button
									variant="outline"
									size="sm"
									onClick={() => handleDisconnect(gmail.id)}
									disabled={disconnectMutation.isPending}
								>
									Disconnect
								</Button>
							</div>
						)}
						{(gmail?.status === 'revoked' || gmail?.status === 'error') && (
							<Button
								variant="outline"
								size="sm"
								onClick={() => handleDisconnect(gmail.id)}
								disabled={disconnectMutation.isPending}
							>
								Disconnect
							</Button>
						)}
					</CardAction>
				</CardHeader>
				<CardContent>
					{gmail ? (
						<div className="space-y-1">
							<p className="text-sm font-medium">{gmail.emailAddress}</p>
							{gmail.lastSyncAt && (
								<p className="text-sm text-muted-foreground">
									Last synced {new Date(gmail.lastSyncAt).toLocaleString()}
								</p>
							)}
							{gmail.errorMessage && gmail.status !== 'active' && (
								<p className="text-sm text-destructive flex items-center gap-1 mt-1">
									<AlertCircle className="h-3 w-3 shrink-0" />
									{gmail.errorMessage}
								</p>
							)}
						</div>
					) : (
						<div className="space-y-3">
							<p className="text-sm text-muted-foreground">
								Emails automatically linked to customer records.
							</p>
							<ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
								<li>Send and receive emails from the CRM</li>
								<li>Email history on customers, quotes, and jobs</li>
								<li>Search your inbox without leaving the app</li>
							</ul>
							<p className="text-xs text-muted-foreground/70">
								You'll be redirected to Google to authorize access.
							</p>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
