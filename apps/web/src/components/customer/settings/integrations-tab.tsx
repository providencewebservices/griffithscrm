import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, RefreshCw, Unplug, AlertCircle } from 'lucide-react';
import {
	useEmailIntegrationsQuery,
	useDisconnectIntegrationMutation,
	useSyncInboxMutation,
	getConnectGmailUrl,
} from '@/hooks/use-inbox';

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive'; color: string }> = {
	active: { label: 'Connected', variant: 'default', color: 'bg-green-100 text-green-800' },
	token_expired: { label: 'Expired', variant: 'secondary', color: 'bg-yellow-100 text-yellow-800' },
	revoked: { label: 'Revoked', variant: 'destructive', color: 'bg-red-100 text-red-800' },
	error: { label: 'Error', variant: 'destructive', color: 'bg-red-100 text-red-800' },
};

export function IntegrationsTab() {
	const { data: integrations, isLoading } = useEmailIntegrationsQuery();
	const disconnectMutation = useDisconnectIntegrationMutation();
	const syncMutation = useSyncInboxMutation();

	const handleConnectGmail = async () => {
		try {
			const url = await getConnectGmailUrl();
			window.location.href = url;
		} catch (err) {
			toast.error('Failed to start Gmail connection');
		}
	};

	const handleDisconnect = async (integrationId: string) => {
		try {
			await disconnectMutation.mutateAsync(integrationId);
			toast.success('Email disconnected');
		} catch (err) {
			toast.error('Failed to disconnect');
		}
	};

	const handleSync = async (integrationId: string) => {
		try {
			await syncMutation.mutateAsync(integrationId);
			toast.success('Inbox synced');
		} catch (err) {
			toast.error('Failed to sync inbox');
		}
	};

	const handleReconnect = async () => {
		try {
			const url = await getConnectGmailUrl();
			window.location.href = url;
		} catch (err) {
			toast.error('Failed to start reconnection');
		}
	};

	if (isLoading) {
		return (
			<div className="space-y-4">
				<div className="h-8 w-48 bg-muted animate-pulse rounded" />
				<div className="h-32 bg-muted animate-pulse rounded" />
			</div>
		);
	}

	const hasGmailIntegration = integrations?.some((i) => i.provider === 'gmail');

	return (
		<div className="space-y-6">
			<div>
				<h3 className="text-lg font-semibold">Email Integrations</h3>
				<p className="text-sm text-muted-foreground mt-1">
					Connect your email accounts to send and receive emails directly from the CRM.
				</p>
			</div>

			{/* Connected integrations */}
			{integrations && integrations.length > 0 && (
				<div className="space-y-3">
					{integrations.map((integration) => {
						const status = STATUS_CONFIG[integration.status] || STATUS_CONFIG.error;
						return (
							<Card key={integration.id}>
								<CardContent className="flex items-center justify-between p-4">
									<div className="flex items-center gap-3">
										<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
											<Mail className="h-5 w-5" />
										</div>
										<div>
											<div className="flex items-center gap-2">
												<span className="font-medium">{integration.emailAddress}</span>
												<Badge variant="secondary" className={status.color}>
													{status.label}
												</Badge>
											</div>
											<p className="text-sm text-muted-foreground capitalize">
												{integration.provider}
												{integration.lastSyncAt && (
													<> &middot; Last synced {new Date(integration.lastSyncAt).toLocaleString()}</>
												)}
											</p>
											{integration.errorMessage && integration.status !== 'active' && (
												<p className="text-sm text-destructive flex items-center gap-1 mt-1">
													<AlertCircle className="h-3 w-3" />
													{integration.errorMessage}
												</p>
											)}
										</div>
									</div>
									<div className="flex items-center gap-2">
										{integration.status === 'token_expired' && (
											<Button
												variant="outline"
												size="sm"
												onClick={handleReconnect}
											>
												Reconnect
											</Button>
										)}
										{integration.status === 'active' && (
											<Button
												variant="outline"
												size="sm"
												onClick={() => handleSync(integration.id)}
												disabled={syncMutation.isPending}
											>
												<RefreshCw className={`h-4 w-4 mr-2 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
												Sync
											</Button>
										)}
										<Button
											variant="outline"
											size="sm"
											onClick={() => handleDisconnect(integration.id)}
											disabled={disconnectMutation.isPending}
										>
											<Unplug className="h-4 w-4 mr-2" />
											Disconnect
										</Button>
									</div>
								</CardContent>
							</Card>
						);
					})}
				</div>
			)}

			{/* Connect new integration */}
			{!hasGmailIntegration && (
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Gmail</CardTitle>
						<CardDescription>
							Connect your Gmail account to send and receive emails from your CRM inbox.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Button onClick={handleConnectGmail}>
							<Mail className="h-4 w-4 mr-2" />
							Connect Gmail
						</Button>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
