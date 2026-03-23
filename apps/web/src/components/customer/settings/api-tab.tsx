import {
	Card,
	CardHeader,
	CardTitle,
	CardContent,
} from '@/components/ui/card';
import { useTenantSettingsQuery } from '@/hooks/use-tenant-settings';

export function ApiTab() {
	const { data: settings, isLoading, error } = useTenantSettingsQuery();

	if (isLoading) {
		return <div className="text-muted-foreground">Loading settings...</div>;
	}

	if (error) {
		return (
			<div className="text-destructive">
				Error loading settings: {error.message}
			</div>
		);
	}

	return (
		<div className="space-y-8">
			<Card>
				<CardHeader>
					<CardTitle>API Documentation</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-muted-foreground">
						Your tenant slug is <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">{settings?.slug}</code>
					</p>
				</CardContent>
			</Card>
		</div>
	);
}
